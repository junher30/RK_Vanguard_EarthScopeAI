"use client";

// grabar la voz como WAV de 16 kHz (sirve en el navegador del Quest) y preguntarle a la mascota
import { API_BASE, type AgentReply, type ChatContext } from "./api";

export type Recording = { stop: () => Promise<Blob>; cancel: () => void; level: () => number };

export async function startRecording(maxSeconds = 12, onLimit?: () => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let lvl = 0;
  proc.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(d));
    let s = 0;
    for (let i = 0; i < d.length; i += 16) s += d[i] * d[i];
    lvl = Math.min(1, Math.sqrt(s / (d.length / 16)) * 6);
  };
  src.connect(proc);
  proc.connect(ctx.destination);
  const close = () => {
    proc.disconnect();
    src.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
  };
  let done = false;
  const auto = setTimeout(() => onLimit?.(), maxSeconds * 1000);
  const stop = async () => {
    if (done) return new Blob();
    done = true;
    clearTimeout(auto);
    const rate = ctx.sampleRate;
    close();
    return wav(downsample(chunks, rate, 16000), 16000);
  };
  return {
    stop,
    cancel: () => { done = true; clearTimeout(auto); close(); },
    level: () => lvl,
  };
}

export function downsample(chunks: Float32Array[], from: number, to: number) {
  const len = chunks.reduce((a, c) => a + c.length, 0);
  const all = new Float32Array(len);
  let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  if (from === to) return all;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(len / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio), b = Math.min(len, Math.floor((i + 1) * ratio));
    let s = 0;
    for (let j = a; j < b; j++) s += all[j];
    out[i] = s / Math.max(1, b - a);
  }
  return out;
}

export function wav(samples: Float32Array, rate: number) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

export async function askVoice(audio: Blob, session: string, context: ChatContext): Promise<AgentReply & { transcript: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 120000);
  try {
    const q = new URLSearchParams({ session, context: JSON.stringify(context) });
    const r = await fetch(`${API_BASE}/api/v1/agent/voice?${q}`, {
      method: "POST",
      headers: { "content-type": "audio/wav" },
      body: audio,
      signal: ctl.signal,
    });
    if (r.status === 404 || r.status === 503) throw new Error("unavailable");
    if (r.status >= 500 && !(r.headers.get("content-type") ?? "").includes("json")) throw new Error("unavailable");
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? `API ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

