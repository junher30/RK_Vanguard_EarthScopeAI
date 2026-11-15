# EarthScope AI
## Documento 02 — Casos de uso y flujos de interacción

**Proyecto:** EarthScope AI — Planetary Investigation Lab · Equipo RoboKids · NASA Space Apps Challenge 2026
**Módulo:** 1 — Exploración Global y Visualización Ambiental Histórica
**Versión:** 0.3 (v0.2 del equipo, adaptada a lo ya construido)
**Estado:** Borrador para revisión
**Fecha:** 14 de noviembre de 2026
**Documento de referencia:** [Documento 01 — Módulo de Exploración Global](01_VISION_Y_FUNCIONAMIENTO.md)
**Relacionados:** [DOCUMENTACION.md](referencia/DOCUMENTACION_TECNICA.md)

Leyenda de estado: ✅ implementado · 🟡 parcial · ⏳ pendiente · ❌ no disponible con los datos actuales

---

## 0. Qué cambia frente a la v0.2

La v0.2 describe el comportamiento deseado. Esta versión conserva sus 12 casos de uso y añade, para cada uno, **cómo funciona hoy en la web** (`web/`, Next.js) y **qué falta**. Hay cinco ajustes de fondo:

| # | En la v0.2 | En lo construido | Consecuencia |
|---|---|---|---|
| 1 | Variables: temperatura, precipitación y **humedad** | Hay **temperatura de superficie**, **precipitación** y **vegetación (EVI)**. **No hay humedad** | La humedad queda ⏳ hasta descargar un producto NASA nuevo (§4.2) |
| 2 | "El sistema consulta los conjuntos de datos NASA" | Los datos se **descargan y procesan antes**, en Python. La web lee archivos ya calculados | "Consultar" significa leer `web/public/data/`; no hay llamadas en vivo a NASA |
| 3 | La capa se limita al **polígono** del visitante | La capa cubre la **caja fija de la Amazonía central** (10°S–2°N, 70°W–50°W) | Recortar al polígono es ⏳ (CU-10) |
| 4 | Período: "año o mes" | Hay **24 años** (2001–2024) en mapas anuales. Los mensuales existen en `data/` pero no se exportan a la web | Mensual es ⏳ (CU-09) |
| 5 | Primero se confirma el polígono, y después se consultan los datos | Hoy las capas se pueden ver **sin confirmar** una región, para que los jueces vean datos al instante | Se propone mantenerlo como atajo (RN-11 ajustada, §8) |

El principio rector no cambia: **la interfaz nunca calcula ciencia**. Las tendencias, los promedios y las pruebas se calculan en `science/` y se exportan con `export/build_site_data.py`.

---

## 1. Introducción

Este documento describe los casos de uso del Módulo 1. Un visitante explora un globo 3D, delimita un área y consulta datos ambientales históricos de NASA, representados como capas de color sobre el globo.

## 2. Objetivo del documento

Identificar los casos de uso del Módulo 1, su estado de implementación y lo que falta, como base para el Documento 03 (modelo conceptual de información) y para la especificación de requerimientos.

## 3. Alcance funcional

### 3.1. Exploración y selección geográfica
El visitante navega el globo, delimita un área y la confirma. Hoy la selección es por **punto**; el **polígono** está especificado en el Documento 01, §7.3–7.7.

### 3.2. Visualización ambiental histórica ✅ (versión inicial)
El visitante elige una variable y un año. El sistema muestra:
- El mapa de color sobre el globo, con su leyenda.
- La serie regional de 24 años.
- El veredicto de tendencia y la prueba de robustez.
- La fuente con su DOI.

**Fuera del alcance:** autenticación, guardado permanente de polígonos y pronósticos. El What-If Lab (simulación) existe como Módulo B, pero no forma parte del Módulo 1.

---

## 4. Actores y fuentes

### ACT-01 — Visitante
Persona que entra sin cuenta. Sin roles ni permisos diferenciados.

### 4.1. Fuentes de datos (sistemas externos, no actores)

| Variable en la web | Producto NASA | Resolución usada | Período | Estado |
|---|---|---|---|---|
| Precipitación (mm/día) | GPM IMERG V07 mensual | 0,1° | 2001–2024 | ✅ |
| Temperatura **de superficie** diurna (°C) | MODIS MOD11C3 v6.1 | 0,05° → 0,1° | 2001–2024 | ✅ |
| Vegetación EVI (índice) | MODIS MOD13C2 v6.1 | 0,05° → 0,1° | 2001–2024 | ✅ (no estaba en la v0.2) |
| Humedad relativa y temperatura del aire (2 m) | MERRA-2 M2TMNXSLV (reanálisis) | 0,5° × 0,625° → 0,5° | 2001–2024 | ✅ ([DATOS_GLOBALES.md](referencia/DATOS_GLOBALES.md)) |

La observación de la v0.2 se cumple: la web etiqueta la variable como *Land surface temperature*, y su advertencia dice que **no es temperatura del aire**.

### 4.2. Opciones para la humedad (decisión pendiente)

| Opción | Producto NASA | Qué mide | Cobertura | Limitación |
|---|---|---|---|---|
| A | AIRS L3 mensual (AIRS3STM) | Humedad relativa / vapor de agua en el aire | sep. 2002 → hoy, 1° | Resolución gruesa (≈ 110 km); falta 2001–ago. 2002 |
| B | SMAP L3/L4 | Humedad del **suelo** | abr. 2015 → hoy, 9–36 km | Solo 10 años: no sirve para la tendencia 2001–2024 |
| C | MERRA-2 (M2TMNXSLV) | Humedad específica del aire a 2 m | 1980 → hoy, 0,5° × 0,625° | Es un **reanálisis** (modelo + observaciones), no una observación directa |

Recomendación: **opción C** si se quiere la serie completa 2001–2024, declarándola como reanálisis. **Opción A** si se prefiere solo observación satelital y se acepta empezar en 2003. Cualquiera de las dos requiere descargar con `pipeline/fetch_nasa.py` (Earthdata Login) y volver a ejecutar el exportador.

---

## 5. Casos de uso y estado

| Código | Caso de uso | Estado | Dónde vive |
|---|---|---|---|
| CU-01 | Explorar el globo terráqueo | ✅ | `components/globe/EarthGlobe.tsx` |
| CU-02 | Activar selección poligonal | ✅ | `explorer/AreaPanel.tsx`, `Explorer.tsx` |
| CU-03 | Delimitar área geográfica | ✅ polígono (y punto) | `globe/EarthGlobe.tsx`, `lib/geo.ts` |
| CU-04 | Editar área geográfica | ✅ | `globe/EarthGlobe.tsx`, `lib/store.ts` |
| CU-05 | Confirmar área geográfica | ✅ | `lib/store.ts` (GeoJSON en `sessionStorage`) |
| CU-06 | Cancelar selección geográfica | ✅ | `AreaPanel.tsx` (✕ / Esc) |
| CU-07 | Consultar datos ambientales históricos | ✅ cualquier área (API) | `lib/api.ts` → `api/main.py` → `science/area.py` |
| CU-08 | Seleccionar variable ambiental | ✅ incluye humedad (MERRA-2) | `components/data/DataDock.tsx` |
| CU-09 | Seleccionar período histórico | 🟡 solo años | `DataDock.tsx` (línea de tiempo) |
| CU-10 | Visualizar capa ambiental | 🟡 sin recorte al polígono | `EarthGlobe.tsx` (capa `tiles`) |
| CU-11 | Consultar información de una celda | ⏳ | — |
| CU-12 | Activar o desactivar capa ambiental | ✅ | `DataDock.tsx` ("Hide") |

Las rutas son relativas a `web/`.

---

## 6. Especificación de casos de uso

Cada caso conserva el flujo de la v0.2. Se añaden **Implementación actual** y **Falta**.

### CU-01 — Explorar el globo terráqueo ✅
**Flujo principal:** el visitante entra → carga el globo 3D (NASA Blue Marble) → gira, acerca y aleja → el sistema actualiza la vista.
**Implementación actual:**
- Portada animada.
- Rotación con inercia y zoom limitado, con botones +/−.
- Pausa de la auto-rotación y cambio a vista nocturna (Black Marble).
- "Ir a coordenadas" y salto a la región de estudio.
- Los países se resaltan al pasar el cursor.
**A1 Error de carga:** se muestra "Loading Earth…" mientras carga. **Falta:** un mensaje de error con botón "Reintentar" si el motor 3D no carga (la versión anterior en HTML sí lo tenía).

### CU-02 — Activar selección poligonal ✅
El botón **Select area** activa el modo dibujo: detiene la rotación, cambia el cursor a cruz y muestra las indicaciones en el panel. **Esc** o el botón ✕ vuelven al modo exploración (A1).

### CU-03 — Delimitar área geográfica ✅
**Implementación actual:**
- Cada clic agrega un vértice y se dibuja un trazo discontinuo.
- El polígono se cierra con clic en el primer vértice, con **Enter** o con **Close shape**, y entonces se rellena en cian.
- **Retroceso** borra el último punto.
- **A1:** **Close shape** está deshabilitado con menos de 3 puntos, y los puntos alineados dan el error V-03.
- **A2:** solo se aceptan puntos sobre la superficie del globo.
- **A3:** se puede cancelar en cualquier momento.

La selección por **punto** se mantiene como atajo fuera del modo dibujo.

### CU-04 — Editar área geográfica ✅
- **Mover:** arrastrar un vértice; la cámara queda quieta mientras se arrastra.
- **A1 Agregar:** arrastrar el punto pequeño del centro de un segmento.
- **A2 Eliminar:** clic derecho sobre un vértice. Con menos de 3 puntos, el polígono vuelve a quedar abierto.
- **A3 Geometría inválida:** los errores aparecen en rojo (V-01…V-07), los bordes se ven rojos y se oculta el relleno.
- **Deshacer:** Ctrl/⌘+Z o botón, con hasta 50 pasos.
- Un área ya confirmada se puede volver a editar con **Edit**.

### CU-05 — Confirmar área geográfica ✅
**Confirm study area** solo se habilita si no hay errores. Al confirmar:
- Se guarda un **GeoJSON** (RFC 7946, anillo antihorario) con el área en km², el centro, si cruza el antimeridiano y la cobertura de datos.
- Se guarda en `sessionStorage` y se emite `earthscope:zone-confirmed`.
- Avanza el indicador de pasos.
- Al recargar, el globo vuelve al área.

El panel muestra puntos, área, centro y cobertura de datos NASA (completa, parcial con % o ninguna) con el número de celdas de 0,1°.

### CU-06 — Cancelar selección geográfica ✅
✕ o **Esc** descartan el dibujo en curso. **New area** empieza otro, y 🗑 borra el área confirmada.

### CU-07 — Consultar datos ambientales históricos 🟡
**Flujo adaptado a la arquitectura real:**
1. *(Antes, fuera de la web)* `pipeline/fetch_nasa.py` descarga los productos NASA, recorta la región, aplica el control de calidad y guarda las series y los mapas en `data/`.
2. *(Antes)* `export/build_site_data.py` ejecuta `science/` y escribe en `web/public/data/`:
   - `manifest.json`: variables, unidades, DOI, años, escalas de color y límites de la región.
   - `series/<var>.json`: series mensuales y anuales, tendencia, robustez y advertencias.
   - `maps/<var>/{value|anomaly}/<año>.png`: mapas anuales. Las celdas sin datos son transparentes.
3. *(En la web)* El visitante elige la variable y el año. La web lee esos archivos.

**A1 Sin datos:** para un punto fuera de la caja, el panel muestra *NASA data coverage: Not yet*. **Falta:** hacerlo también para un polígono, con el porcentaje de cobertura.
**A2 Datos incompletos:** solo se usan años con 12 meses válidos. Las celdas sin dato (agua, nubes) se dejan transparentes (RN-17 ✅).
**A3 Error de recuperación:** si no carga el manifiesto, aparece el aviso *NASA data layers unavailable*. **Falta:** un botón "Reintentar".

### CU-08 — Seleccionar variable ambiental 🟡
**Implementación actual:** botones **Precipitation**, **Vegetation (EVI)** y **Surface temperature**. Al elegir uno se actualizan el mapa, la leyenda, la serie, el veredicto y la fuente.
**Falta:** humedad (§4.2).
**Desviación de la v0.2:** la variable se puede elegir sin confirmar una región (§0, punto 5).

### CU-09 — Seleccionar período histórico 🟡
**Implementación actual:**
- Barra de años 2001–2024 con reproducción animada (0,8 s por año, en bucle).
- Clic en la gráfica para saltar a un año.
- Modo **Annual mean** o **Anomaly vs 2001–2024**.
**Falta:** resolución mensual (288 mapas por variable ya existen en `data/grids/`; habría que exportarlos).
**A1:** el control solo ofrece los años disponibles, así que no se puede elegir un período sin datos.

### CU-10 — Visualizar capa ambiental 🟡
**Implementación actual:**
- Mapa anual con escala de color propia por variable:
  - Lluvia: azules.
  - Vegetación: ocres a verdes.
  - Temperatura: amarillo a rojo.
  - Anomalías: divergentes.
- Leyenda con mínimo, máximo y unidades (RN-16 ✅).
- Contorno visible de la región y celdas sin dato transparentes (RN-17 ✅).
- No se interpola nada que no venga de los datos (A1 ✅).
- Al cambiar de variable o de año no se pierde la región (A2/A3 ✅, RN-18 ✅).

**Falta:** recortar la capa al **polígono** del visitante (paso 5 de la v0.2). Recortar es una operación visual sobre la imagen: no calcula ciencia y puede hacerse en la web.

### CU-11 — Consultar información de una celda ⏳
**Propuesta:** al hacer clic sobre la capa, mostrar el valor de esa celda de 0,1°, su unidad, el año y la fuente. Para eso el exportador debe publicar los valores por celda, no solo la imagen PNG. Formato sugerido: un binario por variable y año (120 × 200 valores, unos 47 KB sin comprimir), del que la web lee el valor de la celda pulsada. Leer un valor no es calcular, así que respeta el principio rector.
**A1:** si la celda no tiene dato, se muestra "No valid data for this cell and year".

### CU-12 — Activar o desactivar capa ambiental ✅
**Implementación actual:** el botón **Hide**, o pulsar de nuevo la variable activa, oculta la capa. La zona confirmada se mantiene (RN-19 ✅).

---

## 7. Flujo general del Módulo 1

| # | Paso (v0.2) | Estado |
|---|---|---|
| 1 | Acceso público | ✅ |
| 2 | Carga del globo 3D | ✅ |
| 3 | Exploración | ✅ |
| 4 | Activar la selección poligonal | ✅ |
| 5 | Crear vértices | ✅ |
| 6 | Cerrar y editar el polígono | ✅ |
| 7 | Validar la geometría | ✅ |
| 8 | Confirmar la región | ✅ |
| 9 | Elegir la variable | ✅ |
| 10 | Elegir el período | 🟡 (anual) |
| 11 | Consultar y procesar los datos | ✅ procesados antes, en Python |
| 12 | Mostrar la capa sobre la región | 🟡 (caja fija, sin recorte) |
| 13 | Consultar valores individuales | ⏳ |
| 14 | Cambiar variable, período o visibilidad | ✅ |
| 15 | Cambiar de región | ✅ |

**Flujo de demo para jueces (ya funciona):** "Central Amazon case study" → el globo vuela a la región y activa la lluvia → reproducir 2001 → 2024 → cambiar a **Anomaly** y ver la sequía de 2023 → cambiar a temperatura → leer el veredicto y la advertencia de robustez.

## 8. Reglas de negocio complementarias

| Código | Regla (v0.2) | Estado / ajuste |
|---|---|---|
| RN-11 | Solo se consultan datos sobre polígonos confirmados y válidos | **Ajuste propuesto:** las capas de la región de estudio se pueden ver sin confirmar (demo); las **estadísticas de un área propia** sí exigen un polígono confirmado |
| RN-12 | Cada variable tiene una fuente científica identificable | ✅ dataset y DOI en el panel |
| RN-13 | Los períodos dependen de la cobertura del dataset | ✅ solo se ofrecen los años con datos |
| RN-14 | Una geometría válida no garantiza que haya datos | ✅ indicador de cobertura |
| RN-15 | Los colores corresponden a datos procesados, no a estimaciones | ✅ los PNG salen de `data/grids/` |
| RN-16 | Cada capa tiene una leyenda con rangos y unidades | ✅ |
| RN-17 | Las zonas sin datos no se muestran como medición | ✅ transparentes |
| RN-18 | Cambiar variable o período no borra la región | ✅ |
| RN-19 | Ocultar la capa no borra la región ni los filtros | ✅ |
| RN-20 | Se respetan las diferencias entre productos | ✅ advertencias por variable (temperatura de superficie ≠ del aire; EVI ≠ deforestación) |
| RN-21 *(nueva)* | La web no calcula ciencia: tendencias, promedios y pruebas vienen de `science/` | ✅ |
| RN-22 *(nueva)* | Toda conclusión de tendencia muestra su prueba de robustez | ✅ aviso "Not robust" en lluvia |

## 9. Validaciones del sistema

| Validación (v0.2) | Estado |
|---|---|
| **Geográficas:** mínimo de vértices, coordenadas, cierre, área, autointersección, antimeridiano y polos | ✅ V-01…V-07 en `web/lib/geo.ts` |
| **Ambientales:** fuente, cobertura espacial y temporal, faltantes, unidades y calidad mínima | ✅ en el pipeline (rango válido, factores de escala, fracción de píxeles válidos, solo años con 12 meses) |
| **Visualización:** valor ↔ color, límite del polígono, período ↔ datos, leyenda y zonas sin datos | ✅ excepto el recorte al polígono ⏳ |

Los polos no aplican a los datos actuales (la región es tropical), pero sí a la validación del dibujo.

## 10. Información utilizada por el módulo

| Concepto (v0.2) | Representación real |
|---|---|
| Área geográfica | `area`: GeoJSON `Feature<Polygon>` en `lib/store.ts` (Documento 01, §10). El dibujo en curso está en `draw` (`status`, `vertices`, historial). El punto sigue en `Selection` / `StudyZone` |
| Variable ambiental | `VARIABLES` en `science/variables.py` → `manifest.json` → `VariableMeta` en `lib/data.ts` |
| Período histórico | año dentro de `years[]` del manifiesto (mes: ⏳) |
| Fuente de datos | `dataset`, `doi` y `caveats` por variable |
| Observación ambiental | celda de 0,1° en `data/grids/<región>/<producto>/AAAA-MM.npz`. En la web, solo como color (valor por celda: ⏳, CU-11) |
| Capa ambiental | PNG anual + escala (`scale.value` / `scale.anomaly`) en el manifiesto |

Esto sirve de base directa para el **Documento 03 (modelo conceptual)**.

## 11. Gestión de la información

La v0.2 dejaba abierta la pregunta de si los datos se consultan en vivo, se procesan antes o se guardan en caché. **Ya está resuelta: se procesan antes.**

- La selección del visitante es temporal (`sessionStorage`). No hay base de datos.
- Los datos NASA se descargan una sola vez (unos 59 MB de mapas en `data/`) y se exportan a la web (unos 8 MB en `web/public/data/`).
- Así la web funciona sin servidor y sin cuenta de Earthdata, y es rápida en el demo.
- La v0.2 tiene razón en que los promedios regionales no reconstruyen la distribución espacial. Por eso se exportan **mapas por celda**, no solo las series.

## 12. Criterios de aceptación

| # | Criterio (v0.2) | Estado |
|---|---|---|
| 1 | Acceso sin autenticación | ✅ |
| 2 | Globo 3D | ✅ |
| 3 | Dibujar una región con vértices | ✅ |
| 4 | Editar los vértices | ✅ |
| 5 | Detectar polígonos inválidos | ✅ |
| 6 | Confirmar una región válida | ✅ |
| 7 | Elegir la variable | ✅ (humedad y temperatura del aire: MERRA-2) |
| 8 | Elegir un período disponible | ✅ anual |
| 9 | Consultar los datos del área | ✅ cualquier área (grilla global 0,5°) |
| 10 | Capa dentro del polígono | 🟡 sin recorte |
| 11 | Leyenda de valores | ✅ |
| 12 | Valor de una celda | ⏳ |
| 13 | Activar y desactivar la capa | ✅ |
| 14 | Cambiar variable o período sin perder el área | ✅ |
| 15 | Mensajes cuando no hay datos o falla una consulta | 🟡 falta "Reintentar" |

**Resumen:** 12 ✅ · 2 🟡 · 1 ⏳ (valor por celda).

## 13. Pendientes ordenados por impacto en el demo

1. **CU-11 Valor por celda:** el exportador publica los valores y la web los muestra al hacer clic. Es corto y muy visible.
2. ~~**CU-02/03/04/05 Polígono**~~ ✅ hecho.
3. **CU-10 Recorte al polígono** y porcentaje de cobertura.
4. **Humedad:** decidir entre las opciones de §4.2, descargar y exportar.
5. **CU-09 Mensual:** exportar los 288 mapas por variable.
6. **CU-01 A1 / CU-07 A3:** botón "Reintentar".

Otros documentos por actualizar: el **Documento 01** debe incorporar la visualización ambiental dentro del Módulo 1, y el **Documento 03** debe partir de la tabla del §10.

## 14. Conclusión

La v0.2 describe bien el producto al que apuntamos, y buena parte ya funciona: el globo, las capas NASA con línea de tiempo y leyenda, el panel de tendencia con robustez y la gestión temporal de la zona. Lo que falta es la parte **poligonal** (dibujar, editar, validar y recortar), el **valor por celda** y la **humedad**. La humedad es la única pieza que requiere datos nuevos, no solo código.
