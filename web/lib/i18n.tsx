"use client";

// idioma de la interfaz (ES/EN). La IA responde en el idioma en que le hablen; si no queda claro, en este.
import { create } from "zustand";

export type Lang = "es" | "en";
const KEY = "earthscope-lang";

type LangStore = { lang: Lang; setLang: (l: Lang) => void };

export const useLang = create<LangStore>((set) => ({
  lang: "en",
  setLang: (lang) => {
    try { localStorage.setItem(KEY, lang); } catch { /* sin almacenamiento */ }
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

// se llama una vez en el cliente: idioma guardado o el del navegador
export function initLang() {
  let l: string | null = null;
  try { l = localStorage.getItem(KEY); } catch { /* */ }
  if (l !== "es" && l !== "en") l = navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
  useLang.getState().setLang(l as Lang);
}

export type T = (es: string, en: string) => string;
export const useT = (): T => {
  const lang = useLang((s) => s.lang);
  return (es, en) => (lang === "es" ? es : en);
};
export const tr: T = (es, en) => (useLang.getState().lang === "es" ? es : en);

// nombres de variables y veredictos que vienen en inglés de los datos
const VAR_ES: Record<string, [string, string]> = {
  precip_mm_day: ["Lluvia", "Precipitación"],
  evi: ["Vegetación", "Vegetación (EVI)"],
  lst_day_c: ["Temp. superficie", "Temperatura de superficie"],
  t2m_c: ["Temp. aire", "Temperatura del aire"],
  rh2m_pct: ["Humedad", "Humedad relativa"],
};
const VAR_EN_SHORT: Record<string, string> = {
  precip_mm_day: "Rain", evi: "Vegetation", lst_day_c: "Surface temp.", t2m_c: "Air temp.", rh2m_pct: "Humidity",
};
export const varShort = (key: string, en: string) => (useLang.getState().lang === "es" ? VAR_ES[key]?.[0] ?? en : en);
// nombre corto para lecturas cuando no hay manifiesto a mano
export const varName = (key: string) => (useLang.getState().lang === "es" ? VAR_ES[key]?.[0] : VAR_EN_SHORT[key]) ?? key;
export const varLabel = (key: string, en: string) => (useLang.getState().lang === "es" ? VAR_ES[key]?.[1] ?? en : en);

const VERDICT_ES: Record<string, string> = {
  "significant increasing trend": "tendencia creciente significativa",
  "significant decreasing trend": "tendencia decreciente significativa",
  "no statistically significant trend": "sin tendencia estadísticamente significativa",
};
export const verdict = (v: string) => (useLang.getState().lang === "es" ? VERDICT_ES[v] ?? v : v);
export const units = (u: string) => (useLang.getState().lang === "es" ? u.replace("mm/day", "mm/día").replace("index", "índice") : u);

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-[2px] border border-line p-0.5 font-mono text-[11px]" role="group" aria-label="Language">
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-[2px] px-2 py-1 font-mono uppercase transition-colors ${lang === l ? "bg-ink text-black" : "text-muted hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
