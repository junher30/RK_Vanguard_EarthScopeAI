"""EarthScope AI analysis API (FastAPI).

Data: full global grids when present, otherwise the 2° sample in git (EARTHSCOPE_DATA=auto|full|sample).

Thin layer over science/: the web sends an area (GeoJSON polygon or point) and a variable,
and gets back the area's monthly series, trend, robustness and caveats computed by the
same engine as the case study. No science lives here.

    .venv/bin/uvicorn api.main:app --port 8000        # docs at http://localhost:8000/docs
"""
from __future__ import annotations

import json
import sys
import warnings
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from export.build_site_data import clean  # noqa: E402
from science.area import analyze_area, data_mode, get_grid  # noqa: E402
from science.variables import GLOBAL_VARIABLES  # noqa: E402

warnings.filterwarnings("ignore", category=RuntimeWarning)

app = FastAPI(title="EarthScope AI API", version="1.0.0",
              description="Trend analysis of any area of the planet on NASA global grids (0.5°, 2001–2024).")
# Public, read-only data: any origin may call it; no cookies or credentials are used.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])


class Point(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class Polygon(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[list[float]]]


class AreaRequest(BaseModel):
    variable: str
    geometry: Optional[Polygon] = None
    point: Optional[Point] = None
    alpha: float = Field(0.05, gt=0, lt=0.5)


@lru_cache(maxsize=256)
def _cached(var: str, geometry_json: str, point_json: str, alpha: float) -> dict:
    geometry = json.loads(geometry_json) if geometry_json else None
    point = json.loads(point_json) if point_json else None
    return clean(analyze_area(var, geometry=geometry, point=point, alpha=alpha))


@app.get("/api/v1/health")
def health():
    out = {}
    for k in GLOBAL_VARIABLES:
        try:
            g = get_grid(k)
            out[k] = {"source": g.source, "grid": g.label, "months": len(g.months),
                      "first": g.months[0], "last": g.months[-1]}
        except FileNotFoundError as exc:
            out[k] = {"source": None, "error": str(exc)}
    return {"status": "ok", "data_mode": data_mode(), "variables": out}


@app.get("/api/v1/variables")
def variables():
    return GLOBAL_VARIABLES


@app.post("/api/v1/area/analyze")
def area_analyze(req: AreaRequest):
    if req.variable not in GLOBAL_VARIABLES:
        raise HTTPException(404, f"unknown variable '{req.variable}'")
    if not req.geometry and not req.point:
        raise HTTPException(422, "send a GeoJSON 'geometry' (Polygon) or a 'point'")
    try:
        return _cached(req.variable,
                       json.dumps(req.geometry.model_dump(), sort_keys=True) if req.geometry else "",
                       json.dumps(req.point.model_dump(), sort_keys=True) if req.point else "",
                       req.alpha)
    except FileNotFoundError as exc:
        raise HTTPException(503, str(exc))
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@app.on_event("startup")
def warm():
    """Build/open the memory-mapped cubes so the first request is fast."""
    for k in GLOBAL_VARIABLES:
        try:
            get_grid(k)
        except FileNotFoundError:
            pass
