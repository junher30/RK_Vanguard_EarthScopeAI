# Contratos API — LACI v1

## 1. Convenciones
Prefijo `/api/v1`; fechas ISO 8601 UTC; JSON para metadatos/resultados; GeoJSON para geometrías pequeñas; COG/tiles para rasters. Toda respuesta incluye unidades, fuente, data_kind y cobertura. Consultas HTTP no ejecutan descargas científicas masivas.

## 2. Endpoints
| Método | Ruta | Función |
|---|---|---|
| GET | /health | Salud |
| GET | /regions | Catálogo continental y jerarquía |
| GET | /regions/{region_id} | Geometría/metadatos de región |
| GET | /regions/{region_id}/availability | Cobertura por variable/fuente/periodo |
| GET | /variables | Catálogo normalizado |
| GET | /sources | Fuentes/productos |
| GET | /series | Series temporales |
| GET | /maps/layers | Capas disponibles |
| GET | /maps/tiles/{layer_id}/{z}/{x}/{y}.png | Tesela |
| GET | /trends | Tendencias |
| POST | /trends/jobs | Crear job |
| GET | /trends/jobs/{job_id} | Estado/resultados |
| GET | /events | Eventos |
| GET | /events/{event_id} | Detalle/trayectoria |
| GET | /forecasts/runs | Ciclos forecast |
| GET | /forecasts/fields | Campo por ciclo/valid time |
| GET | /models | Registro de modelos LACI |
| GET | /models/{model_id}/metrics | Métricas por región/horizonte |
| GET | /predictions | Predicciones publicadas |

## 3. Parámetros comunes
- `region_id`: ID estable del catálogo. Puede referir a país, región analítica, cuenca o bioma.
- `geography_type`: country, administrative, climate_region, basin, biome, grid.
- `variable`: código normalizado; incluir variable original en respuesta.
- `start/end`: ISO 8601 UTC.
- `frequency`: hourly/daily/monthly/annual según fuente.
- Forecast: `model`, `init_time`, `valid_time`, `lead_hours`.
- Respuestas de modelos: `region_id`, `model_version`, `validation_status`.

## 4. Disponibilidad regional
Cada región/variable/fuente/periodo devuelve uno de: available, partial, unavailable, not_validated. La falta de datos no se representa como un mapa vacío de anomalías cero.

## 5. Ejemplo de serie (esquema ilustrativo)
```json
{
  "variable": "tas2m",
  "units": "K",
  "region_id": "amazonia",
  "data_kind": "reanalysis",
  "source": {"name": "MERRA-2", "product_id": "recorded-product"},
  "coverage": {"valid_fraction": null},
  "values": [],
  "status": "illustrative_schema_only"
}
```
No incluir valores observados inventados.

## 6. Ejemplo de predicción regional (esquema)
```json
{
  "model_id": "regional-model-id",
  "region_id": "region-id",
  "model_version": "version",
  "variable": "msl",
  "units": "Pa",
  "init_time": "2026-01-01T00:00:00Z",
  "valid_time": "2026-01-02T00:00:00Z",
  "lead_hours": 24,
  "validation_status": "experimental",
  "metrics_ref": null,
  "uncertainty": null,
  "data_kind": "laci_prediction"
}
```
Ejemplo de contrato, no resultado real. El modelo solo se publica si hay artefacto y métricas trazables.

## 7. Errores
Estructura estándar `error.code/message/request_id`. Distinguir DATA_NOT_AVAILABLE, REGION_NOT_SUPPORTED, MODEL_NOT_VALIDATED y SOURCE_UNAVAILABLE. Nunca convertir un fallo de fuente en cero o anomalía ausente.
