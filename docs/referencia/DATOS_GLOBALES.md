# EarthScope AI — Datos globales de NASA

> Los datos, el código y la versión al día de este documento están en el **Backend**: [https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK](https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK) (ver `docs/DATASET.md`). El dataset completo viene con ese repo.

**Fecha:** 14 de noviembre de 2026
**Relacionados:** [DOCUMENTACION.md](DOCUMENTACION_TECNICA.md) · [Documento 02](../02_CASOS_DE_USO.md)

Además del caso de estudio de la Amazonía central (grilla de 0,1°), EarthScope AI tiene ahora **datos de todo el planeta**: 24 años mensuales (2001–2024) en una grilla global de 0,5°. Sirven para explorar en el globo, estudiar tendencias y como base para simulaciones.

## 1. Productos

| Variable en la web | Producto NASA | Tipo | Resolución original → usada | Cobertura |
|---|---|---|---|---|
| Precipitación (mm/día) | GPM IMERG Final mensual V07 (`GPM_3IMERGM`) | Satélite + pluviómetros | 0,1° → 0,5° (promedio de bloques 5×5) | Todo el planeta (menos fiable en latitudes altas y sobre nieve) |
| Vegetación EVI (y NDVI) | MODIS/Terra MOD13C2 v6.1 | Satélite | 0,05° → 0,5° (bloques 10×10) | Solo tierra |
| Temperatura de superficie diurna (y nocturna) (°C) | MODIS/Terra MOD11C3 v6.1 | Satélite | 0,05° → 0,5° (bloques 10×10) | Solo tierra, cielo despejado |
| **Temperatura del aire a 2 m** (°C) | MERRA-2 `M2TMNXSLV` v5.12.4 | **Reanálisis** | 0,5° × 0,625° → 0,5° (interpolación) | Todo el planeta |
| **Humedad relativa a 2 m** (%) | MERRA-2 `M2TMNXSLV` (derivada de QV2M, T2M y PS) | **Reanálisis** | 0,5° × 0,625° → 0,5° | Todo el planeta |
| Humedad específica a 2 m (g/kg) | MERRA-2 `M2TMNXSLV` (QV2M) | **Reanálisis** | 0,5° × 0,625° → 0,5° | Todo el planeta (guardada; aún no se muestra en la web) |

**Sobre MERRA-2:** es un *reanálisis*, es decir, un modelo meteorológico ajustado con observaciones. No es una medición directa. La web lo marca con la etiqueta **reanalysis**. Se eligió porque es la única fuente NASA que cubre humedad y temperatura del aire de forma continua de 2001 a 2024 (ver [Documento 02, §4.2](../02_CASOS_DE_USO.md)). Así se cubre la "humedad" que pedía el Documento 02, y la temperatura del aire queda separada de la de superficie (RN-20).

**Humedad relativa:** a partir de la presión de vapor `e = q·p / (0,622 + 0,378·q)` y la presión de saturación de Magnus `es = 6,112·exp(17,67·T / (T + 243,5))`, se calcula `RH = 100·e/es`, recortada a 0–100 %.

## 2. Cómo se obtienen

```bash
# Descarga (Earthdata Login en ~/.netrc). Reanuda si se corta.
python pipeline/fetch_global.py --product all          # o: precipitation | vegetation | lst | atmosphere

# Ciencia y exportación a la web
python export/build_global_data.py                     # o: --var evi
python tests/test_global_trends.py
```

- **Descarga:** 4 × 288 archivos (≈ 69 GB en total: IMERG ≈ 17 MB, MOD13C2 ≈ 100 MB, MOD11C3 ≈ 70 MB y MERRA-2 ≈ 52 MB por mes). Cada archivo se procesa y se borra en el momento, así que **en disco quedan solo ≈ 1,3 GB** en `data/global/` (excluido de git).
- **Salida:** `data/global/<producto>/<AAAA-MM>.npz`, grilla de 360 × 720 (norte→sur, oeste→este) con `lat` y `lon`.
- **Control de calidad:** valores de relleno y rangos válidos, factores de escala y conversiones de unidades (mm/h → mm/día, K → °C, kg/kg → g/kg).

## 3. Ciencia sobre los datos globales

| Producto | Método | Dónde |
|---|---|---|
| Medias anuales por celda | Solo años completos; una celda necesita ≥ 10 meses válidos en el año (evita el sesgo de la noche polar o la nieve) | `export/build_global_data.py` |
| **Mapa de tendencias por celda** | Mann-Kendall + pendiente de Sen sobre las 24 medias anuales de cada celda (vectorizado); se exige ≥ 15 años válidos | `science/global_trends.py` |
| Serie global | Media ponderada por cos(latitud) sobre una **máscara fija** de celdas con ≥ 90 % de meses válidos (evita artefactos de cobertura) | `science/global_trends.py` |
| Tendencia de la serie global | Mann-Kendall estacional con Hirsch–Slack, Sen, OLS AR(1) y prueba de robustez (el mismo motor que el caso regional) | `science/trends.py` |

**Validación** (`tests/test_global_trends.py`): sobre grillas sintéticas, recupera una tendencia conocida de +0,15/año (estimada en 0,150), con potencia del 99 % y falsos positivos del 5,2 % (lo esperado con α = 0,05).

**Advertencias** (también visibles en la web):
- Cada celda se prueba por separado. Con α = 0,05, alrededor del 5 % de las celdas parecerá significativa por azar.
- 24 valores anuales dan una potencia limitada, y el p-valor por celda no corrige la autocorrelación residual.
- La serie global de MODIS es solo de tierra. La de IMERG y MERRA-2 incluye océano.

## 4. En la web

- Selector **Global / Central Amazon** en la barra de capas. Al entrar, la vista global está activa.
- Cinco capas globales: Precipitation, Vegetation, Surface temp., Air temp. y Humidity.
- Tres modos de mapa:
  - **Annual mean:** media anual con línea de tiempo animada.
  - **Anomaly:** diferencia frente al promedio 2001–2024.
  - **Trend:** cambio por década. Las celdas sin tendencia significativa se ven atenuadas.
- El panel izquierdo muestra la serie global, el veredicto, la robustez y el porcentaje del área con tendencia significativa.
- Archivos: `web/public/data/global/` (manifiesto, series JSON y PNG de 720 × 360).

## 5. Análisis de cualquier área (API)

Cada área o punto del planeta tiene ahora su propio análisis. El visitante confirma un polígono o un punto, y el panel izquierdo muestra **su** serie mensual, tendencia (Mann-Kendall estacional, Sen, OLS AR(1)), prueba de robustez y advertencias.

```
web (polígono GeoJSON o punto) ──POST──► api/main.py ──► science/area.py ──► science/trends.py
                                                         (máscara 0,5°,       (mismo motor del
                                                          serie ponderada)     caso de estudio)
```

| Pieza | Qué hace |
|---|---|
| `science/area.py` | Marca las celdas de 0,5° cuyo centro cae dentro del polígono (seguro con el antimeridiano). Si el área es más chica que una celda, usa la celda de su centro, y un punto usa su celda. Calcula la media mensual ponderada por cos(latitud): un mes cuenta solo si ≥ 50 % del área tiene datos, y se exigen ≥ 36 meses válidos. |
| `api/main.py` (FastAPI) | `POST /api/v1/area/analyze` `{variable, geometry \| point}`, `GET /api/v1/health`, `GET /api/v1/variables`. Documentación automática en `/docs`. Respuestas en caché. |
| Cubos | En el primer uso se arma `data/global/cubes/<var>.npy` (288 × 360 × 720, mapeado en memoria): una consulta tarda menos de 1 s. |
| Web | `web/lib/api.ts`. El panel cambia entre **Your area / Your point** y **Whole planet**. Sin servidor, avisa y deja ver la serie global. |

**Validación:** la caja de la Amazonía analizada desde la grilla global da **exactamente la misma serie** de precipitación que el pipeline regional a 0,1° (216 meses comparados, diferencia máxima 0,0000 mm/día). Los polígonos que cruzan el antimeridiano marcan el número de celdas esperado.

**Casos sin datos:** las variables solo de tierra (EVI y temperatura de superficie) sobre un área de océano responden *"This variable is measured over land only and this area is mostly water."* (CU-07 A1).

Esto resuelve la **decisión D11** (Documento 01, §14) con la opción B: la ciencia sigue en Python y la web solo muestra resultados.

```bash
.venv/bin/uvicorn api.main:app --port 8000       # API (http://localhost:8000/docs)
npm --prefix web run dev                          # web (http://localhost:3000)
```

## 6. Resultados (2001–2024, descarga completa: 4 × 288 meses, sin fallos)

### 6.1. Serie global (media ponderada por área)

| Variable | Veredicto (α = 0,05) | Pendiente de Sen | Robustez | % del área con tendencia significativa por celda |
|---|---|---|---|---|
| Precipitación (IMERG) | Creciente significativa (p = 0,026) | +0,030 mm/día por década | ⚠️ **No robusta**: sin 2023–2024, p = 0,094 | 20 % |
| Vegetación EVI (MODIS, tierra) | Creciente significativa (p < 0,001) | +0,006 por década | ✅ Robusta | **46 %** (reverdecimiento) |
| Temperatura de superficie diurna (MODIS, tierra) | Sin tendencia significativa (p = 0,18) | +0,11 °C por década | ⚠️ No robusta: sin 2023–2024 sí es significativa (p = 0,005) | 19 % |
| Temperatura del aire a 2 m (MERRA-2) | Creciente significativa (p = 0,005) | **+0,145 °C por década** | ⚠️ No robusta: sin 2023–2024, p = 0,053 | **42 %** |
| Humedad relativa a 2 m (MERRA-2) | Creciente significativa (p < 0,001) | +0,33 puntos % por década | ✅ Robusta | 38 % |

### 6.2. Lo que muestran los mapas de tendencia
- **Temperatura del aire:** calentamiento casi general, más fuerte en el Ártico. Hay enfriamiento en partes del océano Austral.
- **Vegetación:** reverdecimiento extendido, sobre todo en China, India y Europa; hay zonas de pérdida dispersas.
- **Precipitación:** patrones regionales mezclados, con más señal sobre el océano que sobre la tierra.

### 6.3. Ejemplo de análisis de área (API): península ibérica (416 celdas)
Temperatura del aire **+0,58 °C por década** (significativa y robusta), EVI en aumento, y lluvia y humedad sin tendencia significativa.

### 6.4. Cautelas
- Que una tendencia sea "no robusta" significa que depende de los últimos años (2023–2024 fueron récord de calor). Se reporta así, sin exagerar.
- La humedad relativa y la temperatura del aire vienen de un **reanálisis**: son coherentes y continuas, pero no son mediciones directas.
- El aumento global de humedad relativa en MERRA-2 debe contrastarse con otras fuentes (por ejemplo AIRS) antes de usarlo como conclusión.

## 7. Próximos usos

- **Simulación:** con lluvia, humedad y temperaturas en la misma grilla, el What-If (hoy solo en la Amazonía) puede generalizarse a cualquier región o polígono, con validación fuera de muestra por celda.
- **Polígono del visitante:** ✅ hecho (§5).
- **Valor por celda (CU-11):** publicar los valores anuales por celda (cuantizados) para consultarlos con un clic.
