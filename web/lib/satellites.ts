"use client";

// satélites de la NASA en su posición real: TLE de CelesTrak propagados con SGP4
import { degreesLat, degreesLong, eciToGeodetic, gstime, propagate, twoline2satrec, type SatRec } from "satellite.js";
import { API_BASE } from "./api";

// Rol de cada satélite respecto de los datos de ESTA web (sale de la metadata de cada producto):
//   direct      → la capa sale directamente de su instrumento (MODIS/Terra → EVI y temperatura de superficie)
//   calibration → referencia que calibra un producto multisatélite (GPM Core → IMERG)
//   contributor → uno de los muchos satélites que alimentan IMERG (lluvia) o MERRA-2 (temperatura del aire, humedad)
//   other       → satélite de observación de la Tierra que NO usamos en los datos de esta web
export type SatRole = "direct" | "calibration" | "contributor" | "other";
export type Product = "modis" | "imerg" | "merra2";

export const ROLE_STYLE: Record<SatRole, { color: string; es: string; en: string; hintEs: string; hintEn: string }> = {
  direct: { color: "#34d399", es: "Fuente directa", en: "Direct source",
    hintEs: "La capa sale de su instrumento", hintEn: "The layer comes from its instrument" },
  calibration: { color: "#60a5fa", es: "Calibración", en: "Calibration",
    hintEs: "Referencia que calibra la lluvia (IMERG)", hintEn: "Reference that calibrates rainfall (IMERG)" },
  contributor: { color: "#fbbf24", es: "Aporta datos", en: "Contributor",
    hintEs: "Uno de muchos que alimentan IMERG o MERRA-2", hintEn: "One of many feeding IMERG or MERRA-2" },
  other: { color: "#94a3b8", es: "No usado aquí", en: "Not used here",
    hintEs: "Observa la Tierra, pero no está en nuestros datos", hintEn: "Observes Earth, but not in our data" },
};

export const PRODUCT_INFO: Record<Product, { name: string; layers: string[]; es: string; en: string }> = {
  modis: { name: "MODIS", layers: ["evi", "lst_day_c"], es: "vegetación y temperatura de superficie", en: "vegetation and surface temperature" },
  imerg: { name: "GPM IMERG", layers: ["precip_mm_day"], es: "precipitación", en: "precipitation" },
  merra2: { name: "MERRA-2", layers: ["t2m_c", "rh2m_pct"], es: "temperatura del aire y humedad", en: "air temperature and humidity" },
};

// qué producto alimenta cada capa de la web
export const LAYER_PRODUCT: Record<string, Product> = {
  precip_mm_day: "imerg", evi: "modis", lst_day_c: "modis", t2m_c: "merra2", rh2m_pct: "merra2",
};

export type SatMeta = {
  norad: number;
  name: string;
  role: SatRole;
  products: Product[];
  agency: string;
  instrument: string;
  geo?: boolean;          // geoestacionario (~35 786 km): se dibuja más cerca para que se vea
  color: string;          // = color del rol
  layers: string[];       // capas de la web a las que aporta
  es: string;
  en: string;
};

type Def = Omit<SatMeta, "color" | "layers">;
const DEFS: Def[] = [
  // ---- fuente directa
  { norad: 25994, name: "Terra", role: "direct", products: ["modis"], agency: "NASA", instrument: "MODIS",
    es: "Su sensor MODIS es la fuente de las capas de vegetación (EVI) y temperatura de superficie de esta web (productos MOD13C2 y MOD11C3).",
    en: "Its MODIS sensor is the source of this site's vegetation (EVI) and surface temperature layers (products MOD13C2 and MOD11C3)." },
  // ---- calibración
  { norad: 39574, name: "GPM Core", role: "calibration", products: ["imerg"], agency: "NASA / JAXA", instrument: "DPR + GMI",
    es: "Radar y radiómetro de referencia: calibra a toda la constelación que forma la capa de lluvia (IMERG). Antes de 2014 lo hacía TRMM.",
    en: "Reference radar and radiometer: it calibrates the whole constellation behind the rainfall layer (IMERG). Before 2014, TRMM did." },
  // ---- aportan a IMERG y/o MERRA-2 (según la metadata de cada producto)
  { norad: 27424, name: "Aqua", role: "contributor", products: ["merra2"], agency: "NASA", instrument: "AIRS, AMSU",
    es: "Sus sondeadores AIRS y AMSU están entre las observaciones que usa MERRA-2 para la temperatura del aire y la humedad.",
    en: "Its AIRS and AMSU sounders are among the observations MERRA-2 uses for air temperature and humidity." },
  { norad: 37849, name: "Suomi NPP", role: "contributor", products: ["imerg", "merra2"], agency: "NASA / NOAA", instrument: "ATMS, CrIS",
    es: "Su radiómetro de microondas ATMS aporta a la lluvia (IMERG) y a MERRA-2.",
    en: "Its ATMS microwave radiometer contributes to rainfall (IMERG) and to MERRA-2." },
  { norad: 43013, name: "NOAA-20", role: "contributor", products: ["imerg", "merra2"], agency: "NOAA", instrument: "ATMS, CrIS",
    es: "Satélite meteorológico: su ATMS aporta a la lluvia (IMERG) y a MERRA-2.",
    en: "Weather satellite: its ATMS contributes to rainfall (IMERG) and to MERRA-2." },
  { norad: 33591, name: "NOAA-19", role: "contributor", products: ["imerg", "merra2"], agency: "NOAA", instrument: "MHS, AMSU",
    es: "Su sensor de microondas MHS aporta a la lluvia (IMERG); sus sondeos AMSU, a MERRA-2.",
    en: "Its MHS microwave sensor contributes to rainfall (IMERG); its AMSU soundings, to MERRA-2." },
  { norad: 38771, name: "MetOp-B", role: "contributor", products: ["imerg", "merra2"], agency: "EUMETSAT", instrument: "MHS, IASI, ASCAT",
    es: "Europeo: MHS aporta a la lluvia (IMERG); IASI (sondeos) y ASCAT (vientos sobre el mar), a MERRA-2.",
    en: "European: MHS contributes to rainfall (IMERG); IASI (soundings) and ASCAT (ocean winds), to MERRA-2." },
  { norad: 43689, name: "MetOp-C", role: "contributor", products: ["imerg", "merra2"], agency: "EUMETSAT", instrument: "MHS, IASI, ASCAT",
    es: "Gemelo de MetOp-B: aporta a la lluvia (IMERG) y a MERRA-2.",
    en: "MetOp-B's twin: contributes to rainfall (IMERG) and to MERRA-2." },
  { norad: 38337, name: "GCOM-W1", role: "contributor", products: ["imerg"], agency: "JAXA", instrument: "AMSR2",
    es: "Japonés: su radiómetro AMSR2 es uno de los que más aportan a la lluvia (IMERG).",
    en: "Japanese: its AMSR2 radiometer is one of the main contributors to rainfall (IMERG)." },
  { norad: 29522, name: "DMSP F17", role: "contributor", products: ["imerg"], agency: "U.S. DoD", instrument: "SSMIS",
    es: "Satélite meteorológico militar de EE. UU.: su SSMIS aporta a la lluvia (IMERG).",
    en: "U.S. military weather satellite: its SSMIS contributes to rainfall (IMERG)." },
  { norad: 35951, name: "DMSP F18", role: "contributor", products: ["imerg"], agency: "U.S. DoD", instrument: "SSMIS",
    es: "Como F17: su SSMIS aporta a la lluvia (IMERG).",
    en: "Like F17: its SSMIS contributes to rainfall (IMERG)." },
  { norad: 41866, name: "GOES-16", role: "contributor", products: ["imerg", "merra2"], agency: "NOAA", instrument: "ABI", geo: true,
    es: "Geoestacionario sobre América (a 35 786 km; aquí se dibuja más cerca). Su infrarrojo rellena huecos de la lluvia (IMERG) y sus vientos de nubes van a MERRA-2.",
    en: "Geostationary over the Americas (35,786 km up; drawn closer here). Its infrared fills rainfall gaps (IMERG) and its cloud-motion winds feed MERRA-2." },
  { norad: 51850, name: "GOES-18", role: "contributor", products: ["imerg", "merra2"], agency: "NOAA", instrument: "ABI", geo: true,
    es: "Geoestacionario sobre el Pacífico este. Igual que GOES-16: infrarrojo para IMERG y vientos para MERRA-2.",
    en: "Geostationary over the eastern Pacific. Like GOES-16: infrared for IMERG and winds for MERRA-2." },
  { norad: 38552, name: "Meteosat-10", role: "contributor", products: ["imerg", "merra2"], agency: "EUMETSAT", instrument: "SEVIRI", geo: true,
    es: "Geoestacionario sobre Europa y África: infrarrojo para IMERG y vientos para MERRA-2.",
    en: "Geostationary over Europe and Africa: infrared for IMERG and winds for MERRA-2." },
  { norad: 41836, name: "Himawari-9", role: "contributor", products: ["imerg", "merra2"], agency: "JMA", instrument: "AHI", geo: true,
    es: "Geoestacionario japonés sobre Asia y Oceanía: infrarrojo para IMERG y vientos para MERRA-2.",
    en: "Japanese geostationary over Asia and Oceania: infrared for IMERG and winds for MERRA-2." },
  // ---- no usados en los datos de esta web
  { norad: 25544, name: "ISS", role: "other", products: [], agency: "International", instrument: "GEDI, ECOSTRESS",
    es: "Estación Espacial Internacional. Lleva GEDI (altura de bosques) y ECOSTRESS (estrés de las plantas). No usamos sus datos.",
    en: "International Space Station. It carries GEDI (forest height) and ECOSTRESS (plant stress). We don't use its data." },
  { norad: 49260, name: "Landsat 9", role: "other", products: [], agency: "NASA / USGS", instrument: "OLI-2, TIRS-2",
    es: "Imágenes a 30 m: deforestación, ciudades y cultivos. No usamos sus datos.",
    en: "30 m imagery: deforestation, cities and crops. We don't use its data." },
  { norad: 40376, name: "SMAP", role: "other", products: [], agency: "NASA", instrument: "Radiometer",
    es: "Mide la humedad del SUELO (nuestra humedad es del aire). No usamos sus datos.",
    en: "Measures SOIL moisture (our humidity is the air's). We don't use its data." },
  { norad: 43613, name: "ICESat-2", role: "other", products: [], agency: "NASA", instrument: "ATLAS (laser)",
    es: "Láser que mide el grosor del hielo polar y la altura de los árboles. No usamos sus datos.",
    en: "Laser measuring polar ice thickness and tree height. We don't use its data." },
];

export const SAT_META: SatMeta[] = DEFS.map((d) => ({
  ...d,
  color: ROLE_STYLE[d.role].color,
  layers: [...new Set(d.products.flatMap((p) => PRODUCT_INFO[p].layers))],
}));

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
    if (p) out.push([p.lat, p.lng, altToRadius(p.altKm)]);
  }
  return out;
}

// altura en radios terrestres para dibujar; los geoestacionarios (~35 786 km = 5,6 radios) se acercan
// a 0,6 radios para que entren en pantalla (la ficha muestra la altitud real)
export const altToRadius = (altKm: number) => (altKm > 20000 ? 0.6 : altKm / R_EARTH);
