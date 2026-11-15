"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Hexagon, PenLine, Plus, Trash2, Undo2, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { Issue, LatLng } from "@/lib/geo";
import { fmtCoord } from "@/lib/regions";
import type { AreaFeature, Draw } from "@/lib/store";

export type AreaStats = {
  issues: Issue[];
  areaKm2: number;
  centroid: LatLng | null;
  crossesAntimeridian: boolean;
  coverage: { cells: number; fraction: number };
  regionLabel: string;
};

type Props = {
  draw: Draw;
  area: AreaFeature | null;
  stats: AreaStats | null;
  onClose: () => void;
  onUndo: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  onNew: () => void;
  onClear: () => void;
};

const km2 = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(2)} M km²` : v >= 1e3 ? `${Math.round(v).toLocaleString("en-US")} km²` : `${v.toFixed(1)} km²`;

export default function AreaPanel({ draw, area, stats, onClose, onUndo, onCancel, onConfirm, onEdit, onNew, onClear }: Props) {
  const n = draw.vertices.length;
  const confirmed = draw.status === "off" && !!area;
  const valid = !!stats && stats.issues.length === 0;

  const t = useT();
  const hint = confirmed
    ? t("El área quedó guardada en esta sesión y lista para analizar.", "This area is saved for this session and ready for the analysis steps.")
    : draw.status === "drawing"
      ? n < 3
        ? t("Haz clic en el globo para añadir puntos.", "Click on the globe to add points.")
        : t("Sigue añadiendo puntos, o toca el primero (o Enter) para cerrar la forma.", "Keep adding points, or click the first point (or press Enter) to close the shape.")
      : t("Arrastra los puntos para ajustar · toca un punto pequeño de un borde para añadir · clic derecho para quitar.", "Drag points to adjust · click a small dot on an edge to add a point · right-click a point to remove it.");

  const cov = stats?.coverage.fraction ?? 0;
  const hiRes = cov >= 0.999 ? "100%" : cov > 0 ? `${Math.round(cov * 100)}%` : null;

  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold tracking-normal text-signal">
        <Hexagon className="size-4" /> {t("Paso 1 · Área de estudio", "Step 1 · Study area")}
      </div>
      <h2 className="mt-3 text-lg font-semibold">
        {confirmed ? t("Área confirmada", "Study area confirmed") : draw.status === "drawing" ? t("Dibuja tu área", "Draw your area") : t("Ajusta tu área", "Adjust your area")}
      </h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>

      <dl className="mt-3 divide-y divide-line/60 text-sm">
        <Row k={t("Puntos", "Points")} v={<span className="font-mono">{confirmed ? (area!.geometry.coordinates[0].length - 1) : n}</span>} />
        {stats && stats.areaKm2 > 0 && <Row k={t("Área", "Area")} v={<span className="font-mono">{km2(stats.areaKm2)}</span>} />}
        {stats?.centroid && (
          <Row
            k={t("Centro", "Centre")}
            v={<span className="font-mono text-xs">{fmtCoord(stats.centroid.lat, "N", "S")}, {fmtCoord(stats.centroid.lng, "E", "W")}</span>}
          />
        )}
        {stats && stats.areaKm2 > 0 && (
          <Row
            k={t("Datos NASA", "NASA data")}
            v={<span className="rounded-[2px] bg-signal/15 px-2 py-0.5 text-xs font-semibold text-signal">Global 0.5° · 2001–2024</span>}
          />
        )}
        {stats?.crossesAntimeridian && <Row k={t("Antimeridiano", "Antimeridian")} v={<span className="text-xs text-muted">{t("cruza ±180°", "crosses ±180°")}</span>} />}
      </dl>

      {stats && stats.areaKm2 > 0 && (
        <p className="mt-2 text-xs text-muted">
          {t("Lluvia, vegetación, temperatura de superficie y del aire, y humedad están disponibles para cualquier área del planeta.",
            "Rain, vegetation, surface and air temperature and humidity are available for any area of the planet.")}
          {hiRes && t(` El ${hiRes} está además en el caso de estudio ${stats.regionLabel} (mapas de 0.1°).`, ` ${hiRes} of it also lies in the ${stats.regionLabel} case study (0.1° high-res maps).`)}
        </p>
      )}

      <AnimatePresence>
        {draw.status === "closed" && stats && stats.issues.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-1 overflow-hidden rounded-[3px] border border-red/40 bg-red/10 p-3 text-xs text-red"
            role="alert"
          >
            {stats.issues.map((i) => (
              <li key={i.code} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span><b className="font-mono">{i.code}</b> · {i.message}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap gap-2">
        {draw.status === "drawing" && (
          <button onClick={onClose} disabled={n < 3} className="btn-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-40">
            <Check className="size-4" /> {t("Cerrar forma", "Close shape")}
          </button>
        )}
        {draw.status === "closed" && (
          <button onClick={onConfirm} disabled={!valid} className="btn-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-40">
            <Check className="size-4" /> {t("Confirmar área", "Confirm study area")}
          </button>
        )}
        {confirmed && (
          <>
            <button onClick={onEdit} className="btn flex-1 justify-center"><PenLine className="size-4" /> {t("Editar", "Edit")}</button>
            <button onClick={onNew} className="btn flex-1 justify-center"><Plus className="size-4" /> {t("Nueva área", "New area")}</button>
            <button onClick={onClear} className="btn" aria-label={t("Quitar área", "Remove area")}><Trash2 className="size-4" /></button>
          </>
        )}
        {!confirmed && (
          <>
            <button onClick={onUndo} disabled={draw.past.length === 0} className="btn disabled:opacity-40" aria-label={t("Deshacer", "Undo")} title={t("Deshacer (Ctrl/⌘ Z)", "Undo (Ctrl/⌘ Z)")}>
              <Undo2 className="size-4" />
            </button>
            <button onClick={onCancel} className="btn" aria-label={t("Cancelar dibujo", "Cancel drawing")} title={t("Cancelar (Esc)", "Cancel (Esc)")}>
              <X className="size-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
