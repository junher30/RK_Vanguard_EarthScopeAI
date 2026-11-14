"""Build the lightweight SAMPLE of the global data that lives in git (data/sample/).

The full global grids (data/global/, 0.5°, ≈ 1.9 GB) stay out of git. This sample keeps every
month (2001–2024) and every variable but coarsens the grid to 2° (90 x 180) and stores float16,
so teammates can run and edit the API and science code without downloading NASA data.

Results computed on the sample are for DEVELOPMENT only (the API labels them "sample").

    python pipeline/make_sample.py        # needs data/global/ (pipeline/fetch_global.py)
"""
from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from science.variables import GLOBAL_VARIABLES  # noqa: E402

OUT = ROOT / "data" / "sample"
FACTOR = 4                                   # 0.5° -> 2°
RES = 0.5 * FACTOR


def coarsen(a: np.ndarray) -> np.ndarray:
    t, r, c = a.shape
    b = a.reshape(t, r // FACTOR, FACTOR, c // FACTOR, FACTOR)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        return np.nanmean(b, axis=(2, 4))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    lat = (90 - (np.arange(int(180 / RES)) + 0.5) * RES).astype("float32")
    lon = (-180 + (np.arange(int(360 / RES)) + 0.5) * RES).astype("float32")
    for var, meta in GLOBAL_VARIABLES.items():
        files = sorted((ROOT / "data" / "global" / meta["product"]).glob("*.npz"))
        if not files:
            sys.exit(f"No global data for {var}. Run pipeline/fetch_global.py first.")
        cube = np.stack([np.load(f)[var] for f in files]).astype("float32")
        small = coarsen(cube).astype("float16")
        np.savez_compressed(OUT / f"{var}.npz", values=small, lat=lat, lon=lon,
                            months=np.array([f.stem for f in files]))
        print(f"{var}: {small.shape} → {(OUT / f'{var}.npz').stat().st_size / 1e6:.1f} MB")
    (OUT / "README.md").write_text(
        "# Muestra de datos globales (2°, float16)\n\n"
        "Generada con `python pipeline/make_sample.py` a partir de `data/global/` (0,5°).\n"
        "Sirve para desarrollar y probar la API y `science/` sin descargar datos de NASA.\n"
        "**No usar sus resultados como conclusiones**: la API los marca como `sample`.\n")
    (OUT / "manifest.json").write_text(json.dumps({"resolution_deg": RES, "dtype": "float16",
                                                   "source": "data/global (0.5°)",
                                                   "variables": list(GLOBAL_VARIABLES)}, indent=1))


if __name__ == "__main__":
    main()
