import type { MapMode } from "./data";

export type AgentAction =
  | { type: "fly"; lat: number; lng: number; altitude?: number }
  | { type: "select"; lat: number; lng: number }
  | { type: "layer"; variable: string; mode: MapMode; year?: number; play?: boolean; scope?: "global" | "amazon" }
  | { type: "zoom"; dir: "in" | "out" }
  | { type: "spin"; on: boolean }
  | { type: "imagery"; mode: "day" | "night" }
  | { type: "play"; on: boolean }
  | { type: "scope"; scope: "global" | "amazon" }
  | { type: "hide" }
  | { type: "clear" }
  | { type: "tour" }
  | { type: "events"; on: boolean }
  | { type: "story"; id: string };

// el Explorer registra aquí cómo mover el globo; el chat solo envía las acciones
let runner: ((actions: AgentAction[]) => void) | null = null;

export function setActionRunner(fn: ((actions: AgentAction[]) => void) | null) {
  runner = fn;
}

// otros oyentes, por ejemplo el globo en VR
const listeners = new Set<(actions: AgentAction[]) => void>();
export function addActionListener(fn: (actions: AgentAction[]) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function runActions(actions: AgentAction[] | undefined) {
  if (!actions?.length) return;
  runner?.(actions);
  listeners.forEach((fn) => fn(actions));
}
