"use client";

// predicción 2025-2030 de la red neuronal del equipo, servida por el backend
import { create } from "zustand";
import { API_BASE } from "./api";
import type { Scale } from "./data";

type ForecastInfo = { available: boolean; years: number[]; variables: string[] };

export const useForecast = create<ForecastInfo & { loaded: boolean }>(() => ({
  available: false, years: [], variables: [], loaded: false,
}));

let started = false;
export function loadForecast() {
  if (started) return;
  started = true;
  fetch(`${API_BASE}/api/v1/forecast`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d: ForecastInfo | null) => useForecast.setState({ ...(d ?? { available: false, years: [], variables: [] }), loaded: true }))
    .catch(() => useForecast.setState({ loaded: true }));
}

// años futuros disponibles para una variable (solo en modo valor)
export function futureYears(variable: string | null, lastReal: number): number[] {
  const f = useForecast.getState();
  if (!f.available || !variable || !f.variables.includes(variable)) return [];
  return f.years.filter((y) => y > lastReal);
}

export const forecastUrl = (v: string, year: number, s: Scale) =>
  `${API_BASE}/api/v1/forecast/map/${v}/${year}.png?min=${s.min}&max=${s.max}`;

export type PointForecast = { year: number; value: number; spread: number | null }[];

export async function forecastPoint(v: string, lat: number, lng: number): Promise<PointForecast> {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  const r = await fetch(`${API_BASE}/api/v1/forecast/point/${v}?${q}`);
  if (!r.ok) return [];
  return (await r.json()).annual ?? [];
}
