"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { CloudRain, Droplets, EyeOff, Globe, Leaf, MapPinned, Pause, Play, Thermometer, Wind } from "lucide-react";
import { fmt, gradient, useLayer, useProbe, type Manifest, type MapMode, type Scope } from "@/lib/data";
import { units, useT, varShort } from "@/lib/i18n";
import { useForecast } from "@/lib/forecast";
import { Sparkles } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  precip_mm_day: <CloudRain className="size-4" />,
  evi: <Leaf className="size-4" />,
  lst_day_c: <Thermometer className="size-4" />,
  t2m_c: <Wind className="size-4" />,
  rh2m_pct: <Droplets className="size-4" />,
};
const ACCENT: Record<string, string> = {
  precip_mm_day: "border-blue text-blue-300 bg-blue/15",
  evi: "border-green text-green bg-green/15",
  lst_day_c: "border-red text-red bg-red/15",
  t2m_c: "border-orange-400 text-orange-300 bg-orange-400/15",
  rh2m_pct: "border-teal-400 text-teal-300 bg-teal-400/15",
};

export default function DataDock({ manifest }: { manifest: Manifest | null }) {
  const { scope, setScope, variable, mode, year, playing, setVariable, setMode, setYear, setPlaying } = useLayer();
  const t = useT();
  const meta = manifest?.variables.find((v) => v.key === variable) ?? null;
  const years = meta?.years ?? manifest?.variables[0]?.years ?? [2001, 2024];
  const first = years[0];
  const realLast = years[years.length - 1];
  const fc = useForecast();
  const future = mode === "value" && scope === "global" && meta && fc.available && fc.variables.includes(meta.key)
    ? fc.years.filter((y) => y > realLast) : [];
  const last = future.length ? future[future.length - 1] : realLast;
  const isFuture = year > realLast;
  const modes: MapMode[] = meta?.scale.trend ? ["value", "anomaly", "trend"] : ["value", "anomaly"];

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const y = useLayer.getState().year;
      useLayer.getState().setYear(y >= last ? first : y + 1);
    }, 800);
    return () => clearInterval(t);
  }, [playing, first, last]);

  const probeT = useProbe((s) => s.t);
  const scale = meta ? (mode === "trend" ? meta.scale.trend : meta.scale[mode]) : undefined;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="glass absolute bottom-4 left-4 right-4 z-30 mx-auto max-w-[620px] p-3 sm:right-[72px] sm:p-4 lg:right-4"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex rounded-lg border border-line p-0.5 text-xs">
          {([["global", "Global", <Globe key="g" className="size-3.5" />], ["amazon", t("Amazonía central", "Central Amazon"), <MapPinned key="a" className="size-3.5" />]] as [Scope, string, React.ReactNode][]).map(
            ([k, label, icon]) => (
              <button
                key={k}
                onClick={() => { setPlaying(false); setScope(k); }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${scope === k ? "bg-panel text-cyan" : "text-muted hover:text-ink"}`}
                aria-pressed={scope === k}
              >
                {icon} {label}
              </button>
            ),
          )}
        </div>
        <span className="text-[10px] text-muted">{scope === "global" ? t("0.5° · todo el planeta", "0.5° · whole planet") : t("0.1° · caso de estudio", "0.1° · case study")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{t("Capa NASA", "NASA layer")}</span>
        {!manifest && <span className="text-xs text-muted">{t("Aún no disponible aquí.", "Not available for this scope yet.")}</span>}
        {manifest?.variables.map((v) => {
          const on = v.key === variable;
          return (
            <motion.button
              key={v.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setVariable(on ? null : v.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                on ? ACCENT[v.key] : "border-line text-ink hover:border-cyan"
              }`}
              aria-pressed={on}
            >
              {ICONS[v.key]} {varShort(v.key, v.short)}
            </motion.button>
          );
        })}
        {variable && (
          <button
            onClick={() => setVariable(null)}
            className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-ink"
            aria-label={t("Ocultar capa", "Hide data layer")}
          >
            <EyeOff className="size-3.5" /> {t("Ocultar", "Hide")}
          </button>
        )}
      </div>

      {meta && scale && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
          {mode === "trend" ? (
            <p className="mt-3 text-xs text-muted">
              {t(`Cambio por década, ${first}–${realLast}. Celdas tenues: tendencia no significativa (p ≥ 0.05).`,
                `Change per decade, ${first}–${realLast}. Faded cells: trend not statistically significant (p ≥ 0.05).`)}
            </p>
          ) : (
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setPlaying(!playing)}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan text-[#03121f] shadow-[0_0_18px_rgba(34,211,238,.45)]"
              aria-label={playing ? t("Pausar", "Pause timeline") : t("Reproducir", "Play timeline")}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <div className="relative w-full">
            <input
              type="range"
              min={first}
              max={last}
              step={1}
              value={year}
              onChange={(e) => { setPlaying(false); setYear(+e.target.value); }}
              className={`timeline w-full ${isFuture ? "timeline-future" : ""}`}
              style={future.length ? {
                background: `linear-gradient(90deg, rgba(34,211,238,.6) 0%, rgba(30,58,95,.9) ${((realLast - first) / (last - first)) * 100}%, rgba(217,70,239,.75) ${((realLast - first) / (last - first)) * 100}%, rgba(217,70,239,.25) 100%)`,
              } : undefined}
              aria-label={t("Año", "Year")}
            />
            {future.length > 0 && (
              <div className="pointer-events-none mt-0.5 flex font-mono text-[9px] uppercase tracking-wider">
                <span className="text-muted" style={{ width: `${((realLast - first) / (last - first)) * 100}%` }}>
                  {t("Datos NASA", "NASA data")} {first}–{realLast}
                </span>
                <span className="flex-1 border-l border-dashed border-fuchsia-400/60 pl-1 text-fuchsia-300">
                  {t("Predicción IA", "AI forecast")}
                </span>
              </div>
            )}
            </div>
            <motion.span
              key={year}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`w-12 text-right font-mono text-lg font-semibold tabular-nums ${isFuture ? "text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,.7)]" : ""}`}
            >
              {year}
            </motion.span>
          </div>
          )}

          {isFuture && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-start gap-2 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-100"
            >
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-fuchsia-300" />
              <span>
                <b className="text-fuchsia-300">{t("Predicción de la red neuronal", "Neural network forecast")} {year}.</b>{" "}
                {t("Es una estimación, no una medición. Donde el color se desvanece, la red está menos segura.",
                  "An estimate, not a measurement. Where colors fade, the network is less certain.")}
              </span>
            </motion.div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-line p-0.5 text-xs">
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); if (m !== "value" && year > realLast) setYear(realLast); }}
                  className={`rounded-md px-2.5 py-1 transition-colors ${mode === m ? "bg-panel text-cyan" : "text-muted hover:text-ink"}`}
                >
                  {m === "value" ? t("Media anual", "Annual mean") : m === "anomaly" ? t("Anomalía", "Anomaly") : t("Tendencia", "Trend")}
                </button>
              ))}
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="relative">
                <div className="h-2 rounded-full" style={{ background: gradient(scale.colors) }} />
                {probeT !== null && (
                  <span
                    className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-white ring-2 ring-black/50"
                    style={{ left: `${probeT * 100}%` }}
                  />
                )}
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
                <span>{fmt(scale.min, meta.decimals)}</span>
                <span>{units(meta.units)}{mode === "trend" ? t(" / década", " / decade") : mode === "anomaly" ? ` vs ${first}–${realLast}` : ""}</span>
                <span>{mode !== "value" ? "+" : ""}{fmt(scale.max, meta.decimals)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
