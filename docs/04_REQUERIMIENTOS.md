# EarthScope AI
## Documento 04 — Requerimientos

**Módulo:** 1 — Exploración Global y Visualización Ambiental Histórica
**Versión:** 0.1 (**borrador base para que el equipo lo complete**)
**Fecha:** 14 de noviembre de 2026
**Parte de:** [Documento 02 — Casos de uso](02_CASOS_DE_USO.md) y [Documento 03 — Modelo conceptual](03_MODELO_CONCEPTUAL.md)

Estado: ✅ cumplido · 🟡 parcial · ⏳ pendiente · ❓ falta definir el criterio
Prioridad: **M** (debe estar) · **S** (debería) · **C** (puede)

> **Para el equipo:** cada requerimiento debe ser verificable. Donde dice ❓, propongan un número concreto (tiempo, tamaño, porcentaje) y anótenlo en la columna "Criterio de aceptación".

## 1. Requerimientos funcionales

| ID | Requerimiento | CU | Prioridad | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| RF-01 | Mostrar un globo 3D con rotación, zoom e ir a coordenadas | CU-01 | M | Gira y hace zoom con mouse y pantalla táctil; "Go to coordinates" valida −90…90 / −180…180 | ✅ |
| RF-02 | Activar el modo de selección poligonal | CU-02 | M | Botón **Select area**; Esc cancela | ✅ |
| RF-03 | Agregar vértices con clic sobre el globo | CU-03 | M | Cada clic agrega un vértice y dibuja el lado | ✅ |
| RF-04 | Cerrar el polígono | CU-03 | M | Clic en el primer vértice, Enter o botón; requiere ≥ 3 vértices | ✅ |
| RF-05 | Mover, agregar y eliminar vértices; deshacer | CU-04 | M | Arrastrar, punto medio, clic derecho, Ctrl/⌘+Z | ✅ |
| RF-06 | Validar la geometría (V-01…V-07) e informar el motivo | CU-04/05 | M | Mensaje por regla; no se puede confirmar si es inválida | ✅ |
| RF-07 | Confirmar el área y conservarla durante la sesión | CU-05 | M | GeoJSON en `sessionStorage`; se recupera al recargar | ✅ |
| RF-08 | Cancelar o reemplazar la selección | CU-06 | M | ✕ / Esc / New area / 🗑 | ✅ |
| RF-09 | Elegir la variable ambiental | CU-08 | M | Lluvia, vegetación, temperatura de superficie, temperatura del aire y humedad | ✅ |
| RF-10 | Elegir el año y animar la serie de años | CU-09 | M | Barra 2001–2024 con reproducción | ✅ |
| RF-11 | Elegir el período mensual | CU-09 | S | Selector de mes | ⏳ |
| RF-12 | Mostrar la capa de color con leyenda, unidades y zonas sin dato | CU-10 | M | Leyenda mín/máx + unidad; celdas sin dato transparentes | ✅ |
| RF-13 | Recortar la capa al polígono del visitante | CU-10 | S | Fuera del polígono la capa no se dibuja | ⏳ |
| RF-14 | Mostrar el valor de una celda al hacer clic | CU-11 | S | Valor, unidad, año y fuente | ⏳ |
| RF-15 | Mostrar y ocultar la capa sin perder la región | CU-12 | M | Botón Hide | ✅ |
| RF-16 | Analizar la serie y la tendencia de cualquier área o punto | CU-07 | M | Serie, veredicto, Sen, p, robustez y advertencias | ✅ (requiere la API) |
| RF-17 | Comparar el área con todo el planeta | CU-07 | S | Selector **Your area / Whole planet** | ✅ |
| RF-18 | Mapa de tendencias por celda | CU-10 | S | Modo **Trend**; celdas no significativas atenuadas | ✅ |
| RF-19 | Informar cuando no hay datos o la consulta falla | CU-07 A1–A3 | M | Mensaje claro (por ejemplo, "land only") | 🟡 falta botón "Reintentar" |
| RF-20 | Descargar un informe reproducible (JSON/PDF) del área | — | C | Incluye fuentes, DOI y limitaciones | ⏳ |

## 2. Requerimientos no funcionales

| ID | Categoría | Requerimiento | Criterio de aceptación | Estado |
|---|---|---|---|---|
| RNF-01 | Acceso | Público, sin cuenta (RN-01) | Abre en ventana privada sin iniciar sesión | ✅ local · ⏳ publicado |
| RNF-02 | Idioma | Interfaz en **inglés** (regla del evento) | Ningún texto visible en español | ✅ |
| RNF-03 | Integridad científica | La web no calcula ciencia; todo resultado viene de `science/` | Revisión de código: sin estadística en `web/` | ✅ |
| RNF-04 | Trazabilidad | Cada capa y resultado muestra dataset y DOI | Visible en el panel | ✅ |
| RNF-05 | Honestidad | Reanálisis, solo tierra, tendencias no robustas y "no es temperatura del aire" quedan señalados | Etiquetas y advertencias visibles | ✅ |
| RNF-06 | Rendimiento | Primera carga del globo | ❓ por ejemplo < 4 s en 4G | ❓ |
| RNF-07 | Rendimiento | Respuesta del análisis de área | ❓ por ejemplo < 2 s (hoy < 1 s en local) | 🟡 |
| RNF-08 | Disponibilidad | Si la API no responde, la web sigue funcionando | Muestra la serie global y un aviso | ✅ |
| RNF-09 | Compatibilidad | Navegadores | ❓ Chrome, Safari y Firefox (últimas 2 versiones) | ❓ |
| RNF-10 | Responsivo | Escritorio para investigar; en móvil se consultan resultados | Sin desbordes a 375 px | 🟡 el panel de análisis no se ve en < 768 px |
| RNF-11 | Accesibilidad | Contraste, teclado y `prefers-reduced-motion` | ❓ objetivo WCAG AA | 🟡 |
| RNF-12 | Privacidad | No se guardan áreas ni datos personales | Solo `sessionStorage` | ✅ |
| RNF-13 | Reproducibilidad | Todo dato se regenera con scripts del repo | `pipeline/` + `export/` documentados | ✅ |
| RNF-14 | Calidad | Pruebas automáticas del motor científico | `tests/*.py` pasan | ✅ |

## 3. Restricciones

- **Entrega:** domingo 15/11/2026, 11:59 p. m. (hora local), con un solo enlace público (ver [referencia/DOCUMENTACION_TECNICA.md §3](referencia/DOCUMENTACION_TECNICA.md)).
- **Datos:** solo NASA (Earthdata), con Earthdata Login. Período 2001–2024.
- **Hosting gratuito:** web en Vercel; API en Render o Hugging Face Spaces.

## 4. Pendiente de definir por el equipo
- [ ] Números para RNF-06, RNF-07, RNF-09 y RNF-11.
- [ ] Decidir si RF-11 (mensual) y RF-20 (informe) entran antes de la entrega.
- [ ] Revisar este documento contra el [Documento 02](02_CASOS_DE_USO.md) y marcar la versión 1.0.
