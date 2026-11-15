"use client";

// lo que la IA necesita saber de la vista y la sesión de conversación (chat y llamada comparten memoria)
import type { ChatContext } from "./api";
import { useExplorer } from "./store";
import { useLayer } from "./data";
import { useLang } from "./i18n";

export function sessionId() {
  try {
    const k = "earthscope-chat";
    const v = sessionStorage.getItem(k) ?? crypto.randomUUID();
    sessionStorage.setItem(k, v);
    return v;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

// lo que el usuario está viendo, para que el agente entienda "aquí"
export function viewContext(): ChatContext {
  const { scope, variable, mode, year } = useLayer.getState();
  const { selection, area } = useExplorer.getState();
  const ctx: ChatContext = { lang: useLang.getState().lang, scope, layer: variable, mode, year };
  if (selection) {
    ctx.point = { lat: +selection.lat.toFixed(3), lng: +selection.lng.toFixed(3) };
    ctx.place = selection.country ?? selection.surface;
  }
  const ring = area?.geometry?.coordinates?.[0];
  if (ring && ring.length <= 60) ctx.polygon = ring;
  return ctx;
}

