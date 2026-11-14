"""Catalog of variables: where each lives, units, NASA source and scientific caveats.
The app, the Evidence Graph and the assistant all read from here."""

VARIABLES = {
    "precip_mm_day": {
        "label": "Precipitation", "units": "mm/day", "file": "precipitation",
        "dataset": "GPM IMERG Final Monthly V07 (GPM_3IMERGM)",
        "doi": "https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07",
        "caveats": [
            "Satellite-gauge estimate, not a rain-gauge measurement.",
            "The changing GPM satellite constellation over time may introduce artifacts in multi-year trends.",
        ],
    },
    "evi": {
        "label": "Vegetation (EVI)", "units": "index", "file": "vegetation",
        "dataset": "MODIS/Terra Vegetation Indices Monthly 0.05deg CMG v6.1 (MOD13C2)",
        "doi": "https://doi.org/10.5067/MODIS/MOD13C2.061",
        "caveats": [
            "EVI measures canopy greenness, not forest area; it is not a direct deforestation measure.",
            "Persistent cloud cover in the wet season reduces valid observations.",
        ],
    },
    "ndvi": {
        "label": "Vegetation (NDVI)", "units": "index", "file": "vegetation",
        "dataset": "MODIS/Terra Vegetation Indices Monthly 0.05deg CMG v6.1 (MOD13C2)",
        "doi": "https://doi.org/10.5067/MODIS/MOD13C2.061",
        "caveats": [
            "NDVI saturates over dense tropical forest; EVI is preferred for the Amazon.",
            "NDVI is not a direct deforestation measure.",
        ],
    },
    "lst_day_c": {
        "label": "Land surface temperature (day)", "units": "°C", "file": "lst",
        "dataset": "MODIS/Terra Land Surface Temperature Monthly 0.05deg CMG v6.1 (MOD11C3)",
        "doi": "https://doi.org/10.5067/MODIS/MOD11C3.061",
        "caveats": [
            "Land SURFACE (skin) temperature, not air temperature.",
            "Only clear-sky pixels are retrieved, so cloudy months are biased toward dry conditions.",
        ],
    },
}

REGIONS = {
    "amazon_core": {"label": "Central Amazon (10°S–2°N, 70°W–50°W)",
                    "lat_min": -10.0, "lat_max": 2.0, "lon_min": -70.0, "lon_max": -50.0},
}

# Global 0.5° grids (pipeline/fetch_global.py → data/global/<product>/<YYYY-MM>.npz).
# Used by the area analysis (science/area.py), the API and the global web export.
GLOBAL_VARIABLES = {
    "precip_mm_day": {
        "product": "precipitation", "label": "Precipitation", "short": "Precipitation", "units": "mm/day",
        "decimals": 2, "kind": "satellite", "land_only": False,
        "dataset": "GPM IMERG Final Monthly V07 (GPM_3IMERGM)", "doi": "https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07",
        "caveats": ["Satellite-gauge estimate; less reliable at high latitudes and over snow and ice.",
                    "Changes in the GPM satellite constellation may introduce artifacts in long trends."],
    },
    "evi": {
        "product": "vegetation", "label": "Vegetation (EVI)", "short": "Vegetation", "units": "index",
        "decimals": 3, "kind": "satellite", "land_only": True,
        "dataset": "MODIS/Terra Vegetation Indices Monthly 0.05deg CMG v6.1 (MOD13C2)",
        "doi": "https://doi.org/10.5067/MODIS/MOD13C2.061",
        "caveats": ["EVI measures canopy greenness, not forest area.",
                    "Land only. Snow, polar night and persistent clouds leave gaps."],
    },
    "lst_day_c": {
        "product": "lst", "label": "Land surface temperature (day)", "short": "Surface temp.", "units": "°C",
        "decimals": 2, "kind": "satellite", "land_only": True,
        "dataset": "MODIS/Terra Land Surface Temperature Monthly 0.05deg CMG v6.1 (MOD11C3)",
        "doi": "https://doi.org/10.5067/MODIS/MOD11C3.061",
        "caveats": ["Land SURFACE (skin) temperature under clear sky, not air temperature.",
                    "Land only. Cloudy months are missing or biased toward dry conditions."],
    },
    "t2m_c": {
        "product": "atmosphere", "label": "Air temperature (2 m)", "short": "Air temp.", "units": "°C",
        "decimals": 2, "kind": "reanalysis", "land_only": False,
        "dataset": "MERRA-2 tavgM_2d_slv_Nx (M2TMNXSLV) v5.12.4", "doi": "https://doi.org/10.5067/AP1B0BA5PD2K",
        "caveats": ["MERRA-2 is a REANALYSIS: a weather model constrained by observations, not a direct measurement.",
                    "Native grid 0.5° x 0.625°, interpolated to 0.5°."],
    },
    "rh2m_pct": {
        "product": "atmosphere", "label": "Relative humidity (2 m)", "short": "Humidity", "units": "%",
        "decimals": 1, "kind": "reanalysis", "land_only": False,
        "dataset": "MERRA-2 tavgM_2d_slv_Nx (M2TMNXSLV) v5.12.4", "doi": "https://doi.org/10.5067/AP1B0BA5PD2K",
        "caveats": ["Derived from MERRA-2 specific humidity, air temperature and pressure (Magnus formula).",
                    "MERRA-2 is a REANALYSIS, not a direct measurement."],
    },
}
