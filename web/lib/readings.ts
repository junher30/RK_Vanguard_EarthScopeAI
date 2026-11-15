// Lecturas en palabras simples: qué significa cada color y cada cifra para alguien que no
// conoce la variable. Solo da formato a resultados que ya calculó el backend (no calcula ciencia).
import type { MapMode } from "./data";

type Words = {
  lowEs: string; lowEn: string; highEs: string; highEn: string;     // extremos del mapa de valores
  lessEs: string; lessEn: string; moreEs: string; moreEn: string;   // extremos de anomalía / tendencia
  whatEs: string; whatEn: string;                                    // qué es, en una frase
};

const W: Record<string, Words> = {
  precip_mm_day: {
    lowEs: "poca lluvia", lowEn: "little rain", highEs: "mucha lluvia", highEn: "a lot of rain",
    lessEs: "más seco", lessEn: "drier", moreEs: "más lluvioso", moreEn: "wetter",
    whatEs: "Cuánta lluvia cae en promedio por día.", whatEn: "How much rain falls per day, on average.",
  },
  evi: {
    lowEs: "poco verde", lowEn: "barely green", highEs: "muy verde", highEn: "very green",
    lessEs: "menos verde", lessEn: "less green", moreEs: "más verde", moreEn: "greener",
    whatEs: "Qué tan verde y frondosa está la vegetación vista desde el espacio.", whatEn: "How green and leafy the vegetation looks from space.",
  },
  lst_day_c: {
    lowEs: "suelo frío", lowEn: "cold ground", highEs: "suelo caliente", highEn: "hot ground",
    lessEs: "más frío", lessEn: "cooler", moreEs: "más caliente", moreEn: "warmer",
    whatEs: "La temperatura del suelo de día (no la del aire).", whatEn: "The ground's daytime temperature (not the air's).",
  },
  t2m_c: {
    lowEs: "aire frío", lowEn: "cold air", highEs: "aire caliente", highEn: "hot air",
    lessEs: "más frío", lessEn: "cooler", moreEs: "más caliente", moreEn: "warmer",
    whatEs: "La temperatura del aire a 2 m, como la de un termómetro.", whatEn: "Air temperature at 2 m, like a thermometer reading.",
  },
  rh2m_pct: {
    lowEs: "aire seco", lowEn: "dry air", highEs: "aire húmedo", highEn: "humid air",
    lessEs: "más seco", lessEn: "drier", moreEs: "más húmedo", moreEn: "more humid",
    whatEs: "Cuánta humedad tiene el aire respecto del máximo posible.", whatEn: "How much moisture the air holds compared with the maximum possible.",
  },
};

const FALLBACK: Words = {
  lowEs: "bajo", lowEn: "low", highEs: "alto", highEn: "high",
  lessEs: "menos", lessEn: "less", moreEs: "más", moreEn: "more",
  whatEs: "", whatEn: "",
};

export const readingWords = (key: string): Words => W[key] ?? FALLBACK;

/** "¿Qué estoy viendo?" en una frase, según la variable y el modo del mapa. */
export function modeHint(key: string, mode: MapMode, year: number, first: number, last: number, es: boolean) {
  const w = readingWords(key);
  if (mode === "value")
    return es
      ? `${w.whatEs} Promedio de ${year}: de ${w.lowEs} a ${w.highEs}.`
      : `${w.whatEn} ${year} average: from ${w.lowEn} to ${w.highEn}.`;
  if (mode === "anomaly")
    return es
      ? `Cómo fue ${year} frente a lo normal (${first}–${last}): ${w.lessEs} o ${w.moreEs} que el promedio. Blanco = normal.`
      : `How ${year} compared with normal (${first}–${last}): ${w.lessEn} or ${w.moreEn} than average. White = normal.`;
  return es
    ? `Cuánto cambió por década entre ${first} y ${last}. Colores fuertes: cambio claro; desvaído: sin cambio claro.`
    : `How much it changed per decade from ${first} to ${last}. Strong colors: clear change; faded: no clear change.`;
}

/** Resumen del análisis en palabras simples (a partir del veredicto y la pendiente del backend). */
export function plainTrend(
  key: string, verdict: string, slopePerYear: number, units: string, decimals: number, robust: boolean, es: boolean,
) {
  const w = readingWords(key);
  const perDecade = slopePerYear * 10;
  const amount = `${Math.abs(perDecade).toFixed(Math.max(1, decimals))} ${units}`;
  if (!verdict.startsWith("significant"))
    return es
      ? "En palabras simples: no hay un cambio claro; las subidas y bajadas se parecen a la variación normal de un año a otro."
      : "In plain words: no clear change; the ups and downs look like normal year-to-year variation.";
  const dir = perDecade > 0 ? (es ? w.moreEs : w.moreEn) : (es ? w.lessEs : w.lessEn);
  const caveat = robust ? "" : es
    ? " Ojo: depende mucho de los últimos o primeros años, así que es una señal frágil."
    : " Careful: it leans heavily on the first or last years, so the signal is fragile.";
  return es
    ? `En palabras simples: se está volviendo ${dir}, unos ${amount} por década, y es muy poco probable que sea casualidad.${caveat}`
    : `In plain words: it is getting ${dir}, by about ${amount} per decade, and that is very unlikely to be chance.${caveat}`;
}

/** Explicaciones cortas para los "?" de cada cifra. */
export const GLOSSARY = {
  sen: ["Pendiente de Sen: cuánto sube o baja por año, sin que los años raros la distorsionen.",
    "Sen slope: how much it goes up or down per year, without odd years distorting it."],
  change: ["Cambio total en el período, como porcentaje del promedio.",
    "Total change over the period, as a percentage of the average."],
  p: ["Valor p: la probabilidad de ver una tendencia así solo por azar. Menos de 0,05 = tendencia clara.",
    "p-value: the chance of seeing a trend like this by luck alone. Below 0.05 = clear trend."],
  robust: ["Robustez: repetimos el análisis quitando los primeros y los últimos años. Si cambia la conclusión, la señal es frágil.",
    "Robustness: we redo the analysis without the first and last years. If the conclusion changes, the signal is fragile."],
} as const;
