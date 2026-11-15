"use client";

// manos del Quest con guantes: modelo de mano articulada (local, sin CDN) con material de guante,
// y lectura de gestos: pellizco, punta del índice y orientación de la palma
import * as THREE from "three";
import { XRHandModelFactory } from "three/examples/jsm/webxr/XRHandModelFactory.js";

const glove = new THREE.MeshPhysicalMaterial({
  color: 0x1c2a40,
  roughness: 0.6,
  metalness: 0.1,
  sheen: 1,
  sheenColor: new THREE.Color(0x22d3ee),
  sheenRoughness: 0.45,
  emissive: new THREE.Color(0x061420),
});

export function handFactory() {
  const f = new XRHandModelFactory(null, (obj: THREE.Object3D) => {
    obj.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (mesh.isMesh) { mesh.material = glove; mesh.castShadow = false; }
    });
  });
  f.setPath("/xr/hands/");
  return f;
}

type Joints = Record<string, THREE.Object3D | undefined>;

export class HandReader {
  pinching = false;
  justPinched = false;
  justReleased = false;
  tracked = false;
  pinchPos = new THREE.Vector3();
  tip = new THREE.Vector3();
  quat = new THREE.Quaternion();
  private a = new THREE.Vector3();
  private lostAt = 0;
  private b = new THREE.Vector3();
  constructor(public hand: THREE.Group & { joints?: Joints }) {}

  update() {
    const j = this.hand.joints ?? {};
    const thumb = j["thumb-tip"], index = j["index-finger-tip"], wrist = j["wrist"];
    const was = this.pinching;
    this.tracked = !!(thumb && index && wrist && wrist.visible !== false && this.hand.visible);
    if (!this.tracked) {
      this.pinching = false;
      this.justPinched = false;
      this.justReleased = was;
      return;
    }
    thumb!.getWorldPosition(this.a);
    index!.getWorldPosition(this.b);
    this.tip.copy(this.b);
    const d = this.a.distanceTo(this.b);
    this.pinchPos.copy(this.a).add(this.b).multiplyScalar(0.5);
    wrist!.getWorldQuaternion(this.quat);
    // histéresis: cierra a 1.8 cm, abre a 4 cm, y aguanta 120 ms de ruido del seguimiento antes de soltar
    if (was) {
      if (d < 0.04) this.lostAt = 0;
      else if (!this.lostAt) this.lostAt = performance.now();
      this.pinching = !this.lostAt || performance.now() - this.lostAt < 120;
    } else {
      this.pinching = d < 0.018;
      this.lostAt = 0;
    }
    this.justPinched = !was && this.pinching;
    this.justReleased = was && !this.pinching;
  }
}
