"use client";

// imágenes NASA GIBS en mosaicos: más detalle a medida que te acercas
import SlippyMap from "three-slippy-map-globe";

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

// plantillas candidatas, se usa la primera que responda
const DAY = [
  `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`,
  `${GIBS}/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`,
  `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/2004-08-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`,
];
const NIGHT = [
  `${GIBS}/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`,
  `${GIBS}/VIIRS_Black_Marble/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
  `${GIBS}/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
];
export const MAX_LEVEL = 8;

const fill = (tpl: string, x: number, y: number, z: number) =>
  tpl.replace("{x}", String(x)).replace("{y}", String(y)).replace("{z}", String(z));

const probe = (url: string) =>
  new Promise<boolean>((ok) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const t = setTimeout(() => ok(false), 8000);
    img.onload = () => { clearTimeout(t); ok(img.naturalWidth > 0); };
    img.onerror = () => { clearTimeout(t); ok(false); };
    img.src = url;
  });

const chosen = new Map<string, Promise<string | null>>();
function pick(kind: "day" | "night") {
  if (!chosen.has(kind)) {
    const list = kind === "day" ? DAY : NIGHT;
    chosen.set(kind, (async () => {
      for (const tpl of list) if (await probe(fill(tpl, 2, 1, 2))) return tpl;
      return null;
    })());
  }
  return chosen.get(kind)!;
}

export type Detail = { obj: SlippyMap; setImagery: (k: "day" | "night") => void };

// capa de detalle sobre el globo base; si GIBS no responde, no se muestra y queda la textura base
export function createDetail(radius: number, minLevel = 2): Detail {
  const obj = new SlippyMap(radius, { minLevel, maxLevel: MAX_LEVEL, mercatorProjection: true });
  let want: "day" | "night" = "day";
  const setImagery = (k: "day" | "night") => {
    want = k;
    pick(k).then((tpl) => {
      if (want !== k) return;
      obj.visible = !!tpl;
      obj.tileUrl = tpl ? ((x: number, y: number, l: number) => fill(tpl, x, y, l)) as never : (undefined as never);
      if (tpl) obj.clearTiles();
    });
  };
  obj.visible = false;
  return { obj, setImagery };
}
