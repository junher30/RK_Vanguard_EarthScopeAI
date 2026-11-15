"use client";

// sonidos sintetizados (sin archivos) y vibración de los mandos
let ctx: AudioContext | null = null;
function ac() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.12, slide = 0) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

export const sfx = {
  click: () => tone(880, 0.07, "triangle", 0.1),
  hover: () => tone(1400, 0.03, "sine", 0.03),
  grab: () => tone(220, 0.16, "sine", 0.14, 1.8),
  release: () => tone(380, 0.14, "sine", 0.1, 0.6),
  select: () => { tone(660, 0.12, "sine", 0.1); setTimeout(() => tone(990, 0.18, "sine", 0.09), 90); },
};

export function buzz(source: XRInputSource | undefined, intensity = 0.4, ms = 30) {
  const act = source?.gamepad?.hapticActuators?.[0] as { pulse?: (v: number, d: number) => Promise<boolean> } | undefined;
  try { act?.pulse?.(intensity, ms); } catch { /* sin vibración */ }
}
