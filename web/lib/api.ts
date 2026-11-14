// Client for the EarthScope analysis API (api/main.py). The API runs science/ on the
// global 0.5° grids; the browser only displays the result.
import type { Series } from "./data";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AreaTarget =
  | { geometry: { type: "Polygon"; coordinates: number[][][] }; point?: undefined }
  | { point: { lat: number; lng: number }; geometry?: undefined };

export type AreaInfo = {
  cells: number;
  grid: string;
  cells_area_km2: number;
  mean_valid_share: number;
  valid_months: number;
  total_months: number;
};

export type AreaResult =
  | ({ ok: true; area: AreaInfo } & Series)
  | { ok: false; reason: string; area: AreaInfo; variable: string };

const cache = new Map<string, Promise<AreaResult>>();

export function analyzeArea(variable: string, target: AreaTarget): Promise<AreaResult> {
  const body = JSON.stringify({ variable, ...target });
  const hit = cache.get(body);
  if (hit) return hit;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30000);
  const p = fetch(`${API_BASE}/api/v1/area/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    signal: ctl.signal,
  })
    .then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? `API ${r.status}`);
      return r.json() as Promise<AreaResult>;
    })
    .finally(() => clearTimeout(timer));
  p.catch(() => cache.delete(body)); // allow retry after a failure
  cache.set(body, p);
  return p;
}
