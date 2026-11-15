"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LatLng } from "./geo";
import { toFeature } from "./geo";

export type Selection = {
  lat: number;
  lng: number;
  surface: "land" | "water" | "unknown";
  country: string | null;
  regionKey: string | null;
};

export type StudyZone = Selection & { confirmedAt: string };

export type AreaFeature = ReturnType<typeof toFeature>;

export type Draw = {
  status: "off" | "drawing" | "closed";
  vertices: LatLng[];
  past: LatLng[][];
};

const OFF: Draw = { status: "off", vertices: [], past: [] };

type ExplorerState = {
  selection: Selection | null;
  zone: StudyZone | null;
  area: AreaFeature | null;
  draw: Draw;
  select: (s: Selection) => void;
  clear: () => void;
  confirm: () => StudyZone | null;
  startDraw: () => void;
  addVertex: (v: LatLng) => void;
  closeShape: () => void;
  checkpoint: () => void;
  moveVertex: (i: number, v: LatLng) => void;
  insertVertex: (i: number, v: LatLng) => void;
  removeVertex: (i: number) => void;
  undo: () => void;
  cancelDraw: () => void;
  confirmArea: (properties: Record<string, unknown>) => AreaFeature | null;
  editArea: () => void;
};

const push = (d: Draw): LatLng[][] => [...d.past.slice(-49), d.vertices];

export const useExplorer = create<ExplorerState>()(
  persist(
    (set, get) => ({
      selection: null,
      zone: null,
      area: null,
      draw: OFF,
      select: (selection) => set({ selection }),
      clear: () => set({ selection: null, zone: null, area: null, draw: OFF }),
      confirm: () => {
        const s = get().selection;
        if (!s) return null;
        const { lat, lng, surface, country, regionKey } = s;
        const zone: StudyZone = { lat, lng, surface, country, regionKey, confirmedAt: new Date().toISOString() };
        set({ zone, area: null });
        window.dispatchEvent(new CustomEvent("earthscope:zone-confirmed", { detail: zone }));
        return zone;
      },

      startDraw: () => set({ draw: { status: "drawing", vertices: [], past: [] }, selection: null }),
      addVertex: (v) => {
        const d = get().draw;
        if (d.status !== "drawing") return;
        set({ draw: { ...d, past: push(d), vertices: [...d.vertices, v] } });
      },
      closeShape: () => {
        const d = get().draw;
        if (d.status !== "drawing" || d.vertices.length < 3) return;
        set({ draw: { ...d, past: push(d), status: "closed" } });
      },
      checkpoint: () => {
        const d = get().draw;
        set({ draw: { ...d, past: push(d) } });
      },
      moveVertex: (i, v) => {
        const d = get().draw;
        const vertices = d.vertices.slice();
        vertices[i] = v;
        set({ draw: { ...d, vertices } });
      },
      insertVertex: (i, v) => {
        const d = get().draw;
        const vertices = d.vertices.slice();
        vertices.splice(i, 0, v);
        set({ draw: { ...d, past: push(d), vertices } });
      },
      removeVertex: (i) => {
        const d = get().draw;
        const vertices = d.vertices.filter((_, k) => k !== i);
        set({ draw: { ...d, past: push(d), vertices, status: vertices.length < 3 ? "drawing" : d.status } });
      },
      undo: () => {
        const d = get().draw;
        const prev = d.past[d.past.length - 1];
        if (!prev) return;
        const status = d.status === "closed" && prev.length < 3 ? "drawing" : d.status;
        set({ draw: { ...d, vertices: prev, past: d.past.slice(0, -1), status } });
      },
      cancelDraw: () => set({ draw: OFF }),
      confirmArea: (properties) => {
        const d = get().draw;
        if (d.status !== "closed") return null;
        const area = toFeature(d.vertices, { ...properties, status: "confirmed", confirmedAt: new Date().toISOString() });
        set({ area, zone: null, selection: null, draw: OFF });
        window.dispatchEvent(new CustomEvent("earthscope:zone-confirmed", { detail: area }));
        return area;
      },
      editArea: () => {
        const a = get().area;
        if (!a) return;
        const ring = a.geometry.coordinates[0].slice(0, -1);
        set({ draw: { status: "closed", vertices: ring.map(([lng, lat]) => ({ lat, lng })), past: [] }, area: null });
      },
    }),
    {
      name: "earthscope.studyZone",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ zone: s.zone, area: s.area }),
      skipHydration: true,
    },
  ),
);
