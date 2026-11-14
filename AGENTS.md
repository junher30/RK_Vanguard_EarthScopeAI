# Instrucciones para agentes de código (Codex)

## Objetivo
Construir **Amazon Climate Intelligence (ACI)** de forma incremental sobre este repositorio. Antes de implementar código, leer todos los documentos de `docs/aci/`, especialmente `PRODUCT_SPEC.md`, `TECH_STACK.md`, `ARCHITECTURE.md`, `DATA_SOURCES.md` y `SCIENCE_AND_ML.md`.

## Regla principal: proteger el trabajo existente
Este repositorio ya contiene un prototipo EarthScope AI/Streamlit, pipelines NASA, análisis de tendencias y experimentos What-If. No borrar, reemplazar ni mover esos componentes en bloque. La primera tarea de Codex es auditar su estructura, dependencias, comportamiento y pruebas. La migración debe ser incremental y conservar la aplicación existente mientras la nueva interfaz y API alcanzan paridad.

## Reglas de ingeniería
1. Implementar una fase o issue por vez. No intentar construir todo ACI en un único cambio.
2. Antes de editar, inspeccionar los archivos y pruebas existentes. Reutilizar lógica validada cuando sea apropiado, pero verificar supuestos y unidades.
3. Mantener módulos pequeños, tipados, documentados y con responsabilidades claras.
4. No inventar datos meteorológicos, resultados estadísticos, predicciones, polígonos ni métricas. Los datos sintéticos solo se permiten en tests y demostraciones claramente rotuladas como sintéticas.
5. Distinguir siempre observación, reanálisis, pronóstico numérico, predicción del modelo ACI y escenario hipotético.
6. No llamar "pronóstico" a una extrapolación estadística de tendencias históricas.
7. No interpretar correlación como causalidad ni presentar ACI como un sistema oficial de alertas.
8. Conservar metadatos: fuente, producto, versión, unidad, resolución, fecha de descarga, periodo, método de procesamiento y checksum cuando esté disponible.
9. No mezclar temperatura del aire a 2 m con temperatura superficial terrestre (LST).
10. No mezclar presión superficial (PS) con presión reducida al nivel del mar (MSL/SLP). Mantenerlas como variables separadas.
11. No convertir una grilla gruesa de MERRA-2 en una grilla visualmente más fina y presentar esa interpolación como nueva información. Regrillar solo para comparación y documentar el método.
12. No subir credenciales, tokens, archivos `.netrc`, datos crudos, archivos NetCDF/Zarr/GRIB, modelos entrenados grandes ni secretos al repositorio.
13. Leer configuración y credenciales desde variables de entorno. Proporcionar `.env.example` sin valores reales.
14. Fijar dependencias mediante `uv.lock` y `package-lock.json`; no usar instalaciones sin versión ni actualizaciones automáticas silenciosas.
15. Cada cálculo científico debe tener pruebas unitarias con datos sintéticos conocidos y casos límite.
16. Las validaciones temporales deben impedir fuga de información futura. No usar split aleatorio para evaluar pronósticos.
17. Las consultas y respuestas de API deben tener esquemas Pydantic y documentación OpenAPI.
18. Todo endpoint geográfico debe informar CRS y unidades cuando aplique.
19. Mantener los documentos y mensajes de la interfaz en español inicialmente; identificadores, módulos y código en inglés.
20. Si una fuente de datos, licencia, variable o versión no puede verificarse, registrarlo como pendiente y no adivinar.

## Stack de referencia
- Python 3.13.x; gestor `uv`.
- API: FastAPI, Pydantic v2, SQLAlchemy 2.0.x, Alembic, GeoAlchemy2.
- Datos científicos: Xarray, Dask, Zarr v3, NetCDF4/h5netcdf, CF-xarray, Pint-xarray.
- Ciencia/ML: NumPy, Pandas, SciPy, Statsmodels, scikit-learn, XGBoost.
- Geoespacial: GeoPandas, Shapely, PyProj, Rasterio, Rioxarray.
- Web: Node 26 LTS, React 19.3, TypeScript 5.9.x, Vite 8.x, MapLibre GL JS 6.x, Plotly.js.
- Persistencia: PostgreSQL 18 + PostGIS 3.7.
- Entorno: Docker Compose V2; GitHub Actions para lint y tests.

Las versiones patch exactas deben quedar congeladas en los lockfiles. No actualices versiones principales sin revisar compatibilidad, ejecutar todas las pruebas y documentar la decisión.

## Secuencia obligatoria de construcción
1. **Fase 0 — Auditoría:** inventariar el repositorio y documentar qué se conserva del prototipo.
2. **Fase 1 — Base del proyecto:** configuración, tipos, logging, tests, Docker, PostgreSQL/PostGIS y estructura modular.
3. **Fase 2 — Geografía:** incorporar y validar las geometrías de cuenca y bioma; crear pruebas de pertenencia espacial.
4. **Fase 3 — Datos:** implementar primero un adaptador MERRA-2 pequeño y reproducible; normalizar unidades, tiempos y metadatos.
5. **Fase 4 — Tendencias:** reproducir y ampliar pruebas del análisis estadístico existente.
6. **Fase 5 — Eventos:** detectar anomalías de presión y olas de calor con definiciones documentadas.
7. **Fase 6 — Pronóstico:** integrar primero GFS como baseline operativo; solo añadir un modelo ML propio cuando existan datos de entrenamiento/validación adecuados.
8. **Fase 7 — API y web:** integrar API, mapas, series temporales y predicciones con procedencia visible.
9. **Fase 8 — Endurecimiento:** pruebas integrales, seguridad, documentación, rendimiento y despliegue.

## Definición de terminado
Una tarea está terminada cuando:
- tiene pruebas automatizadas;
- pasa Ruff/pytest y las comprobaciones de TypeScript/ESLint aplicables;
- documenta unidades, fuente y límites;
- no rompe el prototipo existente;
- no incluye datos ni secretos prohibidos;
- sus resultados se pueden reproducir a partir de instrucciones documentadas;
- la documentación y el contrato API están actualizados.

## Antes de cada commit
Ejecutar las pruebas pertinentes, resumir los cambios, indicar limitaciones conocidas y no declarar validación científica si solo se comprobó que el código ejecuta.
