"use client";

// barra de llamada en vivo con la IA: estado, onda de tu voz, subtítulos y botones de silenciar y colgar
import { AnimatePresence, motion } from "motion/react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useCall, type CallPhase } from "@/lib/call";
import { useT, type T } from "@/lib/i18n";

const label = (p: CallPhase, t: T) => ({
  connecting: t("Conectando", "Connecting"),
  listening: t("En línea · habla cuando quieras", "Live · speak whenever you want"),
  hearing: t("Te escucho", "Listening"),
  thinking: t("Analizando", "Analyzing"),
  speaking: "EarthScope AI",
})[p];

export function CallButton() {
  const active = useCall((s) => s.active);
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => (active ? useCall.getState().hangup() : useCall.getState().start())}
      aria-label={active ? t("Colgar la llamada", "Hang up") : t("Llamar a EarthScope AI", "Call EarthScope AI")}
      title={active ? t("Colgar", "Hang up") : t("Hablar en vivo con la IA", "Talk live with the AI")}
      className={active ? "btn !border-red-400/60 !bg-red-500/20 !text-red-200" : "btn"}
    >
      {active ? <PhoneOff className="size-4" /> : <Phone className="size-4" />}
      <span className="hidden md:inline">{active ? t("Colgar", "Hang up") : t("Llamar", "Call")}</span>
    </button>
  );
}

export default function CallBar() {
  const s = useCall();
  const t = useT();
  return (
    <AnimatePresence>
      {s.active && (
        <motion.div
          initial={{ y: -16, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="holo-panel absolute left-1/2 top-[88px] z-40 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-4">
            <Orb phase={s.phase} level={s.level} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-normal text-signal">
                <span className="size-1.5 animate-pulse rounded-full bg-red-400" /> {t("Llamada en vivo", "Live call")}
                <span className="text-muted">· {s.muted ? t("Silenciado", "Muted") : label(s.phase, t)}</span>
              </div>
              {s.error ? (
                <p className="mt-1 text-sm text-amber-300">{s.error}</p>
              ) : (
                <>
                  {s.you && <p className="mt-1 truncate text-xs text-muted">{t("Tú", "You")}: {s.you}</p>}
                  <p className="mt-0.5 line-clamp-3 text-[15px] font-medium leading-snug text-ink">
                    {s.phase === "thinking" ? <Dots /> : s.ai || t("Pregunta lo que quieras: \"¿qué está pasando ahora en el planeta?\"", "Ask anything: \"what is happening on the planet right now?\"")}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={s.toggleMute} aria-label={s.muted ? t("Activar micrófono", "Unmute") : t("Silenciar micrófono", "Mute")} className="btn !p-2">
                {s.muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
              <button onClick={s.hangup} aria-label={t("Colgar", "Hang up")} className="btn !border-red-400/60 !bg-red-500/25 !p-2 !text-red-100">
                <PhoneOff className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// medidor de nivel: barras que siguen tu voz; cuando la IA habla, se mueven solas
const BARS = [0.35, 0.6, 0.85, 1, 0.75, 0.5, 0.9, 0.65, 0.4, 0.7, 0.55, 0.3];
function Orb({ phase, level }: { phase: CallPhase; level: number }) {
  const talking = phase === "speaking";
  const live = phase === "hearing" || phase === "listening";
  return (
    <div className="flex h-12 w-24 shrink-0 items-center gap-[3px] border border-line px-2" aria-hidden>
      {BARS.map((k, i) => (
        <span
          key={i}
          className={`w-[3px] ${talking ? "animate-[call-bar_0.7s_ease-in-out_infinite_alternate]" : ""} ${talking ? "bg-ink" : "bg-signal"}`}
          style={{
            height: `${Math.max(8, (live ? level * k * 100 : talking ? k * 70 : 8))}%`,
            animationDelay: `${i * 60}ms`,
            opacity: phase === "thinking" ? 0.35 : 1,
          }}
        />
      ))}
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1 text-signal">
      <span className="think-pip size-1.5 rounded-full bg-signal" />
      <span className="think-pip size-1.5 rounded-full bg-signal [animation-delay:.2s]" />
      <span className="think-pip size-1.5 rounded-full bg-signal [animation-delay:.4s]" />
    </span>
  );
}
