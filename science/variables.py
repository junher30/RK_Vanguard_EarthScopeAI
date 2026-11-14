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
