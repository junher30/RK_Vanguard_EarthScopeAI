"use client";

import { sessionId, viewContext } from "@/lib/agentContext";
import { tr, useT } from "@/lib/i18n";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Loader2, MessageCircle, Mic, Send, Square, X } from "lucide-react";
import { askAgent } from "@/lib/api";
import { runActions } from "@/lib/agentActions";
import { useMascot } from "@/lib/mascot";
import { askVoice, startRecording, type Recording } from "@/lib/voice";

type Msg = { role: "user" | "agent" | "error"; text: string };

// markdown mínimo: negritas, cursivas, código y listas con guiones
function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <b key={`${key}${i}`}>{p.slice(2, -2)}</b>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={`${key}${i}`} className="font-mono text-cyan">{p.slice(1, -1)}</code>;
    if (p.length > 2 && p.startsWith("*") && p.endsWith("*")) return <i key={`${key}${i}`}>{p.slice(1, -1)}</i>;
    return p;
  });
}

function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let items: string[] = [];
  const flush = () => {
    if (!items.length) return;
    const k = blocks.length;
    blocks.push(
      <ul key={k} className="ml-4 list-disc space-y-1">
        {items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}-`)}</li>)}
      </ul>,
    );
    items = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const li = line.match(/^[-*•]\s+(.*)/) ?? line.match(/^\d+[.)]\s+(.*)/);
    if (li) { items.push(li[1]); continue; }
    flush();
    if (!line) continue;
    const k = blocks.length;
    blocks.push(<p key={k}>{inline(line.replace(/^#+\s*/, ""), `${k}-`)}</p>);
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

const SUGGESTIONS: [string, string][] = [
  ["¿Qué está pasando ahora en el planeta?", "What is happening on the planet right now?"],
  ["¿Qué pasa aquí? ¿Hace más calor?", "What is happening here? Is it getting warmer?"],
  ["Muéstrame cómo se verá la vegetación en 2030", "Show me what vegetation will look like in 2030"],
];

export default function ChatPanel() {
  const t = useT();
  const open = useMascot((s) => s.chatOpen);
  const setOpen = (o: boolean | ((x: boolean) => boolean)) =>
    useMascot.getState().setChatOpen(typeof o === "function" ? o(useMascot.getState().chatOpen) : o);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recording | null>(null);
  const session = useRef<string>("");
  const list = useRef<HTMLDivElement>(null);

  // saluda al abrir el chat
  useEffect(() => {
    if (open) useMascot.getState().pulse("greet", 1000);
  }, [open]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  // preguntas que llegan de otras partes (ficha de un evento, historias…)
  const pending = useMascot((st) => st.pending);
  useEffect(() => {
    if (!pending) return;
    useMascot.setState({ pending: null });
    send(pending);
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(q: string) {
    const message = q.trim();
    if (!message || busy) return;
    if (!session.current) session.current = sessionId();
    setText("");
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    const mascot = useMascot.getState();
    mascot.setMood("thinking");
    try {
      const { reply, actions } = await askAgent(message, session.current, viewContext());
      runActions(actions);
      setMsgs((m) => [...m, { role: "agent", text: reply }]);
      // señala el globo si lo movió, luego habla un rato según lo largo de la respuesta
      const talk = Math.min(7000, 1200 + reply.length * 35);
      if (actions?.some((a) => a.type === "fly" || a.type === "layer")) {
        mascot.pulse("pointing", 1400);
        setTimeout(() => useMascot.getState().mood === "pointing" && useMascot.getState().pulse("talking", talk), 1400);
      } else {
        mascot.pulse("talking", talk);
      }
    } catch (e) {
      const err = e as Error;
      const text =
        err.name === "AbortError" ? tr("La IA tardó demasiado. Inténtalo otra vez.", "The agent took too long. Try again.")
        : err.message === "unavailable" || err.name === "TypeError"
          ? tr("IA no disponible: levanta el backend con una API key.", "Agent unavailable. Start the backend with an API key to use it.")
          : `${tr("Error de la IA", "Agent error")}: ${err.message}`;
      setMsgs((m) => [...m, { role: "error", text }]);
      useMascot.getState().setMood("idle");
    } finally {
      setBusy(false);
    }
  }

  // voz: tocar para hablar, tocar otra vez para enviar
  async function stopVoice() {
    const r = rec.current;
    rec.current = null;
    setListening(false);
    if (!r) return;
    const audio = await r.stop();
    if (!session.current) session.current = sessionId();
    setBusy(true);
    useMascot.getState().setMood("thinking");
    try {
      const res = await askVoice(audio, session.current, viewContext());
      if (!res.transcript) {
        setMsgs((m) => [...m, { role: "error", text: tr("No te escuché bien, inténtalo otra vez.", "I did not catch that, try again.") }]);
        useMascot.getState().setMood("idle");
      } else {
        runActions(res.actions);
        setMsgs((m) => [...m, { role: "user", text: res.transcript }, { role: "agent", text: res.reply }]);
        useMascot.getState().pulse("talking", Math.min(7000, 1200 + res.reply.length * 35));
      }
    } catch (e) {
      const err = e as Error;
      setMsgs((m) => [...m, { role: "error", text: err.message === "unavailable" || err.name === "TypeError"
        ? tr("Voz no disponible: falta ELEVENLABS_API_KEY o GOOGLE_API_KEY en el backend.", "Voice unavailable: set ELEVENLABS_API_KEY or GOOGLE_API_KEY in the backend.")
        : `${tr("Error de voz", "Voice error")}: ${err.message}` }]);
      useMascot.getState().setMood("idle");
    } finally {
      setBusy(false);
    }
  }
  async function toggleVoice() {
    if (listening) { stopVoice(); return; }
    if (busy) return;
    try {
      rec.current = await startRecording(12, () => stopVoice());
      setListening(true);
      useMascot.getState().setMood("thinking");
    } catch {
      setMsgs((m) => [...m, { role: "error", text: tr("Micrófono no disponible. Permítelo en el navegador.", "Microphone not available. Allow it in the browser.") }]);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-primary shrink-0"
        aria-label={open ? t("Cerrar asistente", "Close assistant") : t("Abrir asistente", "Open assistant")}
      >
        {open ? <X className="size-4" /> : <MessageCircle className="size-4" />}
        <span className="hidden md:inline">{t("Preguntar", "Ask")}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.section
            key="chat"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="glass absolute right-0 top-full z-40 mt-3 !bg-[#050c1d] flex max-h-[min(70dvh,620px)] w-full flex-col sm:w-[380px]"
            aria-label="EarthScope assistant"
          >
            <header className="flex items-center gap-2 border-b border-line/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">
              <Bot className="size-4" /> {t("Asistente EarthScope", "EarthScope assistant")}
            </header>

            <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
              {msgs.length === 0 && (
                <div className="space-y-2">
                  <p className="text-muted">
                    {t("Pregunta por tendencias, predicciones o lo que pasa ahora en la Tierra. Marca un punto y di \"aquí\".",
                      "Ask about trends, predictions or what is happening on Earth now. Mark a point and say \"here\".")}
                  </p>
                  {SUGGESTIONS.map(([es, en]) => (
                    <button key={en} onClick={() => send(t(es, en))} className="btn w-full justify-start text-left">
                      {t(es, en)}
                    </button>
                  ))}
                </div>
              )}
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-xl bg-cyan/15 px-3 py-2"
                      : m.role === "error"
                        ? "rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-red-200"
                        : "mr-4 rounded-xl bg-white/5 px-3 py-2"
                  }
                >
                  {m.role === "agent" ? <Markdown text={m.text} /> : m.text}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-muted">
                  <Loader2 className="size-4 animate-spin" /> Checking NASA data…
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(text); }}
              className="flex gap-2 border-t border-line/60 p-3"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("Pregunta lo que quieras…", "Ask anything…")}
                maxLength={4000}
                className="min-w-0 flex-1 rounded-xl border border-line/60 bg-transparent px-3 py-2 text-sm outline-none focus:border-cyan"
              />
              <button
                type="button"
                onClick={toggleVoice}
                disabled={busy && !listening}
                className={listening ? "btn-primary animate-pulse" : "btn"}
                aria-label={listening ? t("Parar y enviar", "Stop and send voice question") : t("Preguntar por voz", "Ask by voice")}
                title={listening ? t("Toca para enviar", "Tap to send") : t("Pregunta por voz", "Ask by voice")}
              >
                {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
              </button>
              <button type="submit" disabled={busy || !text.trim()} className="btn-primary" aria-label="Send">
                <Send className="size-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
