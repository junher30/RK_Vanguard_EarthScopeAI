"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { runActions, type AgentAction } from "@/lib/agentActions";
import { useAssistant, type Mood } from "@/lib/assistant";
import { useLang } from "@/lib/i18n";

const KEY = "earthscope-tour-done";

type Step = { es: string; en: string; mood: Mood; actions?: AgentAction[] };

const STEPS: Step[] = [
  {
    es: "Sistema EarthScope en línea. 24 años de datos NASA del planeta entero, listos para analizar. Briefing de 30 segundos.",
    en: "EarthScope system online. 24 years of NASA data for the whole planet, ready to analyze. 30-second briefing.",
    mood: "greet",
  },
  {
    es: "Objetivo: cualquier punto del planeta. Haz clic en el globo o escribe coordenadas. Fijando Cartagena.",
    en: "Target: any point on the planet. Click the globe or type coordinates. Locking on Cartagena.",
    mood: "pointing",
    actions: [{ type: "fly", lat: 10.39, lng: -75.51, altitude: 1.5 }, { type: "select", lat: 10.39, lng: -75.51 }],
  },
  {
    es: "Abajo eliges el sensor: lluvia, vegetación, temperatura o humedad. Activando vegetación (MODIS).",
    en: "Below you pick the sensor: rain, vegetation, temperature or humidity. Activating vegetation (MODIS).",
    mood: "pointing",
    actions: [{ type: "layer", variable: "evi", mode: "value", year: 2024 }],
  },
  {
    es: "La línea de tiempo recorre 2001 a 2024. Observa el planeta cambiar, año por año.",
    en: "The timeline runs from 2001 to 2024. Watch the planet change, year by year.",
    mood: "talking",
    actions: [{ type: "layer", variable: "evi", mode: "value", year: 2001, play: true }],
  },
  {
    es: "Modo Tendencia: revela dónde cambió el planeta en 24 años. Lo tenue no es estadísticamente claro.",
    en: "Trend mode: reveals where the planet changed over 24 years. Faint areas are not statistically clear.",
    mood: "pointing",
    actions: [{ type: "play", on: false }, { type: "layer", variable: "evi", mode: "trend" }],
  },
  {
    es: "A la izquierda, el reporte del punto: serie histórica, tendencia y nivel de confianza.",
    en: "On the left, the point report: history, trend and confidence level.",
    mood: "talking",
  },
  {
    es: "Y yo: háblame o escríbeme. Analizo, te muestro una proyección experimental hasta 2030 y te llevo a cualquier lugar del planeta.",
    en: "And me: talk or type to me. I analyze, show an experimental projection to 2030 and take you anywhere on the planet.",
    mood: "greet",
  },
];

export default function Tutorial() {
  const tour = useAssistant((s) => s.tour);

  // la primera visita arranca sola
  useEffect(() => {
    let done = false;
    try { done = localStorage.getItem(KEY) === "1"; } catch { /* sin almacenamiento */ }
    if (done) return;
    const t = setTimeout(() => useAssistant.getState().setTour(true), 900);
    return () => clearTimeout(t);
  }, []);

  return <AnimatePresence>{tour && <Bubble key="tour" />}</AnimatePresence>;
}

// se monta en cada recorrido, así empieza siempre en el paso 1
function Bubble() {
  const [i, setI] = useState(0);
  const es = useLang((st) => st.lang) === "es";

  useEffect(() => {
    const s = STEPS[i];
    runActions(s.actions);
    useAssistant.getState().pulse(s.mood, s.mood === "greet" ? 1000 : 2600);
  }, [i]);

  const finish = (openChat: boolean) => {
    try { localStorage.setItem(KEY, "1"); } catch { /* sin almacenamiento */ }
    useAssistant.getState().setTour(false);
    if (openChat) useAssistant.getState().setChatOpen(true);
  };

  const last = i === STEPS.length - 1;
  const t = (a: string, b: string) => (es ? a : b);

  return (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="holo-panel absolute bottom-24 right-4 z-40 w-[min(360px,calc(100vw-2rem))] p-4 lg:bottom-[92px] lg:right-[90px]"
          role="dialog"
          aria-label={t("Recorrido guiado", "Guided tour")}
        >
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">
            <span className="size-1.5 animate-pulse rounded-full bg-cyan" />
            {t("Briefing de misión", "Mission briefing")}
            <span className="ml-auto text-muted">{String(i + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-[15px] font-medium leading-relaxed text-ink"
            >
              <Typed text={t(STEPS[i].es, STEPS[i].en)} />
            </motion.p>
          </AnimatePresence>
          <div className="mt-4 flex items-center gap-2">
            <div className="mr-auto flex gap-1" aria-hidden>
              {STEPS.map((_, j) => (
                <span key={j} className={`h-1.5 rounded-full transition-all ${j === i ? "w-4 bg-cyan" : "w-1.5 bg-white/25"}`} />
              ))}
            </div>
            {!last && (
              <button onClick={() => finish(false)} className="px-2 text-xs text-muted hover:text-ink">
                {t("Saltar", "Skip")}
              </button>
            )}
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="btn !px-3 !py-1.5 text-xs">
                {t("Atrás", "Back")}
              </button>
            )}
            <button onClick={() => (last ? finish(true) : setI(i + 1))} className="btn-primary !px-3 !py-1.5 text-xs">
              {last ? t("Iniciar misión", "Start mission") : t("Siguiente", "Next")}
            </button>
          </div>
          {/* línea hacia el botón del asistente */}
          <span className="absolute -bottom-6 right-12 hidden h-6 w-px bg-gradient-to-b from-cyan to-transparent lg:block" />
        </motion.div>
  );
}

// texto que se escribe como en una consola
function Typed({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((k) => (k >= text.length ? k : k + 2)), 16);
    return () => clearInterval(id);
  }, [text]);
  return (
    <>
      {text.slice(0, n)}
      <span className="opacity-0">{text.slice(n)}</span>
    </>
  );
}
