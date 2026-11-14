"""Export processed NASA data and science results for the web frontend.

The web never computes science: this script runs science/ and writes static files that
the Next.js app reads from web/public/data/.

    python export/build_site_data.py

Outputs
  manifest.json                     region, variables, years, color scales
  series/<var>.json                 monthly + annual series, trend result, robustness
  maps/<var>/value/<year>.png       annual-mean map (colored, NaN = transparent)
  maps/<var>/anomaly/<year>.png     annual mean minus the 2001–2024 mean
"""
from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from science.trends import analyze, load_series, summary_text  # noqa: E402
from science.variables import REGIONS, VARIABLES  # noqa: E402

REGION = "amazon_core"
OUT = ROOT / "web" / "public" / "data"
GRIDS = ROOT / "data" / "grids" / REGION
PROCESSED = ROOT / "data" / "processed"

# Variables shown on the web (EVI preferred over NDVI, decision D4).
WEB_VARS = {
    "precip_mm_day": {"short": "Precipitation", "grid": "precipitation", "decimals": 2,
                      "value": ["#f1f5f9", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e1b4b"],
                      "anomaly": ["#b45309", "#fbbf24", "#f8fafc", "#60a5fa", "#1d4ed8"]},
    "evi": {"short": "Vegetation (EVI)", "grid": "vegetation", "decimals": 3,
            "value": ["#a16207", "#d9b36c", "#86efac", "#22c55e", "#14532d"],
            "anomaly": ["#92400e", "#f59e0b", "#f8fafc", "#4ade80", "#166534"]},
    "lst_day_c": {"short": "Surface temperature", "grid": "lst", "decimals": 2,
                  "value": ["#fef9c3", "#fde047", "#fb923c", "#ef4444", "#7f1d1d"],
                  "anomaly": ["#1d4ed8", "#93c5fd", "#f8fafc", "#f87171", "#991b1b"]},
}


def hex_rgb(h: str) -> np.ndarray:
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=float)


def colorize(grid: np.ndarray, vmin: float, vmax: float, stops: list[str],
             alpha_ramp: bool = False) -> Image.Image:
    """Map values to an RGBA image with linear interpolation between color stops.
    alpha_ramp: low values become more transparent (lets the Earth show through)."""
    cols = np.stack([hex_rgb(c) for c in stops])
    t = np.clip((grid - vmin) / (vmax - vmin), 0, 1)
    pos = np.nan_to_num(t, nan=0) * (len(stops) - 1)
    i = np.minimum(pos.astype(int), len(stops) - 2)
    f = (pos - i)[..., None]
    rgb = cols[i] * (1 - f) + cols[i + 1] * f
    alpha = np.where(np.isnan(grid), 0, (40 + 200 * np.nan_to_num(t, nan=0)) if alpha_ramp else 235)[..., None]
    return Image.fromarray(np.concatenate([rgb, alpha], axis=-1).astype(np.uint8))


def annual_grids(var: str, grid_dir: str) -> tuple[dict[int, np.ndarray], np.ndarray, np.ndarray]:
    files = sorted((GRIDS / grid_dir).glob("*.npz"))
    by_year: dict[int, list[np.ndarray]] = {}
    lat = lon = None
    for f in files:
        z = np.load(f)
        lat, lon = z["lat"], z["lon"]
        by_year.setdefault(int(f.stem[:4]), []).append(z[var].astype(float))
    with np.errstate(all="ignore"):
        years = {y: np.nanmean(np.stack(g), axis=0) for y, g in by_year.items() if len(g) == 12}
    return years, lat, lon


def clean(o):
    """JSON-safe: NaN -> None, numpy -> python."""
    if isinstance(o, dict):
        return {str(k): clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.floating, float)):
        return None if not np.isfinite(o) else round(float(o), 6)
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.bool_):
        return bool(o)
    return o


def export_series(var: str, meta: dict, alpha: float = 0.05) -> dict:
    s = load_series(str(PROCESSED / f"{REGION}_{meta['file']}.csv"), var)
    r = analyze(s, alpha)
    start, end = s.index[0].year, s.index[-1].year
    robustness = []
    for label, sub in [("Full period", s),
                       ("Excluding last 2 years", s[: str(end - 2)]),
                       ("Excluding first 2 years", s[str(start + 2):])]:
        rr = analyze(sub, alpha)
        robustness.append({"test": label, "period": rr["period"], "verdict": rr["verdict"],
                           "p_value": rr["seasonal_mann_kendall"]["p_value"],
                           "sen_slope_per_year": rr["sen_slope_per_year"]})
    annual = s.groupby(s.index.year).agg(["mean", "count"])
    annual = annual[annual["count"] == 12]["mean"]
    anom = r.pop("anomalies")
    # Sen-slope line through the period mean, for display only
    yrs = np.array(annual.index, dtype=float)
    centre = yrs.mean()
    trend_line = [[int(y), float(annual.mean() + r["sen_slope_per_year"] * (y - centre))] for y in yrs]
    return {
        "variable": var,
        "label": meta["label"],
        "units": meta["units"],
        "dataset": meta["dataset"],
        "doi": meta["doi"],
        "caveats": meta["caveats"],
        "monthly": [[d.strftime("%Y-%m"), v] for d, v in s.items()],
        "rolling12": [[d.strftime("%Y-%m"), v] for d, v in s.rolling(12, center=True).mean().items()],
        "anomalies": [[d.strftime("%Y-%m"), v] for d, v in anom.items()],
        "annual": [[int(y), v] for y, v in annual.items()],
        "trend": r,
        "trend_line": trend_line,
        "robustness": robustness,
        "robust": len({x["verdict"] for x in robustness}) == 1,
        "summary": summary_text({**r, "variable": meta["label"]}, meta["units"]),
    }


def main() -> None:
    warnings.filterwarnings("ignore", message="Mean of empty slice")
    region = REGIONS[REGION]
    manifest = {
        "region": {"key": REGION, **region},
        "generated_by": "export/build_site_data.py",
        "variables": [],
    }
    for var, web in WEB_VARS.items():
        meta = VARIABLES[var]
        years, lat, lon = annual_grids(var, web["grid"])
        stack = np.stack(list(years.values()))
        with np.errstate(all="ignore"):
            clim = np.nanmean(stack, axis=0)
        vmin, vmax = np.nanpercentile(stack, [2, 98])
        amax = float(np.nanpercentile(np.abs(stack - clim), 98))

        for mode in ("value", "anomaly"):
            (OUT / "maps" / var / mode).mkdir(parents=True, exist_ok=True)
        for y, g in years.items():
            colorize(g, vmin, vmax, web["value"]).save(OUT / "maps" / var / "value" / f"{y}.png", optimize=True)
            colorize(g - clim, -amax, amax, web["anomaly"]).save(
                OUT / "maps" / var / "anomaly" / f"{y}.png", optimize=True)

        series = export_series(var, meta)
        (OUT / "series").mkdir(parents=True, exist_ok=True)
        (OUT / "series" / f"{var}.json").write_text(json.dumps(clean(series), separators=(",", ":")))

        manifest["variables"].append({
            "key": var, "label": meta["label"], "short": web["short"], "units": meta["units"],
            "decimals": web["decimals"], "dataset": meta["dataset"], "doi": meta["doi"],
            "years": sorted(years),
            "bounds": {"lat_min": float(lat.min() - 0.05), "lat_max": float(lat.max() + 0.05),
                       "lon_min": float(lon.min() - 0.05), "lon_max": float(lon.max() + 0.05)},
            "scale": {"value": {"min": float(vmin), "max": float(vmax), "colors": web["value"]},
                      "anomaly": {"min": -amax, "max": amax, "colors": web["anomaly"]}},
            "verdict": series["trend"]["verdict"],
            "robust": series["robust"],
        })
        print(f"{var}: {len(years)} years, scale {vmin:.3f}–{vmax:.3f}, ±{amax:.3f}; {series['trend']['verdict']}")

    (OUT / "manifest.json").write_text(json.dumps(clean(manifest), indent=1))
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
