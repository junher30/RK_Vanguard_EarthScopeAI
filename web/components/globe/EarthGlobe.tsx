"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { createDetail, type Detail } from "@/lib/globe/detail";
import { Rain, rainSource } from "@/lib/globe/rain";
import { satMesh, useSatellites, type SatObj } from "@/lib/globe/useSatellites";
import { eventStyle, type GeoEvent } from "@/lib/events";
import type { Sat } from "@/lib/satellites";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { DATA_REGIONS, regionAt, regionCenter, regionOutline } from "@/lib/regions";
import { midpoint, toFeature, type LatLng } from "@/lib/geo";
import type { AreaFeature, Draw, Selection } from "@/lib/store";
import { fmt, useProbe, valueOfColor, type Scale } from "@/lib/data";

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
  scale: Scale;
  decimals: number;
  units: string;
  signed: boolean;
  faded: boolean;
  caption: string;
  rain?: boolean;
  future?: boolean;
};

type EvObj = { kind: "event"; lat: number; lng: number; ev: GeoEvent };

const setOpacity = (m: THREE.Material, v: number) => { m.opacity = v; };

const pixels = new Map<string, ImageData | "loading">();
function pixelData(url: string): ImageData | null {
  const p = pixels.get(url);
  if (p) return p === "loading" ? null : p;
  pixels.set(url, "loading");
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    pixels.set(url, ctx.getImageData(0, 0, c.width, c.height));
  };
  img.onerror = () => pixels.delete(url);
  img.src = url;
  return null;
}

type Probe = { x: number; y: number; lat: number; lng: number; value: number | null; weak: boolean };

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
  showSats?: boolean;
  events?: GeoEvent[];
  onEvent?: (e: GeoEvent) => void;
  selectedSat?: number | null;
  onSatellite?: (s: Sat) => void;
};

type Pt = { lat: number; lng: number; kind: "mark" | "vertex" | "mid"; i: number };
type UserPoly = GeoJSON.Feature<GeoJSON.Polygon, { __user: true }>;
type PathObj = { coords: ([number, number] | [number, number, number])[]; kind: "region" | "user" | "orbit" | "storm"; color?: string };

const isUser = (d: object): d is UserPoly =>
  !!(d as { properties?: { __user?: boolean } }).properties?.__user;

const angle = (a: LatLng, b: LatLng) => {
  const r = Math.PI / 180;
  const c = Math.sin(a.lat * r) * Math.sin(b.lat * r) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.cos((a.lng - b.lng) * r);
  return Math.acos(Math.min(1, Math.max(-1, c))) / r;
};

export default function EarthGlobe({
  selection, overlay, imagery, draw, drawValid, area, onSelect, onVertex, onReady, onBordersError,
  showSats = false, selectedSat = null, onSatellite, events = [], onEvent,
}: Props) {
  const evClick = useRef(onEvent);
  useEffect(() => { evClick.current = onEvent; }, [onEvent]);
  const sats = useSatellites(showSats, selectedSat);
  const satClick = useRef(onSatellite);
  // accesores estables: si cambian en cada render, el globo recrea etiquetas y satélites cada segundo
  const htmlEl = useCallback((d: object) => {
    const el = document.createElement("div");
    if ((d as SatObj).kind === "sat") {
      const o = d as SatObj;
      el.className = "globe-sat-label";
      el.style.setProperty("--sat", o.color);
      el.textContent = o.text;
      // la etiqueta también abre la ficha del satélite
      el.onpointerdown = (e) => e.stopPropagation();
      el.onclick = (e) => { e.stopPropagation(); satClick.current?.(o.sat); };
      return el;
    }
    if ((d as EvObj).kind === "event") {
      const o = d as EvObj;
      el.className = "globe-event";
      el.style.setProperty("--ev", eventStyle(o.ev.kind).color);
      el.title = o.ev.title;
      el.onpointerdown = (e) => e.stopPropagation();
      el.onclick = (e) => { e.stopPropagation(); evClick.current?.(o.ev); };
      return el;
    }
    el.className = "globe-region-label";
    el.textContent = (d as { text: string }).text;
    return el;
  }, []);
  const satObj = useCallback(
    (d: object) => satMesh((d as SatObj).color, (d as SatObj).sat.norad === 25544 ? 2.4 : 1.8),
    [],
  );
  useEffect(() => { satClick.current = onSatellite; }, [onSatellite]);
  const evObjs = useMemo<EvObj[]>(() => events.map((ev) => ({ kind: "event", lat: ev.lat, lng: ev.lng, ev })), [events]);
  const ref = useRef<GlobeMethods | undefined>(undefined);
  const wrap = useRef<HTMLDivElement>(null);
  const detail = useRef<Detail | null>(null);
  const rain = useRef<Rain | null>(null);
  const fx = useRef(0);
  // océanos con brillo: el mapa de agua hace de máscara especular
  const globeMat = useMemo(() => {
    const m = new THREE.MeshPhongMaterial({ specular: new THREE.Color(0x3a4a5a), shininess: 14 });
    new THREE.TextureLoader().load(TEX.water, (t) => { m.specularMap = t; m.needsUpdate = true; });
    return m;
  }, []);
  const imageryRef = useRef(imagery);
  const zoomRef = useRef(1);
  const [zoomK, setZoomK] = useState(1);

  // detalle: cambia entre día y noche
  useEffect(() => {
    imageryRef.current = imagery;
    detail.current?.setImagery(imagery);
  }, [imagery]);
  useEffect(() => () => cancelAnimationFrame(fx.current), []);

  // lluvia: gotas donde la capa de precipitación marca más lluvia
  const rainUrl = overlay?.rain ? overlay.url : null;
  const rainScale = overlay?.scale;
  const rainBounds = overlay?.bounds;
  useEffect(() => {
    if (!rainUrl || !rainScale || !rainBounds) { rain.current?.setSource(null); return; }
    let live = true;
    rainSource(rainUrl, rainScale, rainBounds).then((src) => { if (live) rain.current?.setSource(src); });
    return () => { live = false; };
  }, [rainUrl, rainScale, rainBounds]);
  const dragging = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [hover, setHover] = useState<CountryFeature | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const probeFrame = useRef(0);
  const setProbeT = useProbe((s) => s.set);
  useEffect(() => {
    if (!overlay) useProbe.getState().set(null);
  }, [overlay]);
  useEffect(() => {
    if (overlay?.url) pixelData(overlay.url);
  }, [overlay?.url]);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide }),
    [],
  );

  // la predicción respira como un holograma para que no se confunda con los datos medidos
  const future = !!overlay?.future;
  useEffect(() => {
    if (!future) { setOpacity(material, 0.92); return; }
    let raf = 0;
    const tick = () => {
      setOpacity(material, 0.72 + 0.18 * (0.5 + 0.5 * Math.sin(performance.now() / 450)));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [future, material]);

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
  const lat = selection?.lat, lng = selection?.lng;
  const marks = useMemo(() => (lat === undefined || lng === undefined ? [] : [{ lat, lng }]), [lat, lng]);

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

  const orbitColor = sats.list.find((o) => o.sat.norad === selectedSat)?.color;
  const paths = useMemo<PathObj[]>(() => {
    const base = DATA_REGIONS.map((r) => ({ coords: regionOutline(r), kind: "region" as const }));
    const storms: PathObj[] = events.filter((e) => e.track && e.track.length > 1)
      .map((e) => ({ coords: e.track!, kind: "storm" as const, color: eventStyle(e.kind).color }));
    const region: PathObj[] = [...base, ...storms, ...(sats.orbit ? [{ coords: sats.orbit, kind: "orbit" as const, color: orbitColor }] : [])];
    if (shape.length < 2) return region;
    const coords = shape.map((v) => [v.lat, v.lng] as [number, number]);
    if (closed) coords.push(coords[0]);
    return [...region, { coords, kind: "user" as const }];
  }, [shape, closed, sats.orbit, orbitColor, events]);

  const userPoly = useMemo<UserPoly | null>(() => {
    if (!closed || shape.length < 3 || (drawing && !drawValid)) return null;
    const f = toFeature(shape, { __user: true });
    f.geometry.coordinates[0].reverse();
    return f as unknown as UserPoly;
  }, [closed, shape, drawing, drawValid]);
  const polys = useMemo<object[]>(() => (userPoly ? [...countries, userPoly] : countries), [countries, userPoly]);

  const edgeColor = !closed ? "#e2e8f0" : drawing && !drawValid ? "#f87171" : "#22d3ee";
  const fillColor = drawing && !drawValid ? "rgba(248,113,113,.18)" : "rgba(34,211,238,.16)";

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
        if (angle(pov, v) > 80) return;
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
    e.stopPropagation();
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
  const readValue = (x: number, y: number) => {
    cancelAnimationFrame(probeFrame.current);
    probeFrame.current = requestAnimationFrame(() => {
      const o = overlay;
      const ll = o ? ref.current?.toGlobeCoords(x, y) : null;
      const b = o?.bounds;
      if (!o || !ll || !b || ll.lat < b.lat_min || ll.lat > b.lat_max || ll.lng < b.lon_min || ll.lng > b.lon_max) {
        setProbe(null);
        setProbeT(null);
        return;
      }
      const img = pixelData(o.url);
      let value: number | null = null;
      let weak = false;
      let t: number | null = null;
      if (img) {
        const px = Math.min(img.width - 1, Math.floor(((ll.lng - b.lon_min) / (b.lon_max - b.lon_min)) * img.width));
        const py = Math.min(img.height - 1, Math.floor(((b.lat_max - ll.lat) / (b.lat_max - b.lat_min)) * img.height));
        const k = (py * img.width + px) * 4;
        if (img.data[k + 3] > 0) {
          const r = valueOfColor(o.scale, img.data[k], img.data[k + 1], img.data[k + 2]);
          value = r.value;
          t = r.t;
          weak = o.faded && img.data[k + 3] < 120;
        }
      }
      setProbe({ x, y, lat: ll.lat, lng: ll.lng, value, weak });
      setProbeT(t);
    });
  };
  const onPointerMoveCapture = (e: React.PointerEvent) => {
    const { x, y } = local(e);
    readValue(x, y);
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
    c.minDistance = 103;
    c.maxDistance = 600;
    c.zoomSpeed = 0.8;
    // detalle NASA GIBS al acercarse y lluvia animada
    const det = createDetail(100.08, 2);
    det.setImagery(imageryRef.current);
    g.scene().add(det.obj);
    detail.current = det;
    const r = new Rain(100, 4500);
    g.scene().add(r);
    rain.current = r;
    let last = performance.now(), lastPov = 0;
    const loop = (now: number) => {
      fx.current = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const alt = g.pointOfView().altitude;
      r.update(dt, alt);
      if (now - lastPov > 200) {
        lastPov = now;
        det.obj.updatePov(g.camera());
        // el marcador se achica al acercarse
        const z = Math.round(Math.min(1, alt / 0.8) * 20) / 20;
        if (z !== zoomRef.current) {
          zoomRef.current = z;
          setZoomK(z);
          // de cerca la capa de datos se aclara para dejar ver el detalle del terreno
          material.opacity = 0.5 + 0.42 * z;
        }
      }
    };
    fx.current = requestAnimationFrame(loop);
    g.pointOfView({ lat: -5, lng: -40, altitude: 2.6 }, 0);
    g.pointOfView({ lat: -5, lng: -60, altitude: 2.2 }, 2400);
    onReady({
      flyTo: (lat, lng, altitude) => {
        c.autoRotate = false;
        g.pointOfView({ lat, lng, altitude: altitude ?? Math.min(g.pointOfView().altitude, 1.8) }, 1200);
      },
      zoom: (f) => {
        const p = g.pointOfView();
        g.pointOfView({ ...p, altitude: Math.min(4, Math.max(0.04, p.altitude * f)) }, 450);
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
    if (draw.status === "closed") return;
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
      className="relative h-full w-full"
      onPointerDownCapture={onPointerDownCapture}
      onPointerMoveCapture={onPointerMoveCapture}
      onPointerUpCapture={onPointerUpCapture}
      onContextMenu={onContextMenu}
      onPointerLeave={() => {
        cancelAnimationFrame(probeFrame.current);
        setProbe(null);
        setProbeT(null);
      }}
    >
    <Globe
      ref={ref}
      width={size.w}
      height={size.h}
      onGlobeReady={handleReady}
      globeMaterial={globeMat}
      globeImageUrl={imagery === "day" ? TEX.day : TEX.night}
      bumpImageUrl={TEX.bump}
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere
      atmosphereColor="#22d3ee"
      atmosphereAltitude={0.2}
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
      pathsData={paths}
      pathPoints="coords"
      pathPointLat={(p) => (p as [number, number])[0]}
      pathPointLng={(p) => (p as [number, number])[1]}
      pathColor={(p: object) => {
        const o = p as PathObj;
        if (o.kind === "orbit" || o.kind === "storm") return [`${o.color ?? "#22d3ee"}00`, o.color ?? "#22d3ee"];
        return o.kind === "user" ? edgeColor : ["#22d3ee", "#67e8f9"];
      }}
      pathStroke={(p) => ((p as PathObj).kind === "orbit" || (p as PathObj).kind === "storm" ? 1.2 : (p as PathObj).kind === "user" ? 2 : 2.4)}
      pathDashLength={(p) => ((p as PathObj).kind === "orbit" || (p as PathObj).kind === "storm" ? 1 : (p as PathObj).kind === "user" ? (closed ? 1 : 0.04) : 0.08)}
      pathDashGap={(p) => ((p as PathObj).kind === "orbit" || (p as PathObj).kind === "storm" ? 0 : (p as PathObj).kind === "user" ? (closed ? 0 : 0.015) : 0.02)}
      pathDashAnimateTime={(p) => ((p as PathObj).kind === "region" ? 6000 : 0)}
      pathPointAlt={(pt) => ((pt as number[])[2] ?? 0.011)}
      pathTransitionDuration={0}
      htmlElementsData={evObjs.length || showSats ? [...labels, ...(showSats ? sats.list : []), ...evObjs] : labels}
      htmlLat="lat"
      htmlLng="lng"
      htmlAltitude={(d) => ((d as SatObj).kind === "sat" ? (d as SatObj).alt + 0.02 : (d as EvObj).kind === "event" ? 0.012 : 0.01)}
      htmlTransitionDuration={0}
      htmlElement={htmlEl}
      objectsData={sats.list}
      objectLat="lat"
      objectLng="lng"
      objectAltitude="alt"
      objectFacesSurfaces={false}
      objectThreeObject={satObj}
      objectLabel={(d) => `<div class="globe-tip">${(d as SatObj).text}</div>`}
      onObjectClick={(d) => onSatellite?.((d as SatObj).sat)}
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointColor={(p) => {
        const d = p as Pt;
        if (d.kind === "mid") return "rgba(34,211,238,.55)";
        if (d.kind === "vertex") return d.i === 0 && draw.status === "drawing" ? "#22d3ee" : "#f8fafc";
        return "#22d3ee";
      }}
      pointAltitude={(p) => ((p as Pt).kind === "mark" ? 0.025 * Math.max(0.08, zoomK) : 0.012)}
      pointRadius={(p) => {
        const d = p as Pt;
        if (d.kind === "mid") return 0.16;
        if (d.kind === "vertex") return d.i === 0 && draw.status === "drawing" && verts.length >= 3 ? 0.42 : 0.28;
        return 0.45 * Math.max(0.08, zoomK);
      }}
      pointsTransitionDuration={0}
      ringsData={marks}
      ringLat="lat"
      ringLng="lng"
      ringColor={() => (t: number) => `rgba(34,211,238,${1 - t})`}
      ringMaxRadius={4.5 * Math.max(0.08, zoomK)}
      ringPropagationSpeed={2.5}
      ringRepeatPeriod={900}
    />
    {probe && overlay && (
      <div
        className="pointer-events-none absolute z-20 rounded-lg border border-white/15 bg-[#04101cee] px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur"
        style={{ left: probe.x + 16, top: probe.y + 14 }}
      >
        {probe.value === null ? (
          <span className="text-muted">No data here</span>
        ) : (
          <span className="font-mono font-semibold tabular-nums text-ink">
            ≈ {overlay.signed && probe.value > 0 ? "+" : ""}{fmt(probe.value, overlay.decimals)} {overlay.units}
            {probe.weak && <span className="ml-1 font-sans font-normal text-muted">(not significant)</span>}
          </span>
        )}
        <span className="mt-0.5 block text-[10px] text-muted">
          {overlay.caption} · {Math.abs(probe.lat).toFixed(2)}°{probe.lat >= 0 ? "N" : "S"}{" "}
          {Math.abs(probe.lng).toFixed(2)}°{probe.lng >= 0 ? "E" : "W"}
        </span>
      </div>
    )}
    </div>
  );
}
