# Prompt inicial para Codex

Copia este prompt en Codex después de abrir el repositorio.

---

Actúa como arquitecto de software y científico de datos geoespaciales senior. Vas a trabajar sobre este repositorio para desarrollar **Amazon Climate Intelligence (ACI)**, una plataforma de investigación de tendencias y predicción atmosférica en la Amazonía.

## Lecturas obligatorias
Antes de modificar código:
1. Lee `AGENTS.md`.
2. Lee todos los documentos de `docs/aci/`.
3. Inspecciona el repositorio actual y su historial relevante.
4. Identifica la aplicación Streamlit existente, los pipelines NASA, los módulos de tendencias/What-If, tests, dependencias y datos descargados.
5. Comprueba las versiones reales de los productos y librerías en sus fuentes oficiales antes de fijarlas.

## Contexto del producto
ACI debe analizar dos extensiones geográficas separadas:
- cuenca hidrográfica amazónica;
- bioma amazónico intersectado con los territorios de Brasil, Perú, Colombia, Bolivia, Ecuador, Venezuela, Guyana, Surinam y Guayana Francesa.

El sistema estudia temperatura del aire, temperatura superficial, presión superficial, presión a nivel del mar, viento, humedad y precipitación. Debe realizar análisis estadístico de tendencias y detección de eventos, además de ofrecer pronóstico numérico GFS y, posteriormente, predicciones propias de ML si demuestran habilidad fuera de muestra.

## Reglas no negociables
- No borrar ni reemplazar el prototipo Streamlit actual.
- No subir grandes archivos científicos, credenciales ni secretos a Git.
- No inventar datos ni métricas.
- No confundir reanálisis con forecast.
- No confundir LST con temperatura del aire.
- No mezclar presión superficial y presión a nivel del mar.
- No presentar interpolación como nueva resolución.
- No entrenar/evaluar modelos con fuga de información temporal.
- No afirmar que un modelo predice el futuro hasta demostrarlo contra baselines y datos independientes.
- Cada cálculo científico debe tener tests con datos sintéticos conocidos.
- Actualiza documentación y lockfiles cuando cambies contratos o dependencias.

## Stack objetivo
Consulta `docs/aci/TECH_STACK.md`. Línea base: Python 3.13, uv, FastAPI, Pydantic v2, SQLAlchemy 2.0, Xarray, Dask, Zarr, GeoPandas, SciPy, Statsmodels, scikit-learn, XGBoost; Node 26 LTS, React 19.3, TypeScript, Vite 8, MapLibre; PostgreSQL 18 + PostGIS 3.7; Docker Compose V2.

## Tu primera tarea NO es implementar todo el sistema
Ejecuta únicamente la **Fase 0 del roadmap: auditoría del repositorio**.

Entrega:
1. Inventario de carpetas y puntos de entrada.
2. Dependencias y compatibilidad real con Python 3.13.
3. Qué componentes existentes pueden reutilizarse, cuáles requieren cambios y cuáles deben quedar en legacy.
4. Estado de tests y comandos reproducibles.
5. Diagnóstico del pipeline de datos, productos NASA, variables, cobertura temporal, resolución, unidades y máscara geográfica.
6. Riesgos de migración y plan de PRs pequeños.
7. Lista de cualquier supuesto científico o licencia que no hayas podido verificar.

No hagas refactors masivos durante esta fase. No descargues el histórico completo. No modifiques datos ni archivos grandes. Crea un informe en `docs/aci/REPOSITORY_AUDIT.md` y termina con una propuesta concreta para el siguiente PR, sin implementarla hasta que la auditoría esté completa.

Al finalizar, resume comandos ejecutados, pruebas que pasaron/fallaron y limitaciones encontradas. No declares que una función está validada científicamente solo porque el programa se ejecuta.

---
