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
import { tr, units, useLang, useT, varLabel, verdict } from "@/lib/i18n";
import { GLOSSARY, plainTrend } from "@/lib/readings";
import { forecastPoint, useForecast, type PointForecast } from "@/lib/forecast";
import { Flame, Sparkles } from "lucide-react";
import { namedHotspots, type Hotspot } from "@/lib/hotspots";
import { runActions } from "@/lib/agentActions";

const COLOR: Record<string, string> = {
  precip_mm_day: "#3b82f6", evi: "#34d399", lst_day_c: "#f87171", t2m_c: "#fb923c", rh2m_pct: "#2dd4bf",
};

export default function InsightPanel({ scope, meta, regionLabel }: { scope: Scope; meta: VariableMeta; regionLabel: string }) {
  const { year, mode, setYear, setPlaying } = useLayer();
  const tt = useT();
  const [scopeSeries, setScopeSeries] = useState<Series | null>(null);

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
            ? tr("El servidor de análisis está apagado. Levanta el backend (docker compose up).", "The analysis server is offline. Start the backend (docker compose up).")
            : e.message,
        },
      }));
    return () => { live = false; };
  }, [target, meta.key, reqKey]);

  // predicción de la red en el punto (o el centro del área)
  const fc = useForecast();
  const center = area ? (area.properties.centroid as { lat: number; lng: number } | undefined) : zone ? { lat: zone.lat, lng: zone.lng } : undefined;
  const pfKey = fc.available && fc.variables.includes(meta.key) && scope === "global" && useArea && center
    ? `${meta.key}|${center.lat.toFixed(3)}|${center.lng.toFixed(3)}` : "";
  const [pfState, setPf] = useState<{ key: string; data: PointForecast } | null>(null);
  const pf = pfState && pfState.key === pfKey ? pfState.data : [];
  useEffect(() => {
    if (!pfKey || !center) return;
    let live = true;
    forecastPoint(meta.key, center.lat, center.lng).then((d) => live && setPf({ key: pfKey, data: d })).catch(() => {});
    return () => { live = false; };
  }, [pfKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const series = useArea ? (areaState.status === "ok" ? areaState.series : null) : scopeSeries;
  const areaLabel = area
    ? `${tt("Tu área", "Your area")} · ${area.properties.areaKm2 ? `${Number(area.properties.areaKm2).toLocaleString("en-US")} km²` : tt("polígono", "polygon")}`
    : zone ? `${tt("Tu punto", "Your point")} · ${zone.lat.toFixed(2)}, ${zone.lng.toFixed(2)}` : "";

  const header = (
    <>
      {target && (
        <div className="mb-3 flex rounded-lg border border-line p-0.5 text-xs">
          <button
            onClick={() => setSource("area")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 ${source === "area" ? "bg-panel text-cyan" : "text-muted hover:text-ink"}`}
          >
            {area ? <Hexagon className="size-3.5" /> : <MapPin className="size-3.5" />} {area ? tt("Tu área", "Your area") : tt("Tu punto", "Your point")}
          </button>
          <button
            onClick={() => setSource("scope")}
            className={`flex-1 rounded-md px-2 py-1 ${source === "scope" ? "bg-panel text-cyan" : "text-muted hover:text-ink"}`}
          >
            {scope === "global" ? tt("Todo el planeta", "Whole planet") : tt("Amazonía central", "Central Amazon")}
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
          <Loader2 className="size-4 animate-spin" /> {tt(`Analizando ${varLabel(meta.key, meta.label).toLowerCase()} en tu zona…`, `Analysing ${meta.label.toLowerCase()} in your area…`)}
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
  const realLast = series.annual[series.annual.length - 1]?.[0] ?? 2024;
  const fut = pf.filter((p) => p.year > realLast);
  const data: { year: number; value?: number | null; trend?: number; forecast?: number }[] =
    series.annual.map(([y, v]) => ({ year: y, value: v, trend: line.get(y) }));
  if (fut.length && data.length) {
    data[data.length - 1].forecast = data[data.length - 1].value ?? undefined;
    fut.forEach((p) => data.push({ year: p.year, forecast: p.value }));
  }
  const futNow = fut.find((p) => p.year === year);
  const current = futNow ? futNow.value : series.annual.find(([y]) => y === year)?.[1] ?? null;
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
        {varLabel(meta.key, series.label)}
      </p>
      <p className="text-xs text-muted">
        {useArea ? areaLabel : regionLabel}
        {useArea && areaState.status === "ok" && (
          <span className="ml-1">· {areaState.info.cells} {tt(areaState.info.cells === 1 ? "celda" : "celdas", areaState.info.cells === 1 ? "cell" : "cells")} {tt("de", "of")} {areaState.info.grid}</span>
        )}
        {meta.kind === "reanalysis" && (
          <span className="ml-2 rounded-full border border-amber/40 px-1.5 py-px text-[10px] text-amber">{tt("reanálisis", "reanalysis")}</span>
        )}
      </p>
      {mode === "trend" && meta.trend_map && (
        <div className="mt-3 rounded-xl border border-line bg-deep/60 p-3 text-xs text-muted">
          <b className="text-ink">{tt("Mapa de tendencia", "Trend map")} {series.trend.period[0].slice(0, 4)}–{series.trend.period[1].slice(0, 4)}:</b>{" "}
          {tt(`Pendiente de Sen por década en cada celda de 0.5°. Las celdas brillantes son significativas (Mann-Kendall, p < 0.05); las tenues no. En el mapa, el ${Math.round(meta.trend_map.share_significant * 100)}% del área muestra una tendencia significativa (${Math.round(meta.trend_map.share_significant_increase * 100)}% creciente). Por puro azar sería ≈5%.`,
            `Sen slope per decade in each 0.5° cell. Bright cells are significant (Mann-Kendall, p < 0.05); faded cells are not. Across the map, ${Math.round(meta.trend_map.share_significant * 100)}% of the area shows a significant trend (${Math.round(meta.trend_map.share_significant_increase * 100)}% increasing). By chance alone ≈5% would.`)}
        </div>
      )}
      {mode === "trend" && scope === "global" && meta.scale.trend && (
        <Hotspots meta={meta} />
      )}

      <div className="mt-3 flex items-end gap-3">
        <motion.span key={year} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-semibold tabular-nums">
          {fmt(current, d)}
        </motion.span>
        <span className="pb-1 text-sm text-muted">{units(series.units)} · {futNow ? tt("proyección", "projection") : tt("media", "mean")} {year}</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {delta === null ? (year > realLast
          ? tt("Proyección experimental en el globo (no es un pronóstico). Marca un punto para ver su valor y la gráfica hasta 2030.", "Experimental projection on the globe (not a forecast). Mark a point to see its value and the chart to 2030.")
          : tt("Sin datos completos para este año.", "No complete data for this year.")) : (
          <>
            <span className={delta >= 0 ? "text-ink" : "text-ink"}>{delta >= 0 ? "+" : ""}{fmt(delta, d)} {series.units}</span>{" "}
            {tt("frente al promedio", "vs the")} {t.period[0].slice(0, 4)}–{t.period[1].slice(0, 4)} {tt("", "average")} ({fmt(t.mean, d)})
          </>
        )}
      </p>

      {futNow && (
        <div className="mt-2 flex gap-2 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 p-2.5 text-xs text-fuchsia-100">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-fuchsia-300" />
          <span>
            {tt("Proyección experimental de la red neuronal EarthScope", "EarthScope neural network projection (experimental)")}
            {futNow.spread !== null && <> · ± {fmt(futNow.spread, d)} {units(series.units)} {tt("de dispersión entre modelos", "spread across models")}</>}
          </span>
        </div>
      )}

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
              formatter={(v, name) => [`${fmt(Number(v), d)} ${series.units}`, name === "trend" ? tt("Tendencia de Sen", "Sen trend") : name === "forecast" ? tt("Proyección IA (experimental)", "AI projection (experimental)") : tt("Media anual", "Annual mean")]}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#fill-${meta.key})`} dot={false} activeDot={{ r: 4 }} isAnimationActive />
            <Line type="linear" dataKey="trend" stroke="#e2e8f0" strokeDasharray="5 4" strokeWidth={1.4} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="forecast" stroke="#e879f9" strokeDasharray="4 3" strokeWidth={2} dot={{ r: 2, fill: "#e879f9" }} isAnimationActive={false} connectNulls />
            <ReferenceLine x={year} stroke={futNow ? "#e879f9" : "#22d3ee"} strokeWidth={1.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="-mt-1 text-[10px] text-muted">{tt("Toca la gráfica para ir a un año · punteada blanca: tendencia de Sen", "Click the chart to jump to a year · white dashed: Sen slope trend")}{fut.length > 0 && tt(" · fucsia: proyección IA experimental", " · magenta: experimental AI projection")}</p>

      <div
        className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
          sig ? (up ? "border-amber/40 bg-amber/10 text-amber" : "border-red/40 bg-red/10 text-red") : "border-line bg-line/30 text-muted"
        }`}
      >
        <TrendIcon className="size-4" />
        <span className="first-letter:uppercase">{verdict(t.verdict)}</span>
      </div>
      {/* la misma conclusión en palabras simples */}
      <PlainSummary
        varKey={meta.key} verdictText={t.verdict} slope={t.sen_slope_per_year}
        unitsText={units(series.units)} decimals={d} robust={series.robust}
      />

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat k={tt("Pendiente Sen", "Sen slope")} help={tt(GLOSSARY.sen[0], GLOSSARY.sen[1])} v={`${t.sen_slope_per_year >= 0 ? "+" : ""}${fmt(t.sen_slope_per_year, d + 1)}`} u={`${units(series.units)}/${tt("año", "yr")}`} />
        <Stat k={tt("Cambio", "Change")} help={tt(GLOSSARY.change[0], GLOSSARY.change[1])} v={`${t.sen_change_pct_of_mean >= 0 ? "+" : ""}${fmt(t.sen_change_pct_of_mean, 1)}%`} u={tt("en el periodo", "over period")} />
        <Stat k={tt("p-valor MK", "MK p-value")} help={tt(GLOSSARY.p[0], GLOSSARY.p[1])} v={fmt(t.seasonal_mann_kendall.p_value, 4)} u={tt("estacional", "seasonal")} />
      </dl>

      {!series.robust && (
        <div className="mt-3 flex gap-2 rounded-xl border border-amber/40 bg-amber/10 p-3 text-xs text-amber">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {tt("No es robusto", "Not robust")}: {series.robustness.filter((r) => r.verdict !== t.verdict).map((r) => `${r.test.toLowerCase()} → ${verdict(r.verdict)} (p=${fmt(r.p_value, 2)})`).join("; ")}.{" "}
            {tt("El resultado depende de unos pocos años extremos.", "The result depends on a few extreme years.")}{" "}
            <span className="block pt-1 text-amber/80">{tt(GLOSSARY.robust[0], GLOSSARY.robust[1])}</span>
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

function PlainSummary({ varKey, verdictText, slope, unitsText, decimals, robust }: {
  varKey: string; verdictText: string; slope: number; unitsText: string; decimals: number; robust: boolean;
}) {
  const es = useLang((st) => st.lang) === "es";
  return (
    <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-ink">
      {plainTrend(varKey, verdictText, slope, unitsText, decimals, robust, es)}
    </p>
  );
}

// cifra con un "?" que explica qué significa (al pasar el mouse o al tocar)
function Stat({ k, v, u, help }: { k: string; v: string; u: string; help?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative rounded-lg border border-line/70 bg-deep/60 px-2 py-2">
      <dt className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted">
        {k}
        {help && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            className="grid size-3.5 place-items-center rounded-full border border-muted/60 text-[8px] leading-none hover:border-cyan hover:text-cyan"
            aria-label={help}
          >
            ?
          </button>
        )}
      </dt>
      {open && help && (
        <span className="absolute bottom-full left-1/2 z-10 mb-1 w-48 -translate-x-1/2 rounded-md border border-line bg-[#04101c] p-2 text-left text-[11px] normal-case leading-snug tracking-normal text-ink shadow-lg">
          {help}
        </span>
      )}
      <dd className="font-mono text-sm font-semibold">{v}</dd>
      <dd className="text-[10px] text-muted">{u}</dd>
    </div>
  );
}

// los lugares del planeta con el cambio significativo más fuerte en el mapa de tendencia
function Hotspots({ meta }: { meta: VariableMeta }) {
  const tt = useT();
  const [list, setList] = useState<{ key: string; items: Hotspot[] } | null>(null);
  useEffect(() => {
    let live = true;
    namedHotspots(meta.trend_map?.hotspots).then((items) => live && setList({ key: meta.key, items })).catch(() => {});
    return () => { live = false; };
  }, [meta]);
  const items = list?.key === meta.key ? list.items : null;
  return (
    <div className="mt-3 rounded-xl border border-line bg-deep/60 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan">
        <Flame className="size-3.5" /> {tt("Dónde más cambió", "Where it changed most")}
      </p>
      {!items ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted"><Loader2 className="size-3.5 animate-spin" /> {tt("Buscando…", "Searching…")}</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {items.map((h, i) => (
            <li key={i}>
              <button
                onClick={() => runActions([{ type: "fly", lat: h.lat, lng: h.lng, altitude: 1.2 }, { type: "select", lat: h.lat, lng: h.lng }, { type: "layer", variable: meta.key, mode: "trend" }])}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-panel"
              >
                <span className="font-mono text-muted">{i + 1}</span>
                <span className="flex-1 truncate">{h.place ?? tt("Océano", "Ocean")} <span className="text-muted">· {h.lat.toFixed(0)}°, {h.lng.toFixed(0)}°</span></span>
                <span className={`font-mono font-semibold ${h.value >= 0 ? "text-amber" : "text-sky-300"}`}>
                  {h.value >= 0 ? "+" : ""}{fmt(h.value, meta.decimals)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-1.5 text-[10px] text-muted">{tt(`Bloques de 5° con tendencia significativa · ${units(meta.units)} por década`, `5° blocks with a significant trend · ${units(meta.units)} per decade`)}</p>
    </div>
  );
}
