"""Engine validation with synthetic series of KNOWN trend (run: python tests/test_trends.py)."""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from science.trends import analyze  # noqa: E402

rng = np.random.default_rng(42)
idx = pd.date_range("2001-01-01", "2024-12-01", freq="MS")
t = np.arange(len(idx)) / 12
season = 3 * np.sin(2 * np.pi * idx.month / 12)


def series(trend):
    noise = np.zeros(len(idx))
    for i in range(1, len(idx)):                       # AR(1) noise, phi=0.4
        noise[i] = 0.4 * noise[i - 1] + rng.normal(0, 0.5)
    return pd.Series(10 + season + trend * t + noise, index=idx, name="synthetic")


r = analyze(series(0.05))
assert r["verdict"] == "significant increasing trend", r["verdict"]
assert abs(r["sen_slope_per_year"] - 0.05) < 0.015, r["sen_slope_per_year"]

r = analyze(series(-0.05))
assert r["verdict"] == "significant decreasing trend", r["verdict"]

false_pos = sum(analyze(series(0.0))["seasonal_mann_kendall"]["p_value"] < 0.05 for _ in range(100))
assert false_pos <= 12, f"too many false positives: {false_pos}/100"
print(f"OK - known trends recovered; false-positive rate on no-trend series: {false_pos}/100")
