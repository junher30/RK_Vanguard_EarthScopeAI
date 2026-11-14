"""
EarthScope AI — Planetary Investigation Lab
Module A: Earth Trend Detector (NASA Space Apps 2026 · Earth System Trend Detective)

Run:  streamlit run app/streamlit_app.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from science.trends import analyze, load_series, summary_text  # noqa: E402
from science.variables import REGIONS, VARIABLES  # noqa: E402

DATA = ROOT / "data" / "processed"
CYAN, GREEN, BLUE, RED, GREY = "#22d3ee", "#34d399", "#3b82f6", "#f87171", "#94a3b8"

st.set_page_config(page_title="EarthScope AI", page_icon="🌎", layout="wide")
st.markdown("""
<style>
.block-container {padding-top: 1.5rem;}
.hero h1 {font-size: 2.1rem; margin-bottom: 0;}
.hero p {color: #94a3b8; margin-top: .2rem;}
.step {color:#22d3ee; font-weight:600; font-size:.8rem; letter-spacing:.08em; text-transform:uppercase;}
.verdict {padding: .9rem 1.1rem; border-radius: 10px; border: 1px solid #1e3a5f; background:#0b1a2e;}
</style>""", unsafe_allow_html=True)

st.markdown('<div class="hero"><h1>EarthScope AI</h1>'
            '<p>Planetary Investigation Lab · Detect → Simulate → Investigate · '
            'NASA Space Apps 2026 — Earth System Trend Detective</p></div>', unsafe_allow_html=True)


# ------------------------------------------------------------- data access
def available_variables(region: str) -> dict:
    out = {}
    for key, meta in VARIABLES.items():
        f = DATA / f"{region}_{meta['file']}.csv"
        if f.exists() and key in pd.read_csv(f, nrows=1).columns:
            out[key] = f
    return out


@st.cache_data
def get_series(path: str, column: str) -> pd.Series:
    return load_series(path, column)


# ---------------------------------------------------------- sidebar: steps
with st.sidebar:
    st.markdown('<div class="step">Step 1 · Variable</div>', unsafe_allow_html=True)
    region = "amazon_core"
    avail = available_variables(region)
    if not avail:
        st.error("No processed data found. Run pipeline/fetch_nasa.py first.")
        st.stop()
    var = st.selectbox("Data variable", list(avail),
                       format_func=lambda k: f"{VARIABLES[k]['label']} ({VARIABLES[k]['units']})")

    st.markdown('<div class="step">Step 2 · Region</div>', unsafe_allow_html=True)
    region = st.selectbox("Region", list(REGIONS), format_func=lambda k: REGIONS[k]["label"])

    s_full = get_series(str(avail[var]), var)
    y0, y1 = int(s_full.index.year.min()), int(s_full.index.year.max())
    st.markdown('<div class="step">Step 3 · Time period</div>', unsafe_allow_html=True)
    start, end = st.slider("Years", y0, y1, (y0, y1))
    alpha = st.select_slider("Significance level (α)", [0.01, 0.05, 0.10], value=0.05)

    st.divider()
    st.caption(f"Source: {VARIABLES[var]['dataset']}")

meta = VARIABLES[var]
units = meta["units"]
s = s_full[str(start):str(end)]
if s.dropna().size < 36:
    st.warning("Select at least 3 years for a meaningful trend test.")
    st.stop()
r = analyze(s, alpha)
mk, ols = r["seasonal_mann_kendall"], r["ols_anomaly"]

# ------------------------------------------------------------ region map
c_map, c_info = st.columns([1, 2])
with c_map:
    reg = REGIONS[region]
    lats = [reg["lat_min"], reg["lat_min"], reg["lat_max"], reg["lat_max"], reg["lat_min"]]
    lons = [reg["lon_min"], reg["lon_max"], reg["lon_max"], reg["lon_min"], reg["lon_min"]]
    fm = go.Figure(go.Scattergeo(lat=lats, lon=lons, mode="lines", fill="toself",
                                 line=dict(color=CYAN, width=2), fillcolor="rgba(34,211,238,.25)"))
    fm.update_geos(projection_type="orthographic", projection_rotation=dict(lon=-60, lat=-5),
                   showocean=True, oceancolor="#0b1a2e", showland=True, landcolor="#1f2937",
                   showcountries=True, countrycolor="#374151", bgcolor="rgba(0,0,0,0)")
    fm.update_layout(height=260, margin=dict(l=0, r=0, t=0, b=0), paper_bgcolor="rgba(0,0,0,0)")
    st.plotly_chart(fm, use_container_width=True)
with c_info:
    st.markdown('<div class="step">Step 5 · Is the trend significant?</div>', unsafe_allow_html=True)
    color = RED if "decreasing" in r["verdict"] else GREEN if "increasing" in r["verdict"] else GREY
    st.markdown(f'<div class="verdict"><span style="color:{color};font-size:1.25rem;font-weight:700">'
                f'{r["verdict"].capitalize()}</span><br>'
                f'<span style="color:#94a3b8">{meta["label"]} · {region and REGIONS[region]["label"]} · '
                f'{r["period"][0]} → {r["period"][1]} · α = {alpha}</span></div>', unsafe_allow_html=True)
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Sen slope", f"{r['sen_slope_per_year']:+.4f}", f"{units}/yr", delta_color="off")
    m2.metric("Change over period", f"{r['sen_change_pct_of_mean']:+.1f}%", "of mean", delta_color="off")
    m3.metric("Mann-Kendall p", f"{mk['p_value']:.3f}")
    m4.metric("95% CI (OLS)", f"[{ols['ci_low']:+.3f}, {ols['ci_high']:+.3f}]")

# ------------------------------------------------------- step 4: series
st.markdown('<div class="step">Step 4 · Time series — does it appear to have a trend?</div>',
            unsafe_allow_html=True)
tab1, tab2, tab3 = st.tabs(["Monthly series", "Anomalies & trend", "Annual means"])
x_dec = s.index
with tab1:
    f1 = go.Figure()
    f1.add_scatter(x=x_dec, y=s, name="Monthly", line=dict(color=BLUE, width=1))
    f1.add_scatter(x=x_dec, y=s.rolling(12, center=True).mean(), name="12-month mean",
                   line=dict(color=CYAN, width=3))
    f1.update_layout(template="plotly_dark", height=380, yaxis_title=units,
                     legend=dict(orientation="h", y=1.1), margin=dict(t=30))
    st.plotly_chart(f1, use_container_width=True)
with tab2:
    an = r["anomalies"]
    t = an.index.year + (an.index.month - 0.5) / 12
    fit = ols["intercept"] + ols["slope_per_year"] * t
    f2 = go.Figure()
    f2.add_bar(x=an.index, y=an, name="Anomaly",
               marker_color=np.where(an >= 0, GREEN, RED), opacity=.7)
    f2.add_scatter(x=an.index, y=fit, name="Linear trend (OLS)", line=dict(color=CYAN, width=3))
    f2.update_layout(template="plotly_dark", height=380, yaxis_title=f"anomaly ({units})",
                     legend=dict(orientation="h", y=1.1), margin=dict(t=30))
    st.plotly_chart(f2, use_container_width=True)
    st.caption("Anomaly = value minus the 2001–2024 mean of the same calendar month "
               "(removes the seasonal cycle).")
with tab3:
    ann = s.groupby(s.index.year).mean()
    f3 = go.Figure(go.Bar(x=ann.index, y=ann, marker_color=CYAN))
    f3.update_layout(template="plotly_dark", height=380, yaxis_title=units, margin=dict(t=30))
    st.plotly_chart(f3, use_container_width=True)

# --------------------------------------------------- robustness / evidence
st.markdown('<div class="step">Robustness check</div>', unsafe_allow_html=True)
rows = []
for label, sub in [("Full selected period", s),
                   ("Excluding last 2 years", s[: str(end - 2)]),
                   ("Excluding first 2 years", s[str(start + 2):])]:
    if sub.dropna().size >= 36:
        rr = analyze(sub, alpha)
        rows.append({"Test": label, "Period": f"{rr['period'][0]} → {rr['period'][1]}",
                     "Verdict": rr["verdict"],
                     "MK p-value": round(rr["seasonal_mann_kendall"]["p_value"], 4),
                     f"Sen slope ({units}/yr)": round(rr["sen_slope_per_year"], 5)})
rob = pd.DataFrame(rows)
st.dataframe(rob, hide_index=True, use_container_width=True)
if rob["Verdict"].nunique() > 1:
    st.warning("The conclusion changes when the edges of the period are removed: the result is "
               "sensitive to a few years (e.g. extreme events) and should be reported with caution.")
else:
    st.success("The conclusion is stable when the edges of the period are removed.")

# ------------------------------------------------------- method & limits
c1, c2 = st.columns(2)
with c1:
    with st.expander("Method", expanded=False):
        st.markdown(f"""
- **Seasonal Mann-Kendall** (Hirsch et al. 1982) with Hirsch–Slack (1984) dependence correction.
- **Seasonal Sen slope**: median of within-month pairwise slopes.
- **OLS on anomalies** with AR(1) effective sample size (lag-1 r = {ols['lag1_autocorr']:.2f},
  n = {ols['n']}, n_eff = {ols['n_effective']:.0f}).
- Methods agree: **{r['methods_agree']}**.
- Engine validated on synthetic series with known trend (`tests/test_trends.py`).
""")
with c2:
    with st.expander("Limitations & data source", expanded=False):
        for c in meta["caveats"]:
            st.markdown(f"- {c}")
        st.markdown("- Trend ≠ cause: this test detects change, it does not explain it.")
        st.markdown(f"- Regional mean over a fixed box (cos-latitude weighted).\n\n"
                    f"**Dataset:** {meta['dataset']} — [{meta['doi']}]({meta['doi']})")

report = {k: v for k, v in r.items() if k != "anomalies"}
report.update({"region": REGIONS[region], "dataset": meta["dataset"], "doi": meta["doi"],
               "summary": summary_text(r, units), "robustness": rows})
st.download_button("Download reproducible result (JSON)", json.dumps(report, indent=2, default=str),
                   file_name=f"earthscope_{var}_{start}_{end}.json", mime="application/json")
