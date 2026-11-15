"use client";

// satélites para el globo 2D: objetos 3D, etiquetas y órbita del elegido, actualizados cada segundo
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { altToRadius, loadSatellites, satPosition, satTrack, type Sat } from "@/lib/satellites";

export type SatObj = { kind: "sat"; sat: Sat; lat: number; lng: number; alt: number; text: string; color: string };

let glowTex: THREE.Texture | null = null;
function glow() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.25, "rgba(255,255,255,.45)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

// satélite pequeño: cuerpo dorado, dos paneles solares y un halo de su color
export function satMesh(color: string, size = 1) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.1 * size, 1.1 * size, 1.8 * size),
    new THREE.MeshStandardMaterial({ color: 0xd4a537, metalness: 0.7, roughness: 0.35 }),
  );
  grp.add(body);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.4, roughness: 0.5, emissive: 0x0b1d4a });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(3 * size, 0.08 * size, 1.2 * size), panelMat);
    p.position.x = s * 2.2 * size;
    grp.add(p);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.setScalar(5 * size);
  grp.add(halo);
  return grp;
}

// visible: filtro de la leyenda (por rol o "solo fuentes de la capa activa")
export function useSatellites(show: boolean, selected: number | null, visible?: (s: Sat) => boolean) {
  const visibleRef = useRef(visible);
  useEffect(() => { visibleRef.current = visible; }, [visible]);
  const [sats, setSats] = useState<Sat[]>([]);
  const objs = useRef(new Map<number, SatObj>());
  const [tick, setTick] = useState(0);
  const [list, setList] = useState<SatObj[]>([]);

  useEffect(() => {
    if (!show) return;
    let live = true;
    loadSatellites().then((s) => { if (live) setSats(s); });
    return () => { live = false; };
  }, [show]);

  useEffect(() => {
    if (!show || !sats.length) return;
    const update = () => {
      const now = new Date();
      for (const s of sats) {
        const p = satPosition(s, now);
        if (!p) continue;
        let o = objs.current.get(s.norad);
        if (!o) {
          o = { kind: "sat", sat: s, lat: 0, lng: 0, alt: 0, text: s.name, color: s.color };
          objs.current.set(s.norad, o);
        }
        o.lat = p.lat;
        o.lng = p.lng;
        o.alt = altToRadius(p.altKm);
      }
      // los mismos objetos en un arreglo nuevo: el globo los mueve sin recrearlos
      const vis = visibleRef.current;
      setList([...objs.current.values()].filter((o) => !vis || vis(o.sat) || o.sat.norad === selected));
      setTick((t) => t + 1);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [show, sats, selected]);


  const selSat = sats.find((s) => s.norad === selected) ?? null;
  const minute = Math.floor(tick / 30);
  const orbit = useMemo(
    () => (show && selSat ? satTrack(selSat, 100, 1) : null),
    [show, selSat, minute], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { list: show ? list : [], orbit, count: sats.length };
}
