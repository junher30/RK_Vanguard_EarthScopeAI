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
| No subir `data/global/`, `logs/`, `.env`, `node_modules/` ni archivos crudos de NASA. Si regeneras los datos globales, actualiza la muestra con `python pipeline/make_sample.py`. | Pesan GB o son privados |
| Si cambias `science/` o `export/`, vuelve a ejecutar los exportadores y sube los `web/public/data/` resultantes. | La web lee esos archivos |
| Si agregas una región, agrégala en `science/variables.py` **y** en `web/lib/regions.ts`. | La web replica el catálogo de regiones |
| Antes de tocar `web/`, lee `web/AGENTS.md` (Next.js 16 cambió mucho). | Evitar código de versiones viejas |
| Nada de imágenes, voces ni nombres de menores en el producto ni en el demo. | Regla del evento |

## 3. Trabajar en el backend sin los datos globales

No necesitas descargar los 1,9 GB de NASA para editar `science/`, `api/` o `export/`.
El repo trae una **muestra** en `data/sample/` (27 MB): las 5 variables, los 288 meses, con una grilla de 2°. La API la usa sola cuando no encuentra `data/global/`.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-backend.txt         # liviano: sin librerías de descarga NASA
uvicorn api.main:app --reload --port 8000       # usa la muestra → http://localhost:8000/docs
npm --prefix web run dev                        # la web habla con tu API local
```

| `EARTHSCOPE_DATA` | Qué usa | Para qué |
|---|---|---|
| `auto` (por defecto) | `data/global/` si existe; si no, la muestra | Normal |
| `sample` | Siempre la muestra de 2° | Desarrollar y correr las pruebas (lo que hace la CI) |
| `full` | Siempre los datos completos de 0,5° (falla si no están) | Resultados reales y demo |

⚠️ Los resultados de la muestra son **solo para desarrollo**. La API los marca con `"source": "sample"` y la web muestra "2° sample". Las conclusiones y el demo usan siempre los datos completos.

**Qué no se puede romper:** el **formato de respuesta de la API**, porque la web depende de él. `tests/test_api.py` lo verifica. Si necesitas cambiar un campo, cambia también `web/lib/api.ts` y `web/components/data/InsightPanel.tsx` en el mismo PR.

## 4. Protección automática

- **CI (GitHub Actions, `.github/workflows/ci.yml`):** en cada PR corre las pruebas de ciencia y de la API sobre la muestra, y los tipos, el lint y la compilación de la web. Si algo falla, el PR aparece en rojo.
- **Protección de `main`** (la configura el dueño del repo una vez): *Settings → Branches → Add branch ruleset*, sobre `main`:
  - ✅ Require a pull request before merging (1 aprobación)
  - ✅ Require status checks to pass: `Backend (science + API) on sample data` y `Web (types, lint, build)`
  - ✅ Block force pushes

  Así nadie puede romper `main`: todo entra por PR, con las pruebas en verde y la revisión de otra persona.

## 5. Antes de abrir un PR

```bash
# Python (usa la muestra; no hace falta data/global)
export EARTHSCOPE_DATA=sample
python tests/test_trends.py && python tests/test_whatif.py && python tests/test_global_trends.py
python tests/test_area.py && python tests/test_api.py

# Web
cd web && npx tsc --noEmit && npm run lint && npm run build
```

## 6. Dónde está cada cosa
Ver [docs/05_ARQUITECTURA.md](docs/05_ARQUITECTURA.md).

## 7. Documentación
- Los documentos siguen el orden 01 → 02 → 03 → 04 → arquitectura → implementación ([docs/README.md](docs/README.md)).
- Si un cambio afecta un caso de uso, regla o requerimiento, actualiza su estado (✅ 🟡 ⏳) en el documento correspondiente.
- Diagramas: versión editable en Mermaid dentro del `.md`, y la imagen original en `docs/diagramas/`.
