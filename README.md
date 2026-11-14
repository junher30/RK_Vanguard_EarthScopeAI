# EarthScope AI — Planetary Investigation Lab (RoboKids)

## 1. Instalación (una vez)
```bash
cd ~/Documents/earthscope-ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## 2. Descargar datos NASA
Requiere cuenta Earthdata Login: https://urs.earthdata.nasa.gov
En el perfil de Earthdata, aprobar las aplicaciones **"NASA GESDISC DATA ARCHIVE"** y **"LP DAAC Data Pool"**, porque sin eso la descarga da error 401.

```bash
python pipeline/fetch_nasa.py --product precipitation   # el más liviano, probar primero
python pipeline/fetch_nasa.py --product vegetation
python pipeline/fetch_nasa.py --product lst
```
- Descarga un mes a la vez, calcula el promedio regional ponderado por latitud, lo guarda en `data/processed/*.csv` y borra el archivo crudo.
- Si se interrumpe, al volver a ejecutarlo continúa donde quedó.
- La región se cambia en `REGION` dentro de `pipeline/fetch_nasa.py`.

## Fuentes
- MOD13C2 v6.1: https://doi.org/10.5067/MODIS/MOD13C2.061
- MOD11C3 v6.1: https://doi.org/10.5067/MODIS/MOD11C3.061
- GPM IMERG Final Monthly V07: https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07
