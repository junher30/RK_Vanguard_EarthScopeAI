"""Export GLOBAL NASA layers and science results for the web (web/public/data/global/).

Reads data/global/<product>/<YYYY-MM>.npz (pipeline/fetch_global.py) and writes:
  manifest.json                         variables, years, colour scales, caveats
  series/<var>.json                     global area-weighted monthly series + trend (science/trends.py)
  maps/<var>/value/<year>.png           annual mean (720 x 360, NaN = transparent)
  maps/<var>/anomaly/<year>.png         annual mean minus the period mean
  maps/<var>/trend.png                  per-pixel Sen slope (science/global_trends.py);
                                        non-significant pixels (p >= 0.05) are faded

    python export/build_global_data.py            # all variables
    python export/build_global_data.py --var evi  # one variable
"""
from __future__ import annotations

import argparse
import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from export.build_site_data import clean, colorize  # noqa: E402
from science.area import series_payload  # noqa: E402
from science.global_trends import annual_trend, area_weighted_mean  # noqa: E402
from science.variables import GLOBAL_VARIABLES  # noqa: E402

SRC = ROOT / "data" / "global"
OUT = ROOT / "web" / "public" / "data" / "global"

DIVERGING_WARM = ["#1d4ed8", "#93c5fd", "#f8fafc", "#f87171", "#991b1b"]

COLORS = {
    "precip_mm_day": {"alpha_ramp": True,
                      "value": ["#f1f5f9", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e1b4b"],
                      "anomaly": ["#b45309", "#fbbf24", "#f8fafc", "#60a5fa", "#1d4ed8"],
                      "trend": ["#b45309", "#fbbf24", "#f8fafc", "#60a5fa", "#1d4ed8"]},
    "evi": {"value": ["#a16207", "#d9b36c", "#86efac", "#22c55e", "#14532d"],
            "anomaly": ["#92400e", "#f59e0b", "#f8fafc", "#4ade80", "#166534"],
            "trend": ["#92400e", "#f59e0b", "#f8fafc", "#4ade80", "#166534"]},
    "lst_day_c": {"value": ["#1e3a8a", "#38bdf8", "#fde047", "#f97316", "#7f1d1d"],
                  "anomaly": DIVERGING_WARM, "trend": DIVERGING_WARM},
    "t2m_c": {"value": ["#1e3a8a", "#38bdf8", "#fde047", "#f97316", "#7f1d1d"],
              "anomaly": DIVERGING_WARM, "trend": DIVERGING_WARM},
    "rh2m_pct": {"value": ["#7c2d12", "#f59e0b", "#fef3c7", "#5eead4", "#0f766e"],
                 "anomaly": ["#9a3412", "#fdba74", "#f8fafc", "#5eead4", "#0f766e"],
                 "trend": ["#9a3412", "#fdba74", "#f8fafc", "#5eead4", "#0f766e"]},
}
# metadata lives in science/variables.py (single source of truth)
VARS = {k: {**GLOBAL_VARIABLES[k], **COLORS[k]} for k in COLORS}


def load_cube(var: str, product: str):
    files = sorted((SRC / product).glob("*.npz"))
    months = [f.stem for f in files]
    first = np.load(files[0])
    lat, lon = first["lat"], first["lon"]
    cube = np.full((len(files), len(lat), len(lon)), np.nan, dtype="float32")
    for i, f in enumerate(files):
        cube[i] = np.load(f)[var]
    return months, lat, lon, cube


def annual(months: list[str], cube: np.ndarray, min_months: int = 10):
    yrs = np.array([int(m[:4]) for m in months])
    out, kept = [], []
    for y in sorted(set(yrs)):
        sel = yrs == y
        if sel.sum() < 12:
            continue                                            # incomplete year in the archive
        block = cube[sel]
        n = np.sum(~np.isnan(block), axis=0)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            m = np.nanmean(block, axis=0)
        m[n < min_months] = np.nan
        out.append(m)
        kept.append(y)
    return np.array(kept), np.stack(out)


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


def export_var(key: str, cfg: dict) -> dict:
    months, lat, lon, cube = load_cube(key, cfg["product"])
    years, ann = annual(months, cube)
    if len(years) < 2:
        raise SystemExit(f"{key}: not enough complete years yet ({len(years)})")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        clim = np.nanmean(ann, axis=0)
    vmin, vmax = (float(v) for v in np.nanpercentile(ann, [2, 98]))
    amax = float(np.nanpercentile(np.abs(ann - clim), 98))
    base = OUT / "maps" / key
    for y, g in zip(years, ann):
        save_png(colorize(g, vmin, vmax, cfg["value"], alpha_ramp=cfg.get("alpha_ramp", False)),
                 base / "value" / f"{y}.png")
        save_png(colorize(g - clim, -amax, amax, cfg["anomaly"]), base / "anomaly" / f"{y}.png")

    # per-pixel trend (Sen slope per decade), faded where not significant
    tr = annual_trend(ann, years.astype(float))
    per_dec = tr["sen_slope"] * 10
    tmax = float(np.nanpercentile(np.abs(per_dec), 98)) or 1.0
    img = colorize(per_dec, -tmax, tmax, cfg["trend"])
    a = np.array(img)
    a[..., 3] = np.where(np.isnan(per_dec), 0, np.where(tr["p_value"] < 0.05, 240, 70))
    save_png(Image.fromarray(a), base / "trend.png")
    sig = tr["p_value"] < 0.05
    valid = ~np.isnan(tr["p_value"])
    w = np.cos(np.deg2rad(lat))[:, None] * np.ones_like(per_dec)
    share_sig = float(np.sum(w[sig & valid]) / np.sum(w[valid]))
    share_up = float(np.sum(w[sig & valid & (per_dec > 0)]) / np.sum(w[valid]))

    # global series: fixed mask of cells valid in ≥ 90 % of months (avoids coverage artefacts)
    mask = np.mean(~np.isnan(cube), axis=0) >= 0.9
    s = pd.Series([area_weighted_mean(c, lat, mask) for c in cube],
                  index=pd.to_datetime([m + "-01" for m in months]), name=key).asfreq("MS")
    series = {**series_payload(s, key), "mask_share": float(mask.mean())}
    r = series["trend"]
    (OUT / "series").mkdir(parents=True, exist_ok=True)
    (OUT / "series" / f"{key}.json").write_text(json.dumps(clean(series), separators=(",", ":")))
    print(f"{key}: {len(years)} years ({years[0]}–{years[-1]}), global trend: {r['verdict']} "
          f"(Sen {r['sen_slope_per_year']:+.4f} {cfg['units']}/yr); "
          f"{share_sig:.0%} of area with significant pixel trend")
    return {
        "key": key, "label": cfg["label"], "short": cfg["short"], "units": cfg["units"],
        "decimals": cfg["decimals"], "dataset": cfg["dataset"], "doi": cfg["doi"], "kind": cfg["kind"],
        "years": [int(y) for y in years],
        "bounds": {"lat_min": -90.0, "lat_max": 90.0, "lon_min": -180.0, "lon_max": 180.0},
        "scale": {"value": {"min": vmin, "max": vmax, "colors": cfg["value"]},
                  "anomaly": {"min": -amax, "max": amax, "colors": cfg["anomaly"]},
                  "trend": {"min": -tmax, "max": tmax, "colors": cfg["trend"], "per": "decade"}},
        "trend_map": {"share_significant": share_sig, "share_significant_increase": share_up},
        "verdict": r["verdict"], "robust": series["robust"],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--var", choices=list(VARS), action="append")
    args = ap.parse_args()
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    mpath = OUT / "manifest.json"
    manifest = json.loads(mpath.read_text()) if mpath.exists() else {
        "region": {"key": "global", "label": "Global (0.5° grid)", "lat_min": -90, "lat_max": 90,
                   "lon_min": -180, "lon_max": 180},
        "generated_by": "export/build_global_data.py", "variables": []}
    for key in args.var or VARS:
        entry = export_var(key, VARS[key])
        manifest["variables"] = [v for v in manifest["variables"] if v["key"] != key] + [entry]
    order = list(VARS)
    manifest["variables"].sort(key=lambda v: order.index(v["key"]))
    OUT.mkdir(parents=True, exist_ok=True)
    mpath.write_text(json.dumps(clean(manifest), indent=1))
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
