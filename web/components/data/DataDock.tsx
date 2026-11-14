"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { CloudRain, Droplets, EyeOff, Globe, Leaf, MapPinned, Pause, Play, Thermometer, Wind } from "lucide-react";
import { fmt, gradient, useLayer, type Manifest, type MapMode, type Scope } from "@/lib/data";

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
  const meta = manifest?.variables.find((v) => v.key === variable) ?? null;
  const years = meta?.years ?? manifest?.variables[0]?.years ?? [2001, 2024];
  const first = years[0];
  const last = years[years.length - 1];
  const modes: MapMode[] = meta?.scale.trend ? ["value", "anomaly", "trend"] : ["value", "anomaly"];

  // timeline playback: one year every 0.8 s, looping
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const y = useLayer.getState().year;
      useLayer.getState().setYear(y >= last ? first : y + 1);
    }, 800);
    return () => clearInterval(t);
  }, [playing, first, last]);

  const scale = meta ? (mode === "trend" ? meta.scale.trend : meta.scale[mode]) : undefined;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="glass absolute bottom-4 left-4 right-4 z-30 mx-auto max-w-[620px] p-3 sm:right-[72px] sm:p-4 lg:right-4"
    >
      {/* scope */}
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex rounded-lg border border-line p-0.5 text-xs">
          {([["global", "Global", <Globe key="g" className="size-3.5" />], ["amazon", "Central Amazon", <MapPinned key="a" className="size-3.5" />]] as [Scope, string, React.ReactNode][]).map(
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
        <span className="text-[10px] text-muted">{scope === "global" ? "0.5° · whole planet" : "0.1° · case study"}</span>
      </div>

      {/* variable chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">NASA layer</span>
        {!manifest && <span className="text-xs text-muted">Not available for this scope yet.</span>}
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
              {ICONS[v.key]} {v.short}
            </motion.button>
          );
        })}
        {variable && (
          <button
            onClick={() => setVariable(null)}
            className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-ink"
            aria-label="Hide data layer"
          >
            <EyeOff className="size-3.5" /> Hide
          </button>
        )}
      </div>

      {meta && scale && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
          {/* timeline */}
          {mode === "trend" ? (
            <p className="mt-3 text-xs text-muted">
              Change per decade, {first}–{last}. Faded cells: trend not statistically significant (p ≥ 0.05).
            </p>
          ) : (
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setPlaying(!playing)}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan text-[#03121f] shadow-[0_0_18px_rgba(34,211,238,.45)]"
              aria-label={playing ? "Pause timeline" : "Play timeline"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <input
              type="range"
              min={first}
              max={last}
              step={1}
              value={year}
              onChange={(e) => { setPlaying(false); setYear(+e.target.value); }}
              className="timeline w-full"
              aria-label="Year"
            />
            <motion.span
              key={year}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-12 text-right font-mono text-lg font-semibold tabular-nums"
            >
              {year}
            </motion.span>
          </div>
          )}

          {/* mode + legend */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-line p-0.5 text-xs">
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${mode === m ? "bg-panel text-cyan" : "text-muted hover:text-ink"}`}
                >
                  {m === "value" ? "Annual mean" : m === "anomaly" ? "Anomaly" : "Trend"}
                </button>
              ))}
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="h-2 rounded-full" style={{ background: gradient(scale.colors) }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
                <span>{fmt(scale.min, meta.decimals)}</span>
                <span>{meta.units}{mode === "trend" ? " / decade" : mode === "anomaly" ? ` vs ${first}–${last}` : ""}</span>
                <span>{mode !== "value" ? "+" : ""}{fmt(scale.max, meta.decimals)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
