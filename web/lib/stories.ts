"use client";

// Modo Historia: misiones narradas. Cada paso mueve el globo y la IA lo cuenta con voz.
// Las cifras salen de las series NASA del proyecto (public/data/*/series) — revisarlas si se regeneran los datos.
import { create } from "zustand";
import { API_BASE } from "./api";
import { runActions, type AgentAction } from "./agentActions";
import { useAssistant } from "./assistant";
import { tr } from "./i18n";
import { useEvents } from "./events";
import { useForecast } from "./forecast";
import { useLayer } from "./data";

export type StoryStep = {
  es: string;
  en: string;
  actions?: AgentAction[];
  stat?: { value: string; es: string; en: string };
  // pasos que dependen de algo en vivo (eventos, predicción)
  when?: () => boolean;
  dynamic?: () => Partial<StoryStep>;
};

export type Story = { id: string; es: string; en: string; subEs: string; subEn: string; color: string; steps: StoryStep[] };

const hasForecast = (v: string) => () => {
  const f = useForecast.getState();
  return f.available && f.variables.includes(v) && f.years.some((y) => y > 2024);
};
const lastForecast = () => Math.max(...useForecast.getState().years);

export const STORIES: Story[] = [
  {
    id: "warming",
    es: "El planeta se calienta", en: "A warming planet",
    subEs: "24 años de temperatura del aire, de la NASA", subEn: "24 years of NASA air temperature",
    color: "#f97316",
    steps: [
      {
        es: "Esta es la Tierra vista por los satélites y modelos de la NASA entre 2001 y 2024. Vamos a seguir la temperatura del aire, año por año.",
        en: "This is Earth as NASA satellites and models saw it from 2001 to 2024. Let's follow air temperature, year by year.",
        actions: [{ type: "clear" }, { type: "fly", lat: 20, lng: -30, altitude: 2.6 }, { type: "layer", variable: "t2m_c", mode: "anomaly", year: 2001, play: true }],
      },
      {
        es: "Rojo es más caliente de lo normal, azul más frío. Mira cómo el rojo gana terreno en los años recientes.",
        en: "Red is warmer than normal, blue is cooler. Watch red take over in recent years.",
        actions: [{ type: "fly", lat: 45, lng: 60, altitude: 2.4 }],
      },
      {
        es: "Sumando todo el planeta, el aire se calentó unos 0.35 grados en 24 años. La tendencia es estadísticamente significativa, aunque se apoya en los récords de calor de 2023 y 2024.",
        en: "Across the whole planet, the air warmed by about 0.35 degrees in 24 years. The trend is statistically significant, though it leans on the record-warm 2023 and 2024.",
        stat: { value: "+0.35 °C", es: "aire, 2001–2024 (MERRA-2)", en: "air, 2001–2024 (MERRA-2)" },
        actions: [{ type: "play", on: false }, { type: "layer", variable: "t2m_c", mode: "trend" }, { type: "fly", lat: 60, lng: 20, altitude: 2.2 }],
      },
      {
        es: "El 42 por ciento de la superficie muestra una tendencia significativa, y en más del 90 por ciento de esos lugares es calentamiento. Por puro azar esperaríamos un 5.",
        en: "42 percent of the surface shows a significant trend, and over 90 percent of those places are warming. By chance alone we'd expect 5.",
        stat: { value: "42%", es: "del planeta con tendencia significativa", en: "of the planet with a significant trend" },
        actions: [{ type: "fly", lat: 70, lng: -40, altitude: 2.0 }],
      },
      {
        es: "Y esto es lo que nuestra red neuronal proyecta para los próximos años. Es una estimación: donde el color se desvanece, la red duda más.",
        en: "And this is what our neural network projects for the coming years. It's an estimate: where colors fade, the network is less certain.",
        when: hasForecast("t2m_c"),
        dynamic: () => ({ actions: [{ type: "layer", variable: "t2m_c", mode: "value", year: lastForecast() }, { type: "fly", lat: 20, lng: 0, altitude: 2.4 }] }),
      },
    ],
  },
  {
    id: "amazon",
    es: "La Amazonía bajo presión", en: "The Amazon under pressure",
    subEs: "Lluvia, calor y selva en el caso de estudio", subEn: "Rain, heat and forest in the case study",
    color: "#22c55e",
    steps: [
      {
        es: "Entramos a la Amazonía central, el corazón del caso de estudio, con mapas de alta resolución.",
        en: "We're entering the central Amazon, the heart of our case study, with high-resolution maps.",
        actions: [{ type: "clear" }, { type: "scope", scope: "amazon" }, { type: "layer", variable: "precip_mm_day", mode: "anomaly", year: 2001, play: true, scope: "amazon" }],
      },
      {
        es: "Esta es la lluvia comparada con lo normal. En marrón, los años secos: fíjate en las sequías de 2005, 2010, 2015 y 2023.",
        en: "This is rain compared with normal. Brown marks dry years: look at the droughts of 2005, 2010, 2015 and 2023.",
      },
      {
        es: "En 24 años la lluvia bajó cerca de un 11 por ciento. La señal es real pero frágil: depende de esos pocos años extremos.",
        en: "Over 24 years rainfall dropped by about 11 percent. The signal is real but fragile: it hinges on those few extreme years.",
        stat: { value: "−11%", es: "lluvia, 2001–2024 (GPM IMERG)", en: "rainfall, 2001–2024 (GPM IMERG)" },
        actions: [{ type: "play", on: false }, { type: "layer", variable: "precip_mm_day", mode: "trend" }, { type: "fly", lat: -4, lng: -60, altitude: 1.3 }],
      },
      {
        es: "Mientras tanto, la superficie se calentó unos 0.7 grados. Esta tendencia sí es robusta en todas las pruebas.",
        en: "Meanwhile, the land surface warmed by about 0.7 degrees. This trend holds up in every test.",
        stat: { value: "+0.7 °C", es: "superficie, de día (MODIS)", en: "land surface, daytime (MODIS)" },
        actions: [{ type: "layer", variable: "lst_day_c", mode: "trend" }, { type: "fly", lat: -4, lng: -60, altitude: 1.3 }],
      },
      {
        es: "Menos lluvia y más calor: la combinación que más estresa a una selva tropical. Marca cualquier punto y la IA te lo analiza.",
        en: "Less rain and more heat: the combination that stresses a rainforest the most. Mark any point and the AI will analyze it for you.",
        actions: [{ type: "select", lat: -3.1, lng: -60.0 }, { type: "fly", lat: -3.1, lng: -60, altitude: 1.0 }],
      },
    ],
  },
  {
    id: "greening",
    es: "La Tierra reverdece", en: "Earth is greening",
    subEs: "Lo que el satélite MODIS vio crecer", subEn: "What the MODIS satellite saw grow",
    color: "#4ade80",
    steps: [
      {
        es: "No todo son malas noticias. Este es el índice de vegetación del satélite MODIS: mientras más verde, más vida vegetal.",
        en: "Not everything is bad news. This is the vegetation index from the MODIS satellite: the greener, the more plant life.",
        actions: [{ type: "clear" }, { type: "fly", lat: 15, lng: 20, altitude: 2.6 }, { type: "layer", variable: "evi", mode: "value", year: 2001, play: true }],
      },
      {
        es: "Desde 2001 la vegetación del planeta aumentó un 6 por ciento, una tendencia robusta en todas las pruebas.",
        en: "Since 2001 the planet's vegetation has grown by 6 percent, a trend that holds up in every test.",
        stat: { value: "+6.3%", es: "vegetación global (EVI)", en: "global vegetation (EVI)" },
        actions: [{ type: "play", on: false }, { type: "layer", variable: "evi", mode: "trend" }],
      },
      {
        es: "Casi la mitad de la superficie cambió de forma significativa, y en su gran mayoría hacia más verde. India y China destacan; los estudios lo atribuyen sobre todo a la agricultura y la reforestación.",
        en: "Almost half of the land changed significantly, mostly toward greener. India and China stand out; studies attribute it mainly to farming and tree planting.",
        stat: { value: "42%", es: "de la superficie reverdeció", en: "of the land got greener" },
        actions: [{ type: "fly", lat: 27, lng: 90, altitude: 1.6 }],
      },
      {
        es: "Pero más verde no siempre significa más sano: cultivos no son bosques. Por eso EarthScope cruza varias variables antes de concluir.",
        en: "But greener doesn't always mean healthier: crops aren't forests. That's why EarthScope cross-checks several variables before concluding.",
        actions: [{ type: "fly", lat: 0, lng: 20, altitude: 2.4 }],
      },
    ],
  },
  {
    id: "live",
    es: "El planeta, ahora mismo", en: "The planet, right now",
    subEs: "Eventos naturales activos según la NASA", subEn: "Active natural events according to NASA",
    color: "#38bdf8",
    steps: [
      {
        es: "Dejemos el pasado. Esto es lo que la NASA está rastreando en este momento: incendios, tormentas, volcanes.",
        en: "Let's leave the past. This is what NASA is tracking right now: wildfires, storms, volcanoes.",
        actions: [{ type: "clear" }, { type: "hide" }, { type: "events", on: true }, { type: "fly", lat: 10, lng: -40, altitude: 2.8 }],
      },
      {
        es: "Cada punto es un evento activo reportado por satélites.",
        en: "Each dot is an active event reported by satellites.",
        dynamic: () => {
          const ev = useEvents.getState().events;
          if (!ev.length) return {};
          const n = ev.length;
          return {
            es: `Ahora mismo hay ${n} eventos naturales activos en el planeta. Cada punto lo reportó un satélite.`,
            en: `Right now there are ${n} active natural events on the planet. Each dot was reported by a satellite.`,
            stat: { value: String(n), es: "eventos activos (NASA EONET)", en: "active events (NASA EONET)" },
          };
        },
      },
      {
        es: "Vamos al más reciente.",
        en: "Let's go to the most recent one.",
        dynamic: () => {
          const e = useEvents.getState().events[0];
          if (!e) return {};
          return {
            es: `Vamos al más reciente: ${e.title}, reportado el ${e.date}.`,
            en: `Let's go to the most recent one: ${e.title}, reported on ${e.date}.`,
            actions: [{ type: "fly", lat: e.lat, lng: e.lng, altitude: 1.2 }],
          };
        },
      },
      {
        es: "Toca cualquier evento y pídele a la IA que lo analice con 24 años de datos de esa zona.",
        en: "Tap any event and ask the AI to analyze it with 24 years of data from that area.",
        actions: [{ type: "zoom", dir: "out" }],
      },
    ],
  },
];

// reproductor
type StoryState = {
  story: Story | null;
  step: number;
  paused: boolean;
  text: string;
  stat: StoryStep["stat"] | null;
  menu: boolean;
  setMenu: (m: boolean) => void;
  start: (id: string) => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  togglePause: () => void;
};

let run = 0;
let audio: HTMLAudioElement | null = null;

export const useStory = create<StoryState>((set, get) => ({
  story: null, step: 0, paused: false, text: "", stat: null, menu: false,
  setMenu: (menu) => set({ menu }),
  start: (id) => {
    const story = STORIES.find((s) => s.id === id);
    if (!story) return;
    useAssistant.getState().setChatOpen(false);
    set({ story: { ...story, steps: story.steps.filter((s) => !s.when || s.when()) }, step: 0, paused: false, menu: false });
    // los eventos en vivo se piden antes para que estén listos
    if (id === "live") useEvents.getState().setOn(true);
    play();
  },
  stop: () => {
    run++;
    hush();
    useLayer.getState().setPlaying(false);
    useAssistant.getState().setMood("idle");
    set({ story: null, text: "", stat: null });
  },
  next: () => {
    const { story, step } = get();
    if (!story) return;
    if (step + 1 >= story.steps.length) { get().stop(); return; }
    set({ step: step + 1, paused: false });
    play();
  },
  prev: () => {
    const { story, step } = get();
    if (!story) return;
    set({ step: Math.max(0, step - 1), paused: false });
    play();
  },
  togglePause: () => {
    const p = !get().paused;
    set({ paused: p });
    if (p) { run++; hush(); useAssistant.getState().setMood("idle"); } else play();
  },
}));

function hush() {
  if (audio) { audio.pause(); audio = null; }
  if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
}

async function play() {
  const id = ++run;
  hush();
  const { story, step } = useStory.getState();
  if (!story) return;
  // los eventos en vivo pueden tardar un poco
  if (story.id === "live") {
    for (let i = 0; i < 20 && useEvents.getState().status === "loading"; i++) await sleep(250);
  }
  const base = story.steps[step];
  const s = { ...base, ...(base.dynamic?.() ?? {}) };
  const text = tr(s.es, s.en);
  useStory.setState({ text, stat: s.stat ?? null });
  runActions(s.actions);
  useAssistant.getState().setMood("talking");
  const t0 = performance.now();
  await speak(text, id);
  if (id !== run) return;
  useAssistant.getState().setMood("idle");
  // tiempo mínimo para mirar el globo
  const left = 2200 - (performance.now() - t0) + 1400;
  await sleep(Math.max(1200, left));
  if (id !== run || useStory.getState().paused) return;
  useStory.getState().next();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function speak(text: string, id: number) {
  try {
    const r = await fetch(`${API_BASE}/api/v1/agent/speak`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (r.ok) {
      const url = URL.createObjectURL(await r.blob());
      if (id !== run) return;
      await new Promise<void>((done) => {
        audio = new Audio(url);
        audio.onended = audio.onerror = audio.onpause = () => done();
        audio.play().catch(() => done());
      });
      URL.revokeObjectURL(url);
      return;
    }
  } catch { /* sin backend de voz */ }
  if (id !== run) return;
  // respaldo: voz del sistema, o solo el tiempo de lectura
  if ("speechSynthesis" in window && speechSynthesis.getVoices().length) {
    await new Promise<void>((done) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = tr("es-ES", "en-US");
      u.rate = 1.05;
      u.onend = u.onerror = () => done();
      speechSynthesis.speak(u);
    });
  } else {
    await sleep(900 + text.length * 55);
  }
}
