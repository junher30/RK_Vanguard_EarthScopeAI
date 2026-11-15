"use client";

// "Dónde más cambió el planeta": lee el mapa de tendencia (PNG) y busca los bloques de 5° con el cambio
// significativo más fuerte. Las celdas no significativas vienen con alfa bajo en el PNG y se ignoran.
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { valueOfColor, type Scale } from "./data";

export type Hotspot = { lat: number; lng: number; value: number; place: string | null };

const BLOCK = 10; // píxeles de 0.5° -> bloques de 5°
const cache = new Map<string, Promise<Hotspot[]>>();

export function hotspots(url: string, scale: Scale, n = 6): Promise<Hotspot[]> {
  const key = `${url}|${n}`;
  if (!cache.has(key)) cache.set(key, compute(url, scale, n));
  return cache.get(key)!;
}

async function compute(url: string, scale: Scale, n: number): Promise<Hotspot[]> {
  const img = await loadImage(url);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const { data, width: W, height: H } = ctx.getImageData(0, 0, c.width, c.height);
  const memo = new Map<number, number>();
  const blocks: { y: number; x: number; v: number }[] = [];
  for (let by = 0; by < H; by += BLOCK) {
    for (let bx = 0; bx < W; bx += BLOCK) {
      let sum = 0, cnt = 0;
      for (let y = by; y < Math.min(H, by + BLOCK); y++) {
        for (let x = bx; x < Math.min(W, bx + BLOCK); x++) {
          const i = (y * W + x) * 4;
          if (data[i + 3] < 200) continue; // no significativo o sin dato
          const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
          let v = memo.get(rgb);
          if (v === undefined) { v = valueOfColor(scale, data[i], data[i + 1], data[i + 2]).value; memo.set(rgb, v); }
          sum += v; cnt++;
        }
      }
      // al menos la mitad del bloque con tendencia significativa
      if (cnt >= (BLOCK * BLOCK) / 2) blocks.push({ y: by + BLOCK / 2, x: bx + BLOCK / 2, v: sum / cnt });
    }
  }
  blocks.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const out: Hotspot[] = [];
  const countries = await loadCountries();
  for (const b of blocks) {
    const lat = 90 - (b.y / H) * 180, lng = (b.x / W) * 360 - 180;
    // lugares distintos: separados al menos 15°
    if (out.some((o) => Math.abs(o.lat - lat) < 15 && Math.abs(o.lng - lng) < 15)) continue;
    out.push({ lat: +lat.toFixed(2), lng: +lng.toFixed(2), value: b.v, place: countryAt(countries, lat, lng) });
    if (out.length >= n) break;
  }
  return out;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((ok, bad) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = bad;
    img.src = url;
  });
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
