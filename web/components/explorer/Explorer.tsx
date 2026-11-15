"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, BookOpen, Check, CircleHelp, Share2, Clapperboard, Crosshair, Flame, Hexagon, MapPin, Minus, Moon, Pause, Play, Plus, Satellite, Search, Sun, X,
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
import ChatPanel from "@/components/chat/ChatPanel";
import AssistantButton from "@/components/chat/AssistantButton";
import CallBar, { CallButton } from "@/components/chat/CallBar";
import Tutorial from "@/components/chat/Tutorial";
import XRButtons from "@/components/xr/XRButtons";
import SatelliteCard from "./SatelliteCard";
import SatelliteLegend, { DEFAULT_SAT_FILTER, type SatFilter } from "./SatelliteLegend";
import { LAYER_PRODUCT, loadSatellites, satPosition, type Sat } from "@/lib/satellites";
import { useAssistant } from "@/lib/assistant";
import { setActionRunner, type AgentAction } from "@/lib/agentActions";
import { LangToggle, initLang, tr, useT, varShort } from "@/lib/i18n";
import { forecastUrl, futureYears, loadForecast, useForecast } from "@/lib/forecast";
import { useEvents, type GeoEvent } from "@/lib/events";
import EventCard, { EventLegend } from "./EventCard";
import StoryPlayer, { StoryMenu } from "@/components/story/StoryPlayer";
import { useStory } from "@/lib/stories";
import { applyShared, shareUrl } from "@/lib/share";
import Methodology from "./Methodology";
import EasterEggs from "./EasterEggs";

const EarthGlobe = dynamic(() => import("@/components/globe/EarthGlobe"), { ssr: false });

const ease = [0.22, 1, 0.36, 1] as const;

export default function Explorer() {
  const { selection, zone, area, draw, select, clear, confirm } = useExplorer();
  const t = useT();
  useEffect(() => { initLang(); loadForecast(); }, []);
  const fc = useForecast();
  const api = useRef<GlobeApi | null>(null);
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(true);
  const [spinning, setSpinning] = useState(true);
  const [imagery, setImagery] = useState<Imagery>("day");
  const [showSats, setShowSats] = useState(true);
  const [sat, setSat] = useState<Sat | null>(null);
  const [follow, setFollow] = useState(false);
  const [satFilter, setSatFilter] = useState<SatFilter>(DEFAULT_SAT_FILTER);
  const ev = useEvents();
  const storyOn = useStory((st) => !!st.story);
  useEffect(() => useStory.subscribe((st, prev) => { if (st.story && !prev.story) setIntro(false); }), []);
  const [event, setEvent] = useState<GeoEvent | null>(null);
  const [method, setMethod] = useState(false);

  // seguir al satélite: la cámara lo acompaña
  useEffect(() => {
    if (!sat || !follow) return;
    const go = () => {
      const p = satPosition(sat);
      if (p) api.current?.flyTo(p.lat, p.lng, 1.4);
    };
    go();
    const id = setInterval(go, 1500);
    return () => clearInterval(id);
  }, [sat, follow]);
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
        setToast(scope === "global" ? tr("Las capas globales aún no están exportadas.", "Global layers not exported yet.") : tr("Capas NASA no disponibles.", "NASA data layers unavailable."));
      });
    return () => { live = false; };
  }, [scope]);

  const layerMeta = manifest?.variables.find((v) => v.key === variable) ?? null;

  // qué satélites se dibujan: filtros por rol de la leyenda y "solo las fuentes de la capa activa"
  const satVisible = useCallback((s: Sat) => {
    if (!satFilter.roles[s.role]) return false;
    if (satFilter.onlyLayer && variable) {
      const p = LAYER_PRODUCT[variable];
      return !!p && s.products.includes(p);
    }
    return true;
  }, [satFilter, variable]);
  const pickSatellite = useCallback((norad: number) => {
    loadSatellites().then((list) => {
      const s = list.find((x) => x.norad === norad);
      if (!s) return;
      setSat(s); setFollow(false); setIntro(false);
      api.current?.setSpin(false); setSpinning(false);
      const p = satPosition(s);
      if (p) api.current?.flyTo(p.lat, p.lng, 2.2);
    });
  }, []);

  useEffect(() => {
    if (!manifest) return;
    const st = useLayer.getState();
    if (st.variable && !manifest.variables.some((v) => v.key === st.variable)) st.setVariable(null);
    const meta = manifest.variables.find((v) => v.key === st.variable);
    if (meta && st.mode === "trend" && !meta.scale.trend) st.setMode("value");
    const last = meta?.years[meta.years.length - 1] ?? 2024;
    const future = st.mode === "value" && futureYears(meta?.key ?? null, last).includes(st.year);
    if (meta && !meta.years.includes(st.year) && !future) st.setYear(last);
  }, [manifest, variable, fc.available]);

  const overlay = useMemo<DataOverlay | null>(() => {
    if (!layerMeta) return null;
    const last = layerMeta.years[layerMeta.years.length - 1];
    const fut = mode === "value" && scope === "global" && fc.available && fc.variables.includes(layerMeta.key)
      ? fc.years.filter((y) => y > last) : [];
    const isFuture = fut.includes(year);
    const url = (y: number) => (y > last ? forecastUrl(layerMeta.key, y, layerMeta.scale.value) : mapUrl(scope, layerMeta.key, mode, y));
    return {
      url: url(year),
      future: isFuture,
      preload: mode === "trend" ? [] : [...layerMeta.years, ...fut].map(url),
      bounds: layerMeta.bounds,
      scale: (mode === "trend" ? layerMeta.scale.trend : layerMeta.scale[mode]) ?? layerMeta.scale.value,
      decimals: layerMeta.decimals,
      units: layerMeta.units + (mode === "trend" ? tr(" / década", " / decade") : ""),
      signed: mode !== "value",
      faded: mode === "trend",
      caption: `${varShort(layerMeta.key, layerMeta.short)} · ${isFuture ? `${tr("proyección IA (experimental)", "AI projection (experimental)")} ${year}` : mode === "trend" ? tr("tendencia", "trend") : mode === "anomaly" ? `${tr("anomalía", "anomaly")} ${year}` : `${tr("media", "mean")} ${year}`}`,
      rain: layerMeta.key === "precip_mm_day" && mode === "value",
    };
  }, [layerMeta, scope, mode, year, fc]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    Promise.resolve(useExplorer.persist.rehydrate()).then(() => {
      const { zone: z, area: a } = useExplorer.getState();
      if (z) {
        useExplorer.getState().select(z);
        setIntro(false);
        api.current?.flyTo(z.lat, z.lng, 1.4);
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
    // un enlace compartido abre la vista exacta
    if (applyShared()) setIntro(false);
  }, []);
  const eggFly = useCallback((lat: number, lng: number, alt?: number) => {
    setIntro(false); setSpinning(false); api.current?.setSpin(false); api.current?.flyTo(lat, lng, alt);
  }, []);
  const eggNight = useCallback(() => setImagery("night"), []);
  const onBordersError = useCallback(() => setToast(tr("Fronteras no disponibles. Las coordenadas siguen funcionando.", "Country borders unavailable. Coordinates still work.")), []);

  const onSelect = (s: Parameters<typeof select>[0]) => {
    select(s);
    setSpinning(false);
    api.current?.flyTo(s.lat, s.lng);
  };

  const goToCoords = () => {
    const m = coords.split(/[,;\s]+/).filter(Boolean).map(Number);
    if (m.length < 2 || m.some(Number.isNaN) || Math.abs(m[0]) > 90 || Math.abs(m[1]) > 180) {
      setToast(tr("Coordenadas no válidas: latitud −90…90, longitud −180…180", "Enter valid coordinates: latitude −90…90, longitude −180…180"));
      return;
    }
    const region = DATA_REGIONS.find(
      (r) => m[0] >= r.latMin && m[0] <= r.latMax && m[1] >= r.lonMin && m[1] <= r.lonMax,
    );
    onSelect({ lat: m[0], lng: m[1], surface: "unknown", country: null, regionKey: region?.key ?? null });
  };

  // acciones que pide el asistente: volar, marcar un punto y cambiar la capa
  useEffect(() => {
    setActionRunner((actions: AgentAction[]) => {
      setIntro(false);
      if (!actions.some((a) => a.type === "spin")) {
        setSpinning(false);
        api.current?.setSpin(false);
      }
      for (const a of actions) {
        if (a.type === "fly") {
          api.current?.flyTo(a.lat, a.lng, a.altitude);
        } else if (a.type === "select") {
          const region = DATA_REGIONS.find(
            (r) => a.lat >= r.latMin && a.lat <= r.latMax && a.lng >= r.lonMin && a.lng <= r.lonMax,
          );
          const st = useExplorer.getState();
          st.select({ lat: a.lat, lng: a.lng, surface: "unknown", country: null, regionKey: region?.key ?? null });
          st.confirm();
          const L = useLayer.getState();
          L.setScope("global");
          if (!L.variable) L.setVariable("precip_mm_day");
        } else if (a.type === "zoom") {
          api.current?.zoom(a.dir === "in" ? 0.7 : 1.4);
        } else if (a.type === "spin") {
          api.current?.setSpin(a.on);
          setSpinning(a.on);
        } else if (a.type === "imagery") {
          setImagery(a.mode);
        } else if (a.type === "play") {
          const L = useLayer.getState();
          if (a.on && !L.variable) L.setVariable("precip_mm_day");
          if (a.on && L.mode === "trend") L.setMode("value");
          L.setPlaying(a.on);
        } else if (a.type === "scope") {
          const L = useLayer.getState();
          if (a.scope === "amazon") {
            const c = regionCenter(DATA_REGIONS[0]);
            api.current?.flyTo(c.lat, c.lng, 1.1);
            L.setScope("amazon");
            if (!L.variable) L.setVariable("precip_mm_day");
          } else {
            L.setScope("global");
          }
        } else if (a.type === "hide") {
          useLayer.getState().setPlaying(false);
          useLayer.getState().setVariable(null);
        } else if (a.type === "clear") {
          useExplorer.getState().clear();
        } else if (a.type === "events") {
          useEvents.getState().setOn(a.on);
        } else if (a.type === "tour") {
          useAssistant.getState().setTour(true);
        } else if (a.type === "layer") {
          const L = useLayer.getState();
          L.setScope(a.scope ?? "global");
          L.setPlaying(false);
          L.setVariable(a.variable);
          L.setMode(a.play && a.mode === "trend" ? "value" : a.mode);
          if (a.year) L.setYear(a.year);
          if (a.play) L.setPlaying(true);
        }
      }
    });
    return () => setActionRunner(null);
  }, []);

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

  const showAnalysis = () => {
    const L = useLayer.getState();
    L.setScope("global");
    if (!L.variable) L.setVariable("precip_mm_day");
  };
  const doConfirm = () => {
    if (confirm()) {
      setToast(tr("Zona guardada: analizando sus datos NASA.", "Study zone saved — analysing NASA data for it."));
      showAnalysis();
    }
  };

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
      setToast(tr("Área guardada: analizando sus datos NASA.", "Study area saved — analysing NASA data for it."));
      showAnalysis();
    }
  };

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

  const hideSearch = intro || !!variable || storyOn;
  const region = selection?.regionKey ? DATA_REGIONS.find((r) => r.key === selection.regionKey) : null;
  const isConfirmed = !!zone && !!selection && zone.lat === selection.lat && zone.lng === selection.lng;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-space bg-[url(/textures/night-sky.png)] bg-cover bg-center text-ink">
      <motion.div
        className="absolute inset-0"
        aria-label="3D globe"
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
          showSats={showSats}
          satVisible={satVisible}
          selectedSat={sat?.norad ?? null}
          events={ev.on ? ev.events : undefined}
          onEvent={(e) => { setEvent(e); setSat(null); setIntro(false); api.current?.setSpin(false); setSpinning(false); api.current?.flyTo(e.lat, e.lng, 1.3); }}
          onSatellite={(s) => { setSat(s); setFollow(false); setIntro(false); api.current?.setSpin(false); setSpinning(false); }}
        />
      </motion.div>

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
              <span className="text-sm tracking-wide">{t("Cargando la Tierra…", "Loading Earth…")}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StoryPlayer />
      <StoryMenu />
      <Methodology open={method} onClose={() => setMethod(false)} manifest={manifest} />
      {!intro && ready && !storyOn && <AssistantButton />}
      {!intro && ready && <Tutorial />}
      {!intro && <CallBar />}

      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease }}
        className="glass absolute inset-x-4 top-4 z-30 flex items-center justify-between gap-4 px-5 py-3"
      >
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full bg-cyan shadow-[0_0_14px_#22d3ee]" />
          <b className="tracking-wide">EarthScope AI</b>
          <span className="hidden text-sm text-muted xl:inline">{t("Laboratorio de investigación planetaria", "Planetary Investigation Lab")}</span>
        </div>
        <div className="flex items-center gap-3">
          <StepRail active={zone || area ? 2 : 1} />
          <LangToggle />
          <XRButtons />
          {!intro && (
            <button onClick={() => useStory.getState().setMenu(true)} className="btn" title={t("Historias narradas", "Narrated stories")}>
              <Clapperboard className="size-4" /> <span className="hidden lg:inline">{t("Historias", "Stories")}</span>
            </button>
          )}
          {!intro && <CallButton />}
          {!intro && <ChatPanel />}
        </div>
      </motion.header>

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
              {t("No solo observes cómo cambia la Tierra.", "Don't just observe Earth's changes.")}
              <span className="block bg-gradient-to-r from-cyan via-green to-blue bg-clip-text text-transparent">
                {t("Investígalo.", "Investigate them.")}
              </span>
            </h1>
            <p className="mt-4 max-w-md text-muted">
              {t("Elige cualquier lugar del planeta, detecta tendencias, explora una proyección experimental de IA y comprueba cada conclusión con datos de satélites NASA.",
                "Pick any place on the planet, detect trends, explore an experimental AI projection and trace every conclusion back to NASA satellite data.")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => { setIntro(false); }} className="btn-primary">
                {t("Empezar a explorar", "Start exploring")} <ArrowRight className="size-4" />
              </button>
              <button onClick={() => { setIntro(false); useStory.getState().setMenu(true); }} className="btn">
                <Clapperboard className="size-4" /> {t("Ver una historia", "Watch a story")}
              </button>
              <button onClick={flyToRegion} className="btn">
                <Satellite className="size-4" /> {t("Caso de estudio: Amazonía", "Central Amazon case study")}
              </button>
            </div>
            <div className="mt-4">
              <XRButtons big />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!intro && !storyOn && (
          <motion.aside
            key="panel"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.6, ease }}
            className={`glass absolute inset-x-4 bottom-28 z-20 p-5 sm:inset-x-auto sm:right-[68px] sm:top-24 sm:bottom-auto sm:w-[360px] ${variable ? "hidden sm:block" : ""}`}
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
              <MapPin className="size-4" /> {t("Paso 1 · Lugar de estudio", "Step 1 · Study location")}
            </div>

            <AnimatePresence mode="wait">
              {!selection ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="mt-3 text-lg font-semibold">{t("Haz clic en cualquier lugar de la Tierra", "Click anywhere on Earth")}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {t("Arrastra para girar · rueda o pellizca para acercar. El recuadro cian marca el caso de estudio en alta resolución.",
                      "Drag to rotate · scroll or pinch to zoom. The dashed cyan box marks the high-resolution case study.")}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={startDraw} className="btn-primary flex-1 justify-center">
                      <Hexagon className="size-4" /> {t("Seleccionar área", "Select area")}
                    </button>
                    <button onClick={flyToRegion} className="btn flex-1 justify-center">
                      <Satellite className="size-4" /> {t("Región de datos", "Data region")}
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
                    {selection.country ?? (selection.surface === "water" ? t("Océano / mar", "Ocean / sea") : t("Punto seleccionado", "Selected point"))}
                  </h2>
                  <dl className="mt-3 divide-y divide-line/60 text-sm">
                    <Row k={t("Latitud", "Latitude")} v={<span className="font-mono">{fmtCoord(selection.lat, "N", "S")}</span>} />
                    <Row k={t("Longitud", "Longitude")} v={<span className="font-mono">{fmtCoord(selection.lng, "E", "W")}</span>} />
                    <Row
                      k={t("Superficie", "Surface")}
                      v={
                        selection.surface === "land" ? <Tag tone="green">{t("Tierra", "Land")}</Tag>
                        : selection.surface === "water" ? <Tag tone="blue">{t("Agua", "Water")}</Tag>
                        : <Tag tone="muted">{t("Haz clic para detectar", "Click map to detect")}</Tag>
                      }
                    />
                    <Row
                      k={t("Hemisferio", "Hemisphere")}
                      v={`${selection.lat >= 0 ? t("Norte", "Northern") : t("Sur", "Southern")} · ${selection.lng >= 0 ? t("Oriental", "Eastern") : t("Occidental", "Western")}`}
                    />
                    <Row
                      k={t("Cobertura NASA", "NASA data coverage")}
                      v={<Tag tone="cyan">{region ? t("Global + 0.1° alta resolución", "Global + 0.1° high-res") : "Global 0.5° · 2001–2024"}</Tag>}
                    />
                  </dl>
                  <p className="mt-3 text-xs text-muted">
                    {region
                      ? t(`Dentro del caso de estudio ${region.label}: también tiene mapas de 0.1°.`, `Inside the ${region.label} case study: also has 0.1° high-resolution maps.`)
                      : t("Lluvia, vegetación, temperatura de superficie y del aire, y humedad de las grillas globales NASA. Confírmalo para analizarlo.",
                        "Rain, vegetation, surface and air temperature and humidity from NASA's global grids. Confirm to analyse it.")}
                  </p>

                  <div className="mt-4 flex gap-2">
                    {isConfirmed ? (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green/40 bg-green/10 px-4 py-2.5 text-sm font-semibold text-green"
                      >
                        <Check className="size-4" /> {t("Zona confirmada", "Study zone confirmed")}
                      </motion.div>
                    ) : (
                      <button onClick={doConfirm} className="btn-primary flex-1 justify-center">
                        <Check className="size-4" /> {t("Confirmar zona", "Confirm study zone")}
                      </button>
                    )}
                    <button onClick={clear} className="btn" aria-label={t("Borrar selección", "Clear selection")}>
                      <X className="size-4" />
                    </button>
                  </div>
                  {isConfirmed && (
                    <p className="mt-3 text-center text-xs text-muted">
                      {t("El análisis del punto está a la izquierda. Cambia la capa abajo para ver otra variable.", "Analysis of this point is open on the left. Switch layers below to change the variable.")}
                    </p>
                  )}
                  <button onClick={startDraw} className="btn mt-3 w-full justify-center">
                    <Hexagon className="size-4" /> {t("Dibujar un área", "Draw an area instead")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            </>)}
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: hideSearch ? 30 : 0, opacity: hideSearch ? 0 : 1, pointerEvents: hideSearch ? "none" : "auto" }}
        transition={{ duration: 0.7, delay: 0.5, ease }}
        className="glass absolute left-4 top-24 z-20 hidden w-80 p-3 md:block"
      >
        <label htmlFor="coords" className="flex items-center gap-2 text-xs text-muted">
          <Crosshair className="size-3.5" /> {t("Ir a coordenadas (lat, lon)", "Go to coordinates (lat, lon)")}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="coords"
            value={coords}
            onChange={(e) => setCoords(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToCoords()}
            placeholder={t("ej. -3.1, -60.0", "e.g. -3.1, -60.0")}
            className="w-full rounded-lg border border-line bg-deep px-3 py-2 font-mono text-sm outline-none transition focus:border-cyan"
          />
          <button onClick={goToCoords} className="btn px-3" aria-label={t("Ir", "Go")}>
            <Search className="size-4" />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {!intro && !storyOn && layerMeta && manifest && (
          <InsightPanel key={`${scope}-${layerMeta.key}`} scope={scope} meta={layerMeta} regionLabel={manifest.region.label} />
        )}
      </AnimatePresence>
      {!intro && <div className={storyOn ? "pointer-events-none opacity-0" : ""}><DataDock manifest={manifest} /></div>}

      <motion.div
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.6, ease }}
        className="absolute right-4 top-24 z-20 flex flex-col gap-1.5 sm:top-auto sm:bottom-4"
      >
        <IconBtn label={t("Acercar", "Zoom in")} onClick={() => api.current?.zoom(0.7)}><Plus className="size-5" /></IconBtn>
        <IconBtn label={t("Alejar", "Zoom out")} onClick={() => api.current?.zoom(1.4)}><Minus className="size-5" /></IconBtn>
        <IconBtn label={spinning ? t("Pausar rotación", "Pause rotation") : t("Reanudar rotación", "Resume rotation")} onClick={toggleSpin}>
          {spinning ? <Pause className="size-5" /> : <Play className="size-5" />}
        </IconBtn>
        <IconBtn
          label={imagery === "day" ? t("Ver luces nocturnas", "Show night lights") : t("Ver imagen de día", "Show daytime imagery")}
          onClick={() => setImagery((m) => (m === "day" ? "night" : "day"))}
        >
          {imagery === "day" ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </IconBtn>
        <IconBtn label={showSats ? t("Ocultar satélites", "Hide satellites") : t("Mostrar satélites", "Show satellites")} onClick={() => { setShowSats((v) => !v); setSat(null); setFollow(false); }}>
          <Satellite className={`size-5 ${showSats ? "text-cyan" : ""}`} />
        </IconBtn>
        <IconBtn
          label={ev.on ? t("Ocultar eventos en vivo", "Hide live events") : t("Eventos naturales en vivo (NASA)", "Live natural events (NASA)")}
          onClick={() => { ev.setOn(!ev.on); setEvent(null); setIntro(false); }}
        >
          <Flame className={`size-5 ${ev.on ? "text-orange-400" : ""}`} />
        </IconBtn>
        <IconBtn
          label={t("Copiar enlace de esta vista", "Copy a link to this view")}
          onClick={() => {
            const u = shareUrl();
            history.replaceState(null, "", u);
            navigator.clipboard?.writeText(u).then(
              () => setToast(tr("Enlace copiado: abre esta misma vista.", "Link copied: it opens this exact view.")),
              () => setToast(u),
            );
          }}
        >
          <Share2 className="size-5" />
        </IconBtn>
        <IconBtn label={t("Metodología", "Methodology")} onClick={() => setMethod(true)}>
          <BookOpen className="size-5" />
        </IconBtn>
        <IconBtn label={t("Recorrido guiado", "Guided tour")} onClick={() => { setIntro(false); useAssistant.getState().setTour(true); }}>
          <CircleHelp className="size-5" />
        </IconBtn>
      </motion.div>

      {showSats && !intro && !storyOn && (
        <SatelliteLegend
          filter={satFilter}
          onChange={setSatFilter}
          layer={variable}
          layerLabel={layerMeta ? varShort(layerMeta.key, layerMeta.short) : null}
          onPick={pickSatellite}
        />
      )}

      <AnimatePresence>
        {sat && showSats && (
          <SatelliteCard
            key={sat.norad}
            sat={sat}
            following={follow}
            onFollow={() => setFollow((f) => !f)}
            onLayer={(k) => {
              const L = useLayer.getState();
              L.setScope("global");
              L.setVariable(k);
              if (L.mode === "trend") L.setMode("value");
            }}
            onClose={() => { setSat(null); setFollow(false); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {event && ev.on && !storyOn && <EventCard key={event.id} ev={event} onClose={() => setEvent(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {ev.on && !intro && !storyOn && <EventLegend key="legend" events={ev.events} status={ev.status} />}
      </AnimatePresence>

      <EasterEggs flyTo={eggFly} night={eggNight} toast={setToast} />

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
      className="glass grid size-10 place-items-center !rounded-xl text-ink transition-colors hover:border-cyan hover:text-cyan"
    >
      {children}
    </motion.button>
  );
}
