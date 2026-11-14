# Stack tecnológico y política de versiones

Fecha de referencia de esta especificación: **14 de noviembre de 2026**.

Las versiones de esta tabla son una línea base técnica, no una invitación a instalar versiones flotantes. Codex debe resolver las versiones patch compatibles al crear el proyecto, escribir los lockfiles y confirmar que las versiones seleccionadas funcionan juntas.

## 1. Versiones base

| Capa | Tecnología | Versión de referencia | Uso |
|---|---|---:|---|
| Runtime científico | Python | 3.13.18 | Backend y procesamiento |
| Gestor Python | uv | estable 0.x | Entorno y lockfile |
| API | FastAPI | >=0.129,<1.0 | API HTTP |
| Esquemas | Pydantic | 2.x | Validación |
| ORM | SQLAlchemy | 2.0.x | Acceso a PostgreSQL |
| Migraciones | Alembic | 1.x | Evolución de esquema |
| GIS ORM | GeoAlchemy2 | 0.x/compatible | Tipos espaciales |
| Datos | NumPy | 2.x | Arreglos numéricos |
| Tablas | Pandas | >=2.2,<4 | Series tabulares |
| Ciencia | SciPy | versión estable compatible | Estadística |
| Estadística | Statsmodels | 0.14.x o posterior compatible | Modelos y pruebas |
| Series multidimensionales | Xarray | 2026.09.x | NetCDF/Zarr |
| Paralelismo | Dask | 2026.x | Cómputo por bloques |
| Almacenamiento array | Zarr | 3.x | Cubos procesados |
| CF conventions | cf-xarray | estable compatible | Metadatos CF |
| Unidades | Pint / pint-xarray | estable compatible | Conversión explícita |
| ML | scikit-learn | 1.9.x | Baselines y evaluación |
| ML boosting | XGBoost | 3.x | Modelos tabulares |
| GIS vectorial | GeoPandas | 1.x | Polígonos y recortes |
| Geometría | Shapely | 2.x | Operaciones geométricas |
| Proyecciones | PyProj | 3.x | CRS |
| Raster | Rasterio / rioxarray | líneas estables compatibles | GeoTIFF y raster |
| Runtime web | Node.js | 26.x LTS | Toolchain web |
| UI | React | 19.3 | Interfaz |
| Lenguaje UI | TypeScript | 5.9.x | Tipado |
| Bundler | Vite | 8.3.x | Desarrollo/build |
| Mapa | MapLibre GL JS | 6.18.x | Cartografía web |
| Gráficas | Plotly.js | 3.x o versión estable compatible | Series y gráficos |
| Base de datos | PostgreSQL | 18.7 | Metadatos/resultados |
| GIS en DB | PostGIS | 3.7.0 | Geometrías e índices espaciales |
| Entorno | Docker Compose | V2 | Desarrollo local |
| Calidad Python | Ruff | estable | Lint y formato |
| Tests Python | pytest | 9.x | Pruebas |
| Calidad UI | ESLint + Prettier | estables | Lint/formato |
| Tests UI | Vitest + Testing Library | estables compatibles | Pruebas de componentes |

## 2. Compatibilidad y selección

### Python 3.13
Se elige Python 3.13.x para priorizar la compatibilidad de las dependencias científicas, NetCDF y GIS. Aunque existen ramas más nuevas de Python, no se debe migrar a una rama reciente hasta comprobar que Xarray, SciPy, Rasterio, netCDF4, PyProj y los paquetes de acceso a datos tienen wheels y tests correctos.

La versión patch exacta se debe fijar en `.python-version` y en la imagen Docker.

### Node 26 LTS
Usar una rama LTS, no Current/Alpha. Fijar la versión mayor en `.nvmrc` y en CI. Guardar `package-lock.json`.

### PostgreSQL 18 + PostGIS 3.7
Usar la imagen oficial compatible de PostGIS para PostgreSQL 18. No usar PostgreSQL 19 RC en el MVP. Fijar tag concreto y, para despliegues reproducibles, digest de imagen.

### FastAPI y SQLAlchemy
FastAPI se fija en un rango compatible dentro de 0.x y el lockfile determina la versión exacta. Usar SQLAlchemy 2.0.x en la primera versión para minimizar riesgos con GeoAlchemy2; no saltar a 2.1 sin probar migraciones, consultas geográficas y tests.

## 3. Gestión de dependencias

### Python
- Un solo `pyproject.toml` raíz al comienzo.
- `uv.lock` obligatorio y versionado.
- Separar grupos: `api`, `science`, `ml`, `dev`.
- Evitar dependencias opcionales pesadas hasta necesitarlas.
- Documentar cualquier dependencia con binarios nativos.
- No usar `pip install -U` en CI.

### JavaScript
- `package.json` y `package-lock.json` versionados.
- Usar `npm ci` para CI y despliegues.
- No instalar librerías de mapas duplicadas. MapLibre será el único motor de mapa inicial.
- React y React DOM deben compartir la misma versión.

## 4. Dependencias por componente

### API
`fastapi[standard]`, `pydantic`, `sqlalchemy`, `alembic`, `geoalchemy2`, `psycopg`, `orjson` opcional.

### Ciencia y datos
`numpy`, `pandas`, `scipy`, `statsmodels`, `xarray`, `dask[array]`, `zarr`, `netCDF4`, `h5netcdf`, `cf-xarray`, `pint`, `pint-xarray`, `earthaccess`, `cdsapi` solo si se requiere acceso programático a Copernicus.

### GIS
`geopandas`, `shapely`, `pyproj`, `rasterio`, `rioxarray`, `pyogrio`, `rio-tiler` cuando se implemente servicio de teselas.

### ML
`scikit-learn`, `xgboost`. SHAP es opcional y no debe incorporarse hasta que se necesiten explicaciones de modelos.

### Tests / calidad
`pytest`, `pytest-cov`, `hypothesis` opcional, `ruff`, `mypy` opcional.

## 5. Infraestructura mínima

Docker Compose debe poder levantar:
- `db`: PostgreSQL 18 + PostGIS 3.7.
- `api`: FastAPI.
- `web`: React/Vite en modo desarrollo.
- `worker`: mismo código Python, comandos de ingestión/análisis.
- `minio`: perfil opcional para almacenamiento S3 local.

No instalar Redis, Kafka, Kubernetes, Airflow ni un sistema de colas distribuido en el MVP. Para procesos largos se usarán comandos CLI reanudables; se evaluará un worker/cola dedicada solo cuando el producto lo requiera.

## 6. Política de actualizaciones
- Dependabot o revisión mensual para parches.
- Actualizar una familia de dependencias por PR.
- Ejecutar tests completos y comparar resultados científicos antes de actualizar.
- No aceptar actualizaciones mayores automáticas.
- Registrar decisiones de cambios en `docs/aci/DECISIONS.md`.
