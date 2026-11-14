# Fuentes de datos y modelo geográfico — LACI

## 1. Principios
Usar fuentes oficiales/documentadas, verificar catálogo y campos en archivos reales, registrar licencia/DOI/producto/versión/unidad/resolución/periodo. Reanálisis describe el pasado; NWP pronostica el futuro. No asumir cobertura homogénea de estaciones o productos para todos los países.

## 2. Fuentes meteorológicas y ambientales
### NASA MERRA-2
Reanálisis global para análisis histórico. Producto mensual inicial candidato `M2TMNXSLV`; colección horaria candidata `M2T1NXSLV`, siempre sujeto a validar catálogo, campos y disponibilidad. Variables candidatas: T2M, PS, SLP, U10M, V10M. Resolución nominal aproximada 0.625° × 0.5°. Acceso: https://disc.gsfc.nasa.gov/ ; cliente `earthaccess`. No es forecast.

### Copernicus ERA5
Reanálisis global horario para análisis histórico y comparación independiente: https://cds.climate.copernicus.eu/ . Usar `cdsapi` y credenciales fuera del repo. Producto global con resolución de salida común 0.25°; verificar producto, nivel y variable. No combinar con MERRA-2 sin conservar la procedencia.

### NOAA GFS
Pronóstico numérico global, archivos GRIB2, ciclos operativos y horizontes que dependen del producto. Fuentes: https://nomads.ncep.noaa.gov/ y https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast . Variables candidatas: MSLP, PS cuando esté disponible, temperatura, viento, humedad y precipitación. Registrar ciclo, lead, valid_time, resolución y descarga. Si no hay ciclo, mostrar indisponibilidad.

### Fuentes complementarias
- NASA MODIS: LST/vegetación con flags de calidad; LST no es temperatura del aire.
- NASA GPM IMERG: precipitación; distinguir tasa y acumulado/intervalo.
- NASA GLDAS: variables de superficie terrestre, complementarias, no presión atmosférica.
- Estaciones nacionales/organismos regionales: incorporar solo con permisos, metadatos, control de calidad y disponibilidad verificados. No asumir acceso uniforme.

## 3. Geografía continental
Cobertura objetivo: América Latina y el Caribe. Debe incluir países/territorios y divisiones administrativas pertinentes, según fuente y reconocimiento geográfico adoptado por el proyecto. Seleccionar límites con licencias claras (p. ej. geoBoundaries, Natural Earth u organismos oficiales), registrar versión y fecha. No asumir que todas las fuentes incluyen los mismos territorios o niveles administrativos.

### Regiones analíticas candidatas
México; Centroamérica; Caribe; Andes del Norte; Andes Centrales; Amazonia; Nordeste de Brasil; Brasil tropical/central; Pacífico sudamericano; Cono Sur. Son agrupaciones iniciales para análisis, no una taxonomía climática oficial. Los límites deben seleccionarse con fuentes ecológicas/climáticas y validarse con especialistas/datos.

### Entidades geográficas distintas
- País/territorio: división administrativa.
- Región climática/analítica: dominio de modelo o comparación; puede solaparse.
- Cuenca: área de drenaje (HydroSHEDS/HydroBASINS candidato: https://www.hydrosheds.org/).
- Bioma: unidad ecológica (RAISG candidato para Amazonia: https://www.raisg.org/).
No confundir cuenca amazónica con bioma amazónico ni ambos con el territorio nacional. Las cajas de coordenadas solo optimizan descargas; recortar finalmente con geometrías verificadas.

## 4. Grillas y resolución
Conservar grilla nativa de cada fuente. Para comparar, regrillar con método explícito y no más fino que la fuente limitante cuando corresponda. No presentar MERRA-2 interpolado a 0.25° como información nativa de 0.25°. Guardar CRS, coordenadas, bounds y método de regrillado.

## 5. Variables normalizadas
| Código | Significado | Unidad interna |
|---|---|---|
| tas2m | Temperatura aire 2 m | K |
| tasmax2m | Máxima diaria aire 2 m | K |
| ts | Temperatura superficial terrestre | K |
| ps | Presión superficial | Pa |
| msl | Presión a nivel del mar | Pa |
| u10/v10 | Viento 10 m | m s-1 |
| u850/v850 | Viento 850 hPa | m s-1 |
| q2m | Humedad específica | kg kg-1 |
| rh2m | Humedad relativa | % |
| pr | Precipitación | unidad/intervalo de origen normalizados explícitamente |

## 6. Metadatos mínimos
source_name, product_id/version, DOI/URL, data_kind, variable_original/ACI, unidades original/normalizada, time_start/end/frequency/calendar, CRS, resolución, dimensiones/bounds, checksum, fecha de ingesta, versión de pipeline, flags de calidad, cobertura válida, licencia y atribución.

## 7. Credenciales
No versionar Earthdata, CDS tokens, `.netrc` ni `.env`. Usar variables de entorno y `.env.example` sin valores reales. CI no descarga históricos masivos.
