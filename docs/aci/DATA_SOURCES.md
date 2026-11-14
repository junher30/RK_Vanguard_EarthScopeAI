# Fuentes de datos y modelo geográfico

## 1. Principios

- Preferir fuentes oficiales y productos documentados.
- Usar NASA como fuente primaria para el análisis científico solicitado por el desafío.
- Usar reanálisis para reconstruir el pasado y modelos NWP para el futuro.
- No confundir producto satelital con variable atmosférica.
- Registrar licencia, DOI, producto, versión, unidades, resolución y temporalidad.
- Verificar disponibilidad real de cada variable en el catálogo/NetCDF antes de codificar el adaptador.

## 2. Fuentes meteorológicas

### 2.1 NASA MERRA-2 — fuente histórica principal
NASA GES DISC. MERRA-2 es un reanálisis atmosférico global de NASA.

Producto mensual de inicio:
- Colección: `M2TMNXSLV` / `tavgM_2d_slv_Nx`.
- Frecuencia: media mensual.
- Resolución nominal: 0.625° longitud × 0.5° latitud.
- Variables candidatas: temperatura del aire a 2 m (`T2M`), presión superficial (`PS`), presión a nivel del mar (`SLP`), viento a 10 m (`U10M`, `V10M`) y vapor de agua/humedad según disponibilidad.

Producto temporal:
- Colección horaria de diagnósticos de una sola capa MERRA-2 (`M2T1NXSLV`), sujeto a validación de catálogo y campos antes de implementarlo.
- Utilizarlo cuando se requiera construir máximas diarias o estudiar cambios subdiarios.

Acceso:
- NASA GES DISC: https://disc.gsfc.nasa.gov/
- Earthdata Login: https://urs.earthdata.nasa.gov/
- Cliente Python recomendado: `earthaccess`.

MERRA-2 es reanálisis: no es un pronóstico futuro. La versión del producto, unidad, atributos, fill values y nombre de variable se deben leer del archivo fuente, no asumir silenciosamente.

### 2.2 Copernicus ERA5 — comparación histórica
- Fuente: Copernicus Climate Data Store.
- Uso: comparar presión, temperatura, viento y humedad en series horarias y diarias.
- ERA5 es reanálisis, no pronóstico operativo.
- Acceso: https://cds.climate.copernicus.eu/
- Cliente oficial: `cdsapi`, con credenciales configuradas fuera del repositorio.
- Alinear con MERRA-2 solo para comparaciones científicas documentadas. No combinar series sin conservar la fuente.

### 2.3 NOAA GFS — pronóstico operativo de referencia
- Acceso oficial: NOAA NOMADS y NOAA Open Data Dissemination/AWS.
- Resolución de producto disponible: incluye GFS 0.25°; el ciclo se publica cuatro veces al día.
- Horizonte: llega hasta 16 días, con cambios de resolución/intervalo de salida en horizontes largos.
- Variables candidatas: presión a nivel del mar, presión superficial cuando esté disponible, geopotencial, temperatura, viento, humedad y precipitación.
- Formato común: GRIB2.
- Fuentes: https://nomads.ncep.noaa.gov/ y https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast

GFS será el baseline de pronóstico para el MVP. Mostrar siempre modelo, ciclo de inicialización, hora válida, lead time, resolución y fecha de descarga. Si el ciclo no está disponible, informar indisponibilidad; no rellenar con valores ficticios.

### 2.4 NASA MODIS — temperatura de superficie y vegetación
- Uso: temperatura superficial terrestre (LST) y variables de vegetación.
- No equivale a temperatura del aire a 2 m.
- La cobertura puede verse afectada por nubes, calidad y periodo de observación.
- Mantener flags de calidad y metadatos de producto.

### 2.5 NASA GPM IMERG — precipitación
- Uso: precipitación y anomalías de lluvia.
- Mantener distinción entre tasa de precipitación y acumulado por intervalo.
- Consultar el producto y la versión exactos; no asumir que mm/h y mm/día son intercambiables sin integrar el intervalo correctamente.

### 2.6 NASA GLDAS — superficie terrestre
- Uso complementario: humedad del suelo y otras variables de superficie terrestre.
- No es una medición directa de presión atmosférica.
- Incorporar solo después de que el núcleo MERRA-2 funcione.

## 3. Fuentes geográficas

ACI utilizará dos máscaras conceptualmente diferentes.

### A. Cuenca hidrográfica
Fuente candidata: HydroSHEDS/HydroBASINS (https://www.hydrosheds.org/).
- Seleccionar la geometría que representa el drenaje de la cuenca amazónica.
- Registrar nivel, identificador, versión, escala, fecha y licencia.
- Validar que el polígono corresponde a la cuenca hidrográfica y no al bioma.

### B. Bioma amazónico por país
Fuente candidata: RAISG (https://www.raisg.org/) o una fuente ecológica documentada con geometría y licencia clara.
- Obtener una máscara del bioma.
- Obtener límites administrativos nacionales de una fuente identificada, por ejemplo geoBoundaries (https://www.geoboundaries.org/) o Natural Earth.
- Construir la intersección: bioma amazónico ∩ país.
- Conservar país, código de país, fuente y versión de ambas geometrías.

Países/territorios a contemplar: Brasil, Perú, Colombia, Bolivia, Ecuador, Venezuela, Guyana, Surinam y Guayana Francesa. Verificar la cobertura exacta de cada geometría antes de publicarla.

No utilizar una caja rectangular de coordenadas como definición del Amazonas. Las cajas se permiten solamente para optimizar descargas, seguidas de recorte exacto con las máscaras.

## 4. Grillas y resolución

- MERRA-2 tiene una grilla nominal más gruesa que ERA5/GFS 0.25°.
- Conservar la grilla nativa al almacenar datos de fuente.
- Para comparar, elegir una grilla común no más fina que la fuente limitante, o aplicar un método explícito y documentado.
- Nunca representar MERRA-2 interpolado a 0.25° como si contuviera detalle espacial original de 0.25°.
- Guardar coordenadas en grados y CRS geográfico; reproyectar solo para operaciones que lo requieran.
- Definir celdas por coordenadas y un identificador reproducible; evitar redondeos ambiguos.

## 5. Esquema normalizado

Variables internas iniciales:

| Código ACI | Significado | Unidad normalizada | Notas |
|---|---|---|---|
| `tas2m` | Temperatura del aire a 2 m | K internamente; °C en UI | No confundir con LST |
| `tasmax2m` | Máxima diaria de temperatura a 2 m | K | Derivada de subdiaria |
| `ts` | Temperatura superficial terrestre | K | Producto satelital |
| `ps` | Presión superficial | Pa | Mantener separada de msl |
| `msl` | Presión a nivel del mar | Pa | Útil para campos sinópticos |
| `u10`, `v10` | Viento 10 m | m s-1 | Componentes |
| `u850`, `v850` | Viento 850 hPa | m s-1 | Si está disponible |
| `q2m` | Humedad específica | kg kg-1 | Si está disponible |
| `rh2m` | Humedad relativa | % | Si está disponible |
| `pr` | Precipitación | kg m-2 s-1 o mm por intervalo | El intervalo debe constar |

Usar unidades SI internamente cuando sea apropiado. La API puede presentar conversiones amigables, pero debe incluir la unidad de respuesta.

## 6. Metadatos mínimos del dataset

Cada colección procesada debe registrar:
- `source_name`, `product_id`, `product_version`, `doi_or_url`;
- `data_kind` (observation/reanalysis/forecast);
- `variable_original`, `variable_aci`, `units_original`, `units_normalized`;
- `time_start`, `time_end`, `time_frequency`, `calendar`;
- `crs`, `grid_resolution`, dimensiones y bounds;
- checksum, fecha de ingestión y versión del pipeline;
- quality flags, cobertura válida y limitaciones;
- licencia y atribución obligatoria.

## 7. Autenticación y secretos

- No versionar Earthdata credentials, archivos `.netrc`, configuración CDS con token, ni archivos `.env`.
- Proporcionar `.env.example` con nombres de variables solamente.
- Para desarrollo local, usar credenciales del usuario con permisos de archivo restringidos.
- Los procesos CI no descargan datasets privados ni ejecutan descargas grandes.
