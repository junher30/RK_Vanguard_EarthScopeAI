"""
EarthScope AI - Trend detection engine (Module A).

Pure functions, no UI. Input: a monthly series (pandas Series with a monthly
DatetimeIndex). Output: a dict of results that the app, the Evidence Graph and the
AI assistant all read from (single source of truth).

Methods
- Monthly anomalies: value minus the long-term mean of the same calendar month.
- Seasonal Mann-Kendall (Hirsch et al., 1982): non-parametric trend test computed
  per calendar month and summed, so the seasonal cycle cannot create a false trend.
- Seasonal Sen slope: median of within-month pairwise slopes (robust to outliers).
- OLS on anomalies with an AR(1) effective-sample-size correction, because
  monthly climate series are autocorrelated and plain OLS overstates significance.

Only numpy / pandas / scipy are required.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats


# ------------------------------------------------------------------ loading
def load_series(csv_path: str, column: str) -> pd.Series:
    df = pd.read_csv(csv_path)
    s = pd.Series(df[column].values, index=pd.to_datetime(df["month"]), name=column)
    s = s.sort_index()
    s = s[~s.index.duplicated()]
    return s.asfreq("MS")                       # explicit monthly grid; gaps -> NaN


def anomalies(s: pd.Series) -> tuple[pd.Series, pd.Series]:
    clim = s.groupby(s.index.month).mean()
    anom = s - clim.reindex(s.index.month).values
    return anom.rename(f"{s.name}_anomaly"), clim


# ------------------------------------------------------------ Mann-Kendall
def _mk_s_var(x: np.ndarray) -> tuple[float, float]:
    x = x[~np.isnan(x)]
    n = len(x)
    if n < 3:
        return 0.0, 0.0
    diff = np.sign(x[None, :] - x[:, None])
    s = float(np.triu(diff, 1).sum())
    _, counts = np.unique(x, return_counts=True)       # tie correction
    var = (n * (n - 1) * (2 * n + 5) - np.sum(counts * (counts - 1) * (2 * counts + 5))) / 18
    return s, float(var)


def seasonal_mann_kendall(s: pd.Series, correct_dependence: bool = True) -> dict:
    """Seasonal MK. With correct_dependence=True, uses the Hirsch & Slack (1984)
    covariance between months, so autocorrelated data do not inflate significance."""
    S = VAR = 0.0
    for m in range(1, 13):
        sm, vm = _mk_s_var(s[s.index.month == m].values.astype(float))
        S += sm
        VAR += vm
    cov = 0.0
    if correct_dependence:
        table = pd.DataFrame({"y": s.index.year, "m": s.index.month, "v": s.values}) \
                  .pivot(index="y", columns="m", values="v").dropna()
        X = table.values
        n = X.shape[0]
        if n >= 3:
            R = np.apply_along_axis(stats.rankdata, 0, X)
            sg = np.sign(X[None, :, :] - X[:, None, :])          # (i, j, month)
            iu = np.triu_indices(n, 1)
            sg = sg[iu]                                           # (pairs, month)
            for g in range(X.shape[1]):
                for h in range(X.shape[1]):
                    if g == h:
                        continue
                    K = np.sum(sg[:, g] * sg[:, h])
                    cov += (K + 4 * np.sum(R[:, g] * R[:, h]) - n * (n + 1) ** 2) / 3
    VAR_total = VAR + cov
    if VAR_total <= 0:
        VAR_total = VAR
    if VAR_total == 0:
        return {"S": 0.0, "z": 0.0, "p_value": 1.0, "dependence_corrected": correct_dependence}
    z = (S - np.sign(S)) / np.sqrt(VAR_total)
    p = 2 * (1 - stats.norm.cdf(abs(z)))
    return {"S": S, "z": float(z), "p_value": float(p),
            "dependence_corrected": correct_dependence}


def seasonal_sen_slope(s: pd.Series) -> float:
    """Units per year."""
    slopes = []
    for m in range(1, 13):
        sub = s[s.index.month == m].dropna()
        yrs = sub.index.year.values.astype(float)
        v = sub.values
        i, j = np.triu_indices(len(v), 1)
        dy = yrs[j] - yrs[i]
        ok = dy != 0
        slopes.append((v[j] - v[i])[ok] / dy[ok])
    allslopes = np.concatenate(slopes) if slopes else np.array([])
    return float(np.median(allslopes)) if allslopes.size else float("nan")


# ------------------------------------------------- OLS with AR(1) correction
def ols_ar1(anom: pd.Series, alpha: float = 0.05) -> dict:
    a = anom.dropna()
    t = (a.index.year + (a.index.month - 0.5) / 12).values.astype(float)
    y = a.values.astype(float)
    n = len(y)
    res = stats.linregress(t, y)
    resid = y - (res.intercept + res.slope * t)
    r1 = float(np.corrcoef(resid[:-1], resid[1:])[0, 1]) if n > 3 else 0.0
    r1c = max(min(r1, 0.99), 0.0)
    n_eff = n * (1 - r1c) / (1 + r1c)
    se = res.stderr * np.sqrt((n - 2) / max(n_eff - 2, 1))
    dof = max(n_eff - 2, 1)
    tcrit = stats.t.ppf(1 - alpha / 2, dof)
    p = 2 * (1 - stats.t.cdf(abs(res.slope / se), dof))
    return {"slope_per_year": float(res.slope),
            "ci_low": float(res.slope - tcrit * se), "ci_high": float(res.slope + tcrit * se),
            "p_value": float(p), "r_squared": float(res.rvalue ** 2),
            "lag1_autocorr": r1, "n": n, "n_effective": float(n_eff),
            "intercept": float(res.intercept)}


# ------------------------------------------------------------------ public
def analyze(s: pd.Series, alpha: float = 0.05) -> dict:
    """Full trend analysis of one monthly series."""
    s = s.dropna()
    anom, clim = anomalies(s)
    years = (s.index[-1] - s.index[0]).days / 365.25
    mk = seasonal_mann_kendall(s)
    sen = seasonal_sen_slope(s)
    ols = ols_ar1(anom, alpha)
    sig = mk["p_value"] < alpha
    if sig and sen > 0:
        verdict = "significant increasing trend"
    elif sig and sen < 0:
        verdict = "significant decreasing trend"
    else:
        verdict = "no statistically significant trend"
    agree = (mk["p_value"] < alpha) == (ols["p_value"] < alpha)
    return {
        "variable": s.name,
        "period": [s.index[0].strftime("%Y-%m"), s.index[-1].strftime("%Y-%m")],
        "n_months": int(len(s)),
        "mean": float(s.mean()),
        "seasonal_mann_kendall": mk,
        "sen_slope_per_year": sen,
        "sen_change_over_period": sen * years,
        "sen_change_pct_of_mean": 100 * sen * years / s.mean() if s.mean() else float("nan"),
        "ols_anomaly": ols,
        "alpha": alpha,
        "verdict": verdict,
        "methods_agree": bool(agree),
        "climatology": {int(k): float(v) for k, v in clim.items()},
        "anomalies": anom,
    }


def summary_text(r: dict, units: str) -> str:
    mk, o = r["seasonal_mann_kendall"], r["ols_anomaly"]
    return (f"{r['variable']} ({r['period'][0]} to {r['period'][1]}, n={r['n_months']}): "
            f"{r['verdict']} (seasonal Mann-Kendall p={mk['p_value']:.3g}). "
            f"Sen slope {r['sen_slope_per_year']:+.4f} {units}/yr "
            f"({r['sen_change_pct_of_mean']:+.1f}% of mean over the period). "
            f"OLS on anomalies {o['slope_per_year']:+.4f} {units}/yr, "
            f"95% CI [{o['ci_low']:+.4f}, {o['ci_high']:+.4f}], p={o['p_value']:.3g}, "
            f"lag-1 autocorr {o['lag1_autocorr']:.2f} (n_eff={o['n_effective']:.0f}). "
            f"Methods agree: {r['methods_agree']}.")
