# Cómo trabajar en EarthScope AI (Frontend y documentación)

El proyecto tiene dos repos:
- **Frontend** (este): `web/` y `docs/`.
- **Backend**: [jose6668/RK_Vanguard_EarthScopeAI-BACK](https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK), que tiene ciencia, API, pipeline y dataset. Sus reglas están en su propio `CONTRIBUTING.md`.

## 1. Historias de usuario primero
Todo trabajo parte de una **HU** (issue con la plantilla "Historia de usuario"), que debe sacar **≥ 13/16** en la rúbrica:
[docs/gestion/RUBRICA_HISTORIAS_DE_USUARIO.md](docs/gestion/RUBRICA_HISTORIAS_DE_USUARIO.md) · backlog en [docs/gestion/BACKLOG_HU.md](docs/gestion/BACKLOG_HU.md).
Si la HU toca los dos repos, abre un issue en cada uno y enlázalos.

## 2. Flujo con Git
1. `git checkout main && git pull`
2. `git checkout -b <tipo>/HU-<n>-<descripcion>`, por ejemplo `feat/HU-08-recorte-poligono`. Tipos: `feat`, `fix`, `docs`, `chore`.
3. Commits pequeños: `feat(web): clip layer to the study area (HU-08)`.
4. `git push -u origin <rama>` y abre un **PR hacia `main`** con la plantilla y `Closes #<issue>`.
5. Otra persona lo revisa y la CI tiene que estar en verde. Nadie sube directo a `main`.
6. En el mismo PR, marca la HU y la tarea como hechas en `docs/gestion/BACKLOG_HU.md` y `docs/PLAN_DE_TRABAJO.md`.

## 3. Reglas
| Regla | Por qué |
|---|---|
| **La web nunca calcula ciencia.** Muestra lo que exporta el Backend (`web/public/data/`) o lo que responde la API. | Una sola fuente de verdad (en el Backend), revisable y con pruebas |
| Todo texto visible va en **inglés**. | Regla del evento |
| Cada dato muestra su **fuente y DOI**; el reanálisis (MERRA-2) se marca como tal. | Validez ante el jurado |
| `web/public/data/` **no se edita a mano**: se regenera con los exportadores del Backend. | Evita datos inventados |
| Si cambia la respuesta de la API: PR coordinado en los dos repos (`web/lib/api.ts`, `InsightPanel.tsx` ↔ `tests/test_api.py` del Backend). | Que un repo no rompa al otro |
| Las regiones de `web/lib/regions.ts` replican `science/variables.py` del Backend. | Si agregas una, agrégala en los dos |
| Antes de tocar `web/`, lee `web/AGENTS.md` (Next.js 16 cambió mucho). | Evitar código de versiones viejas |
| Nada de imágenes, voces ni nombres de menores en el producto ni en el demo. | Regla del evento |

## 4. Antes de abrir un PR
```bash
cd web && npm run typecheck && npm run lint && npm run build
```
Y pruébalo en el navegador con la API del Backend corriendo (`uvicorn api.main:app --port 8000` en el otro repo).

## 5. Protección de `main` (la configura el dueño del repo una vez)
*Settings → Branches → Add branch ruleset* sobre `main`:
- ✅ Require a pull request before merging (1 aprobación)
- ✅ Require status checks to pass: `Web (types, lint, build)`
- ✅ Block force pushes

## 6. Documentación
- Orden de los documentos: 01 → 02 → 03 → 04 → arquitectura → implementación ([docs/README.md](docs/README.md)).
- Si un cambio afecta un caso de uso, regla, requerimiento o HU, actualiza su estado (✅ 🟡 ⏳).
- Diagramas: Mermaid dentro del `.md` y la imagen original en `docs/diagramas/`.
