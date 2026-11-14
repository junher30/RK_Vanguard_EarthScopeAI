# Decisiones de arquitectura (ADR) — LACI

## ADR-001 — Evolucionar el repositorio existente
**Estado:** aceptada. Mantener y auditar el prototipo EarthScope AI/Streamlit antes de migración. No borrar ni reemplazar durante la transición.

## ADR-002 — Monorepo modular
**Estado:** aceptada. Una API, web y paquete científico compartido. No microservicios prematuros.

## ADR-003 — Python para núcleo científico
**Estado:** aceptada. Xarray/Dask/NumPy/SciPy/GeoPandas y librerías estadísticas/ML.

## ADR-004 — React + MapLibre
**Estado:** aceptada. Streamlit permanece como prototipo hasta paridad validada.

## ADR-005 — PostgreSQL/PostGIS + Zarr/NetCDF
**Estado:** aceptada. DB para catálogos, geometrías, metadatos, jobs y resultados resumidos; cubos científicos en object storage/archivos.

## ADR-006 — Cobertura de producto latinoamericana y caribeña
**Estado:** aceptada por decisión del usuario. LACI se diseña para América Latina y el Caribe. El catálogo y API son continentales; ingesta, validación y disponibilidad real se incorporan progresivamente. No afirmar cobertura de datos/modelos completa por el mero hecho de que exista un catálogo.

## ADR-007 — Modelos regionales especializados
**Estado:** aceptada por decisión del usuario. Cada modelo se asocia a un dominio regional, dataset, targets, horizontes y métricas. Compartir código y pipelines no equivale a compartir pesos ni generalización. Transfer learning se considera experimento y requiere validación específica. Una región sin evidencia suficiente no tiene predicción LACI publicada.

## ADR-008 — Prioridad científica equilibrada
**Estado:** aceptada por decisión del usuario. Temperatura/calor y presión/circulación tienen prioridad equivalente en producto, arquitectura y roadmap. Mantener variables distintas y trazables.

## ADR-009 — Reanálisis no es pronóstico
**Estado:** aceptada. MERRA-2/ERA5 reconstruyen histórico; GFS es baseline de pronóstico. Modelo propio requiere hindcasts compatibles y evaluación temporal/espacial independiente.

## ADR-010 — PS y MSLP separadas
**Estado:** aceptada. Presión superficial y presión reducida al nivel del mar no son intercambiables; especial cuidado en Andes/altas elevaciones.

## ADR-011 — Resolución nativa preservada
**Estado:** aceptada. Regrillar solo para comparación, con método documentado; no implica nueva información.

## ADR-012 — LACI no es un servicio oficial de alertas
**Estado:** aceptada. Resultados científicos y experimentales, sin sustituir servicios meteorológicos nacionales.

## ADR-013 — Regiones analíticas no son divisiones administrativas
**Estado:** aceptada. Regiones climáticas pueden solaparse y deben tener geometría, fuente, versión y justificación propias.
