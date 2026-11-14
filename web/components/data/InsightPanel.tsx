"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, ExternalLink, Hexagon, Loader2, MapPin, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmt, loadSeries, useLayer, type Scope, type Series, type VariableMeta } from "@/lib/data";
import { analyzeArea, type AreaInfo, type AreaTarget } from "@/lib/api";
import { useExplorer } from "@/lib/store";

const COLOR: Record<string, string> = {
  precip_mm_day: "#3b82f6", evi: "#34d399", lst_day_c: "#f87171", t2m_c: "#fb923c", rh2m_pct: "#2dd4bf",
};

export default function InsightPanel({ scope, meta, regionLabel }: { scope: Scope; meta: VariableMeta; regionLabel: string }) {
  const { year, mode, setYear, setPlaying } = useLayer();
  const [scopeSeries, setScopeSeries] = useState<Series | null>(null);

  // the visitor's confirmed area or point (Documento 02, CU-07)
  const area = useExplorer((s) => s.area);
  const zone = useExplorer((s) => s.zone);
  const target = useMemo<AreaTarget | null>(
    () => (area ? { geometry: area.geometry } : zone ? { point: { lat: zone.lat, lng: zone.lng } } : null),
    [area, zone],
  );
  const [source, setSource] = useState<"area" | "scope">("area");
  type Result = { status: "ok"; series: Series; info: AreaInfo } | { status: "empty" | "error"; message: string };
  const reqKey = target ? `${meta.key}|${JSON.stringify(target)}` : "";
  const [result, setResult] = useState<{ key: string; r: Result } | null>(null);
  // a result for another request means the current one is still loading
  const areaState: Result | { status: "loading" } = result && result.key === reqKey ? result.r : { status: "loading" };
  const useArea = !!target && source === "area";

  useEffect(() => {
    let live = true;
    loadSeries(scope, meta.key).then((s) => live && setScopeSeries(s)).catch(() => live && setScopeSeries(null));
    return () => { live = false; };
  }, [scope, meta.key]);

  useEffect(() => {
    if (!target) return;
    let live = true;
    const key = reqKey;
    analyzeArea(meta.key, target)
      .then((r) => {
        if (!live) return;
        setResult({ key, r: r.ok ? { status: "ok", series: r, info: r.area } : { status: "empty", message: r.reason } });
      })
      .catch((e: Error) => live && setResult({
        key,
        r: {
          status: "error",
          message: e.name === "AbortError" || e.message.includes("fetch")
            ? "The analysis server is offline. Start it with: .venv/bin/uvicorn api.main:app --port 8000"
            : e.message,
        },
      }));
    return () => { live = false; };
  }, [target, meta.key, reqKey]);

  const series = useArea ? (areaState.status === "ok" ? areaState.series : null) : scopeSeries;
  const areaLabel = area
    ? `Your area · ${area.properties.areaKm2 ? `${Number(area.properties.areaKm2).toLocaleString("en-US")} km²` : "polygon"}`
    : zone ? `Your point · ${zone.lat.toFixed(2)}, ${zone.lng.toFixed(2)}` : "";

  const header = (
    <>
      {target && (
        <div className="mb-3 flex rounded-lg border border-line p-0.5 text-xs">
          <button
            onClick={() => setSource("area")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 ${source === "area" ? "bg-panel text-cyan" : "text-muted hover:text-ink"}`}
          >
            {area ? <Hexagon className="size-3.5" /> : <MapPin className="size-3.5" />} {area ? "Your area" : "Your point"}
          </button>
          <button
            onClick={() => setSource("scope")}
            className={`flex-1 rounded-md px-2 py-1 ${source === "scope" ? "bg-panel text-cyan" : "text-muted hover:text-ink"}`}
          >
            {scope === "global" ? "Whole planet" : "Central Amazon"}
          </button>
        </div>
      )}
    </>
  );

  const shell = (children: React.ReactNode) => (
    <motion.aside
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -40, opacity: 0 }}
      className="glass absolute left-4 top-24 z-20 hidden w-[380px] p-5 md:block"
    >
      {header}
      {children}
    </motion.aside>
  );

  if (useArea && areaState.status !== "ok") {
    return shell(
      areaState.status === "loading" ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Analysing {meta.label.toLowerCase()} in your area…
        </div>
      ) : (
        <div className={`flex gap-2 rounded-xl border p-3 text-xs ${areaState.status === "empty" ? "border-line text-muted" : "border-amber/40 bg-amber/10 text-amber"}`}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> <span>{areaState.message}</span>
        </div>
      ),
    );
  }
  if (!series || series.variable !== meta.key) return null;

  const color = COLOR[meta.key] ?? "#22d3ee";
  const t = series.trend;
  const line = new Map(series.trend_line);
  const data = series.annual.map(([y, v]) => ({ year: y, value: v, trend: line.get(y) }));
  const current = series.annual.find(([y]) => y === year)?.[1] ?? null;
  const delta = current === null ? null : current - t.mean;
  const sig = t.verdict.startsWith("significant");
  const up = t.sen_slope_per_year > 0;
  const TrendIcon = !sig ? Minus : up ? TrendingUp : TrendingDown;
  const d = meta.decimals;

  return (
    <motion.aside
      key={meta.key}
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -40, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass absolute left-4 top-24 z-20 hidden max-h-[calc(100dvh-260px)] w-[380px] overflow-y-auto p-5 md:block"
    >
      {header}
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color }}>
        {series.label}
      </p>
      <p className="text-xs text-muted">
        {useArea ? areaLabel : regionLabel}
        {useArea && areaState.status === "ok" && (
          <span className="ml-1">· {areaState.info.cells} cell{areaState.info.cells === 1 ? "" : "s"} of {areaState.info.grid}</span>
        )}
        {meta.kind === "reanalysis" && (
          <span className="ml-2 rounded-full border border-amber/40 px-1.5 py-px text-[10px] text-amber">reanalysis</span>
        )}
      </p>
      {mode === "trend" && meta.trend_map && (
        <div className="mt-3 rounded-xl border border-line bg-deep/60 p-3 text-xs text-muted">
          <b className="text-ink">Trend map {series.trend.period[0].slice(0, 4)}–{series.trend.period[1].slice(0, 4)}:</b>{" "}
          Sen slope per decade in each 0.5° cell. Bright cells are significant (Mann-Kendall, p &lt; 0.05);
          faded cells are not. {Math.round(meta.trend_map.share_significant * 100)}% of the area shows a significant
          trend ({Math.round(meta.trend_map.share_significant_increase * 100)}% increasing). By chance alone ≈5% would.
        </div>
      )}

      <div className="mt-3 flex items-end gap-3">
        <motion.span key={year} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-semibold tabular-nums">
          {fmt(current, d)}
        </motion.span>
        <span className="pb-1 text-sm text-muted">{series.units} · {year} mean</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {delta === null ? "No complete data for this year." : (
          <>
            <span className={delta >= 0 ? "text-ink" : "text-ink"}>{delta >= 0 ? "+" : ""}{fmt(delta, d)} {series.units}</span>{" "}
            vs the {t.period[0].slice(0, 4)}–{t.period[1].slice(0, 4)} average ({fmt(t.mean, d)})
          </>
        )}
      </p>

      <div className="mt-3 h-40 -ml-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
            onClick={(e) => {
              const y = Number(e?.activeLabel);
              if (y) { setPlaying(false); setYear(y); }
            }}
          >
            <defs>
              <linearGradient id={`fill-${meta.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e3a5f" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} interval={5} />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => v.toFixed(Math.min(d, 2))}
            />
            <Tooltip
              contentStyle={{ background: "#0b1a2e", border: "1px solid #1e3a5f", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(v, name) => [`${fmt(Number(v), d)} ${series.units}`, name === "trend" ? "Sen trend" : "Annual mean"]}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#fill-${meta.key})`} dot={false} activeDot={{ r: 4 }} isAnimationActive />
            <Line type="linear" dataKey="trend" stroke="#e2e8f0" strokeDasharray="5 4" strokeWidth={1.4} dot={false} isAnimationActive={false} />
            <ReferenceLine x={year} stroke="#22d3ee" strokeWidth={1.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="-mt-1 text-[10px] text-muted">Click the chart to jump to a year · dashed line: Sen slope trend</p>

      <div
        className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
          sig ? (up ? "border-amber/40 bg-amber/10 text-amber" : "border-red/40 bg-red/10 text-red") : "border-line bg-line/30 text-muted"
        }`}
      >
        <TrendIcon className="size-4" />
        <span className="first-letter:uppercase">{t.verdict}</span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat k="Sen slope" v={`${t.sen_slope_per_year >= 0 ? "+" : ""}${fmt(t.sen_slope_per_year, d + 1)}`} u={`${series.units}/yr`} />
        <Stat k="Change" v={`${t.sen_change_pct_of_mean >= 0 ? "+" : ""}${fmt(t.sen_change_pct_of_mean, 1)}%`} u="over period" />
        <Stat k="MK p-value" v={fmt(t.seasonal_mann_kendall.p_value, 4)} u="seasonal" />
      </dl>

      {!series.robust && (
        <div className="mt-3 flex gap-2 rounded-xl border border-amber/40 bg-amber/10 p-3 text-xs text-amber">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Not robust: {series.robustness.filter((r) => r.verdict !== t.verdict).map((r) => `${r.test.toLowerCase()} → ${r.verdict} (p=${fmt(r.p_value, 2)})`).join("; ")}.
            The result depends on a few extreme years.
          </span>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">{series.caveats[0]}</p>
      <a href={series.doi} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs text-cyan hover:underline">
        {series.dataset} <ExternalLink className="size-3" />
      </a>
    </motion.aside>
  );
}

function Stat({ k, v, u }: { k: string; v: string; u: string }) {
  return (
    <div className="rounded-lg border border-line/70 bg-deep/60 px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted">{k}</dt>
      <dd className="font-mono text-sm font-semibold">{v}</dd>
      <dd className="text-[10px] text-muted">{u}</dd>
    </div>
  );
}
