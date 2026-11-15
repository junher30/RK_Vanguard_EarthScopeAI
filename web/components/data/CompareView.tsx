"use client";

// Comparador "antes / después" con cortina: el mismo mapa NASA en dos años, uno a cada lado de
// una línea que se arrastra (mouse, dedo o flechas del teclado). Solo muestra imágenes y cifras
// que ya calculó el backend (mapas PNG y series anuales): la web no calcula nada nuevo.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ArrowLeftRight, X } from "lucide-react";
import { fmt, gradient, loadSeries, mapUrl, type MapMode, type Scope, type Series, type VariableMeta } from "@/lib/data";
import { units, useT, varShort } from "@/lib/i18n";
import { readingWords } from "@/lib/readings";

export default function CompareView({
  scope, meta, initialMode, onClose,
}: {
  scope: Scope;
  meta: VariableMeta;
  initialMode: MapMode;
  onClose: () => void;
}) {
  const t = useT();
  const years = meta.years;
  const [a, setA] = useState(years[0]);
  const [b, setB] = useState(years[years.length - 1]);
  const [mode, setMode] = useState<MapMode>(initialMode === "trend" ? "value" : initialMode);
  const [pos, setPos] = useState(50); // % de la cortina
  const [series, setSeries] = useState<Series | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    let live = true;
    loadSeries(scope, meta.key).then((s) => live && setSeries(s)).catch(() => {});
    return () => { live = false; };
  }, [scope, meta.key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
      if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  // recorte del mapa base mundial (equirectangular) a los límites de la capa
  const bd = meta.bounds;
  const w = bd.lon_max - bd.lon_min, h = bd.lat_max - bd.lat_min;
  const bg = {
    backgroundImage: "url(/textures/earth-blue-marble.jpg)",
    backgroundSize: `${(360 / w) * 100}% ${(180 / h) * 100}%`,
    backgroundPosition: `${w >= 360 ? 0 : ((bd.lon_min + 180) / (360 - w)) * 100}% ${h >= 180 ? 0 : ((90 - bd.lat_max) / (180 - h)) * 100}%`,
  };

  const val = (y: number) => series?.annual.find(([yy]) => yy === y)?.[1] ?? null;
  const va = val(a), vb = val(b);
  const diff = va !== null && vb !== null ? vb - va : null;
  const words = readingWords(meta.key);
  const scale = meta.scale[mode === "anomaly" ? "anomaly" : "value"];
  const u = units(meta.units);
  const where = scope === "global" ? t("el planeta", "the planet") : t("la Amazonía central", "the central Amazon");

  // portal al <body>: el panel ocupa toda la pantalla aunque se abra desde la barra de capas
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-label={t("Comparar dos años", "Compare two years")}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="holo-panel w-full max-w-5xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <ArrowLeftRight className="size-4 text-cyan" />
          <b className="text-ink">{t("Antes / después", "Before / after")} · {varShort(meta.key, meta.short)}</b>
          <div className="flex rounded-lg border border-line p-0.5 text-xs">
            {(["value", "anomaly"] as MapMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 ${mode === m ? "bg-panel text-cyan" : "text-muted hover:text-ink"}`}>
                {m === "value" ? t("Media anual", "Annual mean") : t("Anomalía", "Anomaly")}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-xs text-muted">
            {t("Izquierda", "Left")}
            <select value={a} onChange={(e) => setA(+e.target.value)} className="rounded border border-line bg-deep px-1.5 py-1 text-ink">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs text-muted">
            {t("Derecha", "Right")}
            <select value={b} onChange={(e) => setB(+e.target.value)} className="rounded border border-line bg-deep px-1.5 py-1 text-ink">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <button onClick={onClose} className="ml-auto text-muted hover:text-ink" aria-label={t("Cerrar", "Close")}><X className="size-5" /></button>
        </div>

        {/* mapas con cortina */}
        <div
          ref={box}
          className="relative mt-3 w-full cursor-ew-resize select-none overflow-hidden rounded-lg border border-line"
          style={{ aspectRatio: `${w} / ${h}`, maxHeight: "62vh", ...bg }}
          onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); move(e.clientX); }}
          onPointerMove={(e) => dragging.current && move(e.clientX)}
          onPointerUp={() => { dragging.current = false; }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mapUrl(scope, meta.key, mode, b)} alt={`${meta.label} ${b}`} draggable={false}
            className="absolute inset-0 size-full opacity-90" style={{ imageRendering: "auto" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mapUrl(scope, meta.key, mode, a)} alt={`${meta.label} ${a}`} draggable={false}
            className="absolute inset-0 size-full opacity-90" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
          <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
            <div className="h-full w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]" />
            <div className="absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[#03121f] text-white">
              <ArrowLeftRight className="size-4" />
            </div>
          </div>
          <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-sm font-bold text-white">{a}</span>
          <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-sm font-bold text-white">{b}</span>
        </div>

        {/* leyenda en palabras + lectura simple */}
        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="h-2 rounded-full" style={{ background: gradient(scale.colors) }} />
            <div className="mt-1 flex justify-between text-muted">
              <span>{mode === "anomaly" ? t(words.lessEs, words.lessEn) : t(words.lowEs, words.lowEn)}</span>
              <span className="font-mono">{u}</span>
              <span>{mode === "anomaly" ? t(words.moreEs, words.moreEn) : t(words.highEs, words.highEn)}</span>
            </div>
          </div>
          <p className="leading-relaxed text-ink">
            {va !== null && vb !== null && diff !== null ? (
              <>
                {t(`Promedio de ${where}: `, `Average over ${where}: `)}
                <b>{fmt(va, meta.decimals)} {u}</b> ({a}) → <b>{fmt(vb, meta.decimals)} {u}</b> ({b}),{" "}
                <b className={diff === 0 ? "" : "text-cyan"}>{diff >= 0 ? "+" : ""}{fmt(diff, meta.decimals)} {u}</b>.{" "}
                <span className="text-muted">
                  {t("Arrastra la línea para comparar zona por zona. Dos años sueltos pueden diferir por variabilidad natural; la tendencia de 24 años está en el panel de análisis.",
                    "Drag the line to compare place by place. Two single years can differ by natural variability; the 24-year trend is in the analysis panel.")}
                </span>
              </>
            ) : (
              <span className="text-muted">{t("Arrastra la línea para comparar los dos años.", "Drag the line to compare the two years.")}</span>
            )}
          </p>
        </div>
        <p className="mt-2 text-[10px] text-muted">{meta.dataset} · {t("medias anuales", "annual means")} · {t("celdas sin dato: transparentes", "cells without data: transparent")}</p>
      </div>
    </motion.div>,
    document.body,
  );
}
