# Stack tecnológico y política de versiones

Fecha de verificación: **14 de noviembre de 2026**.

ACI debe priorizar compatibilidad reproducible, no instalar a ciegas la versión numéricamente mayor de cada paquete. Las versiones concretas se fijan en los lockfiles tras resolver y probar el conjunto en CI.

## 1. Runtime y herramientas fijadas como objetivo

| Capa | Tecnología | Versión objetivo verificada | Uso |
|---|---|---:|---|
| Runtime científico | Python | **3.13.18** | Backend y procesamiento |
| Gestor Python | uv | Última estable compatible | Entornos y lockfile |
| API | FastAPI | **0.162.7** | API HTTP |
| Validación | Pydantic | **2.14.3** | Esquemas |
| ORM | SQLAlchemy | **2.0.57** | Persistencia; línea conservadora 2.0 |
| Migraciones | Alembic | Última estable compatible | Migraciones |
| GIS ORM | GeoAlchemy2 | Última estable compatible con SQLAlchemy 2.0 | Tipos espaciales |
| Arrays | NumPy | 2.x | Cómputo numérico |
| Tablas | Pandas | >=2.2,<4 | Series temporales/tabulares |
| Estadística | SciPy | Última estable compatible | Estadística |
| Modelos estadísticos | Statsmodels | 0.14.x o posterior compatible | Modelos |
| Arrays etiquetados | Xarray | **2026.9.0** | NetCDF/Zarr |
| Paralelismo | Dask | **2026.8.0** | Cómputo por bloques |
| Almacenamiento de arrays | Zarr | 3.x | Cubos procesados |
| Metadatos CF | cf-xarray | Última estable compatible | Convenciones CF |
| Unidades | Pint / pint-xarray | Última estable compatible | Conversión explícita |
| ML | scikit-learn | **1.9.1** | Baselines y evaluación |
| Boosting | XGBoost | **3.4.2** | ML tabular |
| GIS vectorial | GeoPandas | 1.x | Geometrías/recortes |
| Geometría | Shapely | 2.x | Operaciones geométricas |
| Proyecciones | PyProj | 3.x | CRS |
| Raster | Rasterio / rioxarray | Última estable compatible | Raster y COG |
| Runtime web | Node.js | **26 LTS** | Toolchain web |
| UI | React / React DOM | **19.3** | Interfaz |
| Lenguaje UI | TypeScript | **6.0.3** | Tipado; línea conservadora para compatibilidad de plugins |
| Bundler | Vite | **8.3.8** | Desarrollo/build |
| Mapa | MapLibre GL JS | **6.18.0** | Cartografía web |
| Gráficas | Plotly.js | Última estable compatible | Series y gráficos |
| Base de datos | PostgreSQL | **18.7** | Metadatos/resultados |
| GIS en DB | PostGIS | **3.7.0** | Geometrías e índices espaciales |
| Contenedores | Docker Compose | V2 | Desarrollo local |
| Calidad Python | Ruff | Última estable | Lint/format |
| Tests Python | pytest | **9.2.0** | Pruebas |
| Calidad UI | ESLint + Prettier | Últimas estables compatibles | Lint/format |
| Tests UI | Vitest + Testing Library | Últimas estables compatibles | Pruebas UI |

### Por qué Python 3.13.18 y no 3.14/3.15
Python 3.14.10 es una rama de funcionalidad más nueva, pero 3.13.18 ofrece una base conservadora para validar el ecosistema nativo científico/GIS (NetCDF, HDF, Rasterio, GDAL, PyProj, SciPy). Xarray 2026.9.0 ya requiere Python 3.12 o superior. La elección de 3.13 es deliberada para facilitar ruedas binarias y compatibilidad; revisar en Fase 0 si todos los paquetes existentes ya soportan esta versión.

Node 26 está en LTS; no usar Node 27 Alpha para el entorno del proyecto. Se fija TypeScript 6.0.3 como elección conservadora para la toolchain web; TypeScript 7.0.2 aparece como versión más reciente en el catálogo consultado, pero su adopción se deja para una prueba específica de compatibilidad con ESLint, Vite y plugins antes de cambiar el compilador.

### SQLAlchemy: mantener 2.0 en el primer corte
SQLAlchemy 2.1.8 es la versión actual, pero ACI fijará inicialmente la rama de mantenimiento 2.0.57 para reducir riesgos durante la integración de GeoAlchemy2 y Alembic. Antes de migrar a 2.1 se deben pasar tests de geometrías, transacciones y migraciones.

## 2. Resolución de dependencias

Las versiones anteriores son los objetivos comprobados al redactar esta especificación. Codex debe:
1. comprobar la compatibilidad de todos los paquetes con Python 3.13 y entre sí;
2. probar la imagen Docker de PostgreSQL/PostGIS;
3. resolver versiones exactas;
4. generar y versionar `uv.lock` y `package-lock.json`;
5. registrar cualquier desviación en `DECISIONS.md`.

No usar etiquetas `latest` en producción ni intervalos abiertos sin lockfile.

### Python
- Un solo `pyproject.toml` raíz inicialmente.
- `uv.lock` obligatorio y versionado.
- Separar grupos: `api`, `science`, `ml`, `dev`.
- Mantener paquetes con binarios nativos en un grupo de instalación controlado.
- No actualizar dependencias silenciosamente.

### JavaScript
- `package.json` y `package-lock.json` versionados.
- Usar `npm ci` en CI y despliegues.
- React y React DOM deben compartir la misma versión.
- MapLibre será el único motor de mapa inicial; no instalar motores cartográficos redundantes.

## 3. Dependencias por componente

### API
`fastapi`, `pydantic`, `sqlalchemy`, `alembic`, `geoalchemy2`, `psycopg`.

### Ciencia y datos
`numpy`, `pandas`, `scipy`, `statsmodels`, `xarray`, `dask[array]`, `zarr`, `netCDF4`, `h5netcdf`, `cf-xarray`, `pint`, `pint-xarray`, `earthaccess`. Añadir `cdsapi` solo cuando se implemente el adaptador ERA5.

### GIS
`geopandas`, `shapely`, `pyproj`, `rasterio`, `rioxarray`, `pyogrio`. Añadir `rio-tiler` solo cuando se implemente el servicio de teselas.

### ML
`scikit-learn`, `xgboost`. SHAP y frameworks de deep learning son opcionales y no deben entrar hasta que exista una necesidad demostrada.

### Calidad
`pytest`, `pytest-cov`, `hypothesis` opcional, `ruff`. Mypy puede añadirse cuando los límites entre paquetes estén definidos.

## 4. Infraestructura mínima

Docker Compose debe levantar:
- `db`: PostgreSQL 18 + PostGIS 3.7.
- `api`: FastAPI.
- `web`: React/Vite en modo desarrollo.
- `worker`: mismo paquete Python para ingestión y análisis.
- `minio`: perfil opcional para almacenamiento S3 local.

No introducir Redis, Kafka, Kubernetes ni Airflow en el MVP. Los procesos largos deben ejecutarse mediante comandos CLI idempotentes y reanudables; evaluar una cola de trabajos cuando exista una necesidad operativa concreta.

## 5. Política de actualización
- Revisar parches de seguridad mensualmente.
- Actualizar una familia de dependencias por PR.
- Ejecutar la suite completa antes y después.
- No aceptar actualizaciones mayores automáticamente.
- Registrar cambios de versiones y decisiones de compatibilidad en `docs/aci/DECISIONS.md`.

## 6. Referencias oficiales de versiones

- [Python 3.13.18](https://www.python.org/downloads/release/python-31318/)
- [Node.js Release Schedule](https://nodejs.org/en/about/previous-releases/)
- [FastAPI Release Notes](https://fastapi.tiangolo.com/release-notes/)
- [Pydantic Releases](https://github.com/pydantic/pydantic/releases)
- [SQLAlchemy releases](https://www.sqlalchemy.org/download.html)
- [Xarray What’s New](https://docs.xarray.dev/en/stable/whats-new.html)
- [Dask releases](https://github.com/dask/dask/releases)
- [scikit-learn releases](https://github.com/scikit-learn/scikit-learn/releases)
- [XGBoost releases](https://github.com/dmlc/xgboost/releases)
- [React 19.3](https://react.dev/blog/2026/09/09/react-19-3)
- [TypeScript releases](https://github.com/microsoft/TypeScript/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
- [MapLibre GL JS releases](https://github.com/maplibre/maplibre-gl-js/releases)
- [PostgreSQL 18.7](https://www.postgresql.org/docs/release/18.7/)
- [PostGIS 3.7.0](https://postgis.net/2026/10/PostGIS-3.7.0/)
- [pytest releases](https://github.com/pytest-dev/pytest/releases)
