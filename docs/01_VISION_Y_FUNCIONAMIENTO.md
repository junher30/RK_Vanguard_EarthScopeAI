# EarthScope AI
## Documento 01 — Módulo de Exploración Global (selección de región)

**Proyecto:** EarthScope AI — Planetary Investigation Lab · Equipo RoboKids · NASA Space Apps Challenge 2026
**Versión:** 1.2 (adaptada a lo ya construido; alcance ampliado con la visualización ambiental del [Documento 02](02_CASOS_DE_USO.md))
**Módulo:** 01 — Exploración Global (puerta de entrada del frontend web)
**Paso del reto que cubre:** Paso 2, *Choose a region*
**Estado:** ✅ Web Next.js con selección por punto o polígono, validación, cobertura y capas NASA · ⏳ publicación
**Fecha:** 14 de noviembre de 2026
**Documentos relacionados:** [DOCUMENTACION.md](referencia/DOCUMENTACION_TECNICA.md) · [BLUEPRINT_PRODUCTO_FINAL.md](referencia/BLUEPRINT_PRODUCTO_FINAL.md)

---

## 0. Cómo encaja este documento en lo que ya existe

La propuesta original planteaba EarthScope AI empezando desde cero por la exploración del globo, y dejaba el análisis ambiental para "etapas futuras". En realidad, el proyecto ya tiene construida esa parte científica:

| Ya existe | Dónde | Estado |
|---|---|---|
| Descarga y procesamiento de datos NASA (IMERG, MODIS EVI/NDVI y LST), 2001–2024 | `pipeline/fetch_nasa.py`, `data/` | ✅ |
| Motor de tendencias (Mann-Kendall estacional, Sen, OLS con AR(1), robustez) | `science/trends.py` | ✅ |
| What-If Lab: temperatura de temporada seca frente a lluvia, regional y pixel a pixel | `science/whatif.py`, `science/whatif_maps.py` | ✅ modelo |
| App de análisis con los 5 pasos | `app/streamlit_app.py` | ✅ |
| Globo 3D del frontend web: rotar, acercar, hacer clic, confirmar una zona y ver capas NASA | `web/` (Next.js) | ✅ punto y polígono |

Por eso este documento **no define todo el proyecto**. Define solo el **Módulo 01**, que es la pantalla de entrada del frontend web estático (decisión D9) y cumple el **Paso 2 del reto**. Su función es entregar una región bien formada a los módulos que ya existen:

```
Módulo 01 · Exploración Global  ──►  región (GeoJSON)  ──►  Módulo A · Earth Trend Detector (pasos 3–5)
       web/ (Next.js)                   sessionStorage                 └─► Módulo B · What-If Lab
                                                                       └─► Módulo C · Evidence Graph
```

Relación con la numeración de [DOCUMENTACION.md](referencia/DOCUMENTACION_TECNICA.md): los módulos A–D son los **módulos científicos**. El Módulo 01 es un **módulo de interfaz**. No calcula ciencia, en línea con el principio rector "la interfaz nunca calcula", y se limita a producir la geometría de entrada.

---

## 1. Introducción

El Módulo 01 es la experiencia de entrada de EarthScope AI. Muestra un globo terráqueo 3D con imágenes NASA Blue Marble, en el que el visitante explora el planeta y delimita una región de estudio dibujando un polígono. Esa región se entrega a los módulos de análisis.

La primera versión, ya construida, permite seleccionar **un punto** y confirmarlo. Este documento especifica la evolución a **selección poligonal**: dibujar, editar, validar y confirmar un área.

## 2. Planteamiento del problema

Analizar información ambiental suele requerir herramientas SIG especializadas. Para estudiantes y público general, delimitar un área de estudio es una barrera de entrada.

Además, en EarthScope AI hay un problema concreto. Los datos procesados cubren hoy **una sola caja fija**, la Amazonía central (10°S–2°N, 70°W–50°W, decisión D2), en una grilla de 0,1° de 120 × 200 celdas. El visitante necesita saber, mientras dibuja, si su región **tiene datos** o no, sin que eso le impida dibujarla.

## 3. Descripción de la solución

1. El visitante entra a la web pública, sin registro, y ve el globo 3D.
2. Explora con rotación, zoom o el campo "ir a coordenadas", o salta a la región de estudio con el botón **Amazon study region**.
3. Activa **Select area**. Cada clic sobre el globo agrega un vértice y el sistema dibuja los segmentos.
4. Cierra el polígono y lo edita: arrastra, agrega o elimina vértices.
5. El sistema valida la geometría e indica **qué parte del área tiene datos NASA procesados**.
6. El visitante confirma. La región queda en el estado temporal de la sesión y se emite el evento `earthscope:zone-confirmed` para el siguiente paso (variables y período).

## 4. Objetivos

### 4.1. Objetivo general
Completar el Paso 2 del reto (*Choose a region*) en el frontend web, con un globo 3D que permita delimitar áreas de estudio mediante polígonos válidos y entregarlas al motor científico existente.

### 4.2. Objetivos específicos

| # | Objetivo | Estado en `web/` |
|---|---|---|
| 1 | Representar la Tierra en 3D de forma interactiva | ✅ globe.gl + Blue Marble + atmósfera |
| 2 | Navegar con rotación, zoom y salto a coordenadas | ✅ (incluye botones +/−, auto-rotación y "Go to coordinates") |
| 3 | Mostrar la cobertura de datos NASA sobre el globo | ✅ contorno cian de la Amazonía central |
| 4 | Herramienta de selección poligonal | ✅ |
| 5 | Agregar, mover y eliminar vértices | ✅ |
| 6 | Validar la geometría, incluido el antimeridiano | ✅ (`web/lib/geo.ts`) |
| 7 | Calcular la cobertura del polígono frente a la región con datos | ✅ % y celdas de 0,1° |
| 8 | Conservar la región temporalmente y entregarla al Módulo A | ✅ `sessionStorage` (ver §7.8) |

## 5. Público objetivo

- Estudiantes de ciencias ambientales, geografía y tecnología.
- Docentes que necesiten una herramienta visual.
- Investigadores en formación.
- Público general.
- **Jueces de Space Apps:** el demo debe funcionar desde un enlace público, sin inicio de sesión y **en inglés**. La interfaz ya está en inglés; este documento está en español para el equipo.

## 6. Alcance del Módulo 01

### 6.1. Incluido
- Globo 3D con rotación, zoom y salto a coordenadas ✅
- Contornos de países y detección de tierra o agua al hacer clic ✅
- Contorno de la región con datos procesados ✅
- Modo **Select area** para dibujar polígonos ✅
- Edición de vértices (agregar, mover, eliminar) ✅
- Relleno semitransparente del área ✅
- Validación geométrica con mensajes claros ✅
- Indicador de cobertura de datos: % del área con datos y celdas de la grilla de 0,1° ✅
- Confirmar, cancelar o iniciar una nueva selección ✅
- Conservación temporal y entrega al Módulo A ✅ (GeoJSON en `sessionStorage` + evento)

### 6.2. Fuera del Módulo 01 (existen o se harán en otros módulos)

| Funcionalidad | Dónde vive |
|---|---|
| Cálculo de tendencias y significancia | Módulo A (`science/trends.py`). Desde la v1.2, la **visualización** de variables, períodos y capas sí está dentro del Módulo 1: ver [Documento 02](02_CASOS_DE_USO.md) |
| Escenarios hipotéticos | Módulo B (`science/whatif*.py`) |
| Evidencias y limitaciones | Módulo C (Evidence Graph) |
| Asistente de IA | Módulo D (opcional) |
| Descarga de datos para regiones nuevas | `pipeline/fetch_nasa.py` (fuera de la web; requiere Earthdata Login) |
| Registro, cuentas o guardado permanente de regiones | No se hará (RN-01, RN-09) |

## 7. Funcionamiento del sistema

### 7.1. Acceso ✅
El visitante abre la web estática (GitHub Pages) y el globo carga con su panel. Si el motor 3D no carga, por ejemplo sin conexión, se muestra un mensaje de error en lugar de una pantalla vacía. Esto ya está implementado.

### 7.2. Exploración geográfica ✅
El visitante puede arrastrar para rotar, usar la rueda o el gesto de pellizco para hacer zoom (distancia limitada entre 120 y 600), usar los botones +/−, activar la auto-rotación, ir a coordenadas o volar a la región de estudio. Al pasar el cursor sobre un país se muestra su nombre.

### 7.3. Activación de la herramienta poligonal ✅
El botón **Select area** cambia al modo dibujo. En ese modo:
- Se detiene la auto-rotación.
- El clic agrega vértices en lugar de seleccionar un punto.
- El cursor y el panel indican el modo activo ("Click to add points · double-click or click the first point to close").
- La tecla `Esc` cancela el dibujo.

La selección por punto actual se conserva como atajo: un clic fuera del modo dibujo sigue mostrando coordenadas, país y cobertura.

### 7.4. Construcción del polígono ✅
> Implementado: el polígono se cierra con clic en el primer vértice, con **Enter** o con el botón **Close shape**. No se usa doble clic, porque cada clic ya agrega un vértice. **Retroceso** borra el último punto mientras se dibuja.
- Cada clic registra `lat` y `lng`, que el globo entrega en `onGlobeClick` y `onPolygonClick`.
- Los segmentos se dibujan con la capa de trayectorias (`pathsData`) y los vértices con `pointsData`.
- El polígono se cierra con doble clic o con un clic sobre el primer vértice, siempre que haya 3 o más vértices.
- Al cerrarse, se rellena en cian semitransparente. El contorno cian discontinuo de la región con datos sigue visible para comparar.

### 7.5. Edición del polígono ✅
> Implementado: para agregar un vértice se **arrastra** el punto medio de un segmento; se crea en ese momento y se coloca donde se suelta.
| Acción | Interacción propuesta |
|---|---|
| Mover vértice | Arrastrar el vértice. Durante el arrastre se desactivan los controles de cámara y la posición se convierte con `world.toGlobeCoords(x, y)` |
| Agregar vértice | Clic sobre el punto medio de un segmento |
| Eliminar vértice | Clic derecho o doble clic sobre el vértice (si quedan menos de 3, el polígono vuelve a "abierto") |
| Deshacer | `Ctrl/Cmd+Z` deshace el último cambio |
| Cancelar | Botón **Cancel**: descarta el dibujo |
| Nueva selección | Botón **New area** |

Después de cada cambio se redibuja y se vuelve a validar (§7.6).

### 7.6. Validación geográfica ✅
> Implementado en `web/lib/geo.ts`. Además se agregó **V-07**, que rechaza los polígonos que rodean un polo (§9.1 del Documento 02). Con un polígono inválido se muestran solo los bordes en rojo, sin relleno.

| Código | Condición | Mensaje (UI en inglés) |
|---|---|---|
| V-01 | Al menos 3 vértices distintos | "Add at least 3 points." |
| V-02 | Latitud entre −90 y 90 y longitud entre −180 y 180 | "Invalid coordinates." |
| V-03 | Vértices no todos alineados y área > 0 | "The area is too small or the points are aligned." |
| V-04 | Sin autointersecciones entre segmentos no adyacentes | "Edges cross each other. Move a point to fix it." |
| V-05 | Anillo cerrado (el primer vértice se repite al final en el GeoJSON) | automático |
| V-06 | Área menor que medio hemisferio | "Area too large. Draw a smaller region." |

**Antimeridiano (±180°):** antes de validar, las longitudes se "desenvuelven" respecto del vértice anterior para que no haya saltos mayores de 180°. Así, un polígono que cruza el Pacífico se valida como una figura continua. Al guardar, el GeoJSON conserva las longitudes normalizadas en [−180, 180], y si el polígono cruza el antimeridiano se marca `crossesAntimeridian: true`.

**Área:** se calcula sobre la esfera (km²) para mostrarla al visitante y para la regla V-06.

**Validez frente a datos (RN-10):** un polígono sin datos NASA es **geométricamente válido** y se puede confirmar. La falta de datos se informa aparte (§7.7), no como error.

### 7.7. Confirmación y cobertura de datos ✅
Con el polígono válido, el panel muestra:
- Vértices, área (km²), centroide y país principal.
- **Cobertura de datos:** % del área dentro de la región procesada (Amazonía central) y número aproximado de celdas de 0,1°.
  - 100 %: "Full NASA data coverage (2001–2024)."
  - Entre 0 % y 100 %: "Partial coverage: analysis will use the overlapping part."
  - 0 %: "No processed data yet for this area. It can still be saved as a zone of interest."

Al pulsar **Confirm study zone** se guarda la región (§10) y se emite `earthscope:zone-confirmed`. Ese evento ya existe en la versión por punto.

### 7.8. Gestión temporal de la selección (cambio sobre lo construido)
- **Antes:** la versión HTML guardaba la zona en `localStorage` y la restauraba en visitas posteriores, lo que contradecía RN-08 y RN-09. **Corregido en la web Next.js.**
- **Propuesta:** usar `sessionStorage` con la clave `earthscope.studyZone`. La región sobrevive al pasar a la pantalla del Módulo A, que en un sitio estático es otra página, y se pierde al cerrar la pestaña.
- El JSON descargable del informe (Módulo A) ya incluye la región. Esa es la única forma de "conservar" una región, y queda en manos del visitante.

## 8. Actor del sistema

**ACT-01 · Visitante:** persona que accede sin autenticación. Explora el globo, dibuja, edita, valida, confirma o cancela una región y pasa al análisis. No hay más roles en el Módulo 01.

## 9. Reglas de negocio

| Código | Regla | Estado |
|---|---|---|
| RN-01 | Acceso público, sin autenticación | ✅ |
| RN-02 | Las regiones se delimitan con polígonos de vértices geográficos | ✅ (el punto se conserva como atajo) |
| RN-03 | Todo polígono confirmado cumple V-01…V-06 | ✅ |
| RN-04 | Mínimo 3 vértices distintos y no alineados | ✅ |
| RN-05 | Se pueden agregar, mover y eliminar vértices durante la edición | ✅ |
| RN-06 | No se puede confirmar una geometría inválida (botón deshabilitado y mensaje) | ✅ |
| RN-07 | Se puede cancelar y empezar una nueva selección | ✅ |
| RN-08 | La región confirmada se conserva durante la sesión | ✅ `sessionStorage` |
| RN-09 | No hay almacenamiento permanente de regiones | ✅ `sessionStorage` |
| RN-10 | La validez geométrica no depende de que haya datos | ✅ (el punto fuera de la caja se puede confirmar) |
| RN-11 *(nueva)* | La cobertura de datos se muestra siempre, separada de la validez | ✅ |
| RN-12 *(nueva)* | El Módulo 01 no calcula ciencia: solo produce geometría y cobertura | ✅ |
| RN-13 *(nueva)* | Toda la interfaz visible para jueces está en inglés | ✅ |

## 10. Información manejada por el módulo

Se usa **GeoJSON (RFC 7946)**, que encaja directamente con el modelo conceptual de la propuesta, con el formato JSON que ya exporta el proyecto y con `science/`.

| Concepto de la propuesta | Representación |
|---|---|
| Área geográfica | `Feature` con geometría `Polygon` |
| Vértice geográfico | Par `[lon, lat]` dentro del anillo; el orden en el arreglo es su posición |
| Estado (en edición / confirmada) | `properties.status` |

```json
{
  "type": "Feature",
  "geometry": { "type": "Polygon",
    "coordinates": [[[-65.0,-8.0],[-55.0,-8.0],[-55.0,-2.0],[-65.0,-2.0],[-65.0,-8.0]]] },
  "properties": {
    "id": "tmp-1731600000000",
    "status": "confirmed",
    "areaKm2": 738700,
    "centroid": [-60.0, -5.0],
    "crossesAntimeridian": false,
    "dataCoverage": { "region": "amazon_core", "fraction": 1.0, "cells": 6000 },
    "confirmedAt": "2026-11-14T15:00:00Z"
  }
}
```

> Ojo con el orden: GeoJSON usa **`[lon, lat]`**, mientras que globe.gl y el código actual usan `lat`/`lng` por separado. La conversión se hace en un solo lugar.

La región actual de `science/variables.py` (`REGIONS["amazon_core"]`, caja `lat_min/lat_max/lon_min/lon_max`) es un caso particular de este formato: un polígono rectangular de 4 vértices.

## 11. Persistencia y modelo de datos

El Módulo 01 **no necesita base de datos**. La región vive en el estado de la página y en `sessionStorage`. Esto es coherente con el resto del proyecto, que es un frontend estático alimentado por JSON precalculado sin servidor.

Las entidades `Region` y `GridMap` de [DOCUMENTACION.md §6](referencia/DOCUMENTACION_TECNICA.md) ya cubren el lado científico. Este módulo solo agrega la representación GeoJSON de la región elegida.

## 12. Criterios de aceptación

| # | Criterio | Estado |
|---|---|---|
| 1 | Acceso al globo sin autenticación | ✅ |
| 2 | Rotación y zoom controlados | ✅ |
| 3 | Crear polígonos con clics sobre el globo | ✅ |
| 4 | Mover, agregar y eliminar vértices | ✅ |
| 5 | Detectar e informar geometrías inválidas, incluido el antimeridiano | ✅ |
| 6 | Confirmar una región válida | ✅ |
| 7 | Conservar la región en la sesión y entregarla al Módulo A | ✅ en sesión · ⏳ el Módulo A aún analiza la caja fija (§14) |
| 8 | Cancelar y hacer otra selección | ✅ |
| 9 *(nuevo)* | Mostrar la cobertura de datos del polígono | ✅ |
| 10 *(nuevo)* | Funciona en un enlace público abierto en ventana privada | ⏳ (pendiente de publicar) |

## 13. Tecnología (la ya elegida)

| Elemento | Tecnología | Nota |
|---|---|---|
| Aplicación | **Next.js 16 + React 19 + TypeScript + Tailwind CSS 4**, en `web/` | ✅ Reemplaza a la página HTML estática (que queda en `web/public/legacy/explorer/`) |
| Globo 3D | **react-globe.gl** (globe.gl sobre three.js) | ✅ |
| Países | **topojson-client** + world-atlas 110m, servido localmente | ✅ |
| Imágenes | NASA Blue Marble y Black Marble, servidas localmente | ✅ |
| Capas NASA | PNG anuales como capa `tiles` del globo; serie y tendencia en JSON (`export/build_site_data.py`) | ✅ |
| Gráficas | **Recharts** | ✅ |
| Animaciones | **Motion** (antes Framer Motion) | ✅ |
| Estado | **Zustand** + `sessionStorage` + evento `earthscope:zone-confirmed` | ✅ |
| Geometría del polígono | Funciones propias en `web/lib/geo.ts` (área esférica, intersección de segmentos, longitudes desenvueltas, punto en polígono) | ✅ |
| Hosting | Vercel (o exportación estática para GitHub Pages) | ⏳ |

**Detalle técnico:** globe.gl tiene una sola capa de polígonos, que hoy usan los contornos de países. Para no perder la detección de país, el polígono del usuario debe agregarse **en la misma lista** (`polygonsData`) con un estilo propio, o dibujarse solo con `pathsData` (borde) + `pointsData` (vértices).

## 14. Puente con el Módulo A (✅ resuelto: opción B, ver [DATOS_GLOBALES.md §5](referencia/DATOS_GLOBALES.md))

El motor científico hoy trabaja con **una caja fija** y series regionales precalculadas (`data/processed/*.csv`). Para que un polígono libre produzca su propia serie y su tendencia, hay que promediar las celdas de los mapas `data/grids/amazon_core/*.npz` que caen dentro del polígono, ponderadas por cos(latitud).

| Opción | Cómo | Ventaja | Costo |
|---|---|---|---|
| **A. Regiones predefinidas (recomendada para el hackathon)** | El polígono se usa para elegir y mostrar; el análisis usa la caja Amazonía central, o subregiones precalculadas por `export/build_site_data.py` | Respeta "la interfaz nunca calcula"; cero riesgo | El análisis no sigue exactamente la forma dibujada |
| B. Máscara en Python | Nueva función en `science/` que recibe el GeoJSON; se precalcula o se ejecuta en Streamlit | Ciencia correcta, en un solo lugar | La web estática no puede llamarla en vivo sin backend |
| C. Máscara en el navegador | Exportar las grillas a JSON o binario y promediar en JS | Polígono libre en vivo | Duplica cálculo científico en la interfaz (rompe el principio rector) y pesa más |

**Decisión D11 tomada:** opción B con datos globales a 0,5°. `science/area.py` arma la serie del polígono y `api/main.py` (FastAPI) la expone; la web la muestra en el panel de análisis.

## 15. Prioridad dentro del cronograma

El envío cierra el **domingo 15/11 a las 11:59 p. m.** Según la regla de prioridad de [DOCUMENTACION.md §16](referencia/DOCUMENTACION_TECNICA.md), los 5 pasos y la entrega van primero. Orden sugerido para este módulo:

1. **Mínimo entregable (ya casi listo):** selección por punto + región Amazonía central + paso a la pantalla siguiente. ✅ Hecho, incluido el cambio a `sessionStorage`.
2. Dibujo de polígono, cierre y validación V-01…V-04.
3. Cobertura de datos (§7.7).
4. Edición avanzada (arrastrar, punto medio, deshacer) y antimeridiano.

## 16. Conclusión

El Módulo 01 es la puerta de entrada visual de EarthScope AI y cumple el Paso 2 del reto. A diferencia de la propuesta original, no es la primera piedra de un proyecto por construir. Es la pieza que conecta un **motor científico ya validado** (tendencias, robustez, What-If) con el visitante. La base, el globo 3D con selección y confirmación, ya funciona en `web/`, junto con las capas NASA (Documento 02). El trabajo pendiente es pasar del punto al polígono, validar la geometría y mostrar la cobertura de datos.
