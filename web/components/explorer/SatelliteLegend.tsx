"use client";

// Leyenda de satélites: colores por rol frente a los datos de la web, filtros por rol y
// "solo las fuentes de la capa activa" (une lo que se ve en el globo con quién lo midió).
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Satellite } from "lucide-react";
import { LAYER_PRODUCT, PRODUCT_INFO, ROLE_STYLE, SAT_META, type SatRole } from "@/lib/satellites";
import { useT, varShort } from "@/lib/i18n";

const ROLES: SatRole[] = ["direct", "calibration", "contributor", "other"];

export type SatFilter = { roles: Record<SatRole, boolean>; onlyLayer: boolean };
export const DEFAULT_SAT_FILTER: SatFilter = {
  roles: { direct: true, calibration: true, contributor: true, other: true },
  onlyLayer: false,
};

export default function SatelliteLegend({
  filter, onChange, layer, layerLabel, onPick,
}: {
  filter: SatFilter;
  onChange: (f: SatFilter) => void;
  layer: string | null;           // capa activa (clave)
  layerLabel: string | null;
  onPick: (norad: number) => void; // abrir la ficha de un satélite
}) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<SatRole | null>(null);
  const product = layer ? LAYER_PRODUCT[layer] : undefined;
  const count = (r: SatRole) => SAT_META.filter((s) => s.role === r).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="holo-panel absolute bottom-[92px] left-4 z-20 hidden w-[270px] p-3 text-xs lg:block"
    >
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <Satellite className="size-3.5 text-signal" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-signal">
          {t("Satélites · quién mide qué", "Satellites · who measures what")}
        </span>
        <ChevronDown className={`ml-auto size-3.5 text-muted transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ul className="mt-2 space-y-1">
              {ROLES.map((r) => {
                const st = ROLE_STYLE[r];
                const on = filter.roles[r];
                return (
                  <li key={r}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onChange({ ...filter, roles: { ...filter.roles, [r]: !on } })}
                        className={`flex flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/5 ${on ? "" : "opacity-40"}`}
                        aria-pressed={on}
                        title={t(st.hintEs, st.hintEn)}
                      >
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: st.color, boxShadow: on ? `0 0 8px ${st.color}` : undefined }} />
                        <span className="font-semibold" style={{ color: on ? st.color : undefined }}>{t(st.es, st.en)}</span>
                        <span className="ml-auto font-mono text-muted">{count(r)}</span>
                      </button>
                      <button
                        onClick={() => setExpanded(expanded === r ? null : r)}
                        className="rounded p-0.5 text-muted hover:text-ink"
                        aria-label={t("Ver la lista", "Show the list")}
                      >
                        <ChevronDown className={`size-3 transition-transform ${expanded === r ? "" : "-rotate-90"}`} />
                      </button>
                    </div>
                    {expanded === r && (
                      <div className="mb-1 ml-5 mt-0.5 flex flex-wrap gap-1">
                        <p className="w-full text-[10px] text-muted">{t(st.hintEs, st.hintEn)}</p>
                        {SAT_META.filter((s) => s.role === r).map((s) => (
                          <button
                            key={s.norad}
                            onClick={() => onPick(s.norad)}
                            className="rounded-full border px-1.5 py-px text-[10px] hover:bg-white/10"
                            style={{ borderColor: `${st.color}66`, color: st.color }}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {layer && product && (
              <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md border border-line/70 p-2 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={filter.onlyLayer}
                  onChange={(e) => onChange({ ...filter, onlyLayer: e.target.checked })}
                  className="mt-0.5 accent-signal"
                />
                <span>
                  {t("Solo los que miden", "Only those behind")} <b className="text-ink">{layerLabel ?? varShort(layer, layer)}</b>
                  <span className="block text-[10px] text-muted">
                    {t("Producto", "Product")}: {PRODUCT_INFO[product].name}
                  </span>
                </span>
              </label>
            )}
            <p className="mt-2 text-[10px] leading-snug text-muted">
              {t("Posiciones reales en este momento (órbitas de CelesTrak). Los geoestacionarios se dibujan más cerca de la Tierra.",
                "Real positions right now (CelesTrak orbits). Geostationary satellites are drawn closer to Earth.")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
