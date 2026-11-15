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
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">
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

// esfera que respira con tu voz y gira cuando la IA piensa o habla
function Orb({ phase, level }: { phase: CallPhase; level: number }) {
  const k = phase === "hearing" || phase === "listening" ? 1 + level * 0.6 : 1;
  const hot = phase === "speaking" || phase === "thinking";
  return (
    <div className="relative grid size-14 shrink-0 place-items-center">
      <span
        className={`absolute inset-0 rounded-full border border-cyan/50 ${hot ? "animate-spin [animation-duration:2.5s] border-t-cyan border-r-transparent" : ""}`}
      />
      <span
        className="size-9 rounded-full transition-transform duration-75"
        style={{
          transform: `scale(${k})`,
          background: phase === "speaking"
            ? "radial-gradient(circle at 35% 35%, #a5f3fc, #22d3ee 45%, #0e7490)"
            : "radial-gradient(circle at 35% 35%, #67e8f9, #0891b2 55%, #082f49)",
          boxShadow: `0 0 ${12 + level * 30}px rgba(34,211,238,${0.4 + level * 0.5})`,
          animation: phase === "speaking" ? "call-speak 0.6s ease-in-out infinite alternate" : undefined,
        }}
      />
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1 text-cyan">
      <span className="think-pip size-1.5 rounded-full bg-cyan" />
      <span className="think-pip size-1.5 rounded-full bg-cyan [animation-delay:.2s]" />
      <span className="think-pip size-1.5 rounded-full bg-cyan [animation-delay:.4s]" />
    </span>
  );
}
