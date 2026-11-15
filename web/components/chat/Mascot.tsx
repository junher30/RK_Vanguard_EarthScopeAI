"use client";

// mascota pixel art (sprites de 8 cuadros de 176 px) presentada como holograma
import { useEffect, useState } from "react";
import { useMascot } from "@/lib/mascot";
import { useT } from "@/lib/i18n";

const SHEETS = {
  welcome: "/mascot/Robot_Welcome_Wave_sheet.png",
  idle: "/mascot/Robot_Hover_Idle_sheet.png",
  talk: "/mascot/Robot_Talking_sheet.png",
} as const;
type Sheet = keyof typeof SHEETS;

const FRAME = 176;
const SCALE = 1; // múltiplo entero para mantener los píxeles nítidos

export default function Mascot() {
  const mood = useMascot((s) => s.mood);
  const t = useT();
  const chatOpen = useMascot((s) => s.chatOpen);
  const [welcoming, setWelcoming] = useState(true);
  const [frame, setFrame] = useState(0);
  const sheet: Sheet = welcoming ? "welcome" : mood === "talking" ? "talk" : "idle";

  // el saludo se reproduce una vez al aparecer y cada vez que la mascota saluda
  useEffect(() => useMascot.subscribe((s, prev) => {
    if (s.mood === "greet" && prev.mood !== "greet") { setWelcoming(true); setFrame(0); }
  }), []);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => {
        if (f === 7 && welcoming) setWelcoming(false);
        return (f + 1) % 8;
      });
    }, 125);
    return () => clearInterval(id);
  }, [welcoming]);

  const thinking = mood === "thinking";
  const pointing = mood === "pointing";
  const size = FRAME * SCALE;
  return (
    <div className="pointer-events-none absolute bottom-3 right-[72px] z-30 hidden lg:block" style={{ width: size, height: size + 46 }}>
      {/* procesando: pulsos que suben hacia un indicador */}
      <div
        aria-hidden
        className={`absolute left-1 top-0 transition-opacity duration-300 ${thinking ? "opacity-100" : "opacity-0"}`}
      >
        <span className="think-dot absolute left-[60px] top-[60px] size-1.5 rounded-full bg-cyan" />
        <span className="think-dot absolute left-[48px] top-[44px] size-2 rounded-full bg-cyan [animation-delay:.25s]" />
        <div className="think-cloud holo-chip absolute -top-1 left-0 flex h-8 items-center gap-1.5 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan">{t("Analizando", "Analyzing")}</span>
          <span className="think-pip size-1 rounded-full bg-cyan" />
          <span className="think-pip size-1 rounded-full bg-cyan [animation-delay:.2s]" />
          <span className="think-pip size-1 rounded-full bg-cyan [animation-delay:.4s]" />
        </div>
      </div>
      <button
        type="button"
        onClick={() => useMascot.getState().setChatOpen(!chatOpen)}
        aria-label={chatOpen ? t("Cerrar asistente", "Close assistant") : t("Hablar con EarthScope AI", "Talk to EarthScope AI")}
        title="EarthScope AI"
        className="holo pointer-events-auto absolute bottom-0 left-0"
        style={{ width: size, height: size }}
      >
        <div
          className="holo-sprite"
          style={{
            width: size,
            height: size,
            backgroundImage: `url(${SHEETS[sheet]})`,
            backgroundSize: `${size * 8}px ${size}px`,
            backgroundPosition: `-${frame * size}px 0`,
            transform: `${pointing ? "scaleX(-1) rotate(-6deg)" : ""}`,
          }}
        />
        {/* base del proyector holográfico */}
        <span className="holo-base" />
      </button>
    </div>
  );
}
