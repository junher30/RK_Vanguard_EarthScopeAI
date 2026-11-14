# EarthScope AI — Planetary Investigation Lab

**Equipo RoboKids · NASA Space Apps Challenge 2026 · "Be an Earth System Trend Detective"**

> *Don't just observe Earth's changes. Investigate them, simulate possibilities, and uncover the evidence.*

Un globo 3D donde cualquier persona elige un lugar o dibuja un área del planeta y obtiene, con datos satelitales de NASA de 2001 a 2024:
- mapas animados;
- la tendencia de lluvia, vegetación, temperatura y humedad;
- su significancia estadística y una prueba de robustez;
- las advertencias de cada fuente.

## Estructura

| Carpeta | Qué hay | Lenguaje |
|---|---|---|
| [`web/`](web/) | Aplicación web (globo, capas, polígono, panel de análisis) | Next.js 16 · TypeScript |
| [`api/`](api/) | API de análisis de cualquier área (`POST /api/v1/area/analyze`) | FastAPI |
| [`science/`](science/) | **Única fuente de verdad científica**: tendencias, What-If, tendencias por celda, análisis de área | Python |
| [`pipeline/`](pipeline/) | Descarga y procesamiento de datos NASA (Amazonía 0,1° y planeta 0,5°) | Python |
| [`export/`](export/) | Genera los PNG y JSON que la web muestra | Python |
| [`app/`](app/) | App Streamlit de análisis (respaldo) | Python |
| [`tests/`](tests/) | Validación con datos sintéticos | Python |
| [`docs/`](docs/) | Documentos 01–06, referencia y diagramas | Markdown |
| `data/` | `processed/`, `grids/` y `sample/` (muestra global 2°) en git; `global/` se regenera (≈ 1,9 GB) | — |

**¿Por dónde empiezo?**
1. Lee [docs/README.md](docs/README.md), el mapa de documentos.
2. Lee [CONTRIBUTING.md](CONTRIBUTING.md): cómo trabajar en equipo.
3. Elige una tarea en [docs/PLAN_DE_TRABAJO.md](docs/PLAN_DE_TRABAJO.md).

## Inicio rápido

```bash
# Python
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Web
npm --prefix web install
python export/build_site_data.py          # capas de la Amazonía (los datos ya están en git)
npm --prefix web run dev                  # http://localhost:3000

# API de análisis de áreas: sin datos globales usa la muestra de 2° que está en el repo
uvicorn api.main:app --port 8000          # http://localhost:8000/docs
```

**¿Solo vas a trabajar en el backend?** Instala `requirements-backend.txt` (liviano) y no descargues nada. Ver [CONTRIBUTING.md §3](CONTRIBUTING.md).

### Datos NASA
Requiere una cuenta [Earthdata Login](https://urs.earthdata.nasa.gov) con las aplicaciones **"NASA GESDISC DATA ARCHIVE"** y **"LP DAAC Data Pool"** aprobadas (sin eso la descarga da error 401), y un `~/.netrc` con el usuario y la contraseña.

```bash
python pipeline/fetch_nasa.py --product all       # Amazonía central 0,1° (ya en git)
python pipeline/fetch_global.py --product all     # Planeta 0,5° (≈ 69 GB de descarga, 1,3 GB en disco; ~1 h)
python export/build_global_data.py                # capas globales y mapas de tendencia para la web
```
Las descargas reanudan solas si se cortan.

## Fuentes NASA
| Variable | Producto | DOI |
|---|---|---|
| Precipitación | GPM IMERG Final Monthly V07 | [10.5067/GPM/IMERG/3B-MONTH/07](https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07) |
| Vegetación (EVI/NDVI) | MODIS/Terra MOD13C2 v6.1 | [10.5067/MODIS/MOD13C2.061](https://doi.org/10.5067/MODIS/MOD13C2.061) |
| Temperatura de superficie | MODIS/Terra MOD11C3 v6.1 | [10.5067/MODIS/MOD11C3.061](https://doi.org/10.5067/MODIS/MOD11C3.061) |
| Temperatura del aire y humedad (reanálisis) | MERRA-2 M2TMNXSLV v5.12.4 | [10.5067/AP1B0BA5PD2K](https://doi.org/10.5067/AP1B0BA5PD2K) |

Imágenes del globo: NASA Blue Marble / Black Marble. Fronteras: Natural Earth.

## Uso de IA
Se usó un asistente de IA (Claude, de Anthropic) para asesoría técnica, código y documentación. Detalle en [docs/referencia/DOCUMENTACION_TECNICA.md §17](docs/referencia/DOCUMENTACION_TECNICA.md).
