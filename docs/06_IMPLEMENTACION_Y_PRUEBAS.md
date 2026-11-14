# EarthScope AI
## Implementación y pruebas

**Fecha:** 14 de noviembre de 2026

## 1. Cómo correr todo en local

Dos repos, uno al lado del otro: Frontend ([junher30/RK_Vanguard_EarthScopeAI](https://github.com/junher30/RK_Vanguard_EarthScopeAI)) y Backend ([jose6668/RK_Vanguard_EarthScopeAI-BACK](https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK)).

```bash
# Backend (el dataset completo viene al clonar)
cd RK_Vanguard_EarthScopeAI-BACK
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-backend.txt
uvicorn api.main:app --port 8000                     # API → http://localhost:8000/docs
python export/build_global_data.py                   # (opcional) regenera las capas en ../RK_Vanguard_EarthScopeAI/web/public/data

# Frontend
cd ../RK_Vanguard_EarthScopeAI
npm --prefix web install && npm --prefix web run dev # Web → http://localhost:3000
```

Para descargar datos nuevos de NASA, ver [DATASET.md del Backend](https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK/blob/main/docs/DATASET.md).

## 2. Pruebas automáticas

Las de Python están en el **Backend** (`tests/`); la CI de cada repo las corre en cada PR.


| Prueba | Qué verifica | Resultado |
|---|---|---|
| `python tests/test_trends.py` | El motor de tendencias recupera una pendiente conocida y controla los falsos positivos | ✅ 2/100 falsos positivos |
| `python tests/test_whatif.py` | El What-If recupera una respuesta conocida (−2,0) y marca la extrapolación | ✅ −1,98 |
| `python tests/test_global_trends.py` | Las tendencias por celda recuperan +0,15/año; potencia y falsos positivos | ✅ 0,150 · 99 % · 5,2 % |
| `python tests/test_area.py` | Máscara de polígono, antimeridiano, orientación, punto, polígono diminuto, variable solo de tierra sobre el océano | ✅ |
| `python tests/test_api.py` | **Contrato de la API** que lee la web (campos, errores 404/422, "land only") | ✅ |
| `python tests/test_dataset.py` | El dataset en git está completo, se decodifica y el códec es fiel (±½ paso) | ✅ 8 variables · 192 años-variable · 369 MB |
| `npx --prefix web tsc --noEmit` y `npm --prefix web run lint` | Tipos y estilo de la web | ✅ |
| `npm --prefix web run build` | Compilación de producción | ✅ |

## 3. Validaciones hechas a mano

| Qué | Cómo | Resultado |
|---|---|---|
| Análisis de área = pipeline regional | La caja de la Amazonía desde la grilla global frente al CSV regional (lluvia) | ✅ 216 meses, diferencia máxima 0,0000 |
| Polígono que cruza el antimeridiano | Caja 175°E–175°W | ✅ 400 celdas, las esperadas |
| Geometría | Lados cruzados, puntos alineados, polo, área enorme, 2 puntos | ✅ V-04, V-03, V-07, V-06, V-01 |
| Recorrido en el navegador | Dibujar, arrastrar, insertar, borrar, deshacer, confirmar, recargar y analizar un punto en Madrid | ✅ |
| Mapas globales | Orientación, rangos y valores faltantes de cada producto (julio 2024) | ✅ |

Todas las pruebas de Python corren sobre la muestra de `data/sample/` (`EARTHSCOPE_DATA=sample`), así que no necesitan datos de NASA. **La CI (`.github/workflows/ci.yml`) las corre en cada PR**, junto con los tipos, el lint y la compilación de la web.

## 4. Pendiente de pruebas (para el equipo)
- [ ] Pruebas de `web/lib/geo.ts` (hoy validado a mano con Node).
- [ ] Probar el enlace público en ventana privada, en Chrome, Safari y móvil.
