"""
EarthScope AI - What-If Earth Lab model (Module B).

Question it answers
    "If dry-season precipitation changed by X %, what land-surface temperature (LST)
     would the statistical model estimate, and how uncertain is that estimate?"

Why this relationship (and not vegetation)
    Tested on the 2001-2024 NASA data for the central Amazon box:
      - dry-season LST ~ precipitation : leave-one-year-out R^2 = 0.49  -> usable
      - EVI ~ precipitation (+LST)     : leave-one-year-out R^2 <= 0.1  -> no skill
    Only relationships that pass out-of-sample validation are offered as scenarios.

Model
    Unit = one year. For each year, average the selected months (default Jul-Oct,
    the dry season) of:  LST (deg C)  and  precipitation relative anomaly
    r = P_year / P_mean - 1.
    Fit  LST = a + b * r  by ordinary least squares.
    Scenario: r = pct/100  ->  LST estimate with 95 % prediction interval.

What it is NOT
    - Not a climate forecast: no greenhouse forcing, no land-use change, no feedbacks.
    - Not causal proof: it is an observed statistical association (the physical
      mechanism, less cloud and less evaporative cooling, is a hypothesis).
    - Outside the observed range of r the estimate is an extrapolation and flagged.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

DRY_SEASON = (7, 8, 9, 10)


def seasonal_table(precip: pd.Series, lst: pd.Series, months=DRY_SEASON) -> pd.DataFrame:
    def agg(s):
        s = s[s.index.month.isin(months)]
        g = s.groupby(s.index.year)
        return g.mean().where(g.count() == len(months))      # only complete seasons
    df = pd.DataFrame({"precip": agg(precip), "lst": agg(lst)}).dropna()
    df["r"] = df["precip"] / df["precip"].mean() - 1
    return df


def _ols(x: np.ndarray, y: np.ndarray) -> dict:
    n = len(x)
    X = np.column_stack([np.ones(n), x])
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ beta
    s2 = resid @ resid / (n - 2)
    XtX_inv = np.linalg.inv(X.T @ X)
    return {"a": beta[0], "b": beta[1], "s2": s2, "XtX_inv": XtX_inv, "n": n}


def fit(df: pd.DataFrame) -> dict:
    x, y = df["r"].values, df["lst"].values
    m = _ols(x, y)
    se_b = np.sqrt(m["s2"] * m["XtX_inv"][1, 1])
    tcrit = stats.t.ppf(0.975, m["n"] - 2)
    # leave-one-year-out validation
    preds = np.empty(len(x))
    for i in range(len(x)):
        k = np.arange(len(x)) != i
        mi = _ols(x[k], y[k])
        preds[i] = mi["a"] + mi["b"] * x[i]
    resid = y - preds
    loyo_r2 = 1 - np.sum(resid ** 2) / np.sum((y - y.mean()) ** 2)
    r_corr, p_corr = stats.pearsonr(x, y)
    return {
        "a": float(m["a"]), "b": float(m["b"]),
        "b_ci95": [float(m["b"] - tcrit * se_b), float(m["b"] + tcrit * se_b)],
        "s2": float(m["s2"]), "XtX_inv": m["XtX_inv"], "n_years": int(m["n"]),
        "years": [int(df.index.min()), int(df.index.max())],
        "pearson_r": float(r_corr), "pearson_p": float(p_corr),
        "loyo_r2": float(loyo_r2), "loyo_rmse": float(np.sqrt(np.mean(resid ** 2))),
        "r_range": [float(x.min()), float(x.max())],
        "baseline_lst": float(y.mean()), "baseline_precip": float(df["precip"].mean()),
        "loyo_predictions": preds.tolist(),
    }


def simulate(model: dict, pct_change: float) -> dict:
    """Scenario: dry-season precipitation changes by pct_change % vs the 2001-2024 mean."""
    r = pct_change / 100.0
    x0 = np.array([1.0, r])
    est = model["a"] + model["b"] * r
    se_pred = np.sqrt(model["s2"] * (1 + x0 @ model["XtX_inv"] @ x0))
    se_mean = np.sqrt(model["s2"] * (x0 @ model["XtX_inv"] @ x0))
    tcrit = stats.t.ppf(0.975, model["n_years"] - 2)
    lo, hi = model["r_range"]
    return {
        "pct_change": pct_change,
        "precip_mm_day": model["baseline_precip"] * (1 + r),
        "lst_estimate": float(est),
        "delta_vs_baseline": float(est - model["baseline_lst"]),
        "mean_ci95": [float(est - tcrit * se_mean), float(est + tcrit * se_mean)],
        "prediction_interval95": [float(est - tcrit * se_pred), float(est + tcrit * se_pred)],
        "extrapolation": bool(r < lo or r > hi),
        "observed_range_pct": [round(100 * lo, 1), round(100 * hi, 1)],
        "label": "SIMULATION - statistical scenario, not an observation or a forecast",
    }


ASSUMPTIONS = [
    "Relationship estimated from 2001-2024 dry seasons (Jul-Oct) in the central Amazon box.",
    "Linear response; other drivers (ENSO, fires, land-use change, aerosols) are not modelled.",
    "Precipitation change applies uniformly to the whole region and season.",
    "LST is land SURFACE temperature (MODIS clear-sky), not air temperature.",
    "Association, not demonstrated causation.",
]
