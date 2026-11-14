# Plan de trabajo — hasta la entrega

**Cierre:** domingo 15/11/2026, 11:59 p. m. (hora local) · **Actualizado:** 14/11/2026

Cómo usarlo: pon tu nombre en **Responsable** antes de empezar, crea la rama sugerida (ver [CONTRIBUTING.md](../CONTRIBUTING.md)) y marca ✅ al unir el PR.
Prioridad: **P0** sin esto no hay entrega · **P1** mejora mucho el demo · **P2** si sobra tiempo.

## Ya hecho
- ✅ Pipeline NASA Amazonía 0,1° y planeta 0,5° (IMERG, MODIS EVI y LST, MERRA-2 temperatura del aire y humedad).
- ✅ Motor de tendencias con robustez, What-If validado (Amazonía) y tendencias por celda.
- ✅ Web Next.js: globo 3D, capas globales y de la Amazonía, línea de tiempo, anomalías, mapa de tendencias, dibujo y validación de polígonos.
- ✅ API: análisis de cualquier polígono o punto del planeta.
- ✅ Documentos 01, 02 y 03, arquitectura e implementación.

## Tareas

### A. Entrega (P0)
| # | Tarea | Responsable | Rama | Estado |
|---|---|---|---|---|
| A1 | Publicar la web en **Vercel** (raíz `web/`, `NEXT_PUBLIC_API_URL`) | | `chore/deploy-web` | ⏳ |
| A2 | Publicar la API en **Render** o **Hugging Face Spaces** con los cubos globales (o una versión float16) | | `chore/deploy-api` | ⏳ |
| A3 | Probar el enlace público en ventana privada (Chrome, Safari y móvil) | | — | ⏳ |
| A4 | Presentación de **7 diapositivas en inglés** (o video de 30 s) | | `docs/demo` | ⏳ |
| A5 | Textos de envío en inglés: resumen, detalles técnicos, uso de NASA, declaración de IA | | `docs/submission` | ⏳ |
| A6 | Pulsar **"Submit for Judging"** (y otra vez después de cada edición) | | — | ⏳ |

### B. Web (P1)
| # | Tarea | Doc | Responsable | Rama | Estado |
|---|---|---|---|---|---|
| B1 | **Valor por celda** al hacer clic sobre la capa (CU-11) | Doc 02 §6 | | `feat/web-valor-por-celda` | ⏳ |
| B2 | **Recortar la capa** al polígono del visitante (CU-10) | Doc 02 §6 | | `feat/web-recorte-poligono` | ⏳ |
| B3 | Panel de análisis en móvil (hoy se oculta en < 768 px) | RNF-10 | | `fix/web-panel-movil` | ⏳ |
| B4 | Botón "Reintentar" cuando falla la carga o la API | RF-19 | | `fix/web-reintentar` | ⏳ |
| B5 | Pantalla **What-If Lab** en la web (deslizador de lluvia → temperatura con intervalo) | Doc técnico §7.2 | | `feat/web-whatif` | ⏳ |
| B6 | Comparador antes/después con cortina (2001 frente a 2024) | Doc técnico §7.2 | | `feat/web-comparador` | ⏳ P2 |
| B7 | Evidence Graph (Cytoscape) | Doc técnico §6.3 | | `feat/web-evidence-graph` | ⏳ P2 |

### C. Ciencia y datos (P1)
| # | Tarea | Responsable | Rama | Estado |
|---|---|---|---|---|
| C1 | Prueba automática de `science/area.py` (polígono, antimeridiano, punto, océano) | | `feat/science-test-area` | ✅ |
| C2 | Pruebas de la API con `fastapi.testclient` | | `feat/api-tests` | ✅ |
| C6 | Activar la protección de `main` en GitHub ([CONTRIBUTING §4](../CONTRIBUTING.md)) | dueño del repo | — | ⏳ |
| C3 | Exportar valores por celda cuantizados para B1 | | `feat/export-valores-celda` | ⏳ |
| C4 | Generalizar el What-If a cualquier área con validación fuera de muestra | | `feat/science-whatif-global` | ⏳ P2 |
| C5 | Exportar mapas **mensuales** globales (RF-11) | | `feat/export-mensual` | ⏳ P2 |

### D. Documentación
| # | Tarea | Responsable | Estado |
|---|---|---|---|
| D1 | Completar los criterios ❓ del [Documento 04](04_REQUERIMIENTOS.md) | | ⏳ |
| D2 | Aprobar los ajustes al modelo conceptual ([Doc 03 §4.1](03_MODELO_CONCEPTUAL.md)) | | ⏳ |
| D3 | Completar los resultados globales en [referencia/DATOS_GLOBALES.md §6](referencia/DATOS_GLOBALES.md) | | ✅ |
| D4 | Agregar a la declaración de IA cualquier otra herramienta usada (ChatGPT, etc.) | | ⏳ |

## Orden sugerido
1. **Hoy:** C6 (proteger `main`), A1 + A2 (que exista el enlace), B1.
2. **Domingo por la mañana:** A3, B2, B3, B4.
3. **Domingo por la tarde:** A4, A5 → A6 con margen (antes de las 9 p. m.).
