"use client";

// mascota pixel art (PixelLab) presentada como holograma. Tiene tres animaciones de sprite
// (saludo, flotar, hablar) y además se mueve sola: pasea, da vueltas, salta, se asoma y
// vuela hacia el globo cuando la IA lo mueve.
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import { useAssistant } from "@/lib/assistant";
import { useT } from "@/lib/i18n";
import { cell, SHEETS, SPRITE, type SheetName } from "@/lib/mascotSprites";

const SCALE = 1; // múltiplo entero para mantener los píxeles nítidos
const FPS = 8;
type Trick = "wander" | "loop" | "hop" | "peek" | "scan" | "zoom";
const TRICKS: Trick[] = ["wander", "loop", "hop", "peek", "scan", "wander", "zoom"];

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export default function Mascot() {
  const mood = useAssistant((s) => s.mood);
  const chatOpen = useAssistant((s) => s.chatOpen);
  const tour = useAssistant((s) => s.tour);
  const t = useT();
  const [welcoming, setWelcoming] = useState(true);
  const [frame, setFrame] = useState(0);
  const [face, setFace] = useState<1 | -1>(1); // -1 = mira a la izquierda
  const sheet: SheetName = welcoming ? "welcome" : mood === "talking" ? "talk" : "idle";
  const body = useAnimationControls(); // desplazamiento por la pantalla
  const sprite = useAnimationControls(); // inclinación, giros y saltos del robot
  const busy = useRef(false);
  // los paseos son asíncronos: si la mascota se desmonta (por ejemplo durante una historia) no deben seguir
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; body.stop(); sprite.stop(); }; }, [body, sprite]);
  const go = (c: typeof body, target: Parameters<typeof body.start>[0]) => (mounted.current ? c.start(target) : Promise.resolve());
  const pos = useRef({ x: 0, y: 0 });

  // el saludo se reproduce una vez al aparecer y cada vez que la mascota saluda
  useEffect(() => useAssistant.subscribe((s, prev) => {
    if (s.mood === "greet" && prev.mood !== "greet") { setWelcoming(true); setFrame(0); }
  }), []);

  useEffect(() => {
    const total = SHEETS[sheet].frames;
    const id = setInterval(() => {
      setFrame((f) => {
        if (welcoming && f === total - 1) { setWelcoming(false); return 0; }
        return (f + 1) % total;
      });
    }, 1000 / FPS);
    return () => clearInterval(id);
  }, [sheet, welcoming]);

  // volar a un punto (relativo a su casa, abajo a la derecha), mirando hacia donde va
  async function flyTo(x: number, y: number, duration?: number) {
    const dx = x - pos.current.x;
    if (Math.abs(dx) > 4) setFace(dx < 0 ? -1 : 1);
    const d = duration ?? Math.min(2.6, 0.6 + Math.hypot(dx, y - pos.current.y) / 260);
    pos.current = { x, y };
    go(sprite, { rotate: Math.max(-14, Math.min(14, dx / 25)), transition: { duration: 0.3 } });
    await go(body, { x, y, transition: { duration: d, ease: [0.45, 0, 0.25, 1] } });
    await go(sprite, { rotate: 0, transition: { type: "spring", stiffness: 180, damping: 9 } });
  }
  const home = () => flyTo(0, 0);

  async function trick(k: Trick) {
    const W = Math.min(window.innerWidth - 260, 900);
    const H = Math.min(window.innerHeight - 320, 320);
    switch (k) {
      case "wander":
        await flyTo(-rand(80, W), -rand(0, H));
        await new Promise((r) => setTimeout(r, rand(1500, 3500)));
        await home();
        break;
      case "loop": // una vuelta completa en el aire
        await flyTo(pos.current.x, -60, 0.5);
        await go(sprite, { rotate: [0, 360], transition: { duration: 0.9, ease: "easeInOut" } });
        sprite.set({ rotate: 0 });
        await home();
        break;
      case "hop": // dos saltitos con rebote
        await go(sprite, { y: [0, -38, 0, -20, 0], scaleY: [1, 1.06, 0.9, 1.04, 1], transition: { duration: 1.1, ease: "easeOut" } });
        break;
      case "peek": // baja, se esconde y se asoma
        await go(body, { y: 90, transition: { duration: 0.5, ease: "easeIn" } });
        await new Promise((r) => setTimeout(r, 900));
        await go(body, { y: 0, transition: { type: "spring", stiffness: 140, damping: 11 } });
        pos.current.y = 0;
        break;
      case "scan": // mira a un lado y al otro
        setFace(-1);
        await go(sprite, { rotate: [-8, 0], transition: { duration: 0.8 } });
        await new Promise((r) => setTimeout(r, 900));
        setFace(1);
        await go(sprite, { rotate: [8, 0], transition: { duration: 0.8 } });
        break;
      case "zoom": // cruza rápido la pantalla y vuelve
        await flyTo(-W, -rand(H * 0.4, H), 1.1);
        await go(sprite, { rotate: [0, -10, 10, 0], transition: { duration: 0.6 } });
        await flyTo(0, 0, 1.4);
        break;
    }
  }

  // paseos al azar mientras espera tranquila (sin chat, sin tutorial, sin hablar)
  const calm = !chatOpen && !tour && mood === "idle" && !welcoming;
  useEffect(() => {
    if (!calm || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const loop = async () => {
      while (alive) {
        await new Promise((r) => setTimeout(r, rand(5000, 11000)));
        if (!alive || busy.current) continue;
        busy.current = true;
        await trick(TRICKS[Math.floor(Math.random() * TRICKS.length)]);
        busy.current = false;
      }
    };
    loop();
    return () => { alive = false; };
  }, [calm]); // eslint-disable-line react-hooks/exhaustive-deps

  // reacciona a lo que hace la IA
  useEffect(() => {
    if (mood === "pointing" && useAssistant.getState().tour) {
      // en el tutorial se queda junto al briefing y solo señala
      go(sprite, { rotate: [0, -12, 0], transition: { duration: 0.6 } });
    } else if (mood === "pointing") {
      // vuela hacia el globo, lo señala y vuelve
      busy.current = true;
      (async () => {
        await flyTo(-Math.min(window.innerWidth * 0.35, 520), -Math.min(window.innerHeight * 0.3, 260), 0.9);
        await go(sprite, { rotate: [0, -12, 0], transition: { duration: 0.5 } });
        busy.current = false;
      })();
    } else if (mood === "thinking") {
      busy.current = true;
      go(sprite, { rotate: [0, -6, 6, 0], y: [0, -6, 0], transition: { duration: 1.6, repeat: Infinity } });
    } else if (mood === "talking") {
      go(sprite, { rotate: 0, y: [0, -3, 0], transition: { duration: 0.5, repeat: Infinity } });
    } else {
      sprite.stop();
      go(sprite, { rotate: 0, y: 0, scaleY: 1, transition: { duration: 0.3 } });
      if (pos.current.x !== 0 || pos.current.y !== 0) home().then(() => { busy.current = false; });
      else busy.current = false;
    }
  }, [mood]); // eslint-disable-line react-hooks/exhaustive-deps

  // al abrir el chat vuelve a su lugar
  useEffect(() => { if (chatOpen) home(); }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const thinking = mood === "thinking";
  const size = SPRITE * SCALE;
  const sh = SHEETS[sheet];
  const { col, row } = cell(sheet, frame);
  return (
    <motion.div
      animate={body}
      initial={{ x: 0, y: 0 }}
      data-mood={mood}
      className="pointer-events-none absolute bottom-3 right-[78px] z-30 hidden lg:block"
      style={{ width: size, height: size + 46 }}
    >
      {/* procesando: pulsos que suben hacia un indicador */}
      <div aria-hidden className={`absolute -left-8 top-0 transition-opacity duration-300 ${thinking ? "opacity-100" : "opacity-0"}`}>
        <span className="think-dot absolute left-[60px] top-[52px] size-1.5 rounded-full bg-signal" />
        <span className="think-dot absolute left-[48px] top-[38px] size-2 rounded-full bg-signal [animation-delay:.25s]" />
        <div className="think-cloud holo-chip absolute -top-3 left-0 flex h-8 items-center gap-1.5 px-3">
          <span className="text-[10px] font-semibold tracking-normal text-signal">{t("Analizando", "Analyzing")}</span>
          <span className="think-pip size-1 rounded-full bg-signal" />
          <span className="think-pip size-1 rounded-full bg-signal [animation-delay:.2s]" />
          <span className="think-pip size-1 rounded-full bg-signal [animation-delay:.4s]" />
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!chatOpen) useAssistant.getState().pulse("greet", 900);
          useAssistant.getState().setChatOpen(!chatOpen);
        }}
        aria-label={chatOpen ? t("Cerrar asistente", "Close assistant") : t("Hablar con EarthScope AI", "Talk to EarthScope AI")}
        title="EarthScope AI"
        className="holo pointer-events-auto absolute bottom-0 left-0"
        style={{ width: size, height: size }}
      >
        <motion.div animate={sprite} style={{ width: size, height: size, originY: 0.6 }}>
          <div
            className="holo-sprite"
            style={{
              width: size,
              height: size,
              backgroundImage: `url(${sh.url})`,
              backgroundSize: `${sh.cols * size}px ${sh.rows * size}px`,
              backgroundPosition: `-${col * size}px -${row * size}px`,
              transform: face === -1 ? "scaleX(-1)" : undefined,
            }}
          />
        </motion.div>
        {/* brillo holográfico bajo el robot */}
        <span className="holo-base" />
      </button>
    </motion.div>
  );
}
