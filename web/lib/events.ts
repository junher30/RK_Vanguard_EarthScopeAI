"use client";

// eventos naturales activos (NASA EONET): incendios, tormentas, volcanes, inundaciones…
import { create } from "zustand";
import { API_BASE } from "./api";
import { tr } from "./i18n";

export type GeoEvent = {
  id: string; title: string; kind: string; category: string;
  lat: number; lng: number; date: string; link?: string; magnitude?: string; track?: [number, number][];
};

export const EVENT_STYLE: Record<string, { color: string; es: string; en: string }> = {
  fire: { color: "#fb923c", es: "Incendio", en: "Wildfire" },
  storm: { color: "#a78bfa", es: "Tormenta", en: "Storm" },
  volcano: { color: "#f43f5e", es: "Volcán", en: "Volcano" },
  flood: { color: "#38bdf8", es: "Inundación", en: "Flood" },
  ice: { color: "#e0f2fe", es: "Hielo marino", en: "Sea ice" },
  dust: { color: "#d6a35c", es: "Polvo y humo", en: "Dust & haze" },
  heat: { color: "#ef4444", es: "Temperatura extrema", en: "Extreme heat" },
  drought: { color: "#eab308", es: "Sequía", en: "Drought" },
  quake: { color: "#fde047", es: "Sismo", en: "Earthquake" },
  landslide: { color: "#a16207", es: "Deslizamiento", en: "Landslide" },
  snow: { color: "#f8fafc", es: "Nieve", en: "Snow" },
  other: { color: "#facc15", es: "Evento", en: "Event" },
};
export const eventStyle = (k: string) => EVENT_STYLE[k] ?? EVENT_STYLE.other;
export const eventKindName = (k: string) => tr(eventStyle(k).es, eventStyle(k).en);

type EventsStore = {
  on: boolean;
  events: GeoEvent[];
  status: "idle" | "loading" | "ok" | "error";
  setOn: (on: boolean) => void;
};

export const useEvents = create<EventsStore>((set, get) => ({
  on: false,
  events: [],
  status: "idle",
  setOn: (on) => {
    set({ on });
    if (on && get().status !== "ok" && get().status !== "loading") load();
  },
}));

function load() {
  useEvents.setState({ status: "loading" });
  fetch(`${API_BASE}/api/v1/events`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { events: GeoEvent[] }) => useEvents.setState({ events: d.events, status: "ok" }))
    .catch(() => useEvents.setState({ status: "error" }));
}
