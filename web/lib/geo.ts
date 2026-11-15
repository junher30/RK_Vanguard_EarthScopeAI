export type LatLng = { lat: number; lng: number };

const R = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;
const HALF_HEMISPHERE_KM2 = Math.PI * R * R;

export const normLng = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180;

export function unwrap(vs: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  vs.forEach((v, i) => {
    if (i === 0) return out.push({ ...v });
    const prev = out[i - 1].lng;
    let l = v.lng;
    while (l - prev > 180) l -= 360;
    while (l - prev < -180) l += 360;
    out.push({ lat: v.lat, lng: l });
  });
  return out;
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  const [ua, ub] = unwrap([a, b]);
  return { lat: (ua.lat + ub.lat) / 2, lng: normLng((ua.lng + ub.lng) / 2) };
}

export function areaKm2(vs: LatLng[]): number {
  if (vs.length < 3) return 0;
  const u = unwrap(vs);
  let s = 0;
  for (let i = 0; i < u.length; i++) {
    const a = u[i];
    let b = u[(i + 1) % u.length];
    if (i === u.length - 1) {
      let l = b.lng;
      while (l - a.lng > 180) l -= 360;
      while (l - a.lng < -180) l += 360;
      b = { lat: b.lat, lng: l };
    }
    s += rad(b.lng - a.lng) * (2 + Math.sin(rad(a.lat)) + Math.sin(rad(b.lat)));
  }
  return Math.abs((s * R * R) / 2);
}

function lngWinding(vs: LatLng[]): number {
  let t = 0;
  for (let i = 0; i < vs.length; i++) {
    let d = vs[(i + 1) % vs.length].lng - vs[i].lng;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    t += d;
  }
  return t;
}

function segmentsCross(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng) {
  const o = (a: LatLng, b: LatLng, c: LatLng) => (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
  const d1 = o(p3, p4, p1), d2 = o(p3, p4, p2), d3 = o(p1, p2, p3), d4 = o(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function ring(vs: LatLng[]): LatLng[] {
  const u = unwrap(vs);
  const last = u[u.length - 1];
  let l = u[0].lng;
  while (l - last.lng > 180) l -= 360;
  while (l - last.lng < -180) l += 360;
  return [...u, { lat: u[0].lat, lng: l }];
}

export function selfIntersects(vs: LatLng[]): boolean {
  const r = ring(vs);
  const n = vs.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsCross(r[i], r[i + 1], r[j], r[j + 1])) return true;
    }
  }
  return false;
}

function planarArea(vs: LatLng[]): number {
  const r = ring(vs);
  let s = 0;
  for (let i = 0; i < r.length - 1; i++) s += r[i].lng * r[i + 1].lat - r[i + 1].lng * r[i].lat;
  return Math.abs(s / 2);
}

export type Issue = { code: string; message: string };

export function validate(vs: LatLng[]): Issue[] {
  const issues: Issue[] = [];
  const distinct = vs.filter(
    (v, i) => vs.findIndex((w) => Math.abs(w.lat - v.lat) < 1e-6 && Math.abs(normLng(w.lng - v.lng)) < 1e-6) === i,
  );
  if (vs.some((v) => !Number.isFinite(v.lat) || !Number.isFinite(v.lng) || Math.abs(v.lat) > 90))
    issues.push({ code: "V-02", message: "Invalid coordinates." });
  if (distinct.length < 3) {
    issues.push({ code: "V-01", message: "Add at least 3 distinct points." });
    return issues;
  }
  if (Math.abs(lngWinding(vs)) > 180)
    issues.push({ code: "V-07", message: "Areas that surround a pole are not supported." });
  const a = areaKm2(vs);
  const crossing = selfIntersects(vs);
  if (crossing) issues.push({ code: "V-04", message: "Edges cross each other. Move a point to fix it." });
  else if (a < 1 || planarArea(vs) < 1e-6)
    issues.push({ code: "V-03", message: "The area is too small or the points are aligned." });
  if (a > HALF_HEMISPHERE_KM2) issues.push({ code: "V-06", message: "Area too large. Draw a smaller region." });
  return issues;
}

export function crossesAntimeridian(vs: LatLng[]) {
  return ring(vs).some((v) => v.lng > 180 || v.lng < -180);
}

export function centroid(vs: LatLng[]): LatLng {
  const u = unwrap(vs);
  const lat = u.reduce((s, v) => s + v.lat, 0) / u.length;
  const lng = u.reduce((s, v) => s + v.lng, 0) / u.length;
  return { lat, lng: normLng(lng) };
}

export function contains(vs: LatLng[], p: LatLng): boolean {
  const u = unwrap(vs);
  const lngs = u.map((v) => v.lng);
  const lo = Math.min(...lngs), hi = Math.max(...lngs);
  let x = p.lng;
  while (x < lo) x += 360;
  while (x > hi && x - 360 >= lo) x -= 360;
  let inside = false;
  for (let i = 0, j = u.length - 1; i < u.length; j = i++) {
    const a = u[i], b = u[j];
    if ((a.lat > p.lat) !== (b.lat > p.lat) && x < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng)
      inside = !inside;
  }
  return inside;
}

export type Box = { latMin: number; latMax: number; lonMin: number; lonMax: number };

export function coverage(vs: LatLng[], box: Box, step = 0.1) {
  const polyArea = areaKm2(vs);
  let cells = 0;
  let covered = 0;
  const cell = (lat: number) => (rad(step) * R) * (rad(step) * R * Math.cos(rad(lat)));
  for (let lat = box.latMax - step / 2; lat > box.latMin; lat -= step) {
    for (let lng = box.lonMin + step / 2; lng < box.lonMax; lng += step) {
      if (contains(vs, { lat, lng })) {
        cells++;
        covered += cell(lat);
      }
    }
  }
  return { cells, fraction: polyArea > 0 ? Math.min(1, covered / polyArea) : 0 };
}

export function toFeature(vs: LatLng[], properties: Record<string, unknown>) {
  const u = unwrap(vs);
  let signed = 0;
  for (let i = 0; i < u.length; i++) {
    const a = u[i], b = u[(i + 1) % u.length];
    signed += (b.lng - a.lng) * (b.lat + a.lat);
  }
  const ordered = signed > 0 ? [...vs].reverse() : vs;
  const coords = ordered.map((v) => [+normLng(v.lng).toFixed(5), +v.lat.toFixed(5)]);
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [[...coords, coords[0]]] },
    properties,
  };
}
