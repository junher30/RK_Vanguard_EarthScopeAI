# Instrucciones para agentes de código (Codex)

## Objetivo y decisiones oficiales
Desarrollar **LatAm Climate Intelligence (LACI)** sobre este repositorio existente. Decisiones aceptadas:
- Cobertura de producto: América Latina y el Caribe desde el diseño (México, Centroamérica, Caribe y Sudamérica).
- Implementación: progresiva por regiones, con catálogo geográfico continental desde el inicio.
- IA: **modelos regionales especializados**; no asumir que un único modelo generaliza a todos los climas.
- Prioridad científica equilibrada: temperatura/calor y presión/circulación atmosférica.
Leer todos los documentos de `docs/aci/` (la carpeta histórica se conserva por compatibilidad de rutas; el producto se denomina LACI).

## Proteger el trabajo existente
El repositorio contiene un prototipo EarthScope AI/Streamlit, pipelines NASA y experimentos científicos. No borrar, reemplazar ni mover esos componentes en bloque. La primera tarea es auditar estructura, dependencias, comportamiento, datos y pruebas. La migración será incremental y mantendrá el prototipo ejecutable hasta demostrar paridad.

## Reglas de ingeniería y ciencia
1. Una fase/issue por PR; no construir todo de una vez.
2. Inspeccionar código y tests antes de editar; reutilizar solo lógica validada.
3. No inventar datos, métricas, pronósticos, polígonos ni resultados. Fixtures sintéticos solo en tests/demo y claramente rotulados.
4. Diferenciar observación, reanálisis, pronóstico numérico, predicción LACI y escenario hipotético.
5. No llamar pronóstico a una extrapolación de tendencias históricas.
6. No interpretar correlación como causalidad ni presentar LACI como servicio oficial de alertas.
7. Conservar fuente, producto, versión, unidades, resolución, periodo, descarga, método y checksum si existe.
8. No mezclar LST con temperatura del aire a 2 m; no mezclar PS con MSL/SLP.
9. No aumentar artificialmente la resolución de una fuente mediante interpolación.
10. No subir credenciales, tokens, `.netrc`, datos crudos, NetCDF/Zarr/GRIB, modelos grandes ni secretos.
11. Usar variables de entorno y proporcionar `.env.example` sin secretos.
12. Fijar dependencias en `uv.lock` y `package-lock.json`; no actualizar silenciosamente.
13. Cada cálculo científico requiere tests con datos sintéticos conocidos y casos límite.
14. Validación temporal cronológica/rolling-origin; prohibido split aleatorio para forecasting. Añadir holdouts espaciales por región.
15. Evitar fuga en climatologías, imputación, normalización, selección de variables y agregaciones.
16. API con Pydantic/OpenAPI; endpoints geográficos documentan CRS y unidades.
17. Interfaz/documentación inicialmente en español; identificadores y código en inglés.
18. Si una variable, fuente, licencia, versión o geometría no se verifica, registrar pendiente; no adivinar.

## Principios geográficos y regionales
- El catálogo de regiones debe cubrir América Latina y el Caribe, con IDs estables, jerarquía, geometría, país/territorio, fuente, versión, licencia y CRS.
- No reducir Latinoamérica a una sola máscara ni a un bounding box.
- Mantener regiones analíticas que pueden solaparse (p. ej. Amazonia y Andes) separadas de divisiones administrativas.
- Regiones iniciales sugeridas: México, Centroamérica, Caribe, Andes del Norte, Andes Centrales, Amazonia, Nordeste de Brasil, Brasil tropical/central, Pacífico sudamericano y Cono Sur. Ajustar límites con fuentes verificadas.
- No publicar modelos regionales sin definir dominio, datos, periodo, resolución y evaluación propios.
- El modelo de cada región debe tener baseline, métricas y umbral de publicación; regiones sin datos suficientes muestran “sin modelo validado”.

## Stack
Consultar `docs/aci/TECH_STACK.md`. Objetivos: Python 3.13 + uv; FastAPI/Pydantic/SQLAlchemy; Xarray/Dask/Zarr; GeoPandas/Shapely/PyProj; SciPy/Statsmodels/scikit-learn/XGBoost; Node 26 LTS, React, TypeScript, Vite, MapLibre; PostgreSQL/PostGIS; Docker Compose. Las versiones patch se verifican y congelan en lockfiles.

## Secuencia obligatoria
0. Auditoría del prototipo y datos.
1. Fundaciones reproducibles, tests, CI y PostGIS.
2. Catálogo geográfico continental, divisiones administrativas y regiones analíticas.
3. Ingesta piloto acotada y QA de ERA5/MERRA-2; conservar grillas nativas.
4. Motor científico común y climatologías comparables.
5. Análisis de tendencias/eventos de calor y presión por región.
6. Pronóstico numérico (GFS) como baseline, con ciclo y tiempo válido.
7. Modelos regionales propios solo con hindcasts/datos compatibles y evaluación robusta.
8. API, mapas, dashboard y expansión progresiva de regiones.
9. Endurecimiento, publicación y monitoreo.

## Definition of done
Tests/lint aplicables pasan; unidades, fuentes y límites están documentados; prototipo no se rompe; sin secretos/datos grandes; resultados reproducibles; contratos y docs actualizados. Antes de cada commit, resumir pruebas y limitaciones. No declarar validación científica solo porque el código ejecuta.
