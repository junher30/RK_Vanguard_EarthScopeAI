"use client";

// satélites de la NASA en su posición real: TLE de CelesTrak propagados con SGP4
import { degreesLat, degreesLong, eciToGeodetic, gstime, propagate, twoline2satrec, type SatRec } from "satellite.js";
import { API_BASE } from "./api";

export type SatMeta = {
  norad: number;
  name: string;
  color: string;
  es: string;
  en: string;
  layers: string[];
};

export const SAT_META: SatMeta[] = [
  { norad: 39574, name: "GPM Core", color: "#60a5fa", layers: ["precip_mm_day"],
    es: "Mide la lluvia y la nieve de todo el planeta con un radar. De él sale la capa de precipitación (IMERG) de esta web.",
    en: "Measures rain and snow across the planet with a radar. This site's precipitation layer (IMERG) comes from it." },
  { norad: 25994, name: "Terra", color: "#34d399", layers: ["evi", "lst_day_c"],
    es: "Lleva el sensor MODIS. De él salen las capas de vegetación (EVI) y temperatura de superficie de esta web.",
    en: "Carries the MODIS sensor. This site's vegetation (EVI) and surface temperature layers come from it." },
  { norad: 27424, name: "Aqua", color: "#22d3ee", layers: ["t2m_c", "rh2m_pct"],
    es: "Estudia el agua de la Tierra: humedad, nubes, océanos. Sus datos alimentan el reanálisis MERRA-2 de temperatura y humedad del aire.",
    en: "Studies Earth's water: humidity, clouds, oceans. Its data feed the MERRA-2 reanalysis of air temperature and humidity." },
  { norad: 25544, name: "ISS", color: "#f8fafc", layers: [],
    es: "La Estación Espacial Internacional. Lleva instrumentos como GEDI, que mide la altura de los bosques, y ECOSTRESS, que mide el estrés de las plantas.",
    en: "The International Space Station. It carries instruments like GEDI (forest height) and ECOSTRESS (plant stress)." },
  { norad: 37849, name: "Suomi NPP", color: "#fbbf24", layers: [],
    es: "Con su sensor VIIRS ve las luces de las ciudades de noche y detecta incendios activos.",
    en: "Its VIIRS sensor sees city lights at night and detects active fires." },
  { norad: 43013, name: "NOAA-20", color: "#f59e0b", layers: [],
    es: "Satélite meteorológico: temperatura, humedad e incendios para los pronósticos del tiempo.",
    en: "Weather satellite: temperature, humidity and fires for forecasts." },
  { norad: 49260, name: "Landsat 9", color: "#a78bfa", layers: [],
    es: "Fotografía la Tierra con 30 m de detalle: deforestación, ciudades y cultivos. La serie Landsat lleva más de 50 años.",
    en: "Images Earth at 30 m detail: deforestation, cities and crops. The Landsat series has run for over 50 years." },
  { norad: 40376, name: "SMAP", color: "#2dd4bf", layers: [],
    es: "Mide la humedad del suelo: cuánta agua tiene la tierra, clave para sequías y cosechas.",
    en: "Measures soil moisture: how much water the ground holds, key for droughts and harvests." },
  { norad: 43613, name: "ICESat-2", color: "#e0f2fe", layers: [],
    es: "Con un láser mide el grosor del hielo polar y la altura de los árboles.",
    en: "Uses a laser to measure polar ice thickness and tree height." },
];

export type Sat = SatMeta & { rec: SatRec };
export type SatPos = { lat: number; lng: number; altKm: number; speedKmh: number };

const R_EARTH = 6371;

async function fromBackend(): Promise<{ norad: number; line1: string; line2: string }[]> {
  const r = await fetch(`${API_BASE}/api/v1/satellites`);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return (await r.json()).satellites;
}

// respaldo: CelesTrak directo desde el navegador
async function fromCelestrak() {
  const ids = SAT_META.map((s) => s.norad).join(",");
  const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${ids}&FORMAT=TLE`);
  if (!r.ok) throw new Error(`CelesTrak ${r.status}`);
  const lines = (await r.text()).split("\n").map((l) => l.trim()).filter(Boolean);
  const out: { norad: number; line1: string; line2: string }[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith("1 ") && lines[i + 1]?.startsWith("2 ")) {
      out.push({ norad: Number(lines[i].slice(2, 7)), line1: lines[i], line2: lines[i + 1] });
      i++;
    }
  }
  return out;
}

let loading: Promise<Sat[]> | null = null;
export function loadSatellites(): Promise<Sat[]> {
  if (!loading) {
    loading = (async () => {
      let tles: { norad: number; line1: string; line2: string }[] = [];
      try { tles = await fromBackend(); } catch { /* sigue con CelesTrak */ }
      if (!tles.length) { try { tles = await fromCelestrak(); } catch { /* sin datos */ } }
      const sats: Sat[] = [];
      for (const meta of SAT_META) {
        const t = tles.find((x) => Number(x.norad) === meta.norad);
        if (!t) continue;
        try { sats.push({ ...meta, rec: twoline2satrec(t.line1, t.line2) }); } catch { /* TLE inválido */ }
      }
      if (!sats.length) loading = null; // reintenta la próxima vez
      return sats;
    })();
  }
  return loading;
}

export function satPosition(s: Sat, when = new Date()): SatPos | null {
  const pv = propagate(s.rec, when);
  if (!pv || typeof pv.position === "boolean" || !pv.position) return null;
  const g = eciToGeodetic(pv.position, gstime(when));
  const v = pv.velocity && typeof pv.velocity !== "boolean" ? pv.velocity : null;
  const speed = v ? Math.hypot(v.x, v.y, v.z) * 3600 : 0;
  return { lat: degreesLat(g.latitude), lng: degreesLong(g.longitude), altKm: g.height, speedKmh: speed };
}

// trayectoria de los próximos minutos (para dibujar la órbita)
export function satTrack(s: Sat, minutes = 100, step = 1, from = new Date()) {
  const out: [number, number, number][] = [];
  for (let m = 0; m <= minutes; m += step) {
    const p = satPosition(s, new Date(from.getTime() + m * 60000));
    if (p) out.push([p.lat, p.lng, p.altKm / R_EARTH]);
  }
  return out;
}

export const altToRadius = (altKm: number) => altKm / R_EARTH;
