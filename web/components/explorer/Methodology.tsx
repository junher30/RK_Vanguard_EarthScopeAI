"use client";

// cómo funciona EarthScope: fuentes NASA, estadística y la red neuronal, con sus límites
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import type { Manifest } from "@/lib/data";
import { useT, varLabel } from "@/lib/i18n";

export default function Methodology({ open, onClose, manifest }: { open: boolean; onClose: () => void; manifest: Manifest | null }) {
  const t = useT();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="holo-panel max-h-[85dvh] w-full max-w-3xl overflow-y-auto p-6 text-sm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={t("Metodología", "Methodology")}
          >
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-cyan">
              <BookOpen className="size-4" /> {t("Metodología", "Methodology")}
              <button onClick={onClose} className="ml-auto text-muted hover:text-ink" aria-label={t("Cerrar", "Close")}><X className="size-4" /></button>
            </div>
            <h2 className="mt-2 text-2xl font-semibold">{t("Cómo sabemos lo que te mostramos", "How we know what we show you")}</h2>

            <h3 className="mt-5 font-semibold text-cyan">1 · {t("Datos NASA", "NASA data")}</h3>
            <p className="mt-1 text-muted">{t("Promedios mensuales 2001–2024 en una grilla global de 0.5° (y 0.1° en la Amazonía central).", "Monthly means 2001–2024 on a global 0.5° grid (and 0.1° in the central Amazon).")}</p>
            <ul className="mt-2 space-y-1.5">
              {manifest?.variables.map((v) => (
                <li key={v.key} className="flex flex-wrap items-baseline gap-x-2">
                  <b>{varLabel(v.key, v.label)}</b>
                  <a href={v.doi} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan hover:underline">
                    {v.dataset} <ExternalLink className="size-3" />
                  </a>
                  {v.kind === "reanalysis" && <span className="text-[10px] text-amber">{t("reanálisis: modelo + observaciones", "reanalysis: model + observations")}</span>}
                </li>
              ))}
            </ul>

            <h3 className="mt-5 font-semibold text-cyan">2 · {t("Tendencias con rigor", "Rigorous trends")}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
              <li>{t("Pendiente de Sen: cuánto cambia por año, resistente a valores extremos.", "Sen's slope: change per year, resistant to outliers.")}</li>
              <li>{t("Mann-Kendall estacional: ¿la tendencia es real o puede ser azar? Respeta el ciclo de las estaciones. Significativa si p < 0.05.", "Seasonal Mann-Kendall: is the trend real or could it be chance? It respects the seasonal cycle. Significant when p < 0.05.")}</li>
              <li>{t("Robustez: repetimos la prueba con otro método y con otros periodos (por ejemplo, sin los últimos años). Si el veredicto cambia, la web avisa que no es robusto.", "Robustness: we repeat the test with another method and other periods (for example, without the last years). If the verdict changes, the app flags it as not robust.")}</li>
              <li>{t("En los mapas, cada celda tiene su propia prueba: las tenues no son significativas.", "On the maps, every cell gets its own test: faded cells are not significant.")}</li>
            </ul>

            <h3 className="mt-5 font-semibold text-fuchsia-300">3 · {t("La red neuronal (2025–2030)", "The neural network (2025–2030)")}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
              <li>{t("Un conjunto de redes U-Net entrenadas con los 24 años de datos predice el mes siguiente en todo el planeta, y se encadena mes a mes hasta 2030.", "An ensemble of U-Net networks trained on the 24 years of data predicts the next month across the planet, chained month by month to 2030.")}</li>
              <li>{t("La incertidumbre es la dispersión entre los modelos del conjunto: donde no están de acuerdo, el mapa se desvanece.", "Uncertainty is the spread between ensemble members: where they disagree, the map fades.")}</li>
              <li>{t("Es una proyección estadística, no un modelo climático físico: no incluye escenarios de emisiones y la incertidumbre crece con cada año.", "It's a statistical projection, not a physical climate model: it has no emission scenarios and uncertainty grows every year.")}</li>
            </ul>

            <h3 className="mt-5 font-semibold text-cyan">4 · {t("Tiempo real y la IA", "Real time and the AI")}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
              <li>{t("Eventos naturales activos: NASA EONET. Satélites: órbitas reales de CelesTrak propagadas en el navegador.", "Active natural events: NASA EONET. Satellites: real CelesTrak orbits propagated in the browser.")}</li>
              <li>{t("La IA no inventa cifras de lugares: las pide a las mismas herramientas de análisis que ves en pantalla.", "The AI doesn't make up figures for places: it asks the same analysis tools you see on screen.")}</li>
            </ul>
            <p className="mt-5 text-xs text-muted">EarthScope AI · RoboKids · NASA Space Apps 2026</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
