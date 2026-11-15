"use client";

// Tierra con el sol real: lado de día, lado de noche con luces de ciudades, brillo del océano y borde atmosférico
import * as THREE from "three";

export function sunDirection(date = new Date()) {
  // punto subsolar aproximado (sin ecuación del tiempo): suficiente para ver el terminador real
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const doy = (date.getTime() - start) / 86400000;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (doy + 10));
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const lng = (12 - hours) * 15;
  return { lat: decl, lng };
}

export function earthMaterial(day: THREE.Texture, night: THREE.Texture, water: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: day },
      nightMap: { value: night },
      waterMap: { value: water },
      sunDir: { value: new THREE.Vector3(1, 0, 0) }, // en espacio del objeto
      allDay: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vNView;
      varying vec3 vSunView;
      varying vec3 vViewPos;
      uniform vec3 sunDir;
      void main() {
        vUv = uv;
        vN = normalize(normal);
        vNView = normalize(normalMatrix * normal);
        vSunView = normalize(normalMatrix * sunDir);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform sampler2D waterMap;
      uniform vec3 sunDir;
      uniform float allDay;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vNView;
      varying vec3 vSunView;
      varying vec3 vViewPos;
      void main() {
        vec3 day = texture2D(dayMap, vUv).rgb;
        vec3 night = texture2D(nightMap, vUv).rgb;
        float water = texture2D(waterMap, vUv).r;
        float l = mix(dot(normalize(vN), normalize(sunDir)), 1.0, allDay);
        float dayMix = smoothstep(-0.15, 0.2, l);
        vec3 lit = day * (0.12 + 1.1 * max(l, 0.0));
        vec3 city = night * 1.6 + day * 0.03;
        vec3 col = mix(city, lit, dayMix);
        // reflejo del sol en el agua
        vec3 V = normalize(-vViewPos);
        vec3 Rf = reflect(-normalize(vSunView), normalize(vNView));
        float spec = pow(max(dot(Rf, V), 0.0), 60.0) * water * dayMix * (1.0 - allDay);
        col += vec3(1.0, 0.95, 0.85) * spec * 0.8;
        // borde atmosférico
        float fres = pow(1.0 - max(dot(normalize(vNView), V), 0.0), 3.0);
        col += vec3(0.25, 0.55, 1.0) * fres * (0.25 + 0.75 * dayMix);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function atmosphereMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vNView;
      varying vec3 vViewPos;
      void main() {
        vNView = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vNView;
      varying vec3 vViewPos;
      void main() {
        float i = pow(0.62 - dot(normalize(vNView), normalize(-vViewPos)), 4.0);
        gl_FragColor = vec4(0.3, 0.65, 1.0, 1.0) * clamp(i * 2.2, 0.0, 0.85);
      }`,
  });
}
