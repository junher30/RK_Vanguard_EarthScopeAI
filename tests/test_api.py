"""Contract tests for the analysis API (python tests/test_api.py). Runs on the 2° sample in git.

If these pass, the web's InsightPanel will still understand the API responses."""
import os
import sys
from pathlib import Path

os.environ.setdefault("EARTHSCOPE_DATA", "sample")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient  # noqa: E402

from api.main import app  # noqa: E402

c = TestClient(app)

h = c.get("/api/v1/health").json()
assert h["status"] == "ok" and all(v["months"] >= 36 for v in h["variables"].values()), h

assert "precip_mm_day" in c.get("/api/v1/variables").json()

poly = {"type": "Polygon", "coordinates": [[[-10, 36], [3, 36], [3, 44], [-10, 44], [-10, 36]]]}
r = c.post("/api/v1/area/analyze", json={"variable": "t2m_c", "geometry": poly})
assert r.status_code == 200, r.text
d = r.json()
# fields read by web/components/data/InsightPanel.tsx and web/lib/api.ts
for key in ("ok", "label", "units", "dataset", "doi", "caveats", "annual", "trend_line", "robust", "area"):
    assert key in d, key
for key in ("verdict", "period", "mean", "sen_slope_per_year", "sen_change_pct_of_mean", "seasonal_mann_kendall"):
    assert key in d["trend"], key
for key in ("cells", "grid", "source"):
    assert key in d["area"], key

assert c.post("/api/v1/area/analyze", json={"variable": "nope", "point": {"lat": 0, "lng": 0}}).status_code == 404
assert c.post("/api/v1/area/analyze", json={"variable": "t2m_c"}).status_code == 422
assert c.post("/api/v1/area/analyze", json={"variable": "t2m_c", "point": {"lat": 95, "lng": 0}}).status_code == 422
ocean = c.post("/api/v1/area/analyze", json={"variable": "lst_day_c", "point": {"lat": 0, "lng": -140}}).json()
assert ocean["ok"] is False and "land only" in ocean["reason"]

print(f"OK - API contract holds ({d['area']['source']} data, {d['area']['grid']} grid)")
