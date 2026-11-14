# Roadmap de implementación — LACI

## Principio
La arquitectura, catálogo y contratos son continentales; la implementación científica y los modelos avanzan por regiones según datos, calidad y capacidad de validación. Una fase por PR. No descargar el histórico continental al inicio. La secuencia es por entregables, no fechas arbitrarias.

## Fase 0 — Auditoría y protección
Inventariar repositorio, Streamlit, pipelines NASA, análisis, tests, datos y dependencias. Probar comandos existentes. Documentar qué se reutiliza/adapta/queda legacy y compatibilidad real. Mantener el prototipo. **Entregable:** `REPOSITORY_AUDIT.md`; no refactor masivo.

## Fase 1 — Fundaciones reproducibles
Configurar Python/uv, lockfile, calidad, tests, CI, Docker Compose y PostGIS. No reescribir la app. **Entregable:** entorno limpio reproducible.

## Fase 2 — Catálogo geográfico continental
Seleccionar límites administrativos y territoriales, construir catálogo de países/territorios, jerarquía y regiones analíticas candidatas. Mantener cuencas/biomas como entidades separadas. Validar CRS, licencias, topología, cobertura y IDs estables. No fijar límites regionales sin fuente. **Entregable:** catálogo continental y endpoint de disponibilidad, aunque la mayoría de regiones aún no tenga datos.

## Fase 3 — Data Core y piloto histórico
Validar ERA5 y MERRA-2 con un subconjunto temporal y pocas variables; documentar resolución, unidades y cobertura. Implementar adaptadores idempotentes, QA, Zarr/NetCDF y metadatos. Empezar con Amazonia como piloto recomendado; no limitar el diseño a Amazonia. **Entregable:** ingesta reproducible de temperatura y presión y reporte QA.

## Fase 4 — Ciencia común
Implementar climatologías, anomalías, tendencias, Mann-Kendall, Sen, autocorrelación y FDR. Probar en el piloto y luego ejecutar por regiones disponibles. **Entregable:** resultados reproducibles por región/celda con cobertura.

## Fase 5 — Eventos de calor y presión
Implementar tasmax2m/ola de calor con definición local; anomalías PS/MSL separadas, gradientes, dP/dt y seguimiento. Sensibilidad de umbrales por región. **Entregable:** eventos históricos trazables.

## Fase 6 — Forecast Core
Integrar NOAA GFS como baseline externo. Procesar inicialmente 24/48/72 h si los productos están disponibles; registrar ciclo, lead, valid_time, resolución y procedencia. Evaluar cobertura regional y coste. **Entregable:** campos reales consultables; indisponibilidad explícita.

## Fase 7 — Modelos regionales LACI
No asumir un modelo continental. Seleccionar una región candidata solo si hay hindcasts/datos compatibles. Definir targets, baselines, rolling-origin, holdout espacial, métricas e incertidumbre. Crear un modelo independiente por región; comparar cualquier transferencia/compartición como experimento. Si no hay habilidad, publicar informe negativo y mantener GFS. **Entregable:** primer modelo regional validado o evidencia de que aún no debe publicarse.

## Fase 8 — API, web y expansión regional
API continental para regiones, disponibilidad, tendencias, eventos, forecasts y registro de modelos. React/MapLibre/Plotly. Expandir ingesta/QA por región priorizada; cada expansión debe aportar geometría, fuentes, cobertura, tests y criterios de aceptación. Mantener Streamlit hasta paridad funcional demostrada. **Entregable:** dashboard que comunica cobertura y madurez de cada región.

## Fase 9 — Endurecimiento y release
Tests integrados/E2E, seguridad, versionado de datos/modelos, rendimiento y costes por región, documentación y demo. No presentar cobertura continental completa si solo se procesaron regiones piloto.

## Orden regional sugerido (sujeto a datos)
1. Amazonia (piloto científico).
2. Andes (dominio de elevación y presión requiere especial cuidado).
3. Caribe y Centroamérica.
4. México.
5. Cono Sur y resto de Sudamérica.
6. Completar vacíos del Caribe y territorios insulares según datos disponibles.
El orden puede cambiar por disponibilidad de fuentes, valor científico y validación.

## Primer sprint
1. Completar auditoría.
2. Verificar compatibilidad real de stack.
3. Proponer catálogo geográfico continental y fuentes/licencias.
4. Probar un subconjunto de ERA5/MERRA-2 en una sola región.
5. Entregar reporte QA antes de producir mapas o entrenar modelos.
