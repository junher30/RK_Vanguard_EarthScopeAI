import type { Series } from "./data";
import type { AgentAction } from "./agentActions";

// por defecto el backend va por el proxy /backend de Next (mismo origen: sirve en HTTPS y en el visor VR)
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/backend";

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
  p.catch(() => cache.delete(body));
  cache.set(body, p);
  return p;
}

export type ChatContext = Record<string, unknown>;
export type AgentReply = { reply: string; actions?: AgentAction[] };

export async function askAgent(message: string, session: string, context: ChatContext): Promise<AgentReply> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 120000);
  try {
    const r = await fetch(`${API_BASE}/api/v1/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, session, context }),
      signal: ctl.signal,
    });
    if (r.status === 404 || r.status === 503) throw new Error("unavailable");
    // el proxy responde 500 sin JSON cuando el backend está apagado
    if (r.status >= 500 && !(r.headers.get("content-type") ?? "").includes("json")) throw new Error("unavailable");
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? `API ${r.status}`);
    return (await r.json()) as AgentReply;
  } finally {
    clearTimeout(timer);
  }
}
