export type DataRegion = {
  key: string;
  label: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  period: string;
};

export const DATA_REGIONS: DataRegion[] = [
  {
    key: "amazon_core",
    label: "Central Amazon",
    latMin: -10,
    latMax: 2,
    lonMin: -70,
    lonMax: -50,
    period: "2001–2024",
  },
];

export const regionAt = (lat: number, lng: number) =>
  DATA_REGIONS.find(
    (r) => lat >= r.latMin && lat <= r.latMax && lng >= r.lonMin && lng <= r.lonMax,
  ) ?? null;

export const regionOutline = (r: DataRegion): [number, number][] => [
  [r.latMin, r.lonMin],
  [r.latMin, r.lonMax],
  [r.latMax, r.lonMax],
  [r.latMax, r.lonMin],
  [r.latMin, r.lonMin],
];

export const regionCenter = (r: DataRegion) => ({
  lat: (r.latMin + r.latMax) / 2,
  lng: (r.lonMin + r.lonMax) / 2,
});

export const fmtCoord = (v: number, pos: string, neg: string) =>
  `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
