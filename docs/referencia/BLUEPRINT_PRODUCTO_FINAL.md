# EarthScope AI — Blueprint del producto final (v2, desde cero)
**RoboKids · NASA Space Apps Challenge 2026 · Reto: Be an Earth System Trend Detective**
Versión 14/11/2026, 10:30 a. m. · Cierre de entrega: **domingo 15/11, 11:59 p. m. (hora Neiva)**

Este documento define **cómo debe ser el resultado final**: una web estable e interactiva que integra mapas y globo, series temporales, simulaciones, evidencias, backend, motor científico y datasets. Sirve como especificación para construir la v2 desde cero.

> **"Desde cero" aplica a la arquitectura y la interfaz.** Los datos NASA ya descargados y validados (288 meses × 3 productos, con sus mapas) y los métodos científicos ya probados se **reutilizan** en el nuevo motor. Rehacerlos costaría horas y no mejoraría nada.

---

## 1. Resultado final en una frase
Una web donde el usuario hace girar un globo, selecciona una región, viaja en el tiempo de 2001 a 2024 viendo los mapas reales de NASA animados, descubre qué tendencias son estadísticamente significativas, simula "¿qué pasaría si…?" con un modelo validado y su incertidumbre, y navega el grafo de evidencias que explica por qué cada conclusión es razonable y qué información falta.

## 2. Requisitos no negociables
1. Cumple los **5 pasos del reto**: variable → región → período → serie temporal → significancia.
2. **Solo datos reales de NASA.** Cada número se puede rastrear hasta su archivo y su DOI.
3. **Estable para los jueces:** enlace público siempre disponible. Si el backend falla, la web sigue funcionando con datos precalculados (modo estático de respaldo).
4. **Observado ≠ simulado ≠ extrapolado**, distinguible en color, trazo y etiqueta.
5. Interfaz y textos en **inglés**. Responsive: escritorio como prioridad, móvil para consultar.
6. Carga inicial menor a 3 s; interacciones menores a 300 ms.

---

## 3. Arquitectura general

```
┌──────────────────────────── FRONTEND (Next.js + TypeScript) ────────────────────────────┐
│ Globe & Maps (deck.gl / MapLibre)  ·  Time Machine  ·  Trend Detector  ·  What-If Lab     │
│ Evidence Graph (Cytoscape.js)  ·  Report  ·  Data panel (sources, DOIs, limitations)       │
│                ▲ fetch JSON / PNG tiles                         ▲ fallback                 │
└────────────────┼────────────────────────────────────────────────┼──────────────────────────┘
                 │ REST (JSON)                                    │ /public/static-api/*.json
┌────────────────┴──────── BACKEND API (FastAPI) ────────┐        │ (snapshot de respuestas)
│ /variables /regions /timeseries /trend /maps            │        │
│ /whatif /evidence /report /health                       │────────┘ export_static.py
│ caché en memoria + archivos; sin estado; read-only      │
└────────────────┬────────────────────────────────────────┘
                 │ import
┌────────────────┴──────── MOTOR CIENTÍFICO (paquete Python `earthscope_engine`) ───────────┐
│ io · qc · aggregate · trends · robustness · whatif · evidence · report                     │
└────────────────┬───────────────────────────────────────────────────────────────────────────┘
                 │ lee
┌────────────────┴──────── DATA LAYER ──────────────────────────────────────────────────────┐
│ data/cube/amazon_core.zarr (o .nc)  ← variables × tiempo × lat × lon, grilla 0,1°           │
│ data/processed/*.parquet           ← series regionales + procedencia                       │
│ data/tiles/<var>/<YYYY-MM>.png     ← mapas coloreados precalculados para el globo          │
│ data/models/*.json                 ← coeficientes What-If validados                         │
└────────────────┬───────────────────────────────────────────────────────────────────────────┘
                 │ genera (offline)
┌────────────────┴──────── PIPELINE DE INGESTA (earthaccess) ───────────────────────────────┐
│ fetch → subset → QC → regrid 0,1° → cube → tiles → models                                  │
└────────────────────────────────────────────────────────────────────────────────────────────┘
          NASA Earthdata: GPM IMERG V07 · MODIS MOD13C2 v6.1 · MODIS MOD11C3 v6.1
```

**Principios:**
- El **motor** es la única fuente de verdad. Backend y frontend nunca recalculan ciencia por su cuenta.
- El backend es **solo lectura y sin estado**. Todo lo pesado se precalcula en el pipeline, y las respuestas se cachean.
- **Doble despliegue:** web en Vercel + API en Render o Hugging Face Spaces. Además, un snapshot JSON estático dentro de la web por si la API "duerme" o cae.

---

## 4. Datasets (capa de datos)

### 4.1 Productos NASA

| Variable | Producto | Res. original | Unidades finales | DOI |
|---|---|---|---|---|
| `precip` | GPM IMERG Final Monthly V07 (GPM_3IMERGM) | 0,1° | mm/día | 10.5067/GPM/IMERG/3B-MONTH/07 |
| `evi`, `ndvi` | MODIS/Terra MOD13C2 v6.1 | 0,05° | índice (0–1) | 10.5067/MODIS/MOD13C2.061 |
| `lst_day` | MODIS/Terra MOD11C3 v6.1 | 0,05° | °C (superficie, diurna) | 10.5067/MODIS/MOD11C3.061 |

**Región:** Amazonía central, 10°S–2°N, 70°W–50°W.
**Período:** 2001-01 a 2024-12 (288 meses).
**Grilla común:** 0,1° (120 × 200).

**Opcional (contexto global):** NASA GISTEMP v4, anomalía de temperatura global anual, como capa de contexto del globo. Es un CSV público.

### 4.2 Data cube (nuevo formato central)
Un solo archivo `amazon_core.zarr`, o NetCDF si Zarr da problemas:
- **Dimensiones:** `time` (288), `lat` (120), `lon` (200).
- **Variables:** `precip`, `evi`, `ndvi`, `lst_day` (float32) y `*_valid_frac`.
- **Atributos:** unidades, DOI, versión, fecha de procesamiento y método de QC.

Se construye a partir de los `.npz` mensuales ya existentes, sin volver a descargar nada.

### 4.3 Derivados precalculados

| Archivo | Contenido | Uso |
|---|---|---|
| `processed/series_<region>.parquet` | Serie regional mensual de cada variable + procedencia | Time series, trend |
| `tiles/<var>/<YYYY>.png` y `<YYYY-MM>.png` | Mapa coloreado, con fondo transparente, para superponer en el globo | Time Machine, globo, comparador |
| `tiles/<var>/trend.png` | Mapa de pendiente de Sen por pixel (diverging verde/rojo), con los no significativos atenuados | Mapa de tendencias |
| `tiles/whatif/<pct>.png` | Δ temperatura por pixel para −40…+40 % de lluvia, en pasos de 5 | What-If en mapa |
| `models/whatif_lst_precip.json` | a, b, IC, R² validado, rango, residuos | What-If interactivo |
| `colormaps.json` | Escalas y rangos fijos por variable | Leyendas coherentes |

### 4.4 Paletas (colores de la Tierra)

| Variable | Escala | Colores |
|---|---|---|
| EVI/NDVI | Secuencial | ocre (#a16207) → amarillo verdoso → verde intenso (#15803d) |
| Precipitación | Secuencial | azul muy claro → azul profundo (#1e3a8a) |
| Temperatura superficial | Secuencial | amarillo → naranja → rojo (#b91c1c) |
| Anomalías y tendencias | Divergente | rojo (seco o caliente) ↔ gris neutro ↔ verde o azul |
| Escenario simulado | Igual a su variable, con **trama rayada** y etiqueta "SIMULATION" | — |

---

## 5. Motor científico — paquete `earthscope_engine`

```
engine/earthscope_engine/
├── catalog.py      Variables, regiones, datasets, unidades, DOI, advertencias (una sola definición)
├── io.py           Abrir el cubo, series regionales, recortes por subregión (bbox dibujado por el usuario)
├── qc.py           Fill values, rangos válidos, escalas, fracción válida
├── aggregate.py    Promedio ponderado cos(lat), climatología, anomalías, temporadas, anuales
├── trends.py       Mann-Kendall estacional + Hirsch–Slack, Sen estacional, OLS-AR(1) con IC   [YA VALIDADO]
├── robustness.py   Sensibilidad a recortes del período, leave-one-year-out de la tendencia
├── trend_maps.py   Tendencia por pixel + control de significancia múltiple (FDR Benjamini-Hochberg)
├── whatif.py       Modelos candidatos → validación LOYO → solo se publican los que pasan el umbral [YA VALIDADO]
├── evidence.py     Construye el grafo de evidencias a partir de los resultados (nodos y aristas tipados)
├── report.py       Informe reproducible (JSON + Markdown/PDF) con fuentes y limitaciones
└── schemas.py      Modelos Pydantic compartidos con la API
```

### 5.1 Reglas del motor
- **Umbral para publicar un escenario What-If:** R² validado fuera de muestra ≥ 0,3. Si no se cumple, el escenario se muestra como "no skill", nunca como simulación.
- **Toda salida incluye** `provenance` (dataset, DOI, archivos, fechas), `method`, `parameters`, `uncertainty` y `limitations`.
- **Tendencias por pixel:** corrección por comparaciones múltiples (FDR), para que el mapa no muestre "tendencias" por azar.
- **Extrapolación:** cualquier valor fuera del rango observado se marca `extrapolation: true`.

### 5.2 Modelos What-If

| Escenario | Estado | Evidencia |
|---|---|---|
| Lluvia de temporada seca → temperatura superficial | ✅ Publicado | r = −0,75; R² validado = 0,49; −20 % → +0,47 °C (IP 95 %: 28,2–29,5 °C) |
| Lluvia → EVI | ❌ No publicado ("no skill") | R² validado ≤ 0,1. Se muestra como resultado negativo en el Evidence Graph |
| Extrapolación de tendencia a 2030 | ⚠️ Opcional | Solo como "trend extrapolation" con cono de incertidumbre creciente. **No es pronóstico** |

---

## 6. Backend — API REST (FastAPI)

Base: `/api/v1`. Respuestas en JSON, cacheadas, documentadas automáticamente en `/docs` (OpenAPI).

| Método y ruta | Parámetros | Devuelve |
|---|---|---|
| `GET /health` | — | Estado, versión de datos y del motor |
| `GET /variables` | — | Catálogo: clave, nombre, unidades, dataset, DOI, advertencias, paleta |
| `GET /regions` | — | Regiones disponibles con bbox y geometría |
| `GET /timeseries` | `var, region, start, end, agg=monthly\|annual\|season` | Serie, climatología, anomalías y procedencia |
| `GET /trend` | `var, region, start, end, alpha` | TrendResult + robustez + texto explicativo |
| `GET /trend/map` | `var, start, end` | URL del PNG de tendencia por pixel + leyenda + % de píxeles significativos |
| `GET /maps/{var}/{period}` | `period = YYYY o YYYY-MM` | URL del tile PNG + rango de colores + valor regional |
| `GET /maps/{var}/frames` | `from, to, step` | Lista de frames para la animación |
| `GET /compare` | `var, a=YYYY, b=YYYY` | Dos tiles + mapa de diferencia + estadística de cambio |
| `GET /whatif/models` | — | Modelos disponibles con su validación (incluye los "no skill") |
| `POST /whatif/simulate` | `{model, pct_change}` | Scenario: estimación, IC, IP, extrapolación, supuestos, tile Δ |
| `GET /evidence/graph` | `var, region, start, end` | Nodos y aristas tipados (formato Cytoscape) |
| `GET /evidence/node/{id}` | — | Detalle: fuente, método, parámetros, resultado, a favor y en contra, alcance |
| `GET /report` | `var, region, start, end, format=json\|md` | Informe reproducible descargable |
| `POST /assistant/ask` *(opcional)* | `{question, context_ids}` | Respuesta de IA basada solo en resultados del motor, con citas a nodos |

**Calidad:** validación de entradas con Pydantic, errores 4xx claros, CORS limitado al dominio de la web, logging y pruebas con `pytest` + `httpx`.

**Snapshot estático:** `scripts/export_static.py` llama a cada endpoint con todas las combinaciones de la demo y guarda las respuestas en `web/public/static-api/`. Si la API no responde en 2 s, el frontend usa el snapshot.

---

## 7. Frontend — experiencia web

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + **deck.gl** (con `_GlobeView` para el globo 3D y BitmapLayer para los tiles) o **globe.gl** + **Plotly.js** o **Recharts** (series) + **Cytoscape.js** (Evidence Graph) + **Framer Motion** (animaciones) + **Zustand** (estado global).

### 7.1 Pantallas

**① Home / Mission Control**
- Globo 3D oscuro girando lentamente, con la capa EVI del último año y la región resaltada con un borde cian pulsante.
- Panel "glass" con tres tarjetas: **Detect**, **Simulate**, **Investigate**.
- KPIs reales: "Surface temperature +0.69 °C (2001–2024, p<0.001)", "Precipitation −10.8 % (sensitive to 2023–24)", "EVI +2.1 %".
- Botón "Start investigation".

**② Explorer (pasos 1–3 del reto)**
- Globo o mapa interactivo: clic en una región predefinida, o dibujar un rectángulo dentro de la caja disponible.
- Selector de variables con chips de color (verde, azul, rojo).
- Selector de período con doble deslizador 2001–2024.

**③ Time Machine (paso 4 + visualización pasado → presente → escenario)**
- Mapa animado mes a mes o año a año, con botones ▶ / ⏸, velocidad y barra de tiempo, al estilo ESA.
- Debajo, la serie temporal sincronizada: un cursor vertical avanza con la animación.
- **Zonas de la línea de tiempo:**
  - **Past** (2001 → 2023): línea sólida, color de la variable.
  - **Present** (2024): punto destacado con halo.
  - **Scenario** (opcional): línea punteada + banda de incertidumbre + etiqueta "SIMULATION – not a forecast".
- Eventos anotados con datos: los años secos 2015, 2023 y 2024 aparecen como anomalías marcadas.

**④ Trend Detector (paso 5)**
- Tarjeta de veredicto en color, con p-valor, pendiente de Sen, IC 95 % y cambio porcentual.
- **Mapa de tendencia por pixel**: dónde cambia más, con los píxeles no significativos atenuados.
- **Panel de robustez:** "¿se sostiene la conclusión si quito 2023–2024?", con resultado visual (✔ estable / ⚠ sensible).
- Explicación en lenguaje claro, generada desde el motor con plantillas, no con IA.

**⑤ Compare (antes / después)**
- Cortina deslizable entre dos años, por ejemplo EVI 2001 frente a 2024, o temperatura 2001 frente a 2024.
- Mapa de diferencia y estadística de cambio.

**⑥ What-If Earth Lab**
- Deslizador "Dry-season precipitation change: −40 % … +40 %".
- Resultado grande: "+0.47 °C (95 % prediction interval: −0.17 … +1.10)".
- Gráfico de dispersión con los 24 años reales (puntos), la recta del modelo, la banda de predicción y el escenario como estrella. Así se ve cómo el escenario se compara con años reales, por ejemplo "similar to 2015".
- Mapa Δ por pixel con trama rayada (simulación), con la baja confianza atenuada.
- Zona de extrapolación sombreada en rojo, con aviso cuando se sale del rango observado.
- Panel "Assumptions" siempre visible y panel "Model validation" (R² validado, error, n = 24 años).
- Tarjeta "Not available: vegetation response". Explica que el modelo no superó la validación: honestidad científica como valor.

**⑦ Evidence Graph**
- Grafo interactivo con disposición de fuerzas. Los nodos están coloreados por tipo:
  - Hipótesis: violeta.
  - Dataset NASA: azul.
  - Observación: cian.
  - Tendencia: verde o rojo.
  - Prueba estadística: blanco.
  - Simulación: rayado.
  - Limitación: ámbar.
  - Información faltante: borde punteado.
- Las aristas tienen estilo según el tipo:
  - `observed`: sólida.
  - `correlated_with`: guiones.
  - `hypothesized_cause`: punteada con "?".
  - `contradicts`: roja.
- **Nunca hay aristas de causalidad no demostrada.**
- Clic en un nodo abre un panel lateral con la fuente, el DOI, el método, los parámetros, el resultado, la evidencia a favor y en contra, y el alcance.
- Botón "What supports this conclusion?": resalta el camino desde la conclusión hasta los datos originales.

**⑧ Report**
- Informe reproducible: preguntas, datos, métodos, resultados, robustez, escenarios, limitaciones y fuentes.
- Descarga en JSON o Markdown/PDF.

**⑨ About / Data & Methods**
- Datasets con DOI, métodos con referencias, declaración de IA y equipo (sin datos personales de menores).

### 7.2 Sistema de diseño
- **Fondo:** #050d1a; superficies "glass": rgba(11,26,46,.7) con desenfoque de fondo de 12 px y borde #1e3a5f.
- **Acento:** cian #22d3ee. Semánticos: verde #34d399, azul #3b82f6, rojo #f87171, ámbar #fbbf24, gris #94a3b8.
- **Tipografía:** Space Grotesk o Inter para títulos; JetBrains Mono para cifras.
- **Animaciones:** globo con rotación lenta; transiciones de 200–400 ms; frames del Time Machine a 4–8 fps; nada de animación que oculte datos.
- **Accesibilidad:** contraste AA y paletas aptas para daltonismo en los mapas divergentes (verde/rojo + luminosidad distinta).

---

## 8. Estructura del repositorio (monorepo)

```
RK_Vanguard_EarthScopeAI/
├── pipeline/                 Ingesta NASA (fetch_nasa.py) + build_cube.py + build_tiles.py + build_models.py
├── engine/earthscope_engine/ Motor científico (paquete Python) + tests/
├── api/                      FastAPI: main.py, routers/, deps.py, tests/
├── web/                      Next.js: app/, components/, lib/api.ts, public/static-api/, public/tiles/
├── data/                     cube/, processed/, tiles/, models/   (versionado ligero; tiles en la web)
├── scripts/export_static.py  Snapshot de la API para el modo estático
├── docs/                     DOCUMENTACION.md, BLUEPRINT (este), METHODS.md, SUBMISSION.md (inglés)
├── legacy/streamlit_app.py   App v1 como herramienta de análisis y respaldo
└── README.md                 (inglés) qué es, cómo correrlo, enlaces, fuentes
```

---

## 9. Despliegue y estabilidad

| Componente | Servicio | Notas |
|---|---|---|
| Web (Next.js) | **Vercel** (gratis) | Incluye tiles PNG y el snapshot estático: funciona aunque la API caiga |
| API (FastAPI) | **Render** o **Hugging Face Spaces** (gratis) | Puede "dormir": la web la despierta al cargar y mientras tanto usa el snapshot |
| Datos | Dentro del repo o del contenedor de la API (pocas decenas de MB) | Sin base de datos: todo es de solo lectura |
| Respaldo final | GitHub Pages con el build estático | Plan C si falla Vercel |

**Checklist de estabilidad antes de enviar:**
- Abrir el enlace en una ventana privada y en un celular.
- Probar con la API apagada.
- Comprobar que no se pide inicio de sesión.
- Comprobar que no hay errores en la consola.
- Comprobar que todos los textos están en inglés.

---

## 10. Plan de construcción (hasta el cierre)

| Bloque | Horas aprox. | Entregable | Prioridad |
|---|---|---|---|
| B0 | 0,5 | Monorepo, `pipeline/build_cube.py` y `build_tiles.py` desde los `.npz` existentes | Crítica |
| B1 | 2 | Motor `earthscope_engine` (migrar trends y whatif; añadir robustness, trend_maps y evidence) + pruebas | Crítica |
| B2 | 2 | API FastAPI con todos los GET + `/whatif/simulate` + pruebas + `export_static.py` | Crítica |
| B3 | 3 | Web: layout, sistema de diseño, Home con globo, Explorer, Trend Detector (**5 pasos cubiertos**) | Crítica |
| B4 | 2 | Time Machine animado + Compare | Alta |
| B5 | 2 | What-If Lab completo | Alta |
| B6 | 2 | Evidence Graph | Alta |
| B7 | 1,5 | Despliegue (Vercel + Render) + modo estático + checklist | Crítica |
| B8 | 2 | 7 diapositivas en inglés, textos de envío, declaración de IA, Submit | Crítica |
| B9 | — | Asistente de IA | Opcional |

**Regla de corte:** si a las 6:00 p. m. del domingo no están B4–B6, se entrega lo que funcione (B3 + B7 + B8 obligatorios) y Streamlit queda como respaldo enlazado en el README.

---

## 11. Criterios de aceptación

| Criterio NASA | Cómo lo demuestra la web |
|---|---|
| **Relevance** | Los 5 pasos visibles en Explorer → Time Machine → Trend Detector; todo calculado con IMERG y MODIS |
| **Validity** | Mann-Kendall estacional con corrección por dependencia, IC, robustez, What-If validado fuera de muestra, resultados negativos reportados |
| **Creativity** | Time Machine pasado → presente → escenario; What-If con incertidumbre honesta; Evidence Graph navegable |
| **Impact** | Herramienta educativa y de investigación reutilizable para otras regiones y variables; explica la evidencia, no solo la muestra |
| **Presentation** | Globo y visuales de nivel profesional, narrativa Detect → Simulate → Investigate en 7 diapositivas |

**Definición de "terminado" por pantalla:** usa datos reales, muestra unidades y fuente, distingue observado y simulado, funciona sin la API (snapshot), se ve bien en móvil y está en inglés.

---

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Tiempo insuficiente para Next.js | El snapshot estático + Streamlit siguen siendo una entrega válida; prioridad a los 5 pasos |
| API gratuita que se duerme o cae | Snapshot JSON dentro de la web; despertar la API al cargar |
| Globo 3D lento en equipos modestos | Tiles PNG ligeros (≤ 150 KB), modo 2D alternativo |
| Sobreinterpretar resultados | Etiquetas obligatorias, robustez, límites visibles, Evidence Graph |
| Problemas de formato (Zarr o pyhdf) | NetCDF como alternativa; los `.npz` ya funcionan |
| Reglas de IA y de menores | Declaración en el envío; sin rostros, voces ni nombres de menores en el demo |
