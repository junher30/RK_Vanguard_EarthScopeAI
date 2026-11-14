"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, Check, Crosshair, Hexagon, MapPin, Minus, Moon, Pause, Play, Plus, Satellite, Search, Sun, X,
} from "lucide-react";
import type { DataOverlay, GlobeApi, Imagery, VertexAction } from "@/components/globe/EarthGlobe";
import AreaPanel, { type AreaStats } from "./AreaPanel";
import { areaKm2, centroid, coverage, crossesAntimeridian, validate } from "@/lib/geo";
import DataDock from "@/components/data/DataDock";
import InsightPanel from "@/components/data/InsightPanel";
import { loadManifest, mapUrl, useLayer, type Manifest } from "@/lib/data";
import { DATA_REGIONS, fmtCoord, regionCenter } from "@/lib/regions";
import { useExplorer } from "@/lib/store";
import StepRail from "./StepRail";

const EarthGlobe = dynamic(() => import("@/components/globe/EarthGlobe"), { ssr: false });

const ease = [0.22, 1, 0.36, 1] as const;

export default function Explorer() {
  const { selection, zone, area, draw, select, clear, confirm } = useExplorer();
  const api = useRef<GlobeApi | null>(null);
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(true);
  const [spinning, setSpinning] = useState(true);
  const [imagery, setImagery] = useState<Imagery>("day");
  const [coords, setCoords] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [wide, setWide] = useState(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const { scope, variable, mode, year } = useLayer();

  useEffect(() => {
    let live = true;
    loadManifest(scope)
      .then((m) => live && setManifest(m))
      .catch(() => {
        if (!live) return;
        setManifest(null);
        setToast(scope === "global" ? "Global layers not exported yet." : "NASA data layers unavailable.");
      });
    return () => { live = false; };
  }, [scope]);

  const layerMeta = manifest?.variables.find((v) => v.key === variable) ?? null;

  // keep the layer state consistent with what the current scope offers
  useEffect(() => {
    if (!manifest) return;
    const st = useLayer.getState();
    if (st.variable && !manifest.variables.some((v) => v.key === st.variable)) st.setVariable(null);
    const meta = manifest.variables.find((v) => v.key === st.variable);
    if (meta && st.mode === "trend" && !meta.scale.trend) st.setMode("value");
    if (meta && !meta.years.includes(st.year)) st.setYear(meta.years[meta.years.length - 1]);
  }, [manifest, variable]);

  const overlay = useMemo<DataOverlay | null>(
    () => layerMeta && {
      url: mapUrl(scope, layerMeta.key, mode, year),
      preload: mode === "trend" ? [] : layerMeta.years.map((y) => mapUrl(scope, layerMeta.key, mode, y)),
      bounds: layerMeta.bounds,
    },
    [layerMeta, scope, mode, year],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // restore a zone confirmed earlier in this session (sessionStorage only)
  useEffect(() => {
    Promise.resolve(useExplorer.persist.rehydrate()).then(() => {
      const { zone: z, area: a } = useExplorer.getState();
      if (z) {
        useExplorer.getState().select(z);
        setIntro(false);
        api.current?.flyTo(z.lat, z.lng, 1.4); // if the globe was ready before rehydration
      } else if (a) {
        setIntro(false);
        const c = a.properties.centroid as { lat: number; lng: number } | undefined;
        if (c) api.current?.flyTo(c.lat, c.lng, 1.6);
      }
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const onReady = useCallback((a: GlobeApi) => {
    api.current = a;
    setReady(true);
    const { zone: z, area: ar } = useExplorer.getState();
    if (z) a.flyTo(z.lat, z.lng, 1.4);
    const c = ar?.properties.centroid as { lat: number; lng: number } | undefined;
    if (c) a.flyTo(c.lat, c.lng, 1.6);
  }, []);
  const onBordersError = useCallback(() => setToast("Country borders unavailable. Coordinates still work."), []);

  const onSelect = (s: Parameters<typeof select>[0]) => {
    select(s);
    setSpinning(false);
    api.current?.flyTo(s.lat, s.lng);
  };

  const goToCoords = () => {
    const m = coords.split(/[,;\s]+/).filter(Boolean).map(Number);
    if (m.length < 2 || m.some(Number.isNaN) || Math.abs(m[0]) > 90 || Math.abs(m[1]) > 180) {
      setToast("Enter valid coordinates: latitude −90…90, longitude −180…180");
      return;
    }
    const region = DATA_REGIONS.find(
      (r) => m[0] >= r.latMin && m[0] <= r.latMax && m[1] >= r.lonMin && m[1] <= r.lonMax,
    );
    onSelect({ lat: m[0], lng: m[1], surface: "unknown", country: null, regionKey: region?.key ?? null });
  };

  const flyToRegion = () => {
    const c = regionCenter(DATA_REGIONS[0]);
    setIntro(false);
    setSpinning(false);
    api.current?.flyTo(c.lat, c.lng, 1.1);
    useLayer.getState().setScope("amazon");
    if (!useLayer.getState().variable) useLayer.getState().setVariable("precip_mm_day");
  };

  const toggleSpin = () => {
    const on = !spinning;
    api.current?.setSpin(on);
    setSpinning(on);
  };

  // after confirming, open the analysis of that place right away (global 0.5° data)
  const showAnalysis = () => {
    const L = useLayer.getState();
    L.setScope("global");
    if (!L.variable) L.setVariable("precip_mm_day");
  };
  const doConfirm = () => {
    if (confirm()) {
      setToast("Study zone saved — analysing NASA data for it.");
      showAnalysis();
    }
  };

  // ---------------- polygon tool (Documento 01 §7.3–7.7) ----------------
  const box = DATA_REGIONS[0];
  const stats = useMemo<AreaStats | null>(() => {
    const vs = draw.status !== "off" ? draw.vertices
      : area ? area.geometry.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })) : [];
    if (vs.length === 0) return null;
    const closed = draw.status === "closed" || (draw.status === "off" && !!area);
    const a = vs.length >= 3 ? areaKm2(vs) : 0;
    return {
      issues: vs.length >= 3 ? validate(vs) : [],
      areaKm2: closed ? a : 0,
      centroid: vs.length >= 3 ? centroid(vs) : null,
      crossesAntimeridian: vs.length >= 2 && crossesAntimeridian(vs),
      coverage: closed && a > 0 ? coverage(vs, box) : { cells: 0, fraction: 0 },
      regionLabel: box.label,
    };
  }, [draw.status, draw.vertices, area, box]);
  const drawValid = !!stats && stats.issues.length === 0;

  const startDraw = () => {
    const st = useExplorer.getState();
    st.startDraw();
    api.current?.setSpin(false);
    setSpinning(false);
    setIntro(false);
  };
  const onVertex = useCallback((a: VertexAction) => {
    const st = useExplorer.getState();
    if (a.type === "add") st.addVertex(a.at);
    else if (a.type === "close") st.closeShape();
    else if (a.type === "dragStart") st.checkpoint();
    else if (a.type === "move") st.moveVertex(a.i, a.at);
    else if (a.type === "insert") st.insertVertex(a.i, a.at);
    else if (a.type === "remove") st.removeVertex(a.i);
  }, []);
  const confirmArea = () => {
    if (!stats || !drawValid) return;
    const f = useExplorer.getState().confirmArea({
      areaKm2: Math.round(stats.areaKm2),
      centroid: stats.centroid,
      crossesAntimeridian: stats.crossesAntimeridian,
      dataCoverage: { region: box.key, fraction: +stats.coverage.fraction.toFixed(4), cells: stats.coverage.cells },
    });
    if (f) {
      setToast("Study area saved — analysing NASA data for it.");
      showAnalysis();
    }
  };

  // keyboard: Enter closes, Esc cancels, Ctrl/⌘+Z undoes, Backspace removes the last point
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useExplorer.getState();
      if (st.draw.status === "off" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "Escape") st.cancelDraw();
      else if (e.key === "Enter") st.closeShape();
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); st.undo(); }
      else if (e.key === "Backspace" && st.draw.status === "drawing" && st.draw.vertices.length) {
        e.preventDefault();
        st.removeVertex(st.draw.vertices.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hideSearch = intro || !!variable;
  const region = selection?.regionKey ? DATA_REGIONS.find((r) => r.key === selection.regionKey) : null;
  const isConfirmed = !!zone && !!selection && zone.lat === selection.lat && zone.lng === selection.lng;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-space bg-[url(/textures/night-sky.png)] bg-cover bg-center text-ink">
      <motion.div
        className="absolute inset-0"
        aria-label="Interactive 3D globe"
        animate={{ x: !wide ? "0%" : intro ? "22%" : variable ? "0%" : "-12%" }}
        transition={{ duration: 1.2, ease }}
      >
        <EarthGlobe
          selection={selection}
          overlay={overlay}
          draw={draw}
          drawValid={drawValid}
          area={area}
          onVertex={onVertex}
          imagery={imagery}
          onSelect={onSelect}
          onReady={onReady}
          onBordersError={onBordersError}
        />
      </motion.div>

      {/* vignette for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(3,8,20,.85)_100%)]" />

      <AnimatePresence>
        {!ready && (
          <motion.div
            key="loading"
            className="absolute inset-0 z-50 grid place-items-center bg-space"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-col items-center gap-4 text-muted">
              <span className="relative flex size-4">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan opacity-60" />
                <span className="relative inline-flex size-4 rounded-full bg-cyan" />
              </span>
              <span className="text-sm tracking-wide">Loading Earth…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* header */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease }}
        className="glass absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-4 px-5 py-3"
      >
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full bg-cyan shadow-[0_0_14px_#22d3ee]" />
          <b className="tracking-wide">EarthScope AI</b>
          <span className="hidden text-sm text-muted sm:inline">Planetary Investigation Lab</span>
        </div>
        <StepRail active={zone || area ? 2 : 1} />
      </motion.header>

      {/* intro hero */}
      <AnimatePresence>
        {intro && ready && (
          <motion.section
            key="intro"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
            transition={{ duration: 0.9, ease }}
            className="absolute bottom-24 left-6 z-20 max-w-xl sm:left-12 sm:bottom-auto sm:top-1/3"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
              NASA Space Apps 2026 · Earth System Trend Detective
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
              Don&apos;t just observe Earth&apos;s changes.
              <span className="block bg-gradient-to-r from-cyan via-green to-blue bg-clip-text text-transparent">
                Investigate them.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-muted">
              Pick any place on the planet, then detect trends, simulate scenarios and trace every
              conclusion back to NASA satellite data.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => { setIntro(false); }} className="btn-primary">
                Start exploring <ArrowRight className="size-4" />
              </button>
              <button onClick={flyToRegion} className="btn">
                <Satellite className="size-4" /> Central Amazon case study
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* selection panel */}
      <AnimatePresence>
        {!intro && (
          <motion.aside
            key="panel"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.6, ease }}
            className={`glass absolute inset-x-4 bottom-28 z-20 p-5 sm:inset-x-auto sm:right-4 sm:top-24 sm:bottom-auto sm:w-[360px] ${variable ? "hidden sm:block" : ""}`}
            aria-live="polite"
          >
            {draw.status !== "off" || (area && !selection) ? (
              <AreaPanel
                draw={draw}
                area={area}
                stats={stats}
                onClose={() => useExplorer.getState().closeShape()}
                onUndo={() => useExplorer.getState().undo()}
                onCancel={() => useExplorer.getState().cancelDraw()}
                onConfirm={confirmArea}
                onEdit={() => useExplorer.getState().editArea()}
                onNew={startDraw}
                onClear={clear}
              />
            ) : (<>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">
              <MapPin className="size-4" /> Step 1 · Study location
            </div>

            <AnimatePresence mode="wait">
              {!selection ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="mt-3 text-lg font-semibold">Click anywhere on Earth</h2>
                  <p className="mt-1 text-sm text-muted">
                    Drag to rotate · scroll or pinch to zoom. The dashed cyan box marks where processed
                    NASA data is available.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={startDraw} className="btn-primary flex-1 justify-center">
                      <Hexagon className="size-4" /> Select area
                    </button>
                    <button onClick={flyToRegion} className="btn flex-1 justify-center">
                      <Satellite className="size-4" /> Data region
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`${selection.lat},${selection.lng}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="mt-3 text-lg font-semibold">
                    {selection.country ?? (selection.surface === "water" ? "Ocean / sea" : "Selected point")}
                  </h2>
                  <dl className="mt-3 divide-y divide-line/60 text-sm">
                    <Row k="Latitude" v={<span className="font-mono">{fmtCoord(selection.lat, "N", "S")}</span>} />
                    <Row k="Longitude" v={<span className="font-mono">{fmtCoord(selection.lng, "E", "W")}</span>} />
                    <Row
                      k="Surface"
                      v={
                        selection.surface === "land" ? <Tag tone="green">Land</Tag>
                        : selection.surface === "water" ? <Tag tone="blue">Water</Tag>
                        : <Tag tone="muted">Click map to detect</Tag>
                      }
                    />
                    <Row
                      k="Hemisphere"
                      v={`${selection.lat >= 0 ? "Northern" : "Southern"} · ${selection.lng >= 0 ? "Eastern" : "Western"}`}
                    />
                    <Row
                      k="NASA data coverage"
                      v={<Tag tone="cyan">{region ? "Global + 0.1° high-res" : "Global 0.5° · 2001–2024"}</Tag>}
                    />
                  </dl>
                  <p className="mt-3 text-xs text-muted">
                    {region
                      ? `Inside the ${region.label} case study: also has 0.1° high-resolution maps.`
                      : "Rain, vegetation, surface and air temperature and humidity from NASA's global grids. Confirm to analyse it."}
                  </p>

                  <div className="mt-4 flex gap-2">
                    {isConfirmed ? (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green/40 bg-green/10 px-4 py-2.5 text-sm font-semibold text-green"
                      >
                        <Check className="size-4" /> Study zone confirmed
                      </motion.div>
                    ) : (
                      <button onClick={doConfirm} className="btn-primary flex-1 justify-center">
                        <Check className="size-4" /> Confirm study zone
                      </button>
                    )}
                    <button onClick={clear} className="btn" aria-label="Clear selection">
                      <X className="size-4" />
                    </button>
                  </div>
                  {isConfirmed && (
                    <p className="mt-3 text-center text-xs text-muted">
                      Analysis of this point is open on the left. Switch layers below to change the variable.
                    </p>
                  )}
                  <button onClick={startDraw} className="btn mt-3 w-full justify-center">
                    <Hexagon className="size-4" /> Draw an area instead
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            </>)}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* coordinate search */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: hideSearch ? 30 : 0, opacity: hideSearch ? 0 : 1, pointerEvents: hideSearch ? "none" : "auto" }}
        transition={{ duration: 0.7, delay: 0.5, ease }}
        className="glass absolute left-4 top-24 z-20 hidden w-80 p-3 md:block"
      >
        <label htmlFor="coords" className="flex items-center gap-2 text-xs text-muted">
          <Crosshair className="size-3.5" /> Go to coordinates (lat, lon)
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="coords"
            value={coords}
            onChange={(e) => setCoords(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToCoords()}
            placeholder="e.g. -3.1, -60.0"
            className="w-full rounded-lg border border-line bg-deep px-3 py-2 font-mono text-sm outline-none transition focus:border-cyan"
          />
          <button onClick={goToCoords} className="btn px-3" aria-label="Go">
            <Search className="size-4" />
          </button>
        </div>
      </motion.div>

      {/* NASA data: insight panel (left) + timeline dock (bottom) */}
      <AnimatePresence>
        {!intro && layerMeta && manifest && (
          <InsightPanel key={`${scope}-${layerMeta.key}`} scope={scope} meta={layerMeta} regionLabel={manifest.region.label} />
        )}
      </AnimatePresence>
      {!intro && <DataDock manifest={manifest} />}

      {/* globe controls */}
      <motion.div
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.6, ease }}
        className="absolute right-4 top-24 z-20 flex flex-col gap-2 sm:top-auto sm:bottom-4"
      >
        <IconBtn label="Zoom in" onClick={() => api.current?.zoom(0.7)}><Plus className="size-5" /></IconBtn>
        <IconBtn label="Zoom out" onClick={() => api.current?.zoom(1.4)}><Minus className="size-5" /></IconBtn>
        <IconBtn label={spinning ? "Pause rotation" : "Resume rotation"} onClick={toggleSpin}>
          {spinning ? <Pause className="size-5" /> : <Play className="size-5" />}
        </IconBtn>
        <IconBtn
          label={imagery === "day" ? "Show night lights" : "Show daytime imagery"}
          onClick={() => setImagery((m) => (m === "day" ? "night" : "day"))}
        >
          {imagery === "day" ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </IconBtn>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className="glass absolute left-1/2 top-24 z-40 -translate-x-1/2 px-4 py-2.5 text-sm"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

const tones = {
  green: "bg-green/15 text-green",
  blue: "bg-blue/20 text-blue-300",
  cyan: "bg-cyan/15 text-cyan",
  amber: "bg-amber/15 text-amber",
  muted: "bg-line/50 text-muted",
} as const;

function Tag({ tone, children }: { tone: keyof typeof tones; children: React.ReactNode }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="glass grid size-11 place-items-center !rounded-xl text-ink transition-colors hover:border-cyan hover:text-cyan"
    >
      {children}
    </motion.button>
  );
}
