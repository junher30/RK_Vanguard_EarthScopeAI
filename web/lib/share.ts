"use client";

// enlace que guarda la vista exacta: capa, modo, año, alcance y punto
import { useLayer, type MapMode, type Scope } from "./data";
import { useExplorer } from "./store";
import { runActions, type AgentAction } from "./agentActions";

export function shareUrl(): string {
  const { scope, variable, mode, year } = useLayer.getState();
  const sel = useExplorer.getState().selection;
  const q = new URLSearchParams();
  if (variable) { q.set("v", variable); q.set("m", mode); q.set("y", String(year)); }
  if (scope !== "global") q.set("s", scope);
  if (sel) { q.set("lat", sel.lat.toFixed(3)); q.set("lng", sel.lng.toFixed(3)); }
  return `${location.origin}${location.pathname}#${q}`;
}

// aplica la vista del enlace; devuelve true si había algo
export function applyShared(): boolean {
  const h = location.hash.slice(1);
  if (!h) return false;
  const q = new URLSearchParams(h);
  const acts: AgentAction[] = [];
  const lat = Number(q.get("lat")), lng = Number(q.get("lng"));
  const hasPoint = q.has("lat") && q.has("lng") && Number.isFinite(lat) && Number.isFinite(lng);
  if (hasPoint) acts.push({ type: "fly", lat, lng, altitude: 1.4 }, { type: "select", lat, lng });
  const v = q.get("v");
  if (v) {
    acts.push({
      type: "layer", variable: v, mode: (q.get("m") as MapMode) || "value",
      year: Number(q.get("y")) || undefined, scope: (q.get("s") as Scope) || "global",
    });
  }
  if (!acts.length) return false;
  runActions(acts);
  return true;
}
