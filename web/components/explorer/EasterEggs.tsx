"use client";

// Huevos de pascua del equipo RoboKids. Escribe en el globo (sin estar en un campo de texto):
//   grecox → vuelo a Neiva (Colombia), donde nació EarthScope
//   korhan → modo noche y una lluvia de estrellas fugaces
//   araña / arana / spider → una telaraña que cuelga del borde de la pantalla
// No tocan los datos ni la ciencia: son solo efectos visuales.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { tr } from "@/lib/i18n";

type Egg = "grecox" | "korhan" | "arana";
const WORDS: [string, Egg][] = [["grecox", "grecox"], ["korhan", "korhan"], ["araña", "arana"], ["arana", "arana"], ["spider", "arana"]];
const NEIVA = { lat: 2.9273, lng: -75.2819 };

export default function EasterEggs({
  flyTo, night, toast,
}: {
  flyTo: (lat: number, lng: number, alt?: number) => void;
  night: () => void;
  toast: (msg: string) => void;
}) {
  const [egg, setEgg] = useState<Egg | null>(null);

  useEffect(() => {
    console.info("%cEarthScope AI%c · RoboKids — Grecox · Korhan · Araña · NASA Space Apps 2026",
      "color:#22d3ee;font-weight:700;font-size:14px", "color:#94a3b8");
    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable || e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-8);
      const hit = WORDS.find(([w]) => buf.endsWith(w));
      if (!hit) return;
      buf = "";
      const k = hit[1];
      setEgg(k);
      if (k === "grecox") {
        flyTo(NEIVA.lat, NEIVA.lng, 0.9);
        toast(tr("Grecox: aquí, en Neiva (Colombia), nació EarthScope.", "Grecox: EarthScope was born here, in Neiva, Colombia."));
      } else if (k === "korhan") {
        night();
        toast(tr("Korhan encendió las luces de la noche. Pide un deseo.", "Korhan switched on the night lights. Make a wish."));
      } else {
        toast(tr("Araña tejió su red sobre el planeta.", "Araña spun a web over the planet."));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flyTo, night, toast]);

  useEffect(() => {
    if (!egg) return;
    const id = setTimeout(() => setEgg(null), egg === "arana" ? 6000 : 4500);
    return () => clearTimeout(id);
  }, [egg]);

  return (
    <AnimatePresence>
      {egg === "korhan" && <Stars key="stars" />}
      {egg === "arana" && <Web key="web" />}
    </AnimatePresence>
  );
}

function Stars() {
  const stars = Array.from({ length: 14 }, (_, i) => ({ i, top: (i * 37) % 60, left: 30 + ((i * 53) % 70), d: (i % 5) * 0.35 }));
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" exit={{ opacity: 0 }} aria-hidden>
      {stars.map((s) => (
        <motion.span
          key={s.i}
          className="absolute h-px w-24 rounded-full bg-gradient-to-l from-white to-transparent"
          style={{ top: `${s.top}%`, left: `${s.left}%`, rotate: -35 }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: -320, y: 220, opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, delay: s.d, repeat: 1, repeatDelay: 0.6 }}
        />
      ))}
    </motion.div>
  );
}

function Web() {
  const rings = [40, 80, 120, 160, 200];
  const spokes = Array.from({ length: 9 }, (_, i) => (i * Math.PI) / 16);
  return (
    <motion.svg
      viewBox="0 0 240 240"
      className="pointer-events-none absolute right-0 top-0 z-30 size-64 text-white/50"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      style={{ transformOrigin: "top right" }}
      aria-hidden
    >
      <g transform="translate(240 0)" fill="none" stroke="currentColor" strokeWidth="0.8">
        {spokes.map((a, i) => <line key={i} x1="0" y1="0" x2={-Math.cos(a) * 230} y2={Math.sin(a) * 230} />)}
        {rings.map((r) => (
          <polyline key={r} points={spokes.map((a) => `${-Math.cos(a) * r},${Math.sin(a) * r}`).join(" ")} />
        ))}
      </g>
      <motion.g initial={{ y: -40 }} animate={{ y: [-40, 130, 115] }} transition={{ duration: 1.6, ease: "easeOut" }}>
        <line x1="150" y1="-40" x2="150" y2="0" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="150" cy="6" r="6" fill="#0f172a" stroke="#22d3ee" strokeWidth="1" />
        <circle cx="150" cy="-2" r="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="1" />
        {[-1, 1].flatMap((s) => [0, 1, 2, 3].map((k) => (
          <path key={`${s}${k}`} d={`M150 ${4 + k * 2} q ${s * 8} ${-6 + k * 3} ${s * 12} ${2 + k * 3}`} stroke="#22d3ee" strokeWidth="0.8" fill="none" />
        )))}
      </motion.g>
    </motion.svg>
  );
}
