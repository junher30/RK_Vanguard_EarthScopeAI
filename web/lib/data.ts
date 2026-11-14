// Static data produced by export/build_site_data.py (never computed in the browser).
import { create } from "zustand";

export type Scale = { min: number; max: number; colors: string[] };
export type MapMode = "value" | "anomaly" | "trend";
export type Scope = "global" | "amazon";

export type VariableMeta = {
  key: string;
  label: string;
  short: string;
  units: string;
  decimals: number;
  dataset: string;
  doi: string;
  years: number[];
  bounds: { lat_min: number; lat_max: number; lon_min: number; lon_max: number };
  scale: { value: Scale; anomaly: Scale; trend?: Scale & { per: string } };
  kind?: "satellite" | "reanalysis";
  trend_map?: { share_significant: number; share_significant_increase: number };
  verdict: string;
  robust: boolean;
};

export type Manifest = {
  region: { key: string; label: string; lat_min: number; lat_max: number; lon_min: number; lon_max: number };
  variables: VariableMeta[];
};

type Point = [string, number | null];
export type Series = {
  variable: string;
  label: string;
  units: string;
  dataset: string;
  doi: string;
  caveats: string[];
  monthly: Point[];
  rolling12: Point[];
  anomalies: Point[];
  annual: [number, number][];
  trend_line: [number, number][];
  trend: {
    verdict: string;
    period: [string, string];
    n_months: number;
    mean: number;
    sen_slope_per_year: number;
    sen_change_pct_of_mean: number;
    seasonal_mann_kendall: { p_value: number };
    ols_anomaly: { slope_per_year: number; ci_low: number; ci_high: number; p_value: number };
  };
  robustness: { test: string; period: [string, string]; verdict: string; p_value: number; sen_slope_per_year: number }[];
  robust: boolean;
  summary: string;
};

const base = (scope: Scope) => (scope === "global" ? "/data/global" : "/data");
export const mapUrl = (scope: Scope, v: string, mode: MapMode, year: number) =>
  mode === "trend" ? `${base(scope)}/maps/${v}/trend.png` : `${base(scope)}/maps/${v}/${mode}/${year}.png`;

const cache = new Map<string, Promise<unknown>>();
const getJSON = <T,>(url: string) => {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
  }));
  return cache.get(url) as Promise<T>;
};
export const loadManifest = (scope: Scope) => getJSON<Manifest>(`${base(scope)}/manifest.json`);
export const loadSeries = (scope: Scope, v: string) => getJSON<Series>(`${base(scope)}/series/${v}.json`);

// ---------------- data-layer UI state ----------------
type LayerState = {
  scope: Scope;
  setScope: (s: Scope) => void;
  variable: string | null;
  mode: MapMode;
  year: number;
  playing: boolean;
  setVariable: (v: string | null) => void;
  setMode: (m: MapMode) => void;
  setYear: (y: number) => void;
  setPlaying: (p: boolean) => void;
};

export const useLayer = create<LayerState>()((set) => ({
  scope: "global",
  setScope: (scope) => set({ scope }),
  variable: null,
  mode: "value",
  year: 2024,
  playing: false,
  setVariable: (variable) => set({ variable }),
  setMode: (mode) => set({ mode }),
  setYear: (year) => set({ year }),
  setPlaying: (playing) => set({ playing }),
}));

export const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || Number.isNaN(v) ? "—" : v.toFixed(d);

export const gradient = (colors: string[]) => `linear-gradient(90deg, ${colors.join(", ")})`;
