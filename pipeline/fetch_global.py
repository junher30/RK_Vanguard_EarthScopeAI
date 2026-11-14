"""
EarthScope AI - GLOBAL NASA data pipeline.

Downloads monthly NASA products for the whole planet, one file at a time, regrids each
month to a common 0.5° global grid (360 x 720, north->south, west->east), saves it as a
compressed .npz and deletes the raw file. Re-running resumes where it left off.

Products (monthly, 2001-01 → 2024-12):
  precipitation  GPM_3IMERGM v07   GPM IMERG Final precipitation, 0.1°        → precip_mm_day
  vegetation     MOD13C2 v6.1      MODIS/Terra vegetation indices, 0.05° CMG → ndvi, evi
  lst            MOD11C3 v6.1      MODIS/Terra land surface temp, 0.05° CMG  → lst_day_c, lst_night_c
  atmosphere     M2TMNXSLV 5.12.4  MERRA-2 single-level diagnostics (reanalysis), 0.5° x 0.625°
                                   → t2m_c (air temp 2 m), qv2m_gkg (specific humidity 2 m),
                                     rh2m_pct (relative humidity 2 m, derived)

Output: data/global/<product>/<YYYY-MM>.npz   (float32 arrays + lat/lon)

Requirements: Earthdata Login (~/.netrc) with "NASA GESDISC DATA ARCHIVE" and "LP DAAC" approved.
Usage:
  python pipeline/fetch_global.py --product precipitation
  python pipeline/fetch_global.py --product all --start 2001-01 --end 2024-12
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile
import time
import warnings
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "global"
RES = 0.5
NLAT, NLON = int(180 / RES), int(360 / RES)
LAT = (90 - (np.arange(NLAT) + 0.5) * RES).astype("float32")     # 89.75 … -89.75
LON = (-180 + (np.arange(NLON) + 0.5) * RES).astype("float32")   # -179.75 … 179.75

PRODUCTS = {
    "precipitation": {"short_name": "GPM_3IMERGM", "version": "07"},
    "vegetation": {"short_name": "MOD13C2", "version": "061"},
    "lst": {"short_name": "MOD11C3", "version": "061"},
    "atmosphere": {"short_name": "M2TMNXSLV", "version": "5.12.4"},
}


# ------------------------------------------------------------------- helpers
def block_mean(a: np.ndarray, f: int) -> np.ndarray:
    """Average non-overlapping f x f blocks, ignoring NaN (all-NaN block -> NaN)."""
    r, c = a.shape
    b = a.reshape(r // f, f, c // f, f)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        return np.nanmean(b, axis=(1, 3)).astype("float32")


def month_from_name(path: str) -> str:
    name = os.path.basename(path)
    m = re.search(r"\.A(\d{4})(\d{3})\.", name)                       # MODIS AYYYYDDD
    if m:
        import datetime as dt
        d = dt.date(int(m.group(1)), 1, 1) + dt.timedelta(days=int(m.group(2)) - 1)
        return f"{d.year}-{d.month:02d}"
    m = re.search(r"\.(\d{4})(\d{2})\d{2}-S", name)                    # IMERG
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    m = re.search(r"\.(\d{4})(\d{2})\.nc4$", name)                     # MERRA-2 .YYYYMM.nc4
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    raise ValueError(f"Cannot parse date from {name}")


def out_path(product: str, month: str) -> Path:
    return OUT / product / f"{month}.npz"


# ----------------------------------------------------------------- readers
def read_cmg(path: str, sds_name: str):
    from pyhdf.SD import SD, SDC
    f = SD(path, SDC.READ)
    try:
        sds = f.select(sds_name)
        data = sds[:, :].astype("float32")                             # 3600 x 7200, N->S, W->E
        attrs = sds.attributes()
    finally:
        f.end()
    return data, attrs


def extract_vegetation(path: str) -> dict:
    out = {}
    for key, sds in (("ndvi", "CMG 0.05 Deg Monthly NDVI"), ("evi", "CMG 0.05 Deg Monthly EVI")):
        d, attrs = read_cmg(path, sds)
        fill = attrs.get("_FillValue", -3000)
        vmin, vmax = attrs.get("valid_range", (-2000, 10000))
        d[(d == fill) | (d < vmin) | (d > vmax)] = np.nan
        out[key] = block_mean(d / 10000.0, 10)                         # 0.05° -> 0.5°
    return out


def extract_lst(path: str) -> dict:
    out = {}
    for key, sds in (("lst_day_c", "LST_Day_CMG"), ("lst_night_c", "LST_Night_CMG")):
        d, attrs = read_cmg(path, sds)
        d[d == attrs.get("_FillValue", 0)] = np.nan
        vmin, vmax = attrs.get("valid_range", (7500, 65535))
        d[(d < vmin) | (d > vmax)] = np.nan
        out[key] = block_mean(d * float(attrs.get("scale_factor", 0.02)) - 273.15, 10)
    return out


def extract_precip(path: str) -> dict:
    import h5py
    with h5py.File(path, "r") as f:
        lat = f["Grid/lat"][:]
        pr = f["Grid/precipitation"][0].astype("float32")              # (lon 3600, lat 1800) mm/h
        fill = f["Grid/precipitation"].attrs.get("_FillValue", -9999.9)
    pr[(pr <= fill) | (pr < 0)] = np.nan
    pr = pr.T * 24.0                                                   # (lat, lon), mm/day
    if lat[0] < lat[-1]:
        pr = pr[::-1]                                                  # south->north to north->south
    return {"precip_mm_day": block_mean(pr, 5)}                        # 0.1° -> 0.5°


def _regrid_merra(a: np.ndarray, lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """MERRA-2 0.5° x 0.625° grid points -> 0.5° cell centres (bilinear, lon wraps)."""
    # longitude: periodic linear interpolation at the target centres
    lon_ext = np.concatenate([lon, [lon[0] + 360]])
    a_ext = np.concatenate([a, a[:, :1]], axis=1)
    tgt_lon = np.where(LON < lon[0], LON + 360, LON)
    idx = np.clip(np.searchsorted(lon_ext, tgt_lon) - 1, 0, len(lon_ext) - 2)
    w = (tgt_lon - lon_ext[idx]) / (lon_ext[idx + 1] - lon_ext[idx])
    b = a_ext[:, idx] * (1 - w) + a_ext[:, idx + 1] * w                # (361, 720)
    # latitude: points at -90, -89.5 … 90 -> centres = mean of neighbours, then N->S
    c = 0.5 * (b[:-1] + b[1:])                                         # (360, 720) S->N
    if lat[0] < lat[-1]:
        c = c[::-1]
    return c.astype("float32")


def extract_atmosphere(path: str) -> dict:
    import h5py
    with h5py.File(path, "r") as f:
        lat, lon = f["lat"][:], f["lon"][:]
        get = lambda k: np.where(np.abs(f[k][0]) > 1e14, np.nan, f[k][0]).astype("float64")
        t2m, qv, ps = get("T2M"), get("QV2M"), get("PS")
    tc = t2m - 273.15
    e = qv * (ps / 100.0) / (0.622 + 0.378 * qv)                      # vapour pressure, hPa
    es = 6.112 * np.exp(17.67 * tc / (tc + 243.5))                     # saturation (Magnus), hPa
    rh = np.clip(100.0 * e / es, 0, 100)
    return {"t2m_c": _regrid_merra(tc, lat, lon),
            "qv2m_gkg": _regrid_merra(qv * 1000.0, lat, lon),
            "rh2m_pct": _regrid_merra(rh, lat, lon)}


EXTRACTORS = {"precipitation": extract_precip, "vegetation": extract_vegetation,
              "lst": extract_lst, "atmosphere": extract_atmosphere}

_SESSION = None


def download(url: str, folder: str, retries: int = 4) -> str:
    """Stream one file with timeouts and retries (avoids silent hangs)."""
    global _SESSION
    import earthaccess
    if _SESSION is None:
        _SESSION = earthaccess.get_requests_https_session()
    dest = os.path.join(folder, os.path.basename(url))
    for attempt in range(1, retries + 1):
        try:
            with _SESSION.get(url, stream=True, timeout=(30, 120)) as r:
                r.raise_for_status()
                with open(dest, "wb") as fh:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        fh.write(chunk)
            return dest
        except Exception as exc:
            print(f"    retry {attempt}/{retries}: {exc}", file=sys.stderr, flush=True)
            time.sleep(5 * attempt)
    raise RuntimeError(f"download failed after {retries} attempts")


# -------------------------------------------------------------------- main
def run(product: str, start: str, end: str) -> None:
    import earthaccess
    cfg = PRODUCTS[product]
    (OUT / product).mkdir(parents=True, exist_ok=True)
    granules = earthaccess.search_data(short_name=cfg["short_name"], version=cfg["version"],
                                       temporal=(f"{start}-01", f"{end}-28"))
    todo = [g for g in granules if not out_path(product, month_from_name(g.data_links()[0])).exists()]
    print(f"[{product}] {len(granules)} granules, {len(granules) - len(todo)} done, {len(todo)} to go", flush=True)
    with tempfile.TemporaryDirectory() as tmp:
        for k, g in enumerate(todo, 1):
            url = g.data_links()[0]
            month = month_from_name(url)
            t0 = time.time()
            try:
                f = download(url, tmp)
                grids = EXTRACTORS[product](f)
                np.savez_compressed(out_path(product, month), lat=LAT, lon=LON,
                                    source_file=os.path.basename(url), **grids)
                print(f"  ok {month} ({k}/{len(todo)}, {time.time() - t0:.0f}s)", flush=True)
            except Exception as exc:                                   # keep going, log failure
                print(f"  ! {month}: {exc}", file=sys.stderr, flush=True)
            finally:
                for p in Path(tmp).glob("*"):
                    p.unlink(missing_ok=True)
    print(f"[{product}] finished", flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--product", choices=[*PRODUCTS, "all"], default="all")
    ap.add_argument("--start", default="2001-01")
    ap.add_argument("--end", default="2024-12")
    args = ap.parse_args()

    import earthaccess
    auth = earthaccess.login(strategy="netrc")
    if not (auth and auth.authenticated):
        sys.exit("ERROR: Earthdata login failed (check ~/.netrc).")
    print("Earthdata login OK", flush=True)
    for p in (PRODUCTS if args.product == "all" else [args.product]):
        run(p, args.start, args.end)
