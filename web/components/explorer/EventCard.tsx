"use client";

// ficha de un evento natural activo (NASA EONET)
import { motion } from "motion/react";
import { Bot, ExternalLink, X } from "lucide-react";
import { eventKindName, eventStyle, type GeoEvent } from "@/lib/events";
import { useMascot } from "@/lib/mascot";
import { useT } from "@/lib/i18n";

export default function EventCard({ ev, onClose }: { ev: GeoEvent; onClose: () => void }) {
  const t = useT();
  const st = eventStyle(ev.kind);
  const ask = () => useMascot.getState().ask(t(
    `Háblame del evento "${ev.title}" (${eventKindName(ev.kind)}, ${ev.lat}, ${ev.lng}). ¿Qué dicen los datos NASA de esa zona?`,
    `Tell me about the event "${ev.title}" (${eventKindName(ev.kind)}, ${ev.lat}, ${ev.lng}). What does NASA data say about that area?`,
  ));
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 16, opacity: 0 }}
      className="holo-panel absolute bottom-[220px] left-1/2 z-30 w-[min(380px,calc(100vw-2rem))] -translate-x-1/2 p-4"
      role="dialog"
      aria-label={ev.title}
    >
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: st.color }}>
        <span className="size-2 animate-pulse rounded-full" style={{ background: st.color, boxShadow: `0 0 10px ${st.color}` }} />
        {eventKindName(ev.kind)} · {t("activo", "active")}
        <button onClick={onClose} className="ml-auto text-muted hover:text-ink" aria-label={t("Cerrar", "Close")}>
          <X className="size-4" />
        </button>
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug">{ev.title}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted">{t("Último reporte", "Last report")}</dt><dd className="text-right font-mono">{ev.date}</dd>
        <dt className="text-muted">{t("Posición", "Position")}</dt><dd className="text-right font-mono">{ev.lat.toFixed(2)}, {ev.lng.toFixed(2)}</dd>
        {ev.magnitude && (<><dt className="text-muted">{t("Magnitud", "Magnitude")}</dt><dd className="text-right font-mono">{ev.magnitude}</dd></>)}
      </dl>
      <div className="mt-3 flex gap-2">
        <button onClick={ask} className="btn-primary flex-1 justify-center !py-1.5 text-xs">
          <Bot className="size-3.5" /> {t("Analizar con la IA", "Analyze with AI")}
        </button>
        {ev.link && (
          <a href={ev.link} target="_blank" rel="noreferrer" className="btn !py-1.5 text-xs">
            {t("Fuente", "Source")} <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <p className="mt-2 text-[10px] text-muted">NASA EONET · Earth Observatory Natural Event Tracker</p>
    </motion.div>
  );
}

// leyenda con cuántos eventos hay de cada tipo
export function EventLegend({ events, status }: { events: GeoEvent[]; status: string }) {
  const t = useT();
  const counts = new Map<string, number>();
  events.forEach((e) => counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1));
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="holo-panel absolute bottom-4 left-4 z-20 hidden max-w-[260px] px-3 py-2.5 xl:block"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
        {t("Planeta en vivo", "Live planet")} · NASA EONET
      </p>
      {status === "loading" && <p className="mt-1 text-xs text-muted">{t("Cargando eventos…", "Loading events…")}</p>}
      {status === "error" && <p className="mt-1 text-xs text-amber">{t("Sin conexión con NASA EONET.", "No connection to NASA EONET.")}</p>}
      {status === "ok" && (
        <>
          <p className="mt-1 text-sm font-semibold">{events.length} {t("eventos activos", "active events")}</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: eventStyle(k).color, boxShadow: `0 0 6px ${eventStyle(k).color}` }} />
                {eventKindName(k)} <span className="font-mono text-muted">{n}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </motion.div>
  );
}
