"use client";

// Mundo VR/MR: globo con datos NASA, paneles de control, asistente por voz y control con mandos o manos (Quest 3)
import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { analyzeArea, askAgent } from "@/lib/api";
import { addActionListener, runActions, type AgentAction } from "@/lib/agentActions";
import { loadManifest, mapUrl, useLayer, type MapMode, type Manifest } from "@/lib/data";
import { forecastUrl } from "@/lib/forecast";
import { useAssistant } from "@/lib/assistant";
import { useExplorer } from "@/lib/store";
import { atmosphereMaterial, earthMaterial, sunDirection } from "@/lib/xr/earthShader";
import { buzz, sfx } from "@/lib/xr/feedback";
import { handFactory, HandReader } from "@/lib/xr/hands";
import { askVoice, startRecording, type Recording } from "@/lib/voice";
import { createDetail } from "@/lib/globe/detail";
import { Rain, rainSource } from "@/lib/globe/rain";
import { satMesh } from "@/lib/globe/useSatellites";
import { loadSatellites, satPosition, type Sat } from "@/lib/satellites";

export type XRMode = "immersive-vr" | "immersive-ar";

const R = 0.3; // radio del globo en metros
const GLOBE_POS = new THREE.Vector3(0, 1.25, -0.8);
const VARS: [string, string][] = [
  ["precip_mm_day", "Lluvia"], ["evi", "Vegetación"], ["lst_day_c", "Temp. superficie"],
  ["t2m_c", "Temp. aire"], ["rh2m_pct", "Humedad"],
];
const MODES: [MapMode, string][] = [["value", "Media"], ["anomaly", "Anomalía"], ["trend", "Tendencia"]];
const QUICK: [string, string][] = [
  ["q-here", "¿Qué pasa aquí?"],
  ["q-explain", "Explícame el mapa"],
  ["q-surprise", "Llévame a un lugar sorpresa"],
];

// --- geometría lat/lng sobre la esfera de three (lon 0 en +x, este hacia -z)
function latLngToVec(lat: number, lng: number, r = 1) {
  const la = THREE.MathUtils.degToRad(lat), lo = THREE.MathUtils.degToRad(lng);
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(r);
}
function vecToLatLng(v: THREE.Vector3) {
  const n = v.clone().normalize();
  return { lat: THREE.MathUtils.radToDeg(Math.asin(n.y)), lng: THREE.MathUtils.radToDeg(Math.atan2(-n.z, n.x)) };
}
// rotación que pone (lat, lng) de frente al usuario (+z)
function faceQuat(lat: number, lng: number) {
  const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -THREE.MathUtils.degToRad(lng) - Math.PI / 2);
  const pitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(lat));
  return pitch.multiply(yaw);
}

// --- paneles dibujados en un canvas
type Btn = { id: string; x: number; y: number; w: number; h: number; label: string; on?: boolean };

class Panel {
  canvas = document.createElement("canvas");
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  mesh: THREE.Mesh;
  buttons: Btn[] = [];
  hover: string | null = null;
  constructor(public wM: number, public hM: number, public px = 1024) {
    this.canvas.width = px;
    this.canvas.height = Math.round((px * hM) / wM);
    this.ctx = this.canvas.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(wM, hM),
      new THREE.MeshBasicMaterial({ map: this.tex, transparent: true }),
    );
  }
  get W() { return this.canvas.width; }
  get H() { return this.canvas.height; }
  begin() {
    const c = this.ctx;
    this.buttons = [];
    c.clearRect(0, 0, this.W, this.H);
    roundRect(c, 4, 4, this.W - 8, this.H - 8, 36);
    c.fillStyle = "rgba(5,12,29,0.92)";
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = "rgba(34,211,238,0.45)";
    c.stroke();
  }
  title(text: string, y: number) {
    const c = this.ctx;
    c.fillStyle = "#22d3ee";
    c.font = "700 34px system-ui, sans-serif";
    c.fillText(text.toUpperCase(), 40, y);
  }
  label(text: string, y: number, size = 30, color = "#94a3b8", x = 40) {
    const c = this.ctx;
    c.fillStyle = color;
    c.font = `500 ${size}px system-ui, sans-serif`;
    c.fillText(text, x, y);
  }
  wrap(text: string, y: number, size = 32, color = "#e2e8f0", maxLines = 12) {
    const c = this.ctx;
    c.fillStyle = color;
    c.font = `400 ${size}px system-ui, sans-serif`;
    const maxW = this.W - 80;
    let line = "", lines = 0;
    for (const para of text.split("\n")) {
      for (const word of para.split(" ")) {
        const test = line ? `${line} ${word}` : word;
        if (c.measureText(test).width > maxW && line) {
          c.fillText(line, 40, y); y += size * 1.3; line = word; lines++;
          if (lines >= maxLines) return y;
        } else line = test;
      }
      if (line) { c.fillText(line, 40, y); y += size * 1.3; line = ""; lines++; }
      if (lines >= maxLines) return y;
    }
    return y;
  }
  button(b: Btn) {
    const c = this.ctx;
    this.buttons.push(b);
    roundRect(c, b.x, b.y, b.w, b.h, b.h / 2);
    const hov = this.hover === b.id;
    c.fillStyle = b.on ? "#22d3ee" : hov ? "rgba(34,211,238,0.25)" : "rgba(255,255,255,0.06)";
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = b.on ? "#22d3ee" : hov ? "#67e8f9" : "rgba(148,163,184,0.45)";
    c.stroke();
    c.fillStyle = b.on ? "#03111f" : "#e2e8f0";
    c.font = `600 ${Math.round(b.h * 0.42)}px system-ui, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
  }
  end() { this.tex.needsUpdate = true; }
  hit(uv: THREE.Vector2) {
    const x = uv.x * this.W, y = (1 - uv.y) * this.H;
    return this.buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)?.id ?? null;
  }
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// --- el mundo
export async function startXR(session: XRSession, mode: XRMode): Promise<() => void> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: mode === "immersive-ar" });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  renderer.domElement.style.display = "none";
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  const loader = new THREE.TextureLoader();

  // fondo: estrellas en VR, la sala real en MR
  if (mode === "immersive-vr") {
    const sky = loader.load("/textures/night-sky.png");
    sky.colorSpace = THREE.SRGBColorSpace;
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(40, 48, 32), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide })));
  }
  scene.add(new THREE.HemisphereLight(0xdff6ff, 0x1a2a44, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(1.5, 3, 2);
  scene.add(sun);
  scene.add(sun.target);

  // globo
  const globe = new THREE.Group();
  globe.position.copy(GLOBE_POS);
  scene.add(globe);
  const tex = { day: loader.load("/textures/earth-blue-marble.jpg"), night: loader.load("/textures/earth-night.jpg") };
  Object.values(tex).forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
  const water = loader.load("/textures/earth-water.png");
  // el sol en su posición real de este momento
  const earthMat = earthMaterial(tex.day, tex.night, water);
  const sunLocal = new THREE.Vector3();
  const updateSun = () => {
    const s0 = sunDirection();
    sunLocal.copy(latLngToVec(s0.lat, s0.lng)).normalize();
    earthMat.uniforms.sunDir.value.copy(sunLocal);
  };
  updateSun();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), earthMat);
  globe.add(earth);
  const overlayMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.78, depthWrite: false });
  const overlay = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 96, 64), overlayMat);
  overlay.visible = false;
  globe.add(overlay);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 64, 48), atmosphereMaterial());
  globe.add(atmo);
  // detalle NASA GIBS (convención de three-globe: se gira 90° para alinear con esta esfera)
  const detail = createDetail(R * 1.0008, 3);
  const detailHolder = new THREE.Group();
  detailHolder.rotation.y = Math.PI / 2;
  detailHolder.add(detail.obj);
  globe.add(detailHolder);
  detail.setImagery("day");
  // lluvia animada
  const rain = new Rain(R, 2500, "xr");
  globe.add(rain);
  // satélites en su posición real, con su nombre flotando
  const satGroup = new THREE.Group();
  globe.add(satGroup);
  const satMeshes = new Map<number, { sat: Sat; obj: THREE.Group }>();
  const nameSprite = (text: string, color: string) => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(3,10,24,.75)";
    roundRect(g, 4, 8, 248, 48, 24); g.fill();
    g.strokeStyle = color; g.lineWidth = 3; g.stroke();
    g.fillStyle = color; g.font = "600 28px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, 128, 33);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    sp.scale.set(0.06, 0.015, 1);
    sp.position.y = 0.014;
    return sp;
  };
  loadSatellites().then((list) => {
    for (const sat of list) {
      const obj = new THREE.Group();
      const m = satMesh(sat.color, 1);
      m.scale.setScalar(0.0022);
      obj.add(m);
      const label = nameSprite(sat.name, sat.color);
      obj.add(label);
      obj.userData.sat = sat;
      satGroup.add(obj);
      satMeshes.set(sat.norad, { sat, obj });
    }
    updateSats();
  });
  const updateSats = () => {
    const now = new Date();
    for (const { sat, obj } of satMeshes.values()) {
      const p = satPosition(sat, now);
      if (!p) continue;
      obj.position.copy(latLngToVec(p.lat, p.lng, R * (1 + p.altKm / 6371)));
    }
  };
  const satTimer = setInterval(updateSats, 1000);
  // marcador del punto elegido
  const marker = new THREE.Group();
  marker.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.022, 16, 12), new THREE.MeshBasicMaterial({ color: 0x22d3ee })));
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.04, R * 0.05, 40), new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide, transparent: true }));
  marker.add(ring);
  marker.visible = false;
  globe.add(marker);

  let targetQuat: THREE.Quaternion | null = null;
  let spin = true;

  // paneles
  const control = new Panel(0.5, 0.62);
  control.mesh.position.set(-0.6, 1.3, -0.58);
  control.mesh.rotation.y = 0.6;
  scene.add(control.mesh);
  const info = new Panel(0.52, 0.62);
  info.mesh.position.set(0.6, 1.3, -0.58);
  info.mesh.rotation.y = -0.6;
  scene.add(info.mesh);


  // estado del panel de información
  const st = {
    point: null as { lat: number; lng: number } | null,
    head: "Toca el globo",
    body: "Apunta con el mando o la mano y pulsa el gatillo (o junta los dedos) sobre cualquier lugar del planeta.\n\nAgarra el globo con el botón lateral para girarlo. Con las dos manos, acércalo o aléjalo.",
    busy: false,
    voice: typeof speechSynthesis !== "undefined",
    listening: false,
    level: 0,
  };
  let manifest: Manifest | null = null;
  let session_alive = true;

  const say = (text: string) => {
    if (!st.voice || typeof speechSynthesis === "undefined") return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = /[áéíóúñ¿¡]/i.test(text) ? "es-ES" : "en-US";
      speechSynthesis.speak(u);
    } catch { /* sin voz */ }
  };

  const drawControl = () => {
    const L = useLayer.getState();
    control.begin();
    control.title("EarthScope AI", 70);
    control.label("Capa NASA", 130);
    VARS.forEach(([k, name], i) => control.button({ id: `v:${k}`, x: 40 + (i % 2) * 476, y: 150 + Math.floor(i / 2) * 92, w: 460, h: 76, label: name, on: L.variable === k }));
    control.button({ id: "v:none", x: 516, y: 334, w: 460, h: 76, label: "Sin capa", on: !L.variable });
    control.label("Modo", 460);
    MODES.forEach(([m, name], i) => control.button({ id: `m:${m}`, x: 40 + i * 318, y: 480, w: 302, h: 76, label: name, on: L.mode === m }));
    control.label("Año", 620);
    control.button({ id: "y:-", x: 40, y: 640, w: 120, h: 86, label: "−" });
    control.ctx.fillStyle = "#e2e8f0";
    control.ctx.font = "700 60px system-ui, sans-serif";
    control.ctx.fillText(L.mode === "trend" ? "2001–24" : String(L.year), 190, 705);
    control.button({ id: "y:+", x: 470, y: 640, w: 120, h: 86, label: "+" });
    control.button({ id: "play", x: 620, y: 640, w: 356, h: 86, label: L.playing ? "❚❚ Pausa" : "▶ Animar", on: L.playing });
    control.button({ id: "img", x: 40, y: 770, w: 302, h: 76, label: earthMat.uniforms.allDay.value ? "🌗 Sol real" : "☀ Todo de día" });
    control.button({ id: "spin", x: 358, y: 770, w: 302, h: 76, label: spin ? "Parar giro" : "Girar", on: spin });
    control.button({ id: "voice", x: 676, y: 770, w: 300, h: 76, label: st.voice ? "🔊 Voz" : "🔇 Voz", on: st.voice });
    control.button({ id: "center", x: 40, y: 870, w: 936, h: 76, label: "⟲ Traer el globo al frente" });
    control.label("Desliza el dedo sobre el globo para girarlo · doble toque marca.", 1000, 27);
    control.label("Pellizca para moverlo · con las dos manos lo agrandas.", 1040, 27);
    control.button({ id: "exit", x: 40, y: 1130, w: 936, h: 90, label: "Salir de la realidad virtual" });
    control.end();
  };

  const drawInfo = () => {
    info.begin();
    info.title("EarthScope AI", 70);
    if (st.point) info.label(`${st.point.lat.toFixed(2)}°, ${st.point.lng.toFixed(2)}°`, 118, 28, "#67e8f9");
    info.wrap(st.head, 180, 40, "#ffffff", 2);
    info.wrap(st.listening ? "Escuchando…\n\nToca el botón otra vez para enviar." : st.busy ? "Analizando…" : st.body, 270, 32, "#e2e8f0", 11);
    // micrófono: tocar para hablar, tocar otra vez para enviar
    info.button({ id: "mic", x: 40, y: 790, w: 944, h: 96, label: st.listening ? "■ Enviar pregunta" : "● Hablar con EarthScope AI", on: st.listening });
    if (st.listening) {
      info.ctx.fillStyle = "#22d3ee";
      info.ctx.fillRect(60, 892, 904 * Math.min(1, st.level), 6);
    }
    QUICK.forEach(([id, label], i) => info.button({ id, x: 40 + (i % 2) * 476, y: 910 + Math.floor(i / 2) * 96, w: i === 2 ? 944 : 460, h: 80, label }));
    info.end();
  };

  const setRain = () => {
    const L = useLayer.getState();
    const meta = manifest?.variables.find((v) => v.key === L.variable);
    if (!meta || L.variable !== "precip_mm_day" || L.mode !== "value") { rain.setSource(null); return; }
    const url = L.year > 2024 ? forecastUrl(meta.key, L.year, meta.scale.value) : mapUrl("global", meta.key, "value", L.year);
    rainSource(url, meta.scale.value, meta.bounds).then((src) => {
      const now = useLayer.getState();
      if (now.variable === "precip_mm_day" && now.mode === "value") rain.setSource(src);
    });
  };

  const setLayerTexture = () => {
    const L = useLayer.getState();
    setRain();
    if (!L.variable) { overlay.visible = false; return; }
    const meta = manifest?.variables.find((v) => v.key === L.variable);
    // 2025-2030: la predicción de la red, servida por el backend
    const url = L.year > 2024 && L.mode === "value" && meta
      ? forecastUrl(L.variable, L.year, meta.scale.value) : mapUrl("global", L.variable, L.mode, L.year);
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      overlayMat.map?.dispose();
      overlayMat.map = t;
      overlayMat.needsUpdate = true;
      overlay.visible = true;
    }, undefined, () => { overlay.visible = false; });
  };

  const placeMarker = (lat: number, lng: number) => {
    marker.position.copy(latLngToVec(lat, lng, R * 1.01));
    marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), latLngToVec(lat, lng).normalize());
    marker.visible = true;
  };

  const flyTo = (lat: number, lng: number) => {
    spin = false;
    targetQuat = faceQuat(lat, lng);
    drawControl();
  };

  const analyse = async (lat: number, lng: number) => {
    st.point = { lat, lng };
    placeMarker(lat, lng);
    const L = useLayer.getState();
    const v = L.variable ?? "t2m_c";
    const name = VARS.find(([k]) => k === v)?.[1] ?? v;
    st.head = `${name} en este punto`;
    st.busy = true;
    drawInfo();
    useAssistant.getState().setMood("thinking");
    try {
      const r = await analyzeArea(v, { point: { lat, lng } });
      st.body = r.ok ? `${r.summary}` : `${r.reason}`;
    } catch {
      st.body = "El servidor de análisis no está disponible. Levanta el backend para ver las tendencias de este punto.";
    }
    st.busy = false;
    drawInfo();
    useAssistant.getState().pulse("talking", 2500);
  };

  const ask = async (q: string) => {
    st.busy = true;
    drawInfo();
    useAssistant.getState().setMood("thinking");
    const L = useLayer.getState();
    const ctx: Record<string, unknown> = { scope: L.scope, layer: L.variable, mode: L.mode, year: L.year, en_vr: true };
    if (st.point) ctx.point = st.point;
    try {
      const { reply, actions } = await askAgent(q, sessionId(), ctx);
      st.head = q;
      st.body = reply;
      runActions(actions);
      say(reply);
      useAssistant.getState().pulse("talking", Math.min(7000, 1200 + reply.length * 35));
    } catch (e) {
      st.head = q;
      st.body = (e as Error).message === "unavailable" || (e as Error).name === "TypeError"
        ? "EarthScope AI no está disponible: levanta el backend con una API key."
        : `Error: ${(e as Error).message}`;
      useAssistant.getState().setMood("idle");
    }
    st.busy = false;
    drawInfo();
  };

  // voz: grabar, transcribir en el backend y responder
  let rec: Recording | null = null;
  const stopListening = async () => {
    const r = rec;
    rec = null;
    st.listening = false;
    if (!r) return;
    const audio = await r.stop();
    st.busy = true;
    drawInfo();
    useAssistant.getState().setMood("thinking");
    const L = useLayer.getState();
    const ctx: Record<string, unknown> = { scope: L.scope, layer: L.variable, mode: L.mode, year: L.year, en_vr: true };
    if (st.point) ctx.point = st.point;
    try {
      const res = await askVoice(audio, sessionId(), ctx);
      if (!res.transcript) {
        st.head = "No te escuché bien";
        st.body = "Inténtalo otra vez, hablando un poco más cerca.";
      } else {
        st.head = `“${res.transcript}”`;
        st.body = res.reply;
        runActions(res.actions);
        say(res.reply);
        useAssistant.getState().pulse("talking", Math.min(7000, 1200 + res.reply.length * 35));
      }
    } catch (e) {
      st.head = "Voz no disponible";
      st.body = (e as Error).message === "unavailable" || (e as Error).name === "TypeError"
        ? "Levanta el backend con GOOGLE_API_KEY para hablar con EarthScope AI."
        : `Error: ${(e as Error).message}`;
      useAssistant.getState().setMood("idle");
    }
    st.busy = false;
    drawInfo();
  };
  let wantMic = false; // para mantener pulsado: si se suelta antes de que arranque el micrófono, se envía igual
  let starting = false;
  const toggleMic = async () => {
    if (st.listening) { wantMic = false; sfx.release(); stopListening(); return; }
    if (st.busy || starting) return;
    wantMic = true;
    starting = true;
    try {
      try { speechSynthesis.cancel(); } catch { /* */ }
      rec = await startRecording(12, () => { if (st.listening) stopListening(); });
      st.listening = true;
      starting = false;
      if (!wantMic) { sfx.release(); stopListening(); return; }
      sfx.select();
      useAssistant.getState().setMood("thinking");
    } catch {
      starting = false;
      st.head = "Sin micrófono";
      st.body = "Permite el micrófono en el navegador del visor para hablar con EarthScope AI.";
    }
    drawInfo();
  };

  // acciones del asistente también mueven el globo VR
  const offActions = addActionListener((actions: AgentAction[]) => {
    for (const a of actions) {
      if (a.type === "fly") flyTo(a.lat, a.lng);
      else if (a.type === "select") { st.point = { lat: a.lat, lng: a.lng }; placeMarker(a.lat, a.lng); }
      else if (a.type === "imagery") { earthMat.uniforms.allDay.value = a.mode === "night" ? 0 : earthMat.uniforms.allDay.value; detail.setImagery(a.mode); }
      else if (a.type === "spin") spin = a.on;
      else if (a.type === "clear") { marker.visible = false; st.point = null; }
    }
    drawControl();
    drawInfo();
  });

  const press = (id: string) => {
    sfx.click();
    const L = useLayer.getState();
    if (id.startsWith("v:")) {
      const k = id.slice(2);
      L.setPlaying(false);
      L.setScope("global");
      L.setVariable(k === "none" ? null : k);
    } else if (id.startsWith("m:")) {
      L.setPlaying(false);
      L.setMode(id.slice(2) as MapMode);
    } else if (id === "y:-" || id === "y:+") {
      const years = manifest?.variables.find((v) => v.key === L.variable)?.years ?? [2001, 2024];
      const y = Math.max(years[0], Math.min(years[years.length - 1], L.year + (id === "y:+" ? 1 : -1)));
      if (L.mode === "trend") L.setMode("value");
      L.setYear(y);
    } else if (id === "play") {
      if (!L.variable) L.setVariable("precip_mm_day");
      if (L.mode === "trend") L.setMode("value");
      L.setPlaying(!L.playing);
    } else if (id === "img") {
      earthMat.uniforms.allDay.value = earthMat.uniforms.allDay.value ? 0 : 1;
    } else if (id === "spin") {
      spin = !spin;
    } else if (id === "voice") {
      st.voice = !st.voice;
      if (!st.voice) try { speechSynthesis.cancel(); } catch { /* */ }
    } else if (id === "mic") {
      toggleMic();
    } else if (id === "center") {
      recenter();
    } else if (id === "exit") {
      session.end();
      return;
    } else if (id === "q-here") {
      ask(st.point ? "¿Qué ha pasado en este lugar? Cuéntamelo con los datos." : "¿Qué puedo hacer aquí?");
    } else if (id === "q-explain") {
      ask("Explícame qué estoy viendo en el mapa del globo ahora mismo.");
    } else if (id === "q-surprise") {
      ask("Llévame a un lugar sorpresa del planeta donde haya pasado algo interesante y muéstramelo.");
    }
    drawControl();
  };

  // capa: se actualiza con el estado compartido de la web
  const unsubLayer = useLayer.subscribe((s, prev) => {
    if (s.variable !== prev.variable || s.mode !== prev.mode || s.year !== prev.year) setLayerTexture();
    drawControl();
  });
  loadManifest("global").then((m) => { manifest = m; setRain(); }).catch(() => {});

  // mandos y manos
  const raycaster = new THREE.Raycaster();
  const ctrlFactory = new XRControllerModelFactory();
  const gloves = handFactory();
  type Ctl = {
    ray: THREE.Group; grip: THREE.Group; line: THREE.Line; source?: XRInputSource; squeeze: boolean;
    hand: HandReader; tipGlow: THREE.Mesh; pokeLatch: boolean;
    // arrastre sobre el globo (dedo o rayo): el punto tocado sigue al dedo
    touch: { anchor: THREE.Vector3; t0: number; start: THREE.Vector3; moved: number; prev: THREE.Vector3; byRay: boolean } | null;
    aWas: boolean;
  };
  const ctls: Ctl[] = [];
  const tmpM = new THREE.Matrix4();
  const hits: THREE.Object3D[] = [earth, control.mesh, info.mesh, satGroup];
  const satOf = (o: THREE.Object3D | null): Sat | null => {
    for (let x = o; x; x = x.parent) if (x.userData.sat) return x.userData.sat as Sat;
    return null;
  };

  const intersect = (c: Ctl) => {
    tmpM.identity().extractRotation(c.ray.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(c.ray.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpM);
    raycaster.camera = renderer.xr.getCamera(); // los sprites (nombres de satélites) lo necesitan
    return raycaster.intersectObjects(hits, true)[0];
  };

  const selectPoint = (worldPoint: THREE.Vector3) => {
    const { lat, lng } = vecToLatLng(globe.worldToLocal(worldPoint.clone()));
    useExplorer.getState().select({ lat, lng, surface: "unknown", country: null, regionKey: null });
    spin = false;
    inertia.set(0, 0, 0);
    sfx.select();
    drawControl();
    analyse(lat, lng);
  };

  const showSat = (sat: Sat) => {
    const p = satPosition(sat);
    st.point = null;
    st.head = `🛰 ${sat.name}`;
    st.body = `${sat.es}${p ? `\n\nAhora: ${p.lat.toFixed(1)}°, ${p.lng.toFixed(1)}° · ${Math.round(p.altKm)} km de altura · ${Math.round(p.speedKmh).toLocaleString()} km/h` : ""}`;
    sfx.select();
    drawInfo();
    say(sat.es);
    useAssistant.getState().pulse("talking", 3000);
  };

  // la mano está cerca de algo que se toca directamente (globo o paneles)
  const globeRadius = () => R * globe.scale.x;
  const nearDirect = (p: THREE.Vector3) =>
    p.distanceTo(globe.position) < globeRadius() * 1.5 ||
    [control, info].some((pn) => Math.abs(pn.mesh.worldToLocal(p.clone()).z) < 0.12 && pn.mesh.position.distanceTo(p) < 0.5);

  for (let i = 0; i < 2; i++) {
    const ray = renderer.xr.getController(i);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.7 }),
    );
    line.scale.z = 2;
    ray.add(line);
    scene.add(ray);
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(ctrlFactory.createControllerModel(grip));
    scene.add(grip);
    const hand = renderer.xr.getHand(i);
    hand.add(gloves.createHandModel(hand, "mesh"));
    scene.add(hand);
    const tipGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.006, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9 }),
    );
    tipGlow.visible = false;
    scene.add(tipGlow);
    const c: Ctl = { ray, grip, line, squeeze: false, hand: new HandReader(hand), tipGlow, pokeLatch: false, touch: null, aWas: false };
    ctls.push(c);
    ray.addEventListener("connected", (e) => { c.source = (e as unknown as { data: XRInputSource }).data; });
    ray.addEventListener("disconnected", () => { c.source = undefined; c.squeeze = false; });
    ray.addEventListener("selectstart", () => {
      // con las manos, de cerca se agarra y se toca con el dedo; el rayo solo sirve de lejos
      if (c.source?.hand && c.hand.tracked && nearDirect(c.hand.pinchPos)) return;
      const h = intersect(c);
      if (!h) return;
      buzz(c.source, 0.3, 25);
      if (h.object === control.mesh && h.uv) { const id = control.hit(h.uv); if (id) press(id); }
      else if (h.object === info.mesh && h.uv) { const id = info.hit(h.uv); if (id) press(id); }
      else if (satOf(h.object)) showSat(satOf(h.object)!);
      else if (h.object === earth) startTouch(c, h.point, true);
    });
    ray.addEventListener("selectend", () => { if (c.touch?.byRay) endTouch(c); });
    ray.addEventListener("squeezestart", () => { c.squeeze = true; });
    ray.addEventListener("squeezeend", () => { c.squeeze = false; });
  }

  // agarre directo: un agarre mueve y gira el globo como un objeto real; dos agarres lo escalan
  type Grab = { c: Ctl; pos: THREE.Vector3; quat: THREE.Quaternion };
  let held: Grab[] = [];
  let g0: {
    n: number; gq: THREE.Quaternion; gp: THREE.Vector3; gs: number;
    hq: THREE.Quaternion; hp: THREE.Vector3; v: THREE.Vector3; d: number; mid: THREE.Vector3;
  } | null = null;
  const inertia = new THREE.Vector3(); // eje * velocidad angular (rad/s)
  const prevQ = new THREE.Quaternion();
  const grabVel = new THREE.Vector3();

  const grabberOf = (c: Ctl): Grab | null => {
    if (c.hand.tracked) return c.hand.pinching ? { c, pos: c.hand.pinchPos.clone(), quat: c.hand.quat.clone() } : null;
    if (c.squeeze) {
      return { c, pos: new THREE.Vector3().setFromMatrixPosition(c.grip.matrixWorld), quat: c.grip.getWorldQuaternion(new THREE.Quaternion()) };
    }
    return null;
  };

  const recenter = () => {
    const cam = renderer.xr.getCamera();
    const head = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    globe.position.copy(head).addScaledVector(fwd, 0.8).setY(Math.max(1.0, head.y - 0.3));
    globe.scale.setScalar(1);
    inertia.set(0, 0, 0);
  };

  // tocar y arrastrar el globo: girarlo; doble toque: marcar el lugar
  let lastTap: { t: number; p: THREE.Vector3 } | null = null;
  const dragVel = new THREE.Vector3();
  function startTouch(c: Ctl, point: THREE.Vector3, byRay: boolean) {
    const anchor = point.clone().sub(globe.position).applyQuaternion(globe.quaternion.clone().invert()).normalize();
    c.touch = { anchor, t0: performance.now(), start: point.clone(), moved: 0, prev: point.clone(), byRay };
    spin = false; targetQuat = null; inertia.set(0, 0, 0); dragVel.set(0, 0, 0);
    buzz(c.source, 0.2, 15);
  }
  function dragTo(c: Ctl, point: THREE.Vector3, dt: number) {
    const t = c.touch!;
    const d0 = t.anchor.clone().applyQuaternion(globe.quaternion);
    const d1 = point.clone().sub(globe.position).normalize();
    if (d0.dot(d1) < -0.5) return;
    const dq = new THREE.Quaternion().setFromUnitVectors(d0, d1);
    globe.quaternion.premultiply(dq);
    // velocidad angular suavizada, para la inercia al soltar
    const ang = 2 * Math.acos(Math.min(1, Math.abs(dq.w)));
    if (ang > 1e-5 && dt > 0) {
      const s0 = Math.sqrt(1 - dq.w * dq.w) || 1;
      const v = new THREE.Vector3(dq.x / s0, dq.y / s0, dq.z / s0).multiplyScalar((dq.w < 0 ? -1 : 1) * ang / dt);
      dragVel.lerp(v, 0.35);
    } else dragVel.multiplyScalar(0.8);
    t.moved += point.distanceTo(t.prev);
    t.prev.copy(point);
  }
  function endTouch(c: Ctl) {
    const t = c.touch;
    c.touch = null;
    if (!t) return;
    const dur = performance.now() - t.t0;
    if (t.moved < 0.015 && dur < 600) {
      // toque corto: si es el segundo seguido en el mismo sitio, se marca el lugar
      const now = performance.now();
      if (lastTap && now - lastTap.t < 700 && lastTap.p.distanceTo(t.start) < 0.05) {
        lastTap = null;
        selectPoint(t.start);
      } else {
        lastTap = { t: now, p: t.start.clone() };
        sfx.hover();
      }
    } else if (dragVel.length() > 0.2) {
      inertia.copy(dragVel).clampLength(0, 4);
    }
  }
  const raySphere = (c: Ctl) => {
    tmpM.identity().extractRotation(c.ray.matrixWorld);
    const o = new THREE.Vector3().setFromMatrixPosition(c.ray.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(tmpM);
    const hit = new THREE.Ray(o, dir).intersectSphere(new THREE.Sphere(globe.position, globeRadius()), new THREE.Vector3());
    return hit;
  };

  // suelo: un anillo de luz bajo los pies (solo en VR)
  if (mode === "immersive-vr") {
    const floor = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.6, 96),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.002;
    scene.add(floor);
    const grid = new THREE.PolarGridHelper(3, 16, 8, 64, 0x1e3a5f, 0x10243d);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);
  }

  // animación
  const clock = new THREE.Clock();
  let lastDetail = 0, lastSun = 0;
  const yAxis = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const tmp = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    for (const c of ctls) c.hand.update();

    // --- agarre directo
    for (const c of ctls) {
      const g = grabberOf(c);
      const startNow = (c.hand.tracked ? c.hand.justPinched : c.squeeze && !held.some((h) => h.c === c));
      if (g && startNow && g.pos.distanceTo(globe.position) < globeRadius() * 1.35 && !held.some((h) => h.c === c)) {
        held.push(g);
        g0 = null;
        spin = false; targetQuat = null; inertia.set(0, 0, 0);
        sfx.grab(); buzz(c.source, 0.6, 40);
      }
    }
    const before = held.length;
    held = held.map((h) => grabberOf(h.c)).filter((g): g is Grab => !!g);
    if (held.length < before) {
      g0 = null;
      if (!held.length) {
        sfx.release();
        // inercia: la velocidad promedio de los últimos instantes, no la de un solo cuadro
        if (grabVel.length() > 0.25) inertia.copy(grabVel).clampLength(0, 4);
        grabVel.set(0, 0, 0);
      }
    }
    if (held.length && dt > 0) {
      const dq = globe.quaternion.clone().multiply(prevQ.clone().invert());
      const ang = 2 * Math.acos(Math.min(1, Math.abs(dq.w)));
      const s0 = Math.sqrt(1 - dq.w * dq.w) || 1;
      const v = ang > 1e-5 ? new THREE.Vector3(dq.x / s0, dq.y / s0, dq.z / s0).multiplyScalar((dq.w < 0 ? -1 : 1) * ang / dt) : new THREE.Vector3();
      grabVel.lerp(v, 0.3);
    }
    prevQ.copy(globe.quaternion);
    if (held.length === 1) {
      const h = held[0];
      if (!g0 || g0.n !== 1) {
        g0 = { n: 1, gq: globe.quaternion.clone(), gp: globe.position.clone(), gs: globe.scale.x,
          hq: h.quat.clone(), hp: h.pos.clone(), v: new THREE.Vector3(), d: 0, mid: new THREE.Vector3() };
      }
      // rotación y posición relativas a la mano en el momento de agarrar
      const dq = h.quat.clone().multiply(g0.hq.clone().invert());
      globe.quaternion.copy(dq.clone().multiply(g0.gq));
      globe.position.copy(h.pos).add(g0.gp.clone().sub(g0.hp).applyQuaternion(dq));
    } else if (held.length >= 2) {
      const [a, b] = held;
      const mid = a.pos.clone().add(b.pos).multiplyScalar(0.5);
      const v = b.pos.clone().sub(a.pos);
      const d = v.length();
      v.normalize();
      if (!g0 || g0.n !== 2) {
        g0 = { n: 2, gq: globe.quaternion.clone(), gp: globe.position.clone(), gs: globe.scale.x,
          hq: new THREE.Quaternion(), hp: new THREE.Vector3(), v: v.clone(), d, mid: mid.clone() };
      }
      // con las manos casi opuestas el giro es inestable: se mantiene el último
      if (g0.v.dot(v) > -0.9) {
        const rot = new THREE.Quaternion().setFromUnitVectors(g0.v, v);
        const sc = THREE.MathUtils.clamp(g0.gs * (d / Math.max(0.05, g0.d)), 0.35, 4);
        // suavizado: el globo sigue a las manos sin temblar
        const k = 1 - Math.pow(0.00001, dt);
        globe.scale.setScalar(THREE.MathUtils.lerp(globe.scale.x, sc, k));
        globe.quaternion.slerp(rot.clone().multiply(g0.gq), k);
        const target = mid.clone().add(g0.gp.clone().sub(g0.mid).applyQuaternion(rot).multiplyScalar(sc / g0.gs));
        globe.position.lerp(target, k);
      }
    }
    if (!held.length) {
      if (inertia.lengthSq() > 1e-6) {
        const w = inertia.length();
        globe.quaternion.premultiply(q.setFromAxisAngle(tmp.copy(inertia).divideScalar(w), w * dt));
        inertia.multiplyScalar(Math.pow(0.35, dt));
      } else if (spin) {
        globe.quaternion.premultiply(q.setFromAxisAngle(yAxis, dt * 0.12));
      }
      if (targetQuat) {
        globe.quaternion.slerp(targetQuat, Math.min(1, dt * 3));
        if (globe.quaternion.angleTo(targetQuat) < 0.002) targetQuat = null;
      }
    }

    // --- tocar con el dedo: botones de los paneles y el globo
    const hov = new Map<Panel, string | null>([[control, null], [info, null]]);
    for (const c of ctls) {
      const tracked = c.hand.tracked;
      c.tipGlow.visible = false;
      if (tracked && !c.hand.pinching) {
        const tip = c.hand.tip;
        let near = false;
        for (const pn of [control, info]) {
          const loc = pn.mesh.worldToLocal(tip.clone());
          const inside = Math.abs(loc.x) < pn.wM / 2 && Math.abs(loc.y) < pn.hM / 2;
          if (!inside || loc.z < -0.03 || loc.z > 0.05) continue;
          near = true;
          const id = pn.hit(new THREE.Vector2(loc.x / pn.wM + 0.5, loc.y / pn.hM + 0.5));
          if (id) hov.set(pn, id);
          if (loc.z < 0.008 && !c.pokeLatch && id) { c.pokeLatch = true; press(id); }
          if (loc.z > 0.025) c.pokeLatch = false;
        }
        const surf = tip.distanceTo(globe.position) - globeRadius();
        if (surf < 0.05) near = true;
        // dedo sobre el globo: tocar y deslizar lo gira; doble toque marca el lugar
        if (!c.touch && surf < 0.005 && !held.length) startTouch(c, tip, false);
        else if (c.touch && !c.touch.byRay) {
          if (surf < 0.02) dragTo(c, tip, dt);
          else endTouch(c);
        }
        c.tipGlow.visible = near;
        c.tipGlow.position.copy(tip);
      } else if (c.touch && !c.touch.byRay) {
        endTouch(c);
      }
      // arrastre con el rayo del mando (gatillo sostenido sobre el globo)
      if (c.touch?.byRay) {
        const p2 = raySphere(c);
        if (p2) dragTo(c, p2, dt);
      }
      // botón A/X del mando: hablar con el asistente
      const aNow = !!c.source?.gamepad?.buttons?.[4]?.pressed;
      if (aNow !== c.aWas) {
        c.aWas = aNow;
        if (aNow && !st.listening) toggleMic();
        else if (!aNow) { if (st.listening) toggleMic(); else wantMic = false; }
      }
      if (st.listening && rec) {
        const lv = rec.level();
        if (Math.abs(lv - st.level) > 0.05) { st.level = lv; drawInfo(); }
      }
      // rayo: con mandos siempre; con manos solo cuando están lejos de todo
      const showRay = !!c.source && !(tracked && nearDirect(c.hand.pinchPos)) && !held.some((h) => h.c === c);
      c.line.visible = showRay;
      if (showRay) {
        const h = intersect(c);
        c.line.scale.z = h ? h.distance : 2;
        const panel = h?.object === control.mesh ? control : h?.object === info.mesh ? info : null;
        if (panel && h?.uv) hov.set(panel, panel.hit(h.uv) ?? hov.get(panel) ?? null);
      }
      // palanca de los mandos: girar y escalar
      const ax = c.source?.gamepad?.axes;
      if (ax && ax.length >= 4 && !tracked) {
        if (Math.abs(ax[2]) > 0.15) { globe.quaternion.premultiply(q.setFromAxisAngle(yAxis, ax[2] * dt * 1.6)); spin = false; targetQuat = null; inertia.set(0, 0, 0); }
        if (Math.abs(ax[3]) > 0.15) globe.scale.setScalar(THREE.MathUtils.clamp(globe.scale.x * (1 - ax[3] * dt), 0.35, 4));
      }
    }
    for (const [p, id] of hov) {
      if (p.hover !== id) { if (id) sfx.hover(); p.hover = id; if (p === control) drawControl(); else drawInfo(); }
    }

    // --- sol real, lluvia y detalle según la distancia de la cabeza al globo
    if (t - lastSun > 30) { lastSun = t; updateSun(); }
    sun.position.copy(sunLocal).applyQuaternion(globe.quaternion).multiplyScalar(5).add(globe.position);
    sun.target.position.copy(globe.position);
    const xrCam = renderer.xr.getCamera();
    const head = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld);
    const alt = Math.max(0.02, (head.distanceTo(globe.position) - globeRadius()) / globeRadius());
    rain.update(dt, alt);
    detail.obj.visible = alt < 0.9;
    if (detail.obj.visible && t - lastDetail > 0.3) { lastDetail = t; detail.obj.updatePov(xrCam); }
    // pulso del marcador
    ring.scale.setScalar(1 + 0.25 * Math.sin(t * 4));
    renderer.render(scene, camera);
  });

  drawControl();
  drawInfo();
  setLayerTexture();
  await renderer.xr.setSession(session);
  useAssistant.getState().pulse("greet", 1200);
  // si ya hay un punto elegido en la web, lo mostramos
  const sel = useExplorer.getState().selection;
  if (sel) { flyTo(sel.lat, sel.lng); placeMarker(sel.lat, sel.lng); st.point = { lat: sel.lat, lng: sel.lng }; drawInfo(); }

  return () => {
    if (!session_alive) return;
    session_alive = false;
    renderer.setAnimationLoop(null);
    clearInterval(satTimer);
    rec?.cancel();
    offActions();
    unsubLayer();
    try { speechSynthesis.cancel(); } catch { /* */ }
    renderer.dispose();
    renderer.domElement.remove();
  };
}

function sessionId() {
  try {
    const k = "earthscope-chat";
    const v = sessionStorage.getItem(k) ?? crypto.randomUUID();
    sessionStorage.setItem(k, v);
    return v;
  } catch {
    return "xr";
  }
}

// --- soporte del dispositivo
export async function xrSupport(): Promise<{ vr: boolean; ar: boolean; headset: boolean }> {
  const xr = typeof navigator !== "undefined" ? (navigator as Navigator & { xr?: XRSystem }).xr : undefined;
  const headset = typeof navigator !== "undefined" && /OculusBrowser|Quest|Pico|Wolvic|VisionOS/i.test(navigator.userAgent);
  if (!xr) return { vr: false, ar: false, headset };
  const [vr, ar] = await Promise.all([
    xr.isSessionSupported("immersive-vr").catch(() => false),
    xr.isSessionSupported("immersive-ar").catch(() => false),
  ]);
  return { vr, ar, headset };
}

export async function requestXR(mode: XRMode) {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) throw new Error("WebXR no disponible");
  return xr.requestSession(mode, {
    requiredFeatures: ["local-floor"],
    optionalFeatures: ["hand-tracking", "bounded-floor", "layers"],
  });
}
