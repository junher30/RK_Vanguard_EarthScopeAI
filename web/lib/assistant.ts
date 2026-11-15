"use client";

import { create } from "zustand";

export type Mood = "idle" | "greet" | "thinking" | "talking" | "pointing";

// Estado del asistente EarthScope AI: chat abierto, recorrido guiado y "mood" (pensando, hablando…)
// que usan el chat, la llamada de voz, las historias y el modo VR para mostrar actividad.
type AssistantState = {
  mood: Mood;
  chatOpen: boolean;
  tour: boolean;
  setTour: (t: boolean) => void;
  setMood: (m: Mood) => void;
  setChatOpen: (o: boolean) => void;
  // pregunta pendiente para el chat (la manda otra parte de la web)
  pending: string | null;
  ask: (q: string) => void;
  // estado temporal que vuelve a idle solo
  pulse: (m: Mood, ms: number) => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;

export const useAssistant = create<AssistantState>()((set) => ({
  mood: "idle",
  chatOpen: false,
  tour: false,
  setTour: (tour) => set({ tour }),
  setMood: (mood) => {
    if (timer) clearTimeout(timer);
    set({ mood });
  },
  setChatOpen: (chatOpen) => set({ chatOpen }),
  pending: null,
  ask: (q) => set({ pending: q, chatOpen: true }),
  pulse: (mood, ms) => {
    if (timer) clearTimeout(timer);
    set({ mood });
    timer = setTimeout(() => set({ mood: "idle" }), ms);
  },
}));
