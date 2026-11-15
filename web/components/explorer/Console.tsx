"use client";

// lecturas de consola: hora UTC, punto de interés y capa activa; y el retículo de instrumento del globo
import { useEffect, useState } from "react";
import { useExplorer } from "@/lib/store";
import { useLayer } from "@/lib/data";
import { useT, varName } from "@/lib/i18n";

const pad = (n: number) => String(n).padStart(2, "0");
const fmtLat = (v: number) => `${Math.abs(v).toFixed(2).padStart(5, "0")}°${v >= 0 ? "N" : "S"}`;
const fmtLng = (v: number) => `${Math.abs(v).toFixed(2).padStart(6, "0")}°${v >= 0 ? "E" : "W"}`;

export function Readouts() {
  const t = useT();
  const sel = useExplorer((s) => s.selection);
  const { variable, mode, year } = useLayer();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  return (
    <div className="readout hidden items-center gap-5 lg:flex" aria-label={t("Lecturas", "Readouts")}>
      <span>UTC <b>{now ? `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}` : "--:--:--"}</b></span>
      <span>{t("Punto", "Point")} <b>{sel ? `${fmtLat(sel.lat)} ${fmtLng(sel.lng)}` : "—"}</b></span>
      <span className="hidden xl:inline">
        {t("Capa", "Layer")} <b>{variable ? `${varName(variable)} ${mode === "trend" ? t("tendencia", "trend") : year}` : "—"}</b>
      </span>
    </div>
  );
}

// anillo graduado alrededor del globo: marcas cada 5°, rumbos cada 30°
export function Reticle() {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <svg
      aria-hidden
      viewBox="-500 -500 1000 1000"
      className="pointer-events-none absolute left-1/2 top-1/2 size-[min(86vh,86vw)] -translate-x-1/2 -translate-y-1/2 opacity-70"
    >
      <circle r="440" fill="none" stroke="#2b3036" strokeWidth="1" />
      <circle r="470" fill="none" stroke="#2b3036" strokeWidth="1" strokeDasharray="2 6" />
      {ticks.map((a) => {
        const major = a % 30 === 0;
        const r1 = 440, r2 = major ? 458 : 448;
        const rad = ((a - 90) * Math.PI) / 180;
        // redondeado: el servidor y el navegador deben generar exactamente el mismo SVG
        const P = (r: number, f: (x: number) => number) => Math.round(r * f(rad) * 100) / 100;
        return (
          <g key={a}>
            <line x1={P(r1, Math.cos)} y1={P(r1, Math.sin)} x2={P(r2, Math.cos)} y2={P(r2, Math.sin)}
              stroke={a === 0 ? "#fc3d21" : "#7c858f"} strokeWidth={major ? 1.5 : 1} />
            {major && (
              <text x={P(486, Math.cos)} y={P(486, Math.sin) + 4} textAnchor="middle"
                fill="#7c858f" fontSize="12" fontFamily="IBM Plex Mono, monospace">
                {String(a).padStart(3, "0")}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
