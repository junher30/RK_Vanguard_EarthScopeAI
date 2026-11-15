"use client";

// lluvia animada sobre el globo: gotas donde la capa de precipitación marca más lluvia
import * as THREE from "three";
import { valueOfColor, type Scale } from "@/lib/data";

type Bounds = { lat_min: number; lat_max: number; lon_min: number; lon_max: number };
export type RainSource = { lat: Float32Array; lng: Float32Array; cdf: Float32Array; max: number };

const cache = new Map<string, Promise<RainSource | null>>();

// lee el PNG de la capa y arma una distribución: más gotas donde llueve más
export function rainSource(url: string, scale: Scale, b: Bounds): Promise<RainSource | null> {
  const key = `${url}|${scale.min}|${scale.max}`;
  if (cache.has(key)) return cache.get(key)!;
  const p = new Promise<RainSource | null>((done) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => done(null);
    img.onload = () => {
      const step = Math.max(1, Math.round(img.naturalWidth / 360));
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return done(null);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const la: number[] = [], lo: number[] = [], w: number[] = [];
      for (let y = 0; y < c.height; y += step) {
        for (let x = 0; x < c.width; x += step) {
          const k = (y * c.width + x) * 4;
          if (d[k + 3] < 60) continue;
          const t = valueOfColor(scale, d[k], d[k + 1], d[k + 2]).t;
          if (t < 0.3) continue;
          la.push(b.lat_max - ((y + 0.5) / c.height) * (b.lat_max - b.lat_min));
          lo.push(b.lon_min + ((x + 0.5) / c.width) * (b.lon_max - b.lon_min));
          w.push(Math.pow(t, 2.2));
        }
      }
      if (!w.length) return done(null);
      const cdf = new Float32Array(w.length);
      let acc = 0;
      w.forEach((v, i) => { acc += v; cdf[i] = acc; });
      done({ lat: Float32Array.from(la), lng: Float32Array.from(lo), cdf, max: acc });
    };
    img.src = url;
  });
  cache.set(key, p);
  return p;
}

// lat/lng a coordenadas del globo (misma convención que three-globe)
function polar(lat: number, lng: number, r: number, out: THREE.Vector3) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  out.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  return out;
}

export class Rain extends THREE.LineSegments {
  private src: RainSource | null = null;
  private lat: Float32Array;
  private lng: Float32Array;
  private h: Float32Array;
  private v: Float32Array;
  private tmp = new THREE.Vector3();
  private top = 0.06; // altura de nacimiento, en radios
  private tmp2 = new THREE.Vector3();

  // convention "three-globe" usa lat/lng de three-globe; "xr" usa la del mundo VR (lon 0 en +x)
  constructor(private radius: number, private n = 4000, private convention: "three-globe" | "xr" = "three-globe") {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xcfe8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    super(geo, mat);
    this.frustumCulled = false;
    this.lat = new Float32Array(n);
    this.lng = new Float32Array(n);
    this.h = new Float32Array(n);
    this.v = new Float32Array(n);
    this.visible = false;
  }

  setSource(src: RainSource | null) {
    this.src = src;
    this.visible = !!src;
    if (src) for (let i = 0; i < this.n; i++) this.spawn(i, true);
  }

  private spawn(i: number, anywhere = false) {
    const s = this.src!;
    const r = Math.random() * s.max;
    let lo = 0, hi = s.cdf.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (s.cdf[m] < r) lo = m + 1; else hi = m; }
    this.lat[i] = s.lat[lo] + (Math.random() - 0.5) * 0.9;
    this.lng[i] = s.lng[lo] + (Math.random() - 0.5) * 0.9;
    this.h[i] = anywhere ? Math.random() * this.top : this.top * (0.55 + Math.random() * 0.45);
    this.v[i] = this.top * (0.4 + Math.random() * 0.35);
  }

  private place(lat: number, lng: number, r: number, out: THREE.Vector3) {
    if (this.convention === "three-globe") return polar(lat, lng, r, out);
    const la = (lat * Math.PI) / 180, lo = (lng * Math.PI) / 180;
    return out.set(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
  }

  // altitude: distancia de la cámara a la superficie en radios; la lluvia se adapta al zoom
  update(dt: number, altitude = 1) {
    if (!this.src || !this.visible) return;
    this.top = Math.max(0.004, Math.min(0.06, altitude * 0.35));
    const len = this.top * 0.1;
    const pos = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    const a = pos.array as Float32Array;
    const R = this.radius;
    for (let i = 0; i < this.n; i++) {
      this.h[i] -= this.v[i] * dt;
      if (this.h[i] < 0.0005 || this.h[i] > this.top * 1.05) this.spawn(i);
      const h = this.h[i];
      this.place(this.lat[i], this.lng[i], R * (1 + h), this.tmp);
      this.place(this.lat[i], this.lng[i], R * (1 + h + len), this.tmp2);
      a.set([this.tmp.x, this.tmp.y, this.tmp.z, this.tmp2.x, this.tmp2.y, this.tmp2.z], i * 6);
    }
    pos.needsUpdate = true;
  }
}
