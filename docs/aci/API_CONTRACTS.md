# Contratos API — ACI v1

## 1. Convenciones

- Prefijo: `/api/v1`.
- JSON para metadatos y resultados tabulares.
- GeoJSON para geometrías vectoriales pequeñas.
- Raster tiles/COG para campos geográficos densos.
- Todas las fechas en ISO 8601 UTC.
- Todas las respuestas indican unidades y fuente.
- Usar paginación para listas.
- Los endpoints de consulta no ejecutan descargas científicas grandes.

## 2. Endpoints propuestos

| Método | Ruta | Función |
|---|---|---|
| GET | `/health` | Salud del servicio |
| GET | `/api/v1/regions` | Máscaras y regiones disponibles |
| GET | `/api/v1/regions/{region_id}` | Metadatos de una región |
| GET | `/api/v1/variables` | Catálogo de variables |
| GET | `/api/v1/sources` | Catálogo de fuentes/productos |
| GET | `/api/v1/series` | Serie temporal agregada |
| GET | `/api/v1/maps/layers` | Catálogo de capas del mapa |
| GET | `/api/v1/maps/tiles/{layer_id}/{z}/{x}/{y}.png` | Tesela raster |
| GET | `/api/v1/trends` | Resultado de tendencia existente |
| POST | `/api/v1/trends/jobs` | Solicitar cálculo de tendencia |
| GET | `/api/v1/trends/jobs/{job_id}` | Estado/resultados del job |
| GET | `/api/v1/events` | Eventos detectados |
| GET | `/api/v1/events/{event_id}` | Detalle y trayectoria |
| GET | `/api/v1/forecasts/runs` | Ciclos de pronóstico disponibles |
| GET | `/api/v1/forecasts/fields` | Campo de un tiempo/horizonte |
| GET | `/api/v1/predictions` | Predicciones ACI disponibles |
| GET | `/api/v1/model-metrics` | Métricas por modelo/horizonte/región |

## 3. Parámetros comunes

### Región
- `geography=basin` para la cuenca hidrográfica.
- `geography=biome_country` para porción de bioma por país.
- `region_id` identifica un sector o país.
- `bbox` opcional para subconsulta, siempre intersectada con la máscara autorizada.

### Variable
Usar códigos normalizados de `PRODUCT_SPEC.md`. La respuesta debe incluir `source_variable` para que el usuario conozca el nombre original.

### Tiempo
- `start`, `end`: ISO 8601 UTC.
- `frequency`: hourly/daily/monthly/annual, según datos disponibles.
- Para pronósticos usar `init_time`, `valid_time`, `lead_hours`, no reinterpretar el tiempo válido como tiempo de descarga.

## 4. Ejemplo de serie

Solicitud:
```http
GET /api/v1/series?variable=tas2m&geography=basin&frequency=monthly&start=2001-01-01T00:00:00Z&end=2020-12-31T23:59:59Z&source=MERRA-2
```

Respuesta ilustrativa:
```json
{
  "variable": "tas2m",
  "units": "K",
  "geography": "basin",
  "source": {
    "name": "MERRA-2",
    "product_id": "M2TMNXSLV",
    "data_kind": "reanalysis",
    "version": "recorded-product-version"
  },
  "frequency": "monthly",
  "coverage": {
    "start": "2001-01-01T00:00:00Z",
    "end": "2020-12-01T00:00:00Z",
    "valid_fraction": 0.99
  },
  "values": [
    {
      "time": "2001-01-01T00:00:00Z",
      "value": 299.1
    }
  ]
}
```
Los números anteriores son ejemplos de formato, no datos observados de la Amazonía.

## 5. Ejemplo de tendencia

```json
{
  "variable": "tas2m",
  "region_id": "amazon_basin",
  "period": ["1991-01-01", "2020-12-31"],
  "method": {
    "trend_test": "seasonal_mann_kendall",
    "slope": "sen",
    "multiple_testing": "benjamini_hochberg",
    "alpha": 0.05
  },
  "result": {
    "direction": "increasing",
    "sen_slope_per_decade": null,
    "p_value": null,
    "q_value": null,
    "confidence_interval": null,
    "valid_observations": null
  },
  "data_kind": "reanalysis",
  "status": "illustrative_schema_only"
}
```

Los campos numéricos quedan null en el esquema de ejemplo; nunca completar con valores inventados.

## 6. Ejemplo de pronóstico

```json
{
  "variable": "msl",
  "units": "Pa",
  "data_kind": "forecast",
  "provider": "NOAA GFS",
  "model": "GFS",
  "cycle_time": "2026-11-14T00:00:00Z",
  "valid_time": "2026-11-15T00:00:00Z",
  "lead_hours": 24,
  "grid_resolution": "0.25 degree",
  "source_status": "example_only"
}
```

## 7. Errores
Usar códigos HTTP estándar y estructura:
```json
{
  "error": {
    "code": "DATA_NOT_AVAILABLE",
    "message": "No hay datos disponibles para la combinación solicitada.",
    "request_id": "..."
  }
}
```

No convertir un fallo de fuente en un mapa vacío indistinguible de una observación sin anomalías.
