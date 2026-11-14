"""Validate the What-If model on synthetic data with a KNOWN response (python tests/test_whatif.py)."""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from science.whatif import fit, seasonal_table, simulate  # noqa: E402

rng = np.random.default_rng(0)
idx = pd.date_range("2001-01-01", "2024-12-01", freq="MS")
yr_factor = pd.Series(rng.normal(0, 0.15, 24), index=range(2001, 2025))
precip = pd.Series(5 * (1 + yr_factor.reindex(idx.year).values), index=idx)
true_b = -2.0                                            # deg C per unit relative anomaly
lst = pd.Series(28 + true_b * yr_factor.reindex(idx.year).values
                + rng.normal(0, 0.1, len(idx)), index=idx)

m = fit(seasonal_table(precip, lst))
assert m["b_ci95"][0] < true_b < m["b_ci95"][1], m["b_ci95"]
s = simulate(m, -20)
assert abs(s["delta_vs_baseline"] - (-0.2 * true_b)) < 0.15, s
assert s["prediction_interval95"][0] < s["lst_estimate"] < s["prediction_interval95"][1]
assert simulate(m, -90)["extrapolation"] and not simulate(m, 0)["extrapolation"]
print(f"OK - true slope {true_b} recovered as {m['b']:.2f} (CI {m['b_ci95'][0]:.2f}..{m['b_ci95'][1]:.2f});"
      f" LOYO R2 {m['loyo_r2']:.2f}; extrapolation flag works")
