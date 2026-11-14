# EarthScope AI
## Implementación y pruebas

**Fecha:** 14 de noviembre de 2026

## 1. Cómo correr todo en local

```bash
# 1. Python (una vez)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Web (una vez)
npm --prefix web install

# 3. Datos (requiere Earthdata Login en ~/.netrc; reanudan solos si se cortan)
python pipeline/fetch_nasa.py --product all          # Amazonía 0,1° (ya está en git)
python pipeline/fetch_global.py --product all        # Planeta 0,5° (≈ 69 GB de descarga, 1,3 GB en disco)

# 4. Exportar para la web
python export/build_site_data.py
python export/build_global_data.py

# 5. Levantar
uvicorn api.main:app --port 8000                     # API  → http://localhost:8000/docs
npm --prefix web run dev                             # Web  → http://localhost:3000
streamlit run app/streamlit_app.py                   # App de análisis → http://localhost:8501
```

## 2. Pruebas automáticas

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `python tests/test_trends.py` | El motor de tendencias recupera una pendiente conocida y controla los falsos positivos | ✅ 2/100 falsos positivos |
| `python tests/test_whatif.py` | El What-If recupera una respuesta conocida (−2,0) y marca la extrapolación | ✅ −1,98 |
| `python tests/test_global_trends.py` | Las tendencias por celda recuperan +0,15/año; potencia y falsos positivos | ✅ 0,150 · 99 % · 5,2 % |
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

## 4. Pendiente de pruebas (para el equipo)
- [ ] Prueba automática de `science/area.py` (máscara de polígono, antimeridiano, punto, océano con variable solo de tierra).
- [ ] Pruebas de la API con `fastapi.testclient`.
- [ ] Pruebas de `web/lib/geo.ts` (hoy validado a mano con Node).
- [ ] Probar el enlace público en ventana privada, en Chrome, Safari y móvil.
