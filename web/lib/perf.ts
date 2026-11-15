"use client";

// equipos con poca memoria de video (visores, celulares): texturas a la mitad y menos efectos
export function lowPower(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return /OculusBrowser|Quest|Pico|Wolvic|Android|iPhone|iPad/i.test(navigator.userAgent) || (mem !== undefined && mem <= 4);
}

const LITE: Record<string, string> = {
  "earth-blue-marble.jpg": "lite/earth-blue-marble.jpg",
  "earth-night.jpg": "lite/earth-night.jpg",
  "night-sky.png": "lite/night-sky.jpg",
  "earth-topology.png": "lite/earth-topology.png",
  "earth-water.png": "lite/earth-water.png",
};

export const texture = (name: string) => `/textures/${lowPower() && LITE[name] ? LITE[name] : name}`;

// libera de la GPU todo lo que cuelga de un objeto 3D (geometrías, materiales y sus texturas)
type Disposable = { dispose: () => void };
export function disposeDeep(root: { traverse: (f: (o: unknown) => void) => void }) {
  const seen = new Set<Disposable>();
  const add = (x: unknown) => { if (x && typeof (x as Disposable).dispose === "function") seen.add(x as Disposable); };
  root.traverse((o) => {
    const obj = o as { geometry?: unknown; material?: unknown };
    add(obj.geometry);
    for (const m of ([] as unknown[]).concat(obj.material ?? [])) {
      add(m);
      for (const v of Object.values(m as Record<string, unknown>)) if ((v as { isTexture?: boolean })?.isTexture) add(v);
      const u = (m as { uniforms?: Record<string, { value: unknown }> }).uniforms;
      if (u) for (const { value } of Object.values(u)) if ((value as { isTexture?: boolean })?.isTexture) add(value);
    }
  });
  seen.forEach((d) => { try { d.dispose(); } catch { /* */ } });
}
