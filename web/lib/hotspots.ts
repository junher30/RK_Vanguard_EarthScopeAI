"use client";

// "Dónde más cambió el planeta". El ranking lo calcula el BACKEND (science/global_trends.hotspots:
// bloques de 5° con al menos la mitad de celdas con tendencia significativa, ordenados por el cambio
// medio real, separados ≥ 15° sobre la esfera) y llega en manifest.json → trend_map.hotspots.
// La web solo les pone nombre de país (etiqueta, no ciencia).
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

export type Hotspot = { lat: number; lng: number; value: number; place: string | null };
export type RawHotspot = { lat: number; lng: number; value_per_decade: number };

export async function namedHotspots(raw: RawHotspot[] | undefined): Promise<Hotspot[]> {
  if (!raw?.length) return [];
  const countries = await loadCountries();
  return raw.map((h) => ({ lat: h.lat, lng: h.lng, value: h.value_per_decade, place: countryAt(countries, h.lat, h.lng) }));
}

type Poly = { name: string; rings: number[][][] };
let countriesP: Promise<Poly[]> | null = null;
function loadCountries() {
  countriesP ??= fetch("/geo/countries-110m.json")
    .then((r) => r.json())
    .then((topo: Topology<{ countries: GeometryCollection<{ name: string }> }>) => {
      const fc = feature(topo, topo.objects.countries) as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name: string }>;
      const out: Poly[] = [];
      for (const f of fc.features) {
        const g = f.geometry;
        if (g.type === "Polygon") out.push({ name: f.properties.name, rings: g.coordinates as number[][][] });
        if (g.type === "MultiPolygon") (g.coordinates as number[][][][]).forEach((p) => out.push({ name: f.properties.name, rings: p }));
      }
      return out;
    })
    .catch(() => []);
  return countriesP;
}

// punto dentro de polígono (rayo), suficiente para nombrar el país de un bloque
function countryAt(polys: Poly[], lat: number, lng: number): string | null {
  for (const p of polys) {
    let inside = false;
    const ring = p.rings[0];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) return p.name;
  }
  return null;
}
