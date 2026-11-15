// Cliente de las SIMULACIONES EXPERIMENTALES ("¿y si…?"). Base para la próxima fase.
// La ciencia y la puerta de validación viven en el backend (science/simulation.py):
// aquí solo se llama a la API y se tipan las respuestas. Ver docs/SIMULACIONES.md del backend.
import { API_BASE } from "./api";

export type ScenarioInput = { key: string; label: string; units: string; min: number; max: number; default: number };

export type ScenarioModel = {
  id: string;
  label: string;
  question: string;
  region: string;
  output: string;
  output_units: string;
  method: string;
  inputs: ScenarioInput[];
  sources: string[];
  assumptions: string[];
  notes: string[];
  status: "validated" | "no_skill";
  skill_threshold: number;
  validation: { metric: string; value: number | null; n: number | null; period: unknown };
  data_kind: "scenario";
};

export type ScenarioResult = {
  model: string;
  label: string;
  region: string;
  inputs: Record<string, number>;
  output: string;
  units: string;
  estimate: number;
  delta_vs_baseline: number;
  baseline: number;
  mean_ci95: [number, number];
  prediction_interval95: [number, number];
  extrapolation: boolean;
  observed_input_range: [number, number];
  status: "experimental";
  data_kind: "scenario";
  caveat: string;
  assumptions: string[];
  validation: ScenarioModel["validation"];
};

let models: Promise<ScenarioModel[]> | null = null;

export function listScenarioModels(): Promise<ScenarioModel[]> {
  models ??= fetch(`${API_BASE}/api/v1/simulate/models`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`))))
    .then((j: { models: ScenarioModel[] }) => j.models)
    .catch((e) => { models = null; throw e; });
  return models;
}

export async function runScenario(model: string, inputs: Record<string, number>): Promise<ScenarioResult> {
  const r = await fetch(`${API_BASE}/api/v1/simulate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, inputs }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? `API ${r.status}`);
  return r.json();
}
