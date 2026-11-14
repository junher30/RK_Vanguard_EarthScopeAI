"""Analysis of ANY area of the planet on the global grids.

Given a GeoJSON polygon (or a point) and a variable, build the area's monthly series
(cos-latitude weighted mean over the grid cells inside it) and run the same trend engine
as the regional case study (science/trends.py), including the robustness test.

Two data sources, chosen with the EARTHSCOPE_DATA environment variable:
  full    data/global/<product>/<YYYY-MM>.npz  (0.5°, ≈ 1.9 GB, out of git; pipeline/fetch_global.py)
          → the first call builds a memory-mapped cube data/global/cubes/<var>.npy
  sample  data/sample/<var>.npz                (2°, float16, ≈ 27 MB, IN git; pipeline/make_sample.py)
  auto    (default) full when it exists, otherwise sample
Results from the sample are for development only; every response says which source it used.
"""
from __future__ import annotations

import json
import os
import warnings
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

from science.trends import analyze, summary_text
from science.variables import GLOBAL_VARIABLES

ROOT = Path(__file__).resolve().parents[1]
FULL = ROOT / "data" / "global"
SAMPLE = ROOT / "data" / "sample"
CUBES = FULL / "cubes"
MIN_VALID_SHARE = 0.5      # a month counts only if ≥ 50 % of the area (by weight) has data
MIN_MONTHS = 36


@dataclass(frozen=True)
class Grid:
    """A global regular grid (north→south, west→east) with a monthly data cube."""
    cube: np.ndarray            # (months, nlat, nlon)
    months: tuple[str, ...]
    lat: np.ndarray
    lon: np.ndarray
    res: float
    source: str                 # "full" | "sample"

    @property
    def label(self) -> str:
        return f"{self.res:g}°" + (" sample" if self.source == "sample" else "")


# ------------------------------------------------------------------ data sources
def data_mode() -> str:
    mode = os.environ.get("EARTHSCOPE_DATA", "auto").lower()
    if mode not in ("auto", "full", "sample"):
        raise ValueError("EARTHSCOPE_DATA must be auto, full or sample")
    return mode


def _full_files(var: str) -> list[Path]:
    return sorted((FULL / GLOBAL_VARIABLES[var]["product"]).glob("*.npz"))


def _resolve(var: str) -> str:
    mode = data_mode()
    if mode == "auto":
        return "full" if _full_files(var) else "sample"
    return mode


def _load_full(var: str) -> Grid:
    files = _full_files(var)
    if not files:
        raise FileNotFoundError(f"No full global data for {var}: run pipeline/fetch_global.py "
                                f"--product {GLOBAL_VARIABLES[var]['product']} (or use EARTHSCOPE_DATA=sample)")
    months = [f.stem for f in files]
    first = np.load(files[0])
    lat, lon = first["lat"].astype(float), first["lon"].astype(float)
    CUBES.mkdir(parents=True, exist_ok=True)
    meta_p, cube_p = CUBES / f"{var}.json", CUBES / f"{var}.npy"
    if not (meta_p.exists() and cube_p.exists() and json.loads(meta_p.read_text())["months"] == months):
        cube = np.lib.format.open_memmap(cube_p, mode="w+", dtype="float32",
                                         shape=(len(files), len(lat), len(lon)))
        for i, f in enumerate(files):
            cube[i] = np.load(f)[var]
        cube.flush()
        meta_p.write_text(json.dumps({"months": months}))
    return Grid(np.load(cube_p, mmap_mode="r"), tuple(months), lat, lon,
                float(abs(lat[0] - lat[1])), "full")


def _load_sample(var: str) -> Grid:
    p = SAMPLE / f"{var}.npz"
    if not p.exists():
        raise FileNotFoundError(f"No sample data for {var} at {p} (run pipeline/make_sample.py)")
    z = np.load(p)
    lat, lon = z["lat"].astype(float), z["lon"].astype(float)
    return Grid(z["values"].astype("float32"), tuple(str(m) for m in z["months"]), lat, lon,
                float(abs(lat[0] - lat[1])), "sample")


@lru_cache(maxsize=16)
def _grid_cached(var: str, source: str, n_files: int) -> Grid:
    return _load_full(var) if source == "full" else _load_sample(var)


def get_grid(var: str) -> Grid:
    source = _resolve(var)
    return _grid_cached(var, source, len(_full_files(var)) if source == "full" else 0)


def get_cube(var: str):
    """Backwards-compatible helper: (cube, months)."""
    g = get_grid(var)
    return g.cube, list(g.months)


# ------------------------------------------------------------------ geometry
def _unwrap(lons: np.ndarray) -> np.ndarray:
    out = lons.astype(float).copy()
    for i in range(1, len(out)):
        while out[i] - out[i - 1] > 180:
            out[i] -= 360
        while out[i] - out[i - 1] < -180:
            out[i] += 360
    return out


def cell_of(lat: float, lng: float, res: float = 0.5) -> tuple[int, int]:
    nlat, nlon = int(round(180 / res)), int(round(360 / res))
    r = int(np.clip((90 - lat) // res, 0, nlat - 1))
    c = int(np.clip(((lng + 180) % 360) // res, 0, nlon - 1))
    return r, c


def polygon_mask(ring: list[list[float]], lat_c: np.ndarray, lon_c: np.ndarray) -> np.ndarray:
    """Cells whose centres fall inside a GeoJSON ring ([lon, lat] pairs). Antimeridian-safe."""
    pts = np.asarray(ring, dtype=float)
    if len(pts) > 1 and np.allclose(pts[0], pts[-1]):
        pts = pts[:-1]
    lon, lat = _unwrap(pts[:, 0]), pts[:, 1]
    mask = np.zeros((len(lat_c), len(lon_c)), dtype=bool)
    rows = np.where((lat_c >= lat.min()) & (lat_c <= lat.max()))[0]
    if rows.size == 0:
        return mask
    glon = lon_c + 360 * np.ceil((lon.min() - lon_c) / 360)   # shift grid into [min, min + 360)
    y = lat_c[rows][:, None]
    x = glon[None, :]
    inside = np.zeros((rows.size, len(lon_c)), dtype=bool)
    n = len(lon)
    for i in range(n):
        x1, y1, x2, y2 = lon[i], lat[i], lon[(i + 1) % n], lat[(i + 1) % n]
        if (i + 1) % n == 0:                                    # closing edge, unwrapped too
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


def area_mask(grid: Grid, geometry: dict | None = None, point: dict | None = None) -> np.ndarray:
    mask = np.zeros((len(grid.lat), len(grid.lon)), dtype=bool)
    if geometry is not None:
        if geometry.get("type") != "Polygon":
            raise ValueError("geometry must be a GeoJSON Polygon")
        mask = polygon_mask(geometry["coordinates"][0], grid.lat, grid.lon)
        if not mask.any():                                      # smaller than one cell → its centroid's cell
            ring = np.asarray(geometry["coordinates"][0], dtype=float)[:-1]
            lon = _unwrap(ring[:, 0])
            point = {"lat": float(ring[:, 1].mean()), "lng": float(((lon.mean() + 180) % 360) - 180)}
    if point is not None and not mask.any():
        mask[cell_of(point["lat"], point["lng"], grid.res)] = True
    if not mask.any():
        raise ValueError("send a polygon or a point")
    return mask


# ------------------------------------------------------------------ series + trend
def area_series(grid: Grid, var: str, mask: np.ndarray) -> tuple[pd.Series, pd.Series]:
    """Monthly area mean and the share of the area (by weight) with valid data each month."""
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
    sub = np.asarray(grid.cube[:, r0:r1, c0:c1], dtype="float64")
    m = mask[r0:r1, c0:c1]
    w = (np.cos(np.deg2rad(grid.lat[r0:r1]))[:, None] * np.ones(m.shape)) * m
    valid = ~np.isnan(sub)
    wv = (w[None] * valid).sum(axis=(1, 2))
    with np.errstate(invalid="ignore", divide="ignore"):
        mean = np.nansum(np.where(valid, sub, 0) * w[None], axis=(1, 2)) / wv
    share = wv / w.sum()
    idx = pd.to_datetime([f"{mo}-01" for mo in grid.months])
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
    grid = get_grid(var)
    mask = area_mask(grid, geometry, point)
    s, share = area_series(grid, var, mask)
    w = np.cos(np.deg2rad(grid.lat))[:, None] * np.ones(mask.shape)
    info = {"cells": int(mask.sum()), "grid": grid.label, "source": grid.source,
            "cells_area_km2": round(float((w * mask).sum() * (grid.res * 111.195) ** 2)),
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
