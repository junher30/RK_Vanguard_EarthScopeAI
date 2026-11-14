"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { DATA_REGIONS, regionAt, regionCenter, regionOutline } from "@/lib/regions";
import { midpoint, toFeature, type LatLng } from "@/lib/geo";
import type { AreaFeature, Draw, Selection } from "@/lib/store";

type CountryFeature = GeoJSON.Feature<GeoJSON.Geometry, { name: string }>;

export type GlobeApi = {
  flyTo: (lat: number, lng: number, altitude?: number) => void;
  zoom: (factor: number) => void;
  setSpin: (on: boolean) => void;
  isSpinning: () => boolean;
};

export type Imagery = "day" | "night";

const TEX = {
  day: "/textures/earth-blue-marble.jpg",
  night: "/textures/earth-night.jpg",
  bump: "/textures/earth-topology.png",
  water: "/textures/earth-water.png",
};

export type DataOverlay = {
  url: string;
  preload: string[];
  bounds: { lat_min: number; lat_max: number; lon_min: number; lon_max: number };
};

// One texture per PNG, loaded once; switching years swaps the map on a single material.
const textures = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();
function texture(url: string, onLoad?: (t: THREE.Texture) => void) {
  let t = textures.get(url);
  if (!t) {
    t = loader.load(url, onLoad);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    textures.set(url, t);
  } else if (t.image) onLoad?.(t);
  else {
    // still loading (e.g. preloaded): wait for it
    const tex = t;
    const img = new Image();
    img.onload = () => onLoad?.(tex);
    img.src = url;
  }
  return t;
}

export type VertexAction =
  | { type: "add"; at: LatLng }
  | { type: "close" }
  | { type: "dragStart" }
  | { type: "move"; i: number; at: LatLng }
  | { type: "insert"; i: number; at: LatLng }
  | { type: "remove"; i: number };

type Props = {
  selection: Selection | null;
  overlay: DataOverlay | null;
  imagery: Imagery;
  draw: Draw;
  drawValid: boolean;
  area: AreaFeature | null;
  onSelect: (s: Selection) => void;
  onVertex: (a: VertexAction) => void;
  onReady: (api: GlobeApi) => void;
  onBordersError?: () => void;
};

type Pt = { lat: number; lng: number; kind: "mark" | "vertex" | "mid"; i: number };
type UserPoly = GeoJSON.Feature<GeoJSON.Polygon, { __user: true }>;
type PathObj = { coords: [number, number][]; kind: "region" | "user" };

const isUser = (d: object): d is UserPoly =>
  !!(d as { properties?: { __user?: boolean } }).properties?.__user;

// great-circle angle between two points, degrees (to skip vertices on the far side)
const angle = (a: LatLng, b: LatLng) => {
  const r = Math.PI / 180;
  const c = Math.sin(a.lat * r) * Math.sin(b.lat * r) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.cos((a.lng - b.lng) * r);
  return Math.acos(Math.min(1, Math.max(-1, c))) / r;
};

export default function EarthGlobe({
  selection, overlay, imagery, draw, drawValid, area, onSelect, onVertex, onReady, onBordersError,
}: Props) {
  const ref = useRef<GlobeMethods | undefined>(undefined);
  const wrap = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [hover, setHover] = useState<CountryFeature | null>(null);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide }),
    [],
  );

  // swap the texture only once the new image has loaded (no flicker while animating)
  const url = overlay?.url;
  useEffect(() => {
    if (!url) return;
    let live = true;
    texture(url, (t) => {
      if (!live) return;
      material.map = t;
      material.needsUpdate = true;
    });
    return () => { live = false; };
  }, [url, material]);

  const preloadKey = overlay?.preload.join("|");
  useEffect(() => {
    preloadKey?.split("|").forEach((u) => texture(u));
  }, [preloadKey]);

  const b = overlay?.bounds;
  const tiles = useMemo(
    () => (b ? [{
      lat: (b.lat_min + b.lat_max) / 2,
      lng: (b.lon_min + b.lon_max) / 2,
      w: b.lon_max - b.lon_min,
      h: b.lat_max - b.lat_min,
    }] : []),
    [b?.lat_min, b?.lat_max, b?.lon_min, b?.lon_max], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const fit = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    fetch("/geo/countries-110m.json")
      .then((r) => r.json())
      .then((topo: Topology<{ countries: GeometryCollection<{ name: string }> }>) => {
        const fc = feature(topo, topo.objects.countries) as GeoJSON.FeatureCollection<
          GeoJSON.Geometry,
          { name: string }
        >;
        setCountries(fc.features);
      })
      .catch(() => onBordersError?.());
  }, [onBordersError]);

  const labels = useMemo(
    () => DATA_REGIONS.map((r) => ({ ...regionCenter(r), lat: r.latMax + 1.2, text: `${r.label} · NASA data` })),
    [],
  );
  // globe.gl mutates the objects it renders; never hand it app state directly
  const lat = selection?.lat, lng = selection?.lng;
  const marks = useMemo(() => (lat === undefined || lng === undefined ? [] : [{ lat, lng }]), [lat, lng]);

  // ---------------- polygon being drawn / confirmed area ----------------
  const drawing = draw.status !== "off";
  const verts = draw.vertices;
  const mids = useMemo(
    () => (draw.status === "closed" ? verts.map((v, i) => midpoint(v, verts[(i + 1) % verts.length])) : []),
    [draw.status, verts],
  );
  const areaRing = useMemo<LatLng[]>(
    () => (area ? area.geometry.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })) : []),
    [area],
  );
  const shape = drawing ? verts : areaRing;
  const closed = drawing ? draw.status === "closed" : areaRing.length >= 3;

  const points = useMemo<Pt[]>(() => [
    ...marks.map((m) => ({ ...m, kind: "mark" as const, i: -1 })),
    ...(drawing ? verts.map((v, i) => ({ ...v, kind: "vertex" as const, i })) : []),
    ...mids.map((v, i) => ({ ...v, kind: "mid" as const, i })),
  ], [marks, drawing, verts, mids]);

  const paths = useMemo<PathObj[]>(() => {
    const region = DATA_REGIONS.map((r) => ({ coords: regionOutline(r), kind: "region" as const }));
    if (shape.length < 2) return region;
    const coords = shape.map((v) => [v.lat, v.lng] as [number, number]);
    if (closed) coords.push(coords[0]);
    return [...region, { coords, kind: "user" as const }];
  }, [shape, closed]);

  const userPoly = useMemo<UserPoly | null>(() => {
    // an invalid ring (e.g. crossing edges) can't be triangulated: show only its edges
    if (!closed || shape.length < 3 || (drawing && !drawValid)) return null;
    const f = toFeature(shape, { __user: true });
    // globe.gl caps face outward with clockwise rings (GeoJSON stores counter-clockwise)
    f.geometry.coordinates[0].reverse();
    return f as unknown as UserPoly;
  }, [closed, shape, drawing, drawValid]);
  const polys = useMemo<object[]>(() => (userPoly ? [...countries, userPoly] : countries), [countries, userPoly]);

  const edgeColor = !closed ? "#e2e8f0" : drawing && !drawValid ? "#f87171" : "#22d3ee";
  const fillColor = drawing && !drawValid ? "rgba(248,113,113,.18)" : "rgba(34,211,238,.16)";

  // ---------------- vertex hit-testing and dragging ----------------
  const local = (e: React.PointerEvent | React.MouseEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const hit = (x: number, y: number): { kind: "vertex" | "mid"; i: number } | null => {
    const g = ref.current;
    if (!g || !drawing) return null;
    const pov = g.pointOfView();
    const near = (list: LatLng[], px: number) => {
      let best = -1, bestD = px;
      list.forEach((v, i) => {
        if (angle(pov, v) > 80) return; // far side of the globe
        const s = g.getScreenCoords(v.lat, v.lng, 0.012);
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < bestD) { best = i; bestD = d; }
      });
      return best;
    };
    const v = near(verts, 13);
    if (v >= 0) return { kind: "vertex", i: v };
    const m = near(mids, 11);
    return m >= 0 ? { kind: "mid", i: m } : null;
  };

  const onPointerDownCapture = (e: React.PointerEvent) => {
    suppressClick.current = false;
    if (e.button !== 0) return;
    const { x, y } = local(e);
    const h = hit(x, y);
    if (!h) return;
    e.stopPropagation(); // keep the camera still and skip globe.gl's click
    suppressClick.current = true;
    if (draw.status === "drawing") {
      if (h.kind === "vertex" && h.i === 0 && verts.length >= 3) onVertex({ type: "close" });
      return;
    }
    if (h.kind === "vertex") {
      onVertex({ type: "dragStart" });
      dragging.current = h.i;
    } else {
      onVertex({ type: "insert", i: h.i + 1, at: mids[h.i] });
      dragging.current = h.i + 1;
    }
    wrap.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMoveCapture = (e: React.PointerEvent) => {
    const { x, y } = local(e);
    if (dragging.current !== null) {
      e.stopPropagation();
      const ll = ref.current?.toGlobeCoords(x, y);
      if (ll) onVertex({ type: "move", i: dragging.current, at: { lat: ll.lat, lng: ll.lng } });
      return;
    }
    if (wrap.current && drawing) {
      const h = hit(x, y);
      wrap.current.style.cursor = h
        ? draw.status === "drawing" ? (h.kind === "vertex" && h.i === 0 && verts.length >= 3 ? "pointer" : "crosshair") : "grab"
        : draw.status === "drawing" ? "crosshair" : "";
    } else if (wrap.current) wrap.current.style.cursor = "";
  };
  const onPointerUpCapture = (e: React.PointerEvent) => {
    if (dragging.current === null) return;
    e.stopPropagation();
    dragging.current = null;
    suppressClick.current = true;
    wrap.current?.releasePointerCapture(e.pointerId);
  };
  const onContextMenu = (e: React.MouseEvent) => {
    if (!drawing) return;
    const { x, y } = local(e);
    const h = hit(x, y);
    if (h?.kind === "vertex") {
      e.preventDefault();
      onVertex({ type: "remove", i: h.i });
    }
  };

  const handleReady = () => {
    const g = ref.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = true;
    c.autoRotateSpeed = 0.35;
    c.enableDamping = true;
    c.minDistance = 120;
    c.maxDistance = 600;
    g.pointOfView({ lat: -5, lng: -40, altitude: 2.6 }, 0);
    g.pointOfView({ lat: -5, lng: -60, altitude: 2.2 }, 2400);
    onReady({
      flyTo: (lat, lng, altitude) => {
        c.autoRotate = false;
        g.pointOfView({ lat, lng, altitude: altitude ?? Math.min(g.pointOfView().altitude, 1.8) }, 1200);
      },
      zoom: (f) => {
        const p = g.pointOfView();
        g.pointOfView({ ...p, altitude: Math.min(4, Math.max(0.3, p.altitude * f)) }, 450);
      },
      setSpin: (on) => {
        c.autoRotate = on;
      },
      isSpinning: () => c.autoRotate,
    });
  };

  const pick = (lat: number, lng: number, country: string | null) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (draw.status === "drawing") return onVertex({ type: "add", at: { lat, lng } });
    if (draw.status === "closed") return; // editing: only handles respond
    const region = regionAt(lat, lng);
    onSelect({
      lat: +lat.toFixed(4),
      lng: +lng.toFixed(4),
      surface: country ? "land" : "water",
      country,
      regionKey: region?.key ?? null,
    });
  };

  if (!size.w) return null;

  return (
    <div
      ref={wrap}
      className="h-full w-full"
      onPointerDownCapture={onPointerDownCapture}
      onPointerMoveCapture={onPointerMoveCapture}
      onPointerUpCapture={onPointerUpCapture}
      onContextMenu={onContextMenu}
    >
    <Globe
      ref={ref}
      width={size.w}
      height={size.h}
      onGlobeReady={handleReady}
      globeImageUrl={imagery === "day" ? TEX.day : TEX.night}
      bumpImageUrl={TEX.bump}
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere
      atmosphereColor="#22d3ee"
      atmosphereAltitude={0.2}
      // country borders + hover highlight
      polygonsData={polys}
      polygonAltitude={(d) => (isUser(d) ? 0.009 : d === hover ? 0.012 : 0.004)}
      polygonCapColor={(d) => (isUser(d) ? fillColor : d === hover ? "rgba(52,211,153,.22)" : "rgba(0,0,0,0)")}
      polygonSideColor={(d) => (isUser(d) ? "rgba(0,0,0,0)" : "rgba(52,211,153,.08)")}
      polygonStrokeColor={(d) => (isUser(d) ? "rgba(0,0,0,0)" : "rgba(226,232,240,.32)")}
      polygonsTransitionDuration={0}
      polygonLabel={(d) =>
        isUser(d) ? "" : `<div class="globe-tip">${(d as CountryFeature).properties.name}</div>`
      }
      onPolygonHover={(d) => setHover(d && !isUser(d) ? (d as CountryFeature) : null)}
      onPolygonClick={(d, _e, c) => pick(c.lat, c.lng, isUser(d) ? null : (d as CountryFeature).properties.name)}
      onGlobeClick={({ lat, lng }) => pick(lat, lng, null)}
      // NASA data overlay (annual map PNG from export/build_site_data.py)
      tilesData={tiles}
      tileLat="lat"
      tileLng="lng"
      tileWidth="w"
      tileHeight="h"
      tileAltitude={0.007}
      tileMaterial={() => material}
      tileCurvatureResolution={1}
      onTileClick={(_t, _e, c) => pick(c.lat, c.lng, null)}
      onPathClick={(_p, _e, c) => pick(c.lat, c.lng, null)}
      onPointClick={(_p, _e, c) => pick(c.lat, c.lng, null)}
      // processed-data region outline
      pathsData={paths}
      pathPoints="coords"
      pathPointLat={(p) => (p as [number, number])[0]}
      pathPointLng={(p) => (p as [number, number])[1]}
      pathColor={(p: object) => ((p as PathObj).kind === "user" ? edgeColor : ["#22d3ee", "#67e8f9"])}
      pathStroke={(p) => ((p as PathObj).kind === "user" ? 2 : 2.4)}
      pathDashLength={(p) => ((p as PathObj).kind === "user" ? (closed ? 1 : 0.04) : 0.08)}
      pathDashGap={(p) => ((p as PathObj).kind === "user" ? (closed ? 0 : 0.015) : 0.02)}
      pathDashAnimateTime={(p) => ((p as PathObj).kind === "user" ? 0 : 6000)}
      pathPointAlt={() => 0.011}
      pathTransitionDuration={0}
      htmlElementsData={labels}
      htmlLat="lat"
      htmlLng="lng"
      htmlAltitude={0.01}
      htmlElement={(d) => {
        const el = document.createElement("div");
        el.className = "globe-region-label";
        el.textContent = (d as { text: string }).text;
        return el;
      }}
      // selected point
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointColor={(p) => {
        const d = p as Pt;
        if (d.kind === "mid") return "rgba(34,211,238,.55)";
        if (d.kind === "vertex") return d.i === 0 && draw.status === "drawing" ? "#22d3ee" : "#f8fafc";
        return "#22d3ee";
      }}
      pointAltitude={(p) => ((p as Pt).kind === "mark" ? 0.025 : 0.012)}
      pointRadius={(p) => {
        const d = p as Pt;
        if (d.kind === "mid") return 0.16;
        if (d.kind === "vertex") return d.i === 0 && draw.status === "drawing" && verts.length >= 3 ? 0.42 : 0.28;
        return 0.45;
      }}
      pointsTransitionDuration={0}
      ringsData={marks}
      ringLat="lat"
      ringLng="lng"
      ringColor={() => (t: number) => `rgba(34,211,238,${1 - t})`}
      ringMaxRadius={4.5}
      ringPropagationSpeed={2.5}
      ringRepeatPeriod={900}
    />
    </div>
  );
}
