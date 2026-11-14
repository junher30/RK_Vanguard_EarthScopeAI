# Cómo trabajar en EarthScope AI

## 1. Flujo con Git

1. Actualiza `main`: `git checkout main && git pull`.
2. Crea una rama por tarea: `git checkout -b <tipo>/<area>-<descripcion-corta>`.
   - Tipos: `feat` (función nueva), `fix` (corrección), `docs`, `data`, `chore`.
   - Áreas: `web`, `api`, `science`, `pipeline`, `export`, `docs`.
   - Ejemplos: `feat/web-valor-por-celda`, `docs/requerimientos-criterios`.
3. Haz commits pequeños con mensajes claros: `feat(web): show cell value on click`.
4. Sube la rama (`git push -u origin <rama>`) y abre un **Pull Request** hacia `main` usando la plantilla.
5. Otra persona del equipo lo revisa antes de unirlo. Que nadie haga push directo a `main`.
6. Si tu tarea viene de [docs/PLAN_DE_TRABAJO.md](docs/PLAN_DE_TRABAJO.md), márcala como hecha en el mismo PR.

## 2. Reglas del proyecto

| Regla | Por qué |
|---|---|
| **La web nunca calcula ciencia.** Tendencias, promedios y pruebas van en `science/`, y la web los recibe por `export/` o por la API. | Una sola fuente de verdad, revisable y con pruebas |
| Todo texto visible en la web va en **inglés**. | Regla del evento |
| Cada dato muestra su **fuente y DOI**. El reanálisis (MERRA-2) se marca como tal. | Criterio de validez del jurado |
| No subir `data/global/`, `logs/`, `.env`, `node_modules/` ni archivos crudos de NASA. | Pesan GB o son privados |
| Si cambias `science/` o `export/`, vuelve a ejecutar los exportadores y sube los `web/public/data/` resultantes. | La web lee esos archivos |
| Si agregas una región, agrégala en `science/variables.py` **y** en `web/lib/regions.ts`. | La web replica el catálogo de regiones |
| Antes de tocar `web/`, lee `web/AGENTS.md` (Next.js 16 cambió mucho). | Evitar código de versiones viejas |
| Nada de imágenes, voces ni nombres de menores en el producto ni en el demo. | Regla del evento |

## 3. Antes de abrir un PR

```bash
# Python
python tests/test_trends.py && python tests/test_whatif.py && python tests/test_global_trends.py

# Web
cd web && npx tsc --noEmit && npm run lint && npm run build
```

## 4. Dónde está cada cosa
Ver [docs/05_ARQUITECTURA.md](docs/05_ARQUITECTURA.md).

## 5. Documentación
- Los documentos siguen el orden 01 → 02 → 03 → 04 → arquitectura → implementación ([docs/README.md](docs/README.md)).
- Si un cambio afecta un caso de uso, regla o requerimiento, actualiza su estado (✅ 🟡 ⏳) en el documento correspondiente.
- Diagramas: versión editable en Mermaid dentro del `.md`, y la imagen original en `docs/diagramas/`.
