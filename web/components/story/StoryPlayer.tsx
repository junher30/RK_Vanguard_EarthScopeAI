"use client";

// reproductor cinematográfico del Modo Historia: franjas de cine, subtítulos, cifra clave y controles
import { AnimatePresence, motion } from "motion/react";
import { Clapperboard, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { STORIES, useStory } from "@/lib/stories";
import { useLayer } from "@/lib/data";
import { useT } from "@/lib/i18n";

export default function StoryPlayer() {
  const s = useStory();
  const year = useLayer((l) => l.year);
  const mode = useLayer((l) => l.mode);
  const variable = useLayer((l) => l.variable);
  const t = useT();
  const story = s.story;
  return (
    <AnimatePresence>
      {story && (
        <motion.div key="story" className="pointer-events-none absolute inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* franjas de cine */}
          <motion.div initial={{ height: 0 }} animate={{ height: "9vh" }} exit={{ height: 0 }} transition={{ duration: 0.7 }}
            className="absolute inset-x-0 top-0 bg-gradient-to-b from-black to-black/80" />
          <motion.div initial={{ height: 0 }} animate={{ height: "24vh" }} exit={{ height: 0 }} transition={{ duration: 0.7 }}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/95 to-black/0" />

          {/* capítulo */}
          <div className="absolute left-6 top-[2.2vh] flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: story.color }}>
            <Clapperboard className="size-4" />
            {t(story.es, story.en)}
            <span className="text-white/40">· {String(s.step + 1).padStart(2, "0")}/{String(story.steps.length).padStart(2, "0")}</span>
          </div>
          {variable && mode !== "trend" && (
            <motion.div key={year} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className={`absolute right-6 top-[1.6vh] font-mono text-3xl font-semibold tabular-nums ${year > 2024 ? "text-fuchsia-300" : "text-white"}`}>
              {year}
            </motion.div>
          )}

          {/* cifra clave */}
          <AnimatePresence mode="wait">
            {s.stat && (
              <motion.div
                key={s.stat.value}
                initial={{ opacity: 0, x: -20, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
                className="absolute left-6 top-[16vh] sm:left-10"
              >
                <div className="text-6xl font-semibold tracking-tight sm:text-7xl" style={{ color: story.color, textShadow: `0 0 40px ${story.color}66` }}>
                  {s.stat.value}
                </div>
                <div className="mt-1 max-w-[260px] font-mono text-xs uppercase tracking-[0.2em] text-white/70">{t(s.stat.es, s.stat.en)}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* subtítulos */}
          <div className="absolute inset-x-0 bottom-[7vh] flex justify-center px-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={s.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.45 }}
                className="max-w-3xl text-center text-lg font-medium leading-relaxed text-white sm:text-2xl"
                style={{ textShadow: "0 2px 12px #000" }}
              >
                {s.text}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* progreso y controles */}
          <div className="pointer-events-auto absolute inset-x-0 bottom-[2vh] flex items-center justify-center gap-3">
            <div className="flex gap-1">
              {story.steps.map((_, i) => (
                <span key={i} className="h-1 w-8 rounded-full transition-colors" style={{ background: i <= s.step ? story.color : "rgba(255,255,255,.2)" }} />
              ))}
            </div>
            <button onClick={s.prev} className="text-white/70 hover:text-white" aria-label={t("Anterior", "Previous")}><SkipBack className="size-4" /></button>
            <button onClick={s.togglePause} className="text-white/70 hover:text-white" aria-label={s.paused ? t("Continuar", "Resume") : t("Pausar", "Pause")}>
              {s.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
            <button onClick={s.next} className="text-white/70 hover:text-white" aria-label={t("Siguiente", "Next")}><SkipForward className="size-4" /></button>
            <button onClick={s.stop} className="ml-2 flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:border-white/50" aria-label={t("Salir de la historia", "Exit story")}>
              <X className="size-3.5" /> {t("Salir", "Exit")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function StoryMenu() {
  const s = useStory();
  const t = useT();
  return (
    <AnimatePresence>
      {s.menu && (
        <motion.div
          key="menu"
          className="absolute inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => s.setMenu(false)}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="holo-panel w-full max-w-3xl p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={t("Historias", "Stories")}
          >
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-cyan">
              <Clapperboard className="size-4" /> {t("Modo historia", "Story mode")}
              <button onClick={() => s.setMenu(false)} className="ml-auto text-muted hover:text-ink" aria-label={t("Cerrar", "Close")}><X className="size-4" /></button>
            </div>
            <h2 className="mt-2 text-2xl font-semibold">{t("Misiones narradas por la IA", "Missions narrated by the AI")}</h2>
            <p className="mt-1 text-sm text-muted">{t("Siéntate y mira: el globo vuela, las capas cambian y la IA te cuenta lo que dicen los datos.", "Sit back: the globe flies, layers change and the AI tells you what the data says.")}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {STORIES.map((st) => (
                <button
                  key={st.id}
                  onClick={() => s.start(st.id)}
                  className="group relative overflow-hidden rounded-xl border border-line bg-deep/70 p-4 text-left transition hover:border-[var(--c)]"
                  style={{ ["--c" as string]: st.color }}
                >
                  <span className="absolute inset-y-0 left-0 w-1" style={{ background: st.color, boxShadow: `0 0 18px ${st.color}` }} />
                  <span className="block text-base font-semibold group-hover:text-[var(--c)]">{t(st.es, st.en)}</span>
                  <span className="mt-1 block text-xs text-muted">{t(st.subEs, st.subEn)}</span>
                  <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted group-hover:text-[var(--c)]">
                    <Play className="size-3" /> {t("Reproducir", "Play")} · {st.steps.length} {t("escenas", "scenes")}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
