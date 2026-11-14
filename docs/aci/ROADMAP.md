# Roadmap de implementación ACI

## Principio de ejecución

Implementar una fase por PR. El orden depende de entregables verificables, no de fechas arbitrarias. La planificación anterior de ocho semanas es una estimación de organización; la aceptación de cada fase depende de pruebas y calidad de datos.

## Fase 0 — Auditoría y protección del prototipo
**Objetivo:** entender qué ya existe y definir cómo evolucionarlo.

Tareas:
- Inventariar archivos, dependencias, entradas de datos, salidas y comandos.
- Ejecutar pruebas existentes.
- Auditar `pipeline/fetch_nasa.py`, `science/trends.py`, `science/whatif.py` y `app/streamlit_app.py`.
- Identificar supuestos geográficos y límites actuales.
- Identificar datos ya descargados y su procedencia.
- Documentar compatibilidad de los módulos antiguos con Python 3.13.
- Crear una tabla de componentes: reutilizar, adaptar, reemplazar más adelante.
- Mantener una ruta de ejecución del prototipo original.

Entregable: informe de auditoría y plan de migración. No reescribir la aplicación en esta fase.

## Fase 1 — Fundaciones reproducibles
**Objetivo:** entorno de desarrollo y estructura estable.

Tareas:
- Crear configuración `pyproject.toml`, `.python-version`, `uv.lock`.
- Crear `.nvmrc`, `package.json`, `package-lock.json` cuando se inicie el frontend.
- Añadir Ruff, pytest, Vitest, ESLint, Prettier y GitHub Actions.
- Crear Docker Compose con PostGIS.
- Crear `.env.example`, `.gitignore` y logging estructurado.
- Crear migraciones Alembic iniciales.
- Comprobar arranque reproducible en una máquina limpia.

Entregable: `docker compose up --build` inicia servicios y los tests mínimos pasan.

## Fase 2 — Geografía amazónica
**Objetivo:** construir dos máscaras válidas.

Tareas:
- Seleccionar y descargar límite de cuenca hidrográfica.
- Seleccionar el polígono del bioma amazónico.
- Obtener límites administrativos nacionales.
- Validar licencias, CRS, validez y cobertura de geometrías.
- Crear la intersección bioma × país.
- Publicar metadatos y vista previa.
- Crear tests de contención, área, geometría y CRS.

Entregable: capa basin y capa biome_country versionadas, documentadas y visibles en mapa.

## Fase 3 — Data Core MERRA-2
**Objetivo:** descargar y normalizar un dataset acotado de forma reproducible.

Tareas:
- Implementar adaptador `earthaccess`.
- Descargar primero un periodo corto y pocas variables.
- Leer metadatos directamente de archivos.
- Manejar retries, reanudación, checksums y fill values.
- Normalizar tiempo, coordenadas, unidades y nombres.
- Aplicar máscara amazónica.
- Guardar raw y procesado fuera de Git.
- Escribir metadatos de procedencia en DB.

Entregable: producto mensual MERRA-2 de temperatura 2m y presión superficial/SLP con grilla y unidad verificadas. Luego ampliar al histórico.

## Fase 4 — Tendencias
**Objetivo:** análisis estadístico robusto por celda y región.

Tareas:
- Definir climatología 1991–2020 si la cobertura lo permite.
- Implementar anomalías mensuales y diarias.
- Revisar el motor de tendencias actual.
- Implementar/validar Mann-Kendall estacional, autocorrelación y pendiente de Sen.
- Implementar FDR en mapas.
- Exportar resumen por basin, biome_country y grid.
- Probar con series sintéticas controladas.

Entregable: mapa de tendencia térmica y presión con p/q, pendiente, cobertura y metadatos.

## Fase 5 — Detección de eventos
**Objetivo:** eventos de presión y calor rastreables.

Tareas:
- Implementar máxima diaria 2m desde fuente subdiaria.
- Construir climatología de referencia.
- Implementar detector de ola de calor con percentil/duración definidos.
- Implementar anomalías y gradientes de presión.
- Agrupar regiones afectadas por evento.
- Seguir centroides/áreas a través del tiempo.
- Evaluar sensibilidad a umbrales.

Entregable: eventos históricos detectados con definición, duración, intensidad y trayectoria.

## Fase 6 — Forecast Core
**Objetivo:** ofrecer un producto futuro fiable como baseline.

Tareas:
- Implementar adaptador NOAA GFS GRIB2.
- Leer variables de presión, temperatura y viento.
- Guardar ciclo, lead, valid_time, resolución y procedencia.
- Mostrar comparación con análisis/reanálisis cuando sea apropiado.
- Medir disponibilidad, latencia y cobertura regional.
- Investigar archivo/hindcast para entrenar ML alineado con el forecast.

Entregable: campos GFS 24/48/72 h consultables y distinguibles de reanálisis.

## Fase 7 — Modelos ACI
**Objetivo:** evaluar si un modelo propio agrega valor sobre GFS y baselines.

Tareas:
- Crear dataset supervisado sin fuga temporal.
- Definir targets y horizontes.
- Construir baseline persistencia/climatología.
- Construir XGBoost de postprocesamiento con entradas de forecast/hindcast compatibles.
- Realizar validación temporal rolling-origin y holdout espacial.
- Calcular skill scores por región/horizonte.
- Publicar modelo solo si supera el baseline acordado.
- Registrar modelo, versión, features, datos y métricas.

Entregable: predicción experimental calibrada, o informe de que todavía no existe skill suficiente. Ambos son resultados válidos.

## Fase 8 — API, frontend y producto
**Objetivo:** experiencia integrada y auditable.

Tareas:
- Implementar FastAPI y esquemas.
- Implementar consultas y endpoints de mapas.
- Construir UI React.
- Visualizar series, trends, events y forecasts.
- Mostrar fuente, periodo, unidades, forecast cycle y valid time.
- Mantener temporalmente el prototipo Streamlit.
- Añadir pruebas end-to-end y documentación de usuario.

Entregable: dashboard funcional y trazable.

## Fase 9 — Release y continuidad
- Seguridad de secretos y permisos.
- Documentación de instalación y reproducción.
- CI estable.
- Política de versionado de datos/modelos.
- Evaluación de rendimiento y costes.
- Despliegue de demo sin prometer disponibilidad permanente de fuentes externas.

## Primer sprint sugerido

1. Auditar el repositorio actual.
2. Probar versiones de dependencias sobre Python 3.13.
3. Añadir entorno reproducible sin cambiar la aplicación existente.
4. Validar el primer producto MERRA-2 con un periodo corto.
5. Entregar un notebook/reporte de QA del producto antes de generar mapas.
