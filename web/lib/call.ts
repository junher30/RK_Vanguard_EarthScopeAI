"use client";

// Llamada en vivo con la IA: escucha continuo, detecta cuándo terminas de hablar, la IA responde con voz
// (ElevenLabs) y mueve el globo mientras habla. Si hablas mientras responde, se calla y te escucha.
import { create } from "zustand";
import { API_BASE, type AgentReply } from "./api";
import { runActions } from "./agentActions";
import { sessionId, viewContext } from "./agentContext";
import { useAssistant } from "./assistant";
import { downsample, wav } from "./voice";
import { tr } from "./i18n";

export type CallPhase = "connecting" | "listening" | "hearing" | "thinking" | "speaking";

type CallStore = {
  active: boolean;
  phase: CallPhase;
  level: number;
  muted: boolean;
  you: string;
  ai: string;
  error: string;
  start: () => void;
  hangup: () => void;
  toggleMute: () => void;
};

let engine: Engine | null = null;

export const useCall = create<CallStore>((set, get) => ({
  active: false,
  phase: "connecting",
  level: 0,
  muted: false,
  you: "",
  ai: "",
  error: "",
  start: () => {
    if (get().active) return;
    set({ active: true, phase: "connecting", you: "", ai: "", error: "", muted: false });
    engine = new Engine();
    engine.start().catch((e: Error) => {
      set({ error: e.name === "NotAllowedError" ? tr("Micrófono bloqueado: permítelo en el navegador.", "Microphone blocked: allow it in the browser.") : tr("No se pudo abrir el micrófono.", "Could not open the microphone.") });
      setTimeout(() => get().hangup(), 2500);
    });
  },
  hangup: () => {
    engine?.stop();
    engine = null;
    useAssistant.getState().setMood("idle");
    set({ active: false, level: 0 });
  },
  toggleMute: () => set({ muted: !get().muted }),
}));

const S = () => useCall.getState();
const put = (p: Partial<CallStore>) => useCall.setState(p);

const PREROLL = 0.35; // segundos guardados antes de detectar voz, para no cortar la primera sílaba
const END_SILENCE = 0.8; // silencio que marca el final de tu frase
const MIN_SPEECH = 0.35;
const MAX_TURN = 15;

class Engine {
  private stream?: MediaStream;
  private ctx?: AudioContext;
  private proc?: ScriptProcessorNode;
  private src?: MediaStreamAudioSourceNode;
  private audio?: HTMLAudioElement;
  private ring: Float32Array[] = [];
  private turn: Float32Array[] = [];
  private floor = 0.01;
  private voiced = 0;
  private silent = 0;
  private speech = 0;
  private alive = true;
  private reqId = 0;
  private session = sessionId();

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    if (!this.alive) { this.stream.getTracks().forEach((t) => t.stop()); return; }
    this.ctx = new AudioContext();
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.proc = this.ctx.createScriptProcessor(2048, 1, 1);
    this.proc.onaudioprocess = (e) => this.onAudio(new Float32Array(e.inputBuffer.getChannelData(0)));
    this.src.connect(this.proc);
    this.proc.connect(this.ctx.destination);
    put({ phase: "listening" });
    useAssistant.getState().pulse("greet", 1000);
  }

  stop() {
    this.alive = false;
    this.reqId++;
    this.stopVoice();
    this.proc?.disconnect();
    this.src?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
  }

  private onAudio(d: Float32Array) {
    const rate = this.ctx!.sampleRate;
    const dt = d.length / rate;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i] * d[i];
    const rms = Math.sqrt(s / (d.length / 4));
    const st = S();
    put({ level: st.muted ? 0 : Math.min(1, rms * 8) });
    if (st.muted) { this.voiced = 0; return; }

    const phase = st.phase;
    // ruido de fondo: se adapta despacio cuando no hablas
    if (phase === "listening" && rms < this.floor * 2) this.floor = this.floor * 0.97 + rms * 0.03;
    const thr = Math.max(0.012, this.floor * 3);

    if (phase === "listening" || phase === "speaking") {
      this.ring.push(d);
      while (this.ring.length * dt > PREROLL) this.ring.shift();
      // mientras la IA habla, hace falta voz más fuerte para interrumpir (el eco no cuenta)
      const need = phase === "speaking" ? Math.max(0.05, thr * 3) : thr;
      this.voiced = rms > need ? this.voiced + dt : 0;
      if (this.voiced >= (phase === "speaking" ? 0.3 : 0.12)) {
        if (phase === "speaking") { this.reqId++; this.stopVoice(); }
        this.turn = [...this.ring];
        this.ring = [];
        this.speech = this.voiced;
        this.silent = 0;
        put({ phase: "hearing" });
        useAssistant.getState().setMood("idle");
      }
      return;
    }
    if (phase === "hearing") {
      this.turn.push(d);
      if (rms > thr) { this.speech += dt; this.silent = 0; } else this.silent += dt;
      const len = this.turn.length * dt;
      if (this.silent >= END_SILENCE || len >= MAX_TURN) {
        const chunks = this.turn;
        this.turn = [];
        this.voiced = 0;
        if (this.speech < MIN_SPEECH) { put({ phase: "listening" }); return; }
        this.send(wav(downsample(chunks, rate, 16000), 16000));
      }
    }
  }

  private async send(audio: Blob) {
    const id = ++this.reqId;
    put({ phase: "thinking" });
    useAssistant.getState().setMood("thinking");
    try {
      const q = new URLSearchParams({ session: this.session, context: JSON.stringify(viewContext()), call: "true" });
      const r = await fetch(`${API_BASE}/api/v1/agent/voice?${q}`, {
        method: "POST",
        headers: { "content-type": "audio/wav" },
        body: audio,
      });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? `API ${r.status}`);
      const res: AgentReply & { transcript: string } = await r.json();
      if (id !== this.reqId || !this.alive) return;
      if (!res.transcript) { put({ phase: "listening" }); useAssistant.getState().setMood("idle"); return; }
      put({ you: res.transcript, ai: res.reply });
      // el globo se mueve mientras la IA empieza a hablar
      runActions(res.actions);
      await this.say(res.reply, id);
    } catch (e) {
      if (id !== this.reqId) return;
      put({ ai: "", error: (e as Error).message.includes("not configured") ? tr("Falta la API key en el backend.", "The backend is missing its API key.") : tr("Se cortó la respuesta. Inténtalo de nuevo.", "The answer was cut off. Try again.") });
      setTimeout(() => put({ error: "" }), 3000);
    }
    if (id === this.reqId && this.alive) {
      put({ phase: "listening" });
      useAssistant.getState().setMood("idle");
    }
  }

  private async say(text: string, id: number) {
    if (!text) return;
    put({ phase: "speaking" });
    useAssistant.getState().setMood("talking");
    let blob: Blob | null = null;
    try {
      const r = await fetch(`${API_BASE}/api/v1/agent/speak`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (r.ok) blob = await r.blob();
    } catch { /* sin voz de ElevenLabs */ }
    if (id !== this.reqId || !this.alive) return;
    if (!blob) return this.sayBrowser(text, id);
    const url = URL.createObjectURL(blob);
    await new Promise<void>((done) => {
      const a = new Audio(url);
      this.audio = a;
      a.onended = a.onerror = a.onpause = () => done();
      a.play().catch(() => done());
    });
    URL.revokeObjectURL(url);
    this.audio = undefined;
  }

  // respaldo: la voz del sistema si no hay ElevenLabs
  private sayBrowser(text: string, id: number) {
    return new Promise<void>((done) => {
      if (!("speechSynthesis" in window)) return done();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = /[ñáéíóú¿¡]/i.test(text) || / (el|la|los|de|que|en) /i.test(text) ? "es-ES" : "en-US";
      u.onend = u.onerror = () => done();
      if (id === this.reqId) speechSynthesis.speak(u);
      else done();
    });
  }

  private stopVoice() {
    if (this.audio) { this.audio.pause(); this.audio = undefined; }
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
  }
}
