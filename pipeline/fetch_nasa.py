"""
EarthScope AI - NASA data ingestion pipeline.

Downloads monthly NASA products one file at a time, extracts the area-weighted
mean over the study region, writes one row per month to CSV, and deletes the raw
file to save disk space. Re-running resumes where it left off.

Products (all monthly, global grids):
  - MOD13C2 v6.1  : MODIS/Terra Vegetation Indices, 0.05 deg CMG (NDVI, EVI)
  - MOD11C3 v6.1  : MODIS/Terra Land Surface Temperature, 0.05 deg CMG (day LST)
  - GPM_3IMERGM 07: GPM IMERG Final Run precipitation, 0.1 deg

Requirements: an Earthdata Login account (https://urs.earthdata.nasa.gov).
Usage:
  python pipeline/fetch_nasa.py --product all --start 2001-01 --end 2024-12
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sys
import tempfile
from pathlib import Path

import numpy as np

# ---------------------------------------------------------------- configuration
# Study region: central Amazon box (edit to change the region).
REGION = {"name": "amazon_core", "lat_min": -10.0, "lat_max": 2.0,
          "lon_min": -70.0, "lon_max": -50.0}

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "processed"

PRODUCTS = {
    "vegetation": {"short_name": "MOD13C2", "version": "061"},
    "lst": {"short_name": "MOD11C3", "version": "061"},
    "precipitation": {"short_name": "GPM_3IMERGM", "version": "07"},
}


# ------------------------------------------------------------------- helpers
def cmg_slices(region: dict, res: float = 0.05):
    """Row/col slices for a MODIS CMG grid (lat 90 -> -90, lon -180 -> 180)."""
    r0 = int(round((90 - region["lat_max"]) / res))
    r1 = int(round((90 - region["lat_min"]) / res))
    c0 = int(round((region["lon_min"] + 180) / res))
    c1 = int(round((region["lon_max"] + 180) / res))
    lats = 90 - (np.arange(r0, r1) + 0.5) * res
    return slice(r0, r1), slice(c0, c1), lats


def weighted_mean(arr: np.ndarray, lats: np.ndarray):
    """Cosine-latitude weighted mean ignoring NaN. Returns (mean, valid_fraction)."""
    w = np.cos(np.deg2rad(lats))[:, None] * np.ones_like(arr)
    valid = ~np.isnan(arr)
    if not valid.any():
        return np.nan, 0.0
    return float(np.nansum(arr * w) / np.sum(w[valid])), float(valid.mean())


GRID_RES = 0.1   # common output grid for all products (deg), north->south, west->east
GRID_DIR = ROOT / "data" / "grids"


def block_mean(a: np.ndarray, f: int) -> np.ndarray:
    """Average non-overlapping f x f blocks, ignoring NaN."""
    r, c = (a.shape[0] // f) * f, (a.shape[1] // f) * f
    b = a[:r, :c].reshape(r // f, f, c // f, f)
    with np.errstate(invalid="ignore"), __import__("warnings").catch_warnings():
        __import__("warnings").simplefilter("ignore", RuntimeWarning)
        return np.nanmean(b, axis=(1, 3))


def grid_coords():
    lat = REGION["lat_max"] - (np.arange(int(round((REGION["lat_max"] - REGION["lat_min"]) / GRID_RES))) + .5) * GRID_RES
    lon = REGION["lon_min"] + (np.arange(int(round((REGION["lon_max"] - REGION["lon_min"]) / GRID_RES))) + .5) * GRID_RES
    return lat, lon


def grid_path(product: str, month: str) -> Path:
    return GRID_DIR / REGION["name"] / product / f"{month}.npz"


def save_grid(product: str, month: str, grids: dict) -> None:
    p = grid_path(product, month)
    p.parent.mkdir(parents=True, exist_ok=True)
    lat, lon = grid_coords()
    np.savez_compressed(p, lat=lat.astype("float32"), lon=lon.astype("float32"),
                        **{k: v.astype("float32") for k, v in grids.items()})


def month_from_name(path: str) -> str:
    name = os.path.basename(path)
    m = re.search(r"\.A(\d{4})(\d{3})\.", name)          # MODIS: AYYYYDDD
    if m:
        import datetime as dt
        d = dt.date(int(m.group(1)), 1, 1) + dt.timedelta(days=int(m.group(2)) - 1)
        return f"{d.year}-{d.month:02d}"
    m = re.search(r"\.(\d{4})(\d{2})\d{2}-S", name)        # IMERG: YYYYMMDD-S...
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    raise ValueError(f"Cannot parse date from {name}")


# ----------------------------------------------------------------- readers
def read_hdf4_sds(path: str, sds_name: str):
    from pyhdf.SD import SD, SDC
    f = SD(path, SDC.READ)
    try:
        sds = f.select(sds_name)
        rs, cs, lats = cmg_slices(REGION)
        data = sds[rs, cs].astype("float64")
        attrs = sds.attributes()
    finally:
        f.end()
    return data, attrs, lats


def extract_vegetation(path: str):
    out, grids = {}, {}
    for key, sds in (("ndvi", "CMG 0.05 Deg Monthly NDVI"),
                     ("evi", "CMG 0.05 Deg Monthly EVI")):
        data, attrs, lats = read_hdf4_sds(path, sds)
        fill = attrs.get("_FillValue", -3000)
        vmin, vmax = attrs.get("valid_range", (-2000, 10000))
        data[(data == fill) | (data < vmin) | (data > vmax)] = np.nan
        data = data / 10000.0                      # scale factor 0.0001
        out[key], out[f"{key}_valid_frac"] = weighted_mean(data, lats)
        grids[key] = block_mean(data, 2)                 # 0.05 -> 0.1 deg
    return out, grids


def extract_lst(path: str) -> dict:
    data, attrs, lats = read_hdf4_sds(path, "LST_Day_CMG")
    data[data == attrs.get("_FillValue", 0)] = np.nan
    data = data * float(attrs.get("scale_factor", 0.02)) - 273.15   # K -> deg C
    mean, frac = weighted_mean(data, lats)
    return {"lst_day_c": mean, "lst_valid_frac": frac}, {"lst_day_c": block_mean(data, 2)}


def extract_precip(path: str) -> dict:
    import h5py
    with h5py.File(path, "r") as f:
        lat = f["Grid/lat"][:]
        lon = f["Grid/lon"][:]
        pr = f["Grid/precipitation"][0]               # (lon, lat), mm/hr
        fill = f["Grid/precipitation"].attrs.get("_FillValue", -9999.9)
    li = (lat >= REGION["lat_min"]) & (lat <= REGION["lat_max"])
    lo = (lon >= REGION["lon_min"]) & (lon <= REGION["lon_max"])
    sub = pr[np.ix_(lo, li)].T.astype("float64")      # -> (lat, lon)
    sub[sub <= fill] = np.nan
    sub[sub < 0] = np.nan
    sub = sub * 24.0                                   # mm/hr -> mm/day
    mean, frac = weighted_mean(sub, lat[li])
    if lat[li][0] < lat[li][-1]:                       # IMERG lat is south->north: flip
        sub = sub[::-1]
    return {"precip_mm_day": mean, "precip_valid_frac": frac}, {"precip_mm_day": sub}


EXTRACTORS = {"vegetation": extract_vegetation, "lst": extract_lst,
              "precipitation": extract_precip}


_SESSION = None


def download_with_timeout(url: str, folder: str, retries: int = 3) -> str:
    """Download one file with a network timeout and retries (avoids silent hangs)."""
    global _SESSION
    import earthaccess
    if _SESSION is None:
        _SESSION = earthaccess.get_requests_https_session()
    dest = os.path.join(folder, os.path.basename(url))
    for attempt in range(1, retries + 1):
        try:
            with _SESSION.get(url, stream=True, timeout=(30, 60)) as r:
                r.raise_for_status()
                with open(dest, "wb") as fh:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        fh.write(chunk)
            return dest
        except Exception as exc:
            print(f"    retry {attempt}/{retries}: {exc}", file=sys.stderr)
    raise RuntimeError(f"download failed after {retries} attempts")


# -------------------------------------------------------------------- main
def run(product: str, start: str, end: str) -> None:
    import earthaccess

    cfg = PRODUCTS[product]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_csv = OUT_DIR / f"{REGION['name']}_{product}.csv"

    done = set()
    if out_csv.exists():
        with open(out_csv) as fh:
            done = {row["month"] for row in csv.DictReader(fh)}

    bbox = (REGION["lon_min"], REGION["lat_min"], REGION["lon_max"], REGION["lat_max"])
    granules = earthaccess.search_data(short_name=cfg["short_name"], version=cfg["version"],
                                       temporal=(f"{start}-01", f"{end}-28"),
                                       bounding_box=bbox)
    print(f"[{product}] {len(granules)} granules found, {len(done)} already in CSV")

    write_header = not out_csv.exists() or out_csv.stat().st_size == 0
    with open(out_csv, "a", newline="") as fh, tempfile.TemporaryDirectory() as tmp:
        writer = None
        for g in granules:
            url = g.data_links()[0]
            month = month_from_name(url)
            need_row = month not in done
            need_grid = not grid_path(product, month).exists()
            if not (need_row or need_grid):
                continue
            try:
                files = [download_with_timeout(url, tmp)]
                row = {"month": month, "source_file": os.path.basename(files[0]),
                       "product": f"{cfg['short_name']} v{cfg['version']}"}
                values, grids = EXTRACTORS[product](files[0])
                row.update(values)
                save_grid(product, month, grids)
            except Exception as exc:                       # keep going, log failure
                print(f"  ! {month}: {exc}", file=sys.stderr)
                continue
            finally:
                for p in Path(tmp).glob("*"):
                    p.unlink(missing_ok=True)
            if not need_row:
                print(f"  grid {month}")
                continue
            if writer is None:
                writer = csv.DictWriter(fh, fieldnames=list(row))
                if write_header:
                    writer.writeheader()
            writer.writerow(row)
            fh.flush()
            print(f"  ok {month}")
    print(f"[{product}] saved -> {out_csv}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--product", choices=[*PRODUCTS, "all"], default="all")
    ap.add_argument("--start", default="2001-01")
    ap.add_argument("--end", default="2024-12")
    args = ap.parse_args()

    import earthaccess
    auth = earthaccess.login(strategy="netrc") if (Path.home() / ".netrc").exists() else None
    if not (auth and auth.authenticated):
        auth = earthaccess.login(strategy="interactive", persist=True)
    if not (auth and auth.authenticated):
        sys.exit("ERROR: Earthdata login failed. Check username/password at "
                 "https://urs.earthdata.nasa.gov and try again.")
    print("Earthdata login OK")
    for p in (PRODUCTS if args.product == "all" else [args.product]):
        run(p, args.start, args.end)
