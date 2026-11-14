# Decisiones de arquitectura (ADR)

Este documento registra decisiones y razones. Cambiar una decisión requiere actualizar este archivo y explicar impacto/migración.

## ADR-001 — Evolucionar el repositorio existente
**Estado:** aceptada.

El repositorio contiene un prototipo EarthScope AI con ingestión NASA, análisis estadístico y visualizaciones. Se aprovechará el trabajo validado, pero no se asume que su región o diseño actual cubren el alcance final. No borrar ni reemplazar el prototipo durante la migración.

## ADR-002 — Monorepo modular antes que microservicios
**Estado:** aceptada.

Una API, una aplicación web y un paquete científico compartido permiten separación sin complejidad de red y despliegue. No introducir Kafka/Kubernetes/servicios independientes hasta que exista una necesidad medida.

## ADR-003 — Python para el núcleo científico
**Estado:** aceptada.

Xarray, Dask, NumPy, SciPy, GeoPandas y scikit-learn cubren la manipulación de cubos, GIS y análisis. FastAPI expone los resultados a la UI.

## ADR-004 — React + MapLibre para el frontend objetivo
**Estado:** aceptada.

React ofrece componentes y estado; MapLibre presenta mapas vectoriales/raster sin acoplar el producto a un servicio cartográfico comercial. Streamlit se conserva como prototipo mientras se construye la nueva interfaz.

## ADR-005 — PostgreSQL/PostGIS para metadatos y geometrías; Zarr/NetCDF para cubos
**Estado:** aceptada.

Los arrays climáticos son multidimensionales y no deben descomponerse en millones de filas SQL. La DB guarda catálogos, geometrías, jobs, resúmenes, resultados y referencias a archivos.

## ADR-006 — Dos delimitaciones geográficas
**Estado:** aceptada.

Cuenca hidrográfica y bioma amazónico no son el mismo objeto. Se usan máscaras distintas y se generan intersecciones por país. No se utiliza una caja rectangular como límite científico.

## ADR-007 — Reanálisis no es pronóstico
**Estado:** aceptada.

MERRA-2 y ERA5 se usan para reconstrucción histórica y tendencias. GFS es el baseline de pronóstico futuro. Un modelo ACI propio requiere entrenamiento con datos compatibles y validación temporal; no se puede inferir que un buen ajuste sobre reanálisis implica habilidad de pronóstico.

## ADR-008 — Presión superficial y presión a nivel del mar separadas
**Estado:** aceptada.

Se conservan como variables distintas, con metadatos/unidades propias. La reducción de presión a nivel del mar puede ser problemática en elevaciones altas y no sustituye a la presión superficial.

## ADR-009 — Resolución nativa preservada
**Estado:** aceptada.

Los datos se almacenan a su resolución de origen. Regrillar es una operación documentada para comparación y no añade información. La resolución de salida nunca debe insinuar mayor detalle del que la fuente contiene.

## ADR-010 — ACI no es un servicio oficial de alertas
**Estado:** aceptada.

ACI presenta resultados de investigación y estimaciones experimentales. No se presenta como autoridad meteorológica ni como alerta oficial para comunidades.
