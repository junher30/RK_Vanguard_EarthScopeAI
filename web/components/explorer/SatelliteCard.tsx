"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Crosshair, Layers, Satellite, X } from "lucide-react";
import { satPosition, type Sat } from "@/lib/satellites";
import { useLang } from "@/lib/i18n";

const LAYER_NAMES: Record<string, [string, string]> = {
  precip_mm_day: ["Precipitación", "Precipitation"],
  evi: ["Vegetación", "Vegetation"],
  lst_day_c: ["Temp. superficie", "Surface temp."],
  t2m_c: ["Temp. aire", "Air temp."],
  rh2m_pct: ["Humedad", "Humidity"],
};

export default function SatelliteCard({
  sat, following, onFollow, onLayer, onClose,
}: {
  sat: Sat;
  following: boolean;
  onFollow: () => void;
  onLayer: (key: string) => void;
  onClose: () => void;
}) {
  const es = useLang((st) => st.lang) === "es";
  const [pos, setPos] = useState(() => satPosition(sat));
  useEffect(() => {
    const id = setInterval(() => setPos(satPosition(sat)), 1000);
    return () => clearInterval(id);
  }, [sat]);
  const t = (a: string, b: string) => (es ? a : b);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass absolute left-1/2 top-24 z-30 w-[min(380px,calc(100vw-2rem))] -translate-x-1/2 !bg-[#050c1d] p-4"
      role="dialog"
      aria-label={sat.name}
    >
      <div className="flex items-center gap-2">
        <Satellite className="size-4" style={{ color: sat.color }} />
        <b className="text-base" style={{ color: sat.color }}>{sat.name}</b>
        <span className="text-xs text-muted">· {t("en vivo", "live")}</span>
        <span className="relative ml-1 flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-green" />
        </span>
        <button onClick={onClose} className="ml-auto text-muted hover:text-ink" aria-label={t("Cerrar", "Close")}>
          <X className="size-4" />
        </button>
      </div>
      {pos && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white/5 p-2">
            <dt className="text-muted">{t("Posición", "Position")}</dt>
            <dd className="font-mono">{Math.abs(pos.lat).toFixed(1)}°{pos.lat >= 0 ? "N" : "S"} {Math.abs(pos.lng).toFixed(1)}°{pos.lng >= 0 ? "E" : "W"}</dd>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <dt className="text-muted">{t("Altitud", "Altitude")}</dt>
            <dd className="font-mono">{Math.round(pos.altKm)} km</dd>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <dt className="text-muted">{t("Velocidad", "Speed")}</dt>
            <dd className="font-mono">{Math.round(pos.speedKmh).toLocaleString()} km/h</dd>
          </div>
        </dl>
      )}
      <p className="mt-3 text-sm leading-relaxed">{t(sat.es, sat.en)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onFollow} className={following ? "btn-primary !py-1.5 text-xs" : "btn !py-1.5 text-xs"}>
          <Crosshair className="size-3.5" /> {following ? t("Siguiendo", "Following") : t("Seguir", "Follow")}
        </button>
        {sat.layers.map((k) => (
          <button key={k} onClick={() => onLayer(k)} className="btn !py-1.5 text-xs">
            <Layers className="size-3.5" /> {t("Ver", "Show")} {LAYER_NAMES[k]?.[es ? 0 : 1] ?? k}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
