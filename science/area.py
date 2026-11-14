"""Analysis of ANY area of the planet on the global 0.5° grids.

Given a GeoJSON polygon (or a point) and a variable, build the area's monthly series
(cos-latitude weighted mean over the 0.5° cells inside it) and run the same trend engine
as the regional case study (science/trends.py), including the robustness test.

Global monthly grids come from pipeline/fetch_global.py. For speed, the first call builds a
memory-mapped cube per variable: data/global/cubes/<var>.npy, shape (months, 360, 720).
"""
from __future__ import annotations

import json
import warnings
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

from science.trends import analyze, summary_text
from science.variables import GLOBAL_VARIABLES

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "global"
CUBES = SRC / "cubes"
RES = 0.5
LAT = 90 - (np.arange(360) + 0.5) * RES
LON = -180 + (np.arange(720) + 0.5) * RES
MIN_VALID_SHARE = 0.5      # a month counts only if ≥ 50 % of the area (by weight) has data
MIN_MONTHS = 36


# ------------------------------------------------------------------ data cubes
def _sources(product: str) -> list[Path]:
    return sorted((SRC / product).glob("*.npz"))


def build_cube(var: str) -> tuple[np.ndarray, list[str]]:
    """(Re)build the memory-mapped cube when the set of downloaded months changes."""
    product = GLOBAL_VARIABLES[var]["product"]
    files = _sources(product)
    if not files:
        raise FileNotFoundError(f"No global data for {var}: run pipeline/fetch_global.py --product {product}")
    months = [f.stem for f in files]
    CUBES.mkdir(parents=True, exist_ok=True)
    meta_p, cube_p = CUBES / f"{var}.json", CUBES / f"{var}.npy"
    if meta_p.exists() and cube_p.exists() and json.loads(meta_p.read_text())["months"] == months:
        return np.load(cube_p, mmap_mode="r"), months
    cube = np.lib.format.open_memmap(cube_p, mode="w+", dtype="float32", shape=(len(files), 360, 720))
    for i, f in enumerate(files):
        cube[i] = np.load(f)[var]
    cube.flush()
    meta_p.write_text(json.dumps({"months": months}))
    return np.load(cube_p, mmap_mode="r"), months


@lru_cache(maxsize=8)
def _cube_cached(var: str, n_files: int):
    return build_cube(var)


def get_cube(var: str):
    return _cube_cached(var, len(_sources(GLOBAL_VARIABLES[var]["product"])))


# ------------------------------------------------------------------ geometry
def _unwrap(lons: np.ndarray) -> np.ndarray:
    out = lons.astype(float).copy()
    for i in range(1, len(out)):
        while out[i] - out[i - 1] > 180:
            out[i] -= 360
        while out[i] - out[i - 1] < -180:
            out[i] += 360
    return out


def cell_of(lat: float, lng: float) -> tuple[int, int]:
    r = int(np.clip((90 - lat) // RES, 0, 359))
    c = int(np.clip((((lng + 180) % 360)) // RES, 0, 719))
    return r, c


def polygon_mask(ring: list[list[float]]) -> np.ndarray:
    """Cells whose centres fall inside a GeoJSON ring ([lon, lat] pairs). Antimeridian-safe."""
    pts = np.asarray(ring, dtype=float)
    if len(pts) > 1 and np.allclose(pts[0], pts[-1]):
        pts = pts[:-1]
    lon, lat = _unwrap(pts[:, 0]), pts[:, 1]
    mask = np.zeros((360, 720), dtype=bool)
    rows = np.where((LAT >= lat.min()) & (LAT <= lat.max()))[0]
    if rows.size == 0:
        return mask
    lo = lon.min()
    glon = LON + 360 * np.ceil((lo - LON) / 360)              # shift grid into [lo, lo + 360)
    y = LAT[rows][:, None]
    x = glon[None, :]
    inside = np.zeros((rows.size, 720), dtype=bool)
    n = len(lon)
    for i in range(n):
        x1, y1, x2, y2 = lon[i], lat[i], lon[(i + 1) % n], lat[(i + 1) % n]
        if (i + 1) % n == 0:                                   # closing edge, unwrapped too
            while x2 - x1 > 180:
                x2 -= 360
            while x2 - x1 < -180:
                x2 += 360
        cond = (y1 > y) != (y2 > y)
        with np.errstate(divide="ignore", invalid="ignore"):
            xint = (x2 - x1) * (y - y1) / (y2 - y1) + x1
        inside ^= cond & (x < xint)
    mask[rows] = inside
    return mask


def area_mask(geometry: dict | None = None, point: dict | None = None) -> np.ndarray:
    mask = np.zeros((360, 720), dtype=bool)
    if geometry is not None:
        if geometry.get("type") != "Polygon":
            raise ValueError("geometry must be a GeoJSON Polygon")
        mask = polygon_mask(geometry["coordinates"][0])
        if not mask.any():                                     # smaller than one cell → its centroid's cell
            ring = np.asarray(geometry["coordinates"][0], dtype=float)[:-1]
            lon = _unwrap(ring[:, 0])
            point = {"lat": float(ring[:, 1].mean()), "lng": float(((lon.mean() + 180) % 360) - 180)}
    if point is not None and not mask.any():
        mask[cell_of(point["lat"], point["lng"])] = True
    if not mask.any():
        raise ValueError("send a polygon or a point")
    return mask


# ------------------------------------------------------------------ series + trend
def area_series(var: str, mask: np.ndarray) -> tuple[pd.Series, pd.Series]:
    """Monthly area mean and the share of the area (by weight) with valid data each month."""
    cube, months = get_cube(var)
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    sub = np.asarray(cube[:, rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1], dtype="float64")
    m = mask[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    w = (np.cos(np.deg2rad(LAT[rows[0]:rows[-1] + 1]))[:, None] * np.ones(m.shape)) * m
    valid = ~np.isnan(sub)
    wv = (w[None] * valid).sum(axis=(1, 2))
    with np.errstate(invalid="ignore", divide="ignore"):
        mean = np.nansum(np.where(valid, sub, 0) * w[None], axis=(1, 2)) / wv
    share = wv / w.sum()
    idx = pd.to_datetime([f"{mo}-01" for mo in months])
    s = pd.Series(np.where(share >= MIN_VALID_SHARE, mean, np.nan), index=idx, name=var).asfreq("MS")
    return s, pd.Series(share, index=idx).asfreq("MS")


def series_payload(s: pd.Series, var: str, alpha: float = 0.05) -> dict:
    """Series + trend + robustness in the schema the web's insight panel reads."""
    meta = GLOBAL_VARIABLES[var]
    r = analyze(s, alpha)
    anom = r.pop("anomalies")
    ann = s.groupby(s.index.year).agg(["mean", "count"])
    ann = ann[ann["count"] == 12]["mean"]
    centre = ann.index.values.mean() if len(ann) else 0
    sv = s.dropna()
    first, last = sv.index[0].year, sv.index[-1].year
    rob = []
    for label, sub in [("Full period", s), ("Excluding last 2 years", s[: str(last - 2)]),
                       ("Excluding first 2 years", s[str(first + 2):])]:
        if sub.dropna().size < MIN_MONTHS:
            continue
        rr = analyze(sub, alpha)
        rob.append({"test": label, "period": rr["period"], "verdict": rr["verdict"],
                    "p_value": rr["seasonal_mann_kendall"]["p_value"],
                    "sen_slope_per_year": rr["sen_slope_per_year"]})
    return {
        "variable": var, "label": meta["label"], "units": meta["units"], "dataset": meta["dataset"],
        "doi": meta["doi"], "caveats": meta["caveats"], "kind": meta["kind"],
        "monthly": [[d.strftime("%Y-%m"), v] for d, v in s.items()],
        "rolling12": [[d.strftime("%Y-%m"), v] for d, v in s.rolling(12, center=True).mean().items()],
        "anomalies": [[d.strftime("%Y-%m"), v] for d, v in anom.items()],
        "annual": [[int(y), v] for y, v in ann.items()],
        "trend_line": [[int(y), float(ann.mean() + r["sen_slope_per_year"] * (y - centre))] for y in ann.index],
        "trend": r, "robustness": rob, "robust": len({x["verdict"] for x in rob}) == 1,
        "summary": summary_text({**r, "variable": meta["label"]}, meta["units"]),
    }


def analyze_area(var: str, geometry: dict | None = None, point: dict | None = None, alpha: float = 0.05) -> dict:
    if var not in GLOBAL_VARIABLES:
        raise ValueError(f"unknown variable {var}")
    mask = area_mask(geometry, point)
    s, share = area_series(var, mask)
    cells = int(mask.sum())
    w = np.cos(np.deg2rad(LAT))[:, None] * np.ones(mask.shape)
    area_km2 = float((w * mask).sum() * (RES * 111.195) ** 2)
    info = {"cells": cells, "grid": "0.5°", "cells_area_km2": round(area_km2),
            "mean_valid_share": float(np.nanmean(share.values)) if len(share) else 0.0,
            "valid_months": int(s.notna().sum()), "total_months": int(len(s))}
    if s.notna().sum() < MIN_MONTHS:
        why = ("This variable is measured over land only and this area is mostly water."
               if GLOBAL_VARIABLES[var]["land_only"] else "Not enough valid months in this area.")
        return {"variable": var, "ok": False, "reason": why, "area": info}
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        payload = series_payload(s, var, alpha)
    return {"ok": True, **payload, "area": info}
