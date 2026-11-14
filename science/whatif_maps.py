"""
Pixel-level What-If model (map version of science/whatif.py).

For every 0.1 deg pixel: dry-season (Jul-Oct) LST = a + b * r, r = relative precipitation
anomaly of that pixel. Validation per pixel by leave-one-year-out (closed form via
leverage: e_loo = e / (1 - h)). Output: data/processed/whatif_pixel_model.npz

Run once:  python science/whatif_maps.py      (numpy only)
"""
from pathlib import Path
import glob
import os

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
GRIDS = ROOT / "data" / "grids" / "amazon_core"
OUT = ROOT / "data" / "processed" / "whatif_pixel_model.npz"
MONTHS = (7, 8, 9, 10)


def load(product, var):
    files = sorted(glob.glob(str(GRIDS / product / "*.npz")))
    keys = [os.path.basename(f)[:7] for f in files]
    first = np.load(files[0])
    return np.stack([np.load(f)[var] for f in files]), keys, first["lat"], first["lon"]


def seasonal(stack, keys):
    yrs = sorted({int(k[:4]) for k in keys})
    out = []
    for y in yrs:
        sel = [i for i, k in enumerate(keys) if int(k[:4]) == y and int(k[5:]) in MONTHS]
        with np.errstate(invalid="ignore"):
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", RuntimeWarning)
                out.append(np.nanmean(stack[sel], axis=0) if len(sel) == len(MONTHS) else
                           np.full(stack.shape[1:], np.nan))
    return np.array(out), yrs


def main():
    P, kp, lat, lon = load("precipitation", "precip_mm_day")
    T, kt, _, _ = load("lst", "lst_day_c")
    Ps, yrs = seasonal(P, kp)
    Ts, _ = seasonal(T, kt)
    Pm = np.nanmean(Ps, axis=0)
    R = Ps / np.where(Pm > 0.05, Pm, np.nan) - 1                # relative anomaly
    ok = np.isfinite(R) & np.isfinite(Ts)
    n = ok.sum(0).astype(float)
    Rz, Tz = np.where(ok, R, 0), np.where(ok, Ts, 0)
    xm, ym = Rz.sum(0) / n, Tz.sum(0) / n
    dx, dy = np.where(ok, R - xm, 0), np.where(ok, Ts - ym, 0)
    sxx, sxy = (dx ** 2).sum(0), (dx * dy).sum(0)
    b = sxy / sxx
    a = ym - b * xm
    e = np.where(ok, Ts - (a + b * R), 0)
    h = 1 / n + dx ** 2 / sxx
    e_loo = np.where(ok, e / (1 - h), 0)
    sst = (dy ** 2).sum(0)
    loyo_r2 = 1 - (e_loo ** 2).sum(0) / sst
    s2 = (e ** 2).sum(0) / (n - 2)
    valid = n >= 15
    for arr in (a, b, loyo_r2, s2):
        arr[~valid] = np.nan
    np.savez_compressed(OUT, lat=lat, lon=lon, a=a.astype("f4"), b=b.astype("f4"),
                        loyo_r2=loyo_r2.astype("f4"), s2=s2.astype("f4"), n_years=n.astype("f4"),
                        baseline_lst=ym.astype("f4"), years=np.array(yrs))
    skill = loyo_r2[np.isfinite(loyo_r2)]
    print(f"saved {OUT}  pixels={skill.size}  median LOYO R2={np.median(skill):.2f}  "
          f"share with R2>0.3: {(skill > 0.3).mean():.0%}  median slope b={np.nanmedian(b):.2f} degC")


if __name__ == "__main__":
    main()
