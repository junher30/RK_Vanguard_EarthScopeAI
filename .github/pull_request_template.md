## Qué cambia
<!-- Una o dos frases. -->

## Tarea / documento
<!-- Ej.: PLAN_DE_TRABAJO B1 · Documento 02 CU-11 -->

## Cómo lo probaste
- [ ] `EARTHSCOPE_DATA=sample` + `python tests/test_trends.py`, `test_whatif.py`, `test_global_trends.py`, `test_area.py`, `test_api.py`
- [ ] `cd web && npx tsc --noEmit && npm run lint && npm run build`
- [ ] Lo revisé en el navegador (escritorio y móvil si aplica)

## Checklist
- [ ] La web no calcula ciencia (todo viene de `science/` vía `export/` o la API)
- [ ] Textos visibles en inglés; fuente y DOI visibles si muestro datos
- [ ] Actualicé el estado (✅ 🟡 ⏳) en los documentos afectados y en `docs/PLAN_DE_TRABAJO.md`
- [ ] Si cambié la respuesta de la API, actualicé `web/lib/api.ts` e `InsightPanel.tsx`
- [ ] No subí `data/global/`, `logs/`, `.env` ni archivos crudos de NASA
