# EarthScope AI — Planetary Investigation Lab
**Documentación técnica y funcional · Equipo RoboKids · NASA Space Apps Challenge 2026**
Versión: 14 de noviembre de 2026, 10:15 a. m. (hora Colombia)
Repositorio: https://github.com/junher30/RK_Vanguard_EarthScopeAI

> *"Don't just observe Earth's changes. Investigate them, simulate possibilities, and uncover the evidence."*

---

## Índice
1. Visión general
2. Reto NASA y correspondencia con los 5 pasos
3. Reglas del evento (Neiva) que afectan al producto
4. Arquitectura
5. Fuentes de datos NASA
6. Entidades (modelo de datos)
7. Funcionalidades: implementadas y pendientes
8. Métodos científicos
9. Resultados científicos obtenidos
10. Flujo de usuario y demostración
11. Diseño visual (UX/UI)
12. Limitaciones y principios científicos
13. Registro de decisiones
14. Instalación y ejecución
15. Pruebas y validación
16. Hoja de ruta
17. Declaración de uso de IA y de recursos

---

## 1. Visión general
EarthScope AI es una plataforma web que usa datos satelitales de NASA para **detectar tendencias** en el sistema terrestre, **simular escenarios hipotéticos** con modelos validados e **investigar la evidencia** que respalda o contradice cada conclusión.

Está organizada en tres acciones, **DETECT → SIMULATE → INVESTIGATE**, sostenidas por cuatro módulos:

| Módulo | Nombre | Rol | Estado |
|---|---|---|---|
| A | Earth Trend Detector | Núcleo obligatorio: los 5 pasos del reto | ✅ Motor y app Streamlit |
| B | What-If Earth Lab | Innovación 1: escenarios hipotéticos validados | ✅ Modelo · ⏳ Interfaz |
| C | Evidence Graph | Innovación 2: mapa navegable de evidencias | ⏳ Pendiente |
| D | AI Scientific Assistant | Complementario: explica resultados calculados | ⏳ Opcional |

**Caso de estudio:** Amazonía central, de 2001 a 2024.

**Diferenciador:** cada tendencia se puede investigar, cada simulación se puede examinar y cada conclusión se puede rastrear hasta su dato original. Esto incluye los resultados negativos (por ejemplo, que la vegetación no es predecible a partir de la lluvia) y las pruebas de robustez que matizan una conclusión.

## 2. Reto NASA: "Be an Earth System Trend Detective"

| Paso del reto | Implementación en EarthScope AI |
|---|---|
| 1. Decide on the data variable(s) | Selector de variable: precipitación, EVI, NDVI y temperatura superficial (`science/variables.py`) |
| 2. Choose a region | Selector de región, con el polígono dibujado en un globo; región actual: Amazonía central |
| 3. Select the time period | Deslizador de años (2001–2024) |
| 4. Create the time-series and examine it | Serie mensual con media móvil de 12 meses, anomalías con línea de tendencia y promedios anuales |
| 5. Analyze the trend for significance | Mann-Kendall estacional, pendiente de Sen, OLS con IC 95 % corregido por autocorrelación, veredicto y prueba de robustez |

> Pendiente: verificar el enunciado completo del reto en la página oficial (desde el entorno de desarrollo no fue accesible).

## 3. Reglas del evento (Neiva) que afectan al producto
- **Horario:** 14 y 15 de noviembre de 2026, de 9:00 a. m. a 5:00 p. m. en sede. **El envío cierra el domingo 15 a las 11:59 p. m., hora local.**
- **Envío:** perfil → My Team → Project. "Save Progress" no envía. Hay que pulsar **"Submit for Judging"**, y volver a pulsarlo después de cada edición.
- **Demo: un solo enlace.** O una presentación de **máximo 7 diapositivas** (portada incluida) o un video de **máximo 30 segundos**. Debe ser público y no pedir inicio de sesión.
- **Idioma:** página, enlace final y textos del demo en **inglés**. El video puede ir en español con subtítulos en inglés.
- **Menores de edad:** no se pueden mostrar imágenes, voces ni nombres de menores de 18 años.
- **IA:** debe declararse. Las imágenes y videos generados con IA llevan marca de agua y no pueden usar elementos de NASA (logos, banderas, insignias).
- **Recursos NASA:** hay que listar todas las fuentes. Para premios globales, el uso de NASA debe ser **significativo**.
- **Criterios de evaluación:** Impacto, Creatividad, Validez, Relevancia y Presentación.
- **Etapas:** local → nominados globales (22/11) → anuncio de nominados (3/12) → finalistas (17/12) → 10 ganadores globales (27/01/2027).

## 4. Arquitectura

### 4.1 Principio rector
**La interfaz nunca calcula.** Todo resultado se produce en `science/`, que es la única fuente de verdad. La app, el Evidence Graph y el asistente de IA leen los mismos objetos de resultado.

```
NASA Earthdata ──► pipeline/ ──► data/ ──► science/ ──► (export JSON) ──► Frontend web
   (earthaccess)    descarga,      CSV +     tendencias,                        globo, animaciones,
                    recorte,       mapas     What-If,                           What-If, Evidence Graph
                    control de     .npz      robustez       └──► app Streamlit (análisis / respaldo)
                    calidad
```

### 4.2 Estructura de los repositorios
- **Frontend** ([junher30/RK_Vanguard_EarthScopeAI](https://github.com/junher30/RK_Vanguard_EarthScopeAI)): `web/` (Next.js) y `docs/`.
- **Backend** ([jose6668/RK_Vanguard_EarthScopeAI-BACK](https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK)): `pipeline/`, `data/` (con el dataset global completo comprimido), `science/`, `export/`, `api/`, `app/` y `tests/`.

Detalle: [../05_ARQUITECTURA.md](../05_ARQUITECTURA.md).

### 4.3 Tecnologías

| Capa | Tecnología | Estado |
|---|---|---|
| Lenguaje científico | Python 3.9+ | ✅ |
| Ingesta NASA | earthaccess, requests (con timeout y reintentos), h5py (IMERG HDF5), pyhdf (MODIS HDF4) | ✅ |
| Datos y estadística | NumPy, Pandas, SciPy | ✅ |
| App de análisis | Streamlit + Plotly | ✅ (Módulo A) |
| Frontend final | Next.js 16 + React 19 + TypeScript + Tailwind 4 + react-globe.gl + Recharts + Motion + Zustand (`web/`) | ✅ |
| API de análisis | FastAPI + Uvicorn (`api/`) | ✅ local · ⏳ publicada |
| Hosting | Vercel (web) · Render o Hugging Face (API) · Streamlit Community Cloud (respaldo) | ⏳ |
| Control de versiones | Git + GitHub | ✅ |

**Decisión de frontend (propuesta):** no migrar todo a Next.js + FastAPI por el tiempo disponible. La ciencia se queda en Python y exporta JSON; el frontend visual es estático. El What-If funciona en el navegador porque el modelo es lineal: temperatura = a + b·r, con los coeficientes exportados.

## 5. Fuentes de datos NASA

| Variable | Producto | Resolución original | Período usado | DOI |
|---|---|---|---|---|
| Precipitación (mm/día) | GPM IMERG Final Run, mensual, V07 (GPM_3IMERGM) | 0,1°, mensual | 2001-01 → 2024-12 | 10.5067/GPM/IMERG/3B-MONTH/07 |
| EVI y NDVI (índice) | MODIS/Terra Vegetation Indices Monthly CMG v6.1 (MOD13C2) | 0,05°, mensual | 2001-01 → 2024-12 | 10.5067/MODIS/MOD13C2.061 |
| Temperatura superficial diurna (°C) | MODIS/Terra LST Monthly CMG v6.1 (MOD11C3) | 0,05°, mensual | 2001-01 → 2024-12 | 10.5067/MODIS/MOD11C3.061 |

**Acceso:** cuenta Earthdata Login con las aplicaciones "NASA GESDISC DATA ARCHIVE" y "LP DAAC" autorizadas. La descarga se hace con `earthaccess`.

**Datos globales (nuevo):** además de la caja amazónica a 0,1°, hay versiones **globales a 0,5°** (2001–2024) de los tres productos y de **MERRA-2** (temperatura del aire y humedad a 2 m, reanálisis). Ver [DATOS_GLOBALES.md](DATOS_GLOBALES.md).

**Procesamiento por mes:**
1. Recortar la región: 10°S–2°N, 70°W–50°W.
2. Aplicar el control de calidad: valores de relleno y rango válido; factores de escala (×0,0001 para los índices de vegetación; ×0,02 K y −273,15 para la temperatura); conversión mm/h → mm/día para IMERG.
3. Calcular el promedio ponderado por cos(latitud) y la fracción de píxeles válidos.
4. Guardar el mapa en una grilla común de 0,1° (120 × 200, norte→sur, oeste→este).
5. Borrar el archivo crudo.

## 6. Entidades (modelo de datos)

### 6.1 Entidades de datos

| Entidad | Descripción | Atributos clave | Dónde vive |
|---|---|---|---|
| **Variable** | Magnitud física analizable | `key`, `label`, `units`, `file`, `dataset`, `doi`, `caveats[]` | `science/variables.py` |
| **Region** | Área de estudio | `name`, `label`, `lat_min`, `lat_max`, `lon_min`, `lon_max` | `science/variables.py`, `pipeline/fetch_nasa.py` |
| **Dataset (producto NASA)** | Fuente original | `short_name`, `version`, DOI, resolución, unidades | `PRODUCTS` en el pipeline |
| **MonthlyObservation** | Un mes de una variable en la región | `month`, `source_file`, `product`, valor, `valid_frac` | `data/processed/*.csv` |
| **GridMap** | Mapa mensual de la región | `lat[120]`, `lon[200]`, matriz de la variable | `data/grids/amazon_core/<producto>/AAAA-MM.npz` |

### 6.2 Entidades de análisis

| Entidad | Descripción | Atributos clave |
|---|---|---|
| **TimeSeries** | Serie mensual de una variable y región | índice mensual, valores; anomalías y climatología derivadas |
| **TrendResult** | Resultado de `analyze()` | `variable`, `period`, `n_months`, `seasonal_mann_kendall{S, z, p_value}`, `sen_slope_per_year`, `sen_change_pct_of_mean`, `ols_anomaly{slope, ci_low, ci_high, p_value, lag1_autocorr, n_effective}`, `verdict`, `methods_agree`, `climatology`, `anomalies` |
| **RobustnessTest** | Repetición del análisis cambiando el período | `test`, `period`, `verdict`, `p_value`, `sen_slope` |
| **WhatIfModel** | Modelo regional validado | `a`, `b`, `b_ci95`, `n_years`, `pearson_r`, `loyo_r2`, `loyo_rmse`, `r_range`, `baseline_lst`, `baseline_precip` |
| **Scenario** | Simulación pedida por el usuario | `pct_change`, `lst_estimate`, `delta_vs_baseline`, `mean_ci95`, `prediction_interval95`, `extrapolation`, `observed_range_pct`, `label` ("SIMULATION…") |
| **PixelModel** | El modelo What-If por pixel | mapas `a`, `b`, `loyo_r2`, `s2`, `n_years`, `baseline_lst` |
| **Report** | Resultado exportable y reproducible | TrendResult + región + dataset + DOI + resumen + robustez (JSON) |

### 6.3 Entidades del Evidence Graph (diseño)

**Nodos:**

| Tipo | Ejemplo |
|---|---|
| `Hypothesis` | "La lluvia de la Amazonía central está disminuyendo" |
| `Variable` | Precipitación (mm/día) |
| `Dataset` | GPM IMERG V07 (DOI) |
| `Observation` | Serie 2001–2024; años secos 2015, 2023 y 2024 |
| `Trend` | −0,029 mm/día/año |
| `StatisticalTest` | Mann-Kendall estacional, p = 0,049 |
| `RobustnessTest` | Sin 2023–2024: p = 0,68 |
| `Simulation` | −20 % de lluvia → +0,47 °C |
| `AlternativeExplanation` | Eventos extremos (El Niño) o artefactos de la constelación satelital |
| `Uncertainty` | IC 95 %, intervalo de predicción |
| `Limitation` | La temperatura superficial no es temperatura del aire; EVI no mide deforestación |
| `Conclusion` | Enunciado final con su alcance |
| `MissingInformation` | Lo que falta para concluir más (por ejemplo, datos in situ o series más largas) |

**Aristas.** Cada arista distingue el tipo de relación: `observed` (dato observado), `derived_from` (cálculo), `supports`, `contradicts`, `correlated_with` (asociación estadística), `hypothesized_cause` (hipótesis), `limited_by` y `causal_demonstrated` (no existe en nuestros resultados; no se debe dibujar).

**Atributos consultables de cada nodo:** fuente, dataset, región, intervalo temporal, método, parámetros, resultado, evidencia a favor y en contra, y alcance de la conclusión.

## 7. Funcionalidades

### 7.1 Implementadas ✅

**Pipeline (`pipeline/fetch_nasa.py`)**
- Inicio de sesión en Earthdata con verificación; se detiene con un mensaje claro si falla.
- Búsqueda de granulos por producto, versión, fechas y región.
- Descarga mes a mes con **timeout de 60 s y 3 reintentos** (evita que se cuelgue).
- Extracción del promedio regional ponderado y del mapa a 0,1°.
- **Reanudación automática:** salta los meses ya procesados y rellena los mapas faltantes.
- Registro de procedencia: archivo de origen y fracción de píxeles válidos.

**Motor de tendencias (`science/trends.py`)**
- Carga y regularización de series mensuales (los huecos quedan como NaN).
- Anomalías mensuales y climatología.
- Mann-Kendall estacional con corrección de dependencia de Hirsch–Slack.
- Pendiente de Sen estacional.
- OLS sobre anomalías con tamaño de muestra efectivo AR(1) e IC 95 %.
- Veredicto automático, acuerdo entre métodos y resumen en texto.

**What-If (`science/whatif.py`, `science/whatif_maps.py`)**
- Tabla de temporada seca (julio–octubre, solo temporadas completas).
- Ajuste OLS con IC de la pendiente.
- Validación dejando un año fuera.
- Simulación con IC de la media e intervalo de predicción del 95 %.
- Alerta de extrapolación y etiqueta de simulación.
- Lista de supuestos.
- Versión pixel a pixel, con validación fuera de muestra calculada de forma analítica.

**App Streamlit (`app/streamlit_app.py`)**
- Barra lateral con los pasos 1–3: variable, región y período, además de α (0,01 / 0,05 / 0,10).
- Globo ortográfico con la región resaltada.
- Paso 4: pestañas con la serie mensual y su media de 12 meses, las anomalías (barras verde/rojo) con la tendencia, y los promedios anuales.
- Paso 5: veredicto con color, pendiente de Sen, cambio porcentual, p de Mann-Kendall e IC 95 %.
- **Prueba de robustez:** período completo, sin los 2 últimos años y sin los 2 primeros, con aviso si la conclusión cambia.
- Paneles de método y de limitaciones con la fuente y el DOI.
- Descarga del resultado reproducible en JSON.
- Las variables nuevas aparecen solas cuando existe su CSV.

### 7.2 Pendientes ⏳ (pedidas por el equipo)
1. **Línea de tiempo animada pasado → presente → escenario.** Paleta tierra: verde para vegetación, azul para agua y lluvia, rojo/ocre para calor y sequía. Observado en línea sólida; simulación o extrapolación en línea punteada con banda o cono de incertidumbre. Nunca llamarlo "predicción".
2. **Globo 3D oscuro**, estilo ESA Climate from Space, con capas de color de los mapas reales y animación temporal.
3. **Comparador antes/después con cortina:** EVI, temperatura y lluvia en 2001 frente a 2024.
4. **Pantalla del What-If Lab:** deslizador de % de lluvia, resultado con intervalo, alerta de extrapolación, supuestos visibles, comparación con años históricos similares y mapa pixel a pixel (con baja confianza atenuada).
5. **Evidence Graph** interactivo (sección 6.3).
6. **Exportador de datos para la web** (`export/build_site_data.py`) y frontend estático publicado en GitHub Pages.
7. **Asistente de IA** opcional, que solo lee resultados ya calculados y separa dato → resultado → hipótesis → interpretación → limitación. El sistema debe funcionar sin él.
8. **Entrega:** presentación de 7 diapositivas en inglés, textos de envío (resumen, detalles técnicos, uso de NASA, declaración de IA) y enlace público verificado.

## 8. Métodos científicos

| Método | Uso | Por qué |
|---|---|---|
| Anomalías mensuales | Quitar el ciclo estacional | Evita que la estacionalidad parezca tendencia |
| Mann-Kendall estacional (Hirsch et al. 1982) | Significancia de la tendencia | No paramétrico y robusto ante valores atípicos |
| Corrección de Hirsch–Slack (1984) | Dependencia entre meses | Sin ella, los falsos positivos subieron al 23 % en las pruebas; con ella, al 2 % |
| Pendiente de Sen estacional | Magnitud de la tendencia | Mediana de pendientes, robusta |
| OLS con corrección AR(1) | Pendiente con IC 95 % | Las series climáticas están autocorrelacionadas; el tamaño de muestra efectivo evita sobrestimar la significancia |
| Prueba de robustez | Sensibilidad a los extremos del período | Detecta conclusiones que dependen de pocos años |
| Validación dejando un año fuera | Capacidad predictiva real del What-If | Solo se ofrecen escenarios que superan la validación fuera de muestra |
| Intervalo de predicción del 95 % | Incertidumbre del escenario | Incluye la variabilidad año a año, no solo el error de la media |

## 9. Resultados científicos obtenidos (datos reales)

### 9.1 Tendencias 2001–2024 (Amazonía central, α = 0,05)

| Variable | Veredicto | p (Mann-Kendall) | Pendiente de Sen | Cambio en el período |
|---|---|---|---|---|
| Precipitación | Decreciente significativa | 0,049 | −0,029 mm/día/año | −10,8 % |
| EVI | Creciente significativa | 0,0008 | +0,0004 /año | +2,1 % |
| Temperatura superficial diurna | Creciente significativa | 0,0004 | +0,029 °C/año | +2,5 % (≈ +0,69 °C) |

**Robustez de la precipitación:** sin 2023–2024, la tendencia **deja de ser significativa** (p = 0,68). Los promedios anuales rondan 6,5 mm/día, con caídas en 2015 (5,6), 2023 (5,2) y 2024 (5,1). La conclusión depende de eventos secos recientes y debe reportarse con cautela. Su relación con El Niño es una hipótesis, no un resultado demostrado.

### 9.2 What-If Earth Lab
- **Descartado: vegetación.** EVI frente a lluvia (y temperatura) no tiene capacidad predictiva fuera de muestra (R² ≤ 0,1, incluso negativo) a escala regional, pixel a pixel o por temporada. Es un resultado negativo legítimo y se mostrará en el Evidence Graph.
- **Adoptado: temperatura superficial de la temporada seca (julio–octubre) frente a la anomalía relativa de lluvia.**
  - r = −0,75 (p = 2×10⁻⁵); **R² validado = 0,49**; error ±0,30 °C.
  - Pendiente −2,33 °C por unidad de anomalía (IC 95 %: −3,24 a −1,43). Base: 28,4 °C con 3,58 mm/día.
  - Rango observado de la anomalía: −29,6 % a +21,8 %.

| Escenario | Temperatura estimada | Δ | Intervalo de predicción 95 % | Extrapolación |
|---|---|---|---|---|
| −40 % de lluvia | 29,34 °C | +0,93 °C | 28,63–30,05 | **Sí** |
| −20 % de lluvia | 28,87 °C | +0,47 °C | 28,23–29,51 | No |
| 0 % | 28,40 °C | 0 | 27,79–29,01 | No |
| +20 % de lluvia | 27,94 °C | −0,47 °C | 27,30–28,57 | No |

- **Pixel a pixel** (≈ 24.000 píxeles): en el 90 % la pendiente es negativa (mediana −1,0 °C). R² validado mediano de 0,10; el 17 % de los píxeles supera 0,3.

## 10. Flujo de usuario (demo para jueces)
1. Seleccionar la región (globo).
2. Seleccionar la variable.
3. Definir el período.
4. Ver la serie temporal y su animación pasado → presente.
5. Consultar la tendencia y su significancia.
6. Revisar la prueba de robustez y las anomalías.
7. Abrir el What-If Lab y mover el deslizador de lluvia.
8. Comparar el escenario con los años históricos observados.
9. Abrir el Evidence Graph.
10. Inspeccionar datos, métodos, hipótesis, incertidumbres y lo que falta.
11. (Opcional) Hacer preguntas al asistente de IA.
12. Descargar el informe reproducible con las fuentes y limitaciones.

## 11. Diseño visual (UX/UI)
- **Referencias del equipo:** ESA Climate from Space (globos oscuros con capas de color), dashboards satelitales con paneles translúcidos, y "Images of Change" (comparador antes/después con cortina).
- **Paleta:** fondo azul muy oscuro (#050d1a / #0b1a2e); acento cian (#22d3ee); **verde** (#34d399) para vegetación y anomalías positivas; **azul** (#3b82f6) para agua y lluvia; **rojo/ocre** (#f87171) para calor, sequía y anomalías negativas; gris (#94a3b8) para lo no significativo.
- **Reglas:** la estética nunca oculta unidades, incertidumbre ni fuentes. Lo observado y lo simulado deben distinguirse visualmente. Animaciones fluidas pero discretas.
- **Prioridad:** escritorio para la investigación; en móvil se consultan los resultados.

## 12. Limitaciones y principios científicos
- Solo datos reales. Lo ilustrativo se etiqueta como tal.
- Siempre separados: **dato observado → resultado estadístico → hipótesis → interpretación → limitación**.
- Una tendencia no indica la causa. El What-If es una **asociación estadística**, no causalidad ni pronóstico climático. Sus supuestos son visibles.
- La temperatura superficial MODIS es de **superficie y de cielo despejado**, no del aire.
- EVI/NDVI miden verdor del dosel, **no deforestación**. NDVI se satura en selva densa.
- Los cambios en la constelación satelital de IMERG pueden introducir artefactos en tendencias multianuales.
- La región es una caja fija; los resultados no se extienden automáticamente a toda la Amazonía.
- 24 años es un período corto para hablar de clima; las tendencias dependen de eventos extremos.

## 13. Registro de decisiones

| # | Decisión | Motivo |
|---|---|---|
| D1 | Aplicación web responsive (no app móvil) | "Space Apps" no exige app móvil |
| D2 | Amazonía central, caja 10°S–2°N, 70°W–50°W | Caso de estudio acordado; región delimitada |
| D3 | Período 2001–2024 | Período común de los tres productos con años completos |
| D4 | EVI como índice principal de vegetación | NDVI se satura en selva densa |
| D5 | Grilla común de 0,1° y mapas mensuales | Necesaria para el globo, las animaciones, el comparador y el modelo pixel a pixel |
| D6 | Mann-Kendall estacional con Hirsch–Slack | Controla los falsos positivos por autocorrelación (de 23 % a 2 %) |
| D7 | Prueba de robustez obligatoria en la app | La tendencia de lluvia depende de 2023–2024 |
| D8 | What-If **solo temperatura** (decisión del equipo) | La vegetación no superó la validación fuera de muestra |
| D9 | Ciencia en Python + web en **Next.js** (cambió: se empezó con HTML estático y el equipo eligió la "web pesada" por estética e interactividad) | La ciencia sigue en Python; la web solo muestra resultados |
| D10 | Streamlit como app de análisis y respaldo | Ya funciona y cubre los 5 pasos |
| D11 | Análisis de cualquier área: grilla global 0,5° + API FastAPI (`science/area.py`, `api/main.py`) | La ciencia sigue en Python; cada polígono o punto del planeta tiene su serie y tendencia |
| D12 | Humedad y temperatura del aire con MERRA-2 (reanálisis), marcado como tal | Única fuente NASA continua 2001–2024 para esas variables |
| D13 | Separar el proyecto en dos repos: Frontend (web + docs) y Backend (ciencia, API, datos) | Que el equipo trabaje en paralelo sin pisarse; contrato fijado por pruebas |
| D14 | Dataset global completo dentro del repo Backend, comprimido (int16 + delta + shuffle + LZMA, 369 MB) | Que clonar sea suficiente, sin cuentas de NASA ni descargas de 69 GB |

## 14. Instalación y ejecución
```bash
cd ~/Documents/earthscope-ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Datos (requiere Earthdata Login; reanuda solo si se corta)
python pipeline/fetch_nasa.py --product precipitation
python pipeline/fetch_nasa.py --product vegetation
python pipeline/fetch_nasa.py --product lst
python science/whatif_maps.py            # modelo What-If pixel a pixel
python pipeline/fetch_global.py --product all   # datos globales 0,5° (≈ 69 GB de descarga, 1,3 GB en disco)
python export/build_site_data.py         # capas y series de la Amazonía para la web
python export/build_global_data.py       # capas, series y mapas de tendencia globales para la web

# App
streamlit run app/streamlit_app.py       # http://localhost:8501

# Pruebas
python tests/test_trends.py
python tests/test_whatif.py
```
Para detener una descarga colgada: `pkill -f fetch_nasa`. Al volver a ejecutar el comando, continúa donde quedó.

## 15. Pruebas y validación

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `tests/test_trends.py` | Recupera tendencias conocidas (±0,05/año) en series sintéticas con estacionalidad y ruido AR(1); controla los falsos positivos | ✅ Pendiente recuperada; 2/100 falsos positivos |
| `tests/test_whatif.py` | Recupera una respuesta conocida (−2,0) y verifica la alerta de extrapolación | ✅ −1,98 (IC −2,13 a −1,83) |
| Validación fuera de muestra del What-If | Capacidad predictiva real con datos NASA | ✅ R² = 0,49 (temperatura); ❌ ≤ 0,1 (EVI, descartado) |
| Revisión de mapas | Forma, rangos y huecos | ✅ 120 × 200; EVI medio 0,50 (máx. 0,69); 0 % NaN |

## 16. Hoja de ruta (hasta el cierre: domingo 15/11, 11:59 p. m.)
1. ✅ Pipeline con mapas · ✅ Modelo What-If · ✅ Módulo A en Streamlit
2. ⏳ Exportador JSON y frontend estático (estructura y estilo)
3. ⏳ Línea de tiempo animada pasado → presente → escenario
4. ⏳ Globo 3D y comparador antes/después
5. ⏳ Pantalla del What-If Lab
6. ⏳ Evidence Graph
7. ⏳ Publicación (GitHub Pages) y prueba del enlace en ventana privada
8. ⏳ Presentación de 7 diapositivas (inglés), textos de envío y "Submit for Judging"
9. ⏳ (Opcional) Asistente de IA

**Regla de prioridad:** si falta tiempo, el núcleo de los 5 pasos y la entrega van primero; las innovaciones se entregan en versión mínima pero funcional.

## 17. Declaración de uso de IA y de recursos
- **IA utilizada:** asistente de lenguaje (Claude, de Anthropic) para asesoría técnica y científica, generación y depuración de código y documentación. Pendiente: añadir cualquier otra herramienta que use el equipo, por ejemplo ChatGPT.
- **No se usaron imágenes ni videos generados con IA** en el producto. Si se usan en la presentación, llevarán marca de agua y no incluirán elementos de marca de NASA.
- **Recursos de NASA:** GPM IMERG V07, MODIS MOD13C2 v6.1, MODIS MOD11C3 v6.1, Earthdata Login y la librería earthaccess. Uso central: todos los análisis, tendencias y simulaciones se calculan a partir de estos datos.
- **Otros recursos:** Python, NumPy, Pandas, SciPy, h5py, pyhdf, Streamlit y Plotly (todos de código abierto).
- **Referencias de métodos:** Hirsch, Slack & Smith (1982), prueba de Mann-Kendall estacional; Hirsch & Slack (1984), corrección por dependencia serial; Sen (1968), estimador de pendiente.
