"use client";

// Botón flotante del asistente EarthScope AI (reemplaza a la mascota): abre o cierra el chat
// y muestra "Analyzing…" mientras el asistente trabaja.
import { motion } from "motion/react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { useAssistant } from "@/lib/assistant";
import { useT } from "@/lib/i18n";

export default function AssistantButton() {
  const t = useT();
  const chatOpen = useAssistant((s) => s.chatOpen);
  const thinking = useAssistant((s) => s.mood === "thinking");
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => useAssistant.getState().setChatOpen(!chatOpen)}
      aria-label={chatOpen ? t("Cerrar asistente", "Close assistant") : t("Hablar con EarthScope AI", "Talk to EarthScope AI")}
      className="holo-chip absolute bottom-4 right-[72px] z-30 hidden items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-cyan lg:flex"
    >
      {chatOpen ? <X className="size-4" /> : thinking ? <Sparkles className="size-4 animate-pulse" /> : <MessageCircle className="size-4" />}
      {thinking ? (
        <span className="flex items-center gap-1.5">
          {t("Analizando", "Analyzing")}
          <span className="think-pip size-1 rounded-full bg-cyan" />
          <span className="think-pip size-1 rounded-full bg-cyan [animation-delay:.2s]" />
          <span className="think-pip size-1 rounded-full bg-cyan [animation-delay:.4s]" />
        </span>
      ) : (
        "EarthScope AI"
      )}
    </motion.button>
  );
}
