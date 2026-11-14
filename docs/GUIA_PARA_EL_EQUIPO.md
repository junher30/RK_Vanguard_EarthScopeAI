# Guía para el equipo — cómo empezar a trabajar en EarthScope AI

Esta guía te lleva desde cero hasta tu primer Pull Request. Síguela en orden. Primera vez: ~20 minutos.

---

## 0. Qué necesitas instalado

| Herramienta | Versión | Cómo comprobarlo |
|---|---|---|
| Git | cualquiera reciente | `git --version` |
| Python | 3.9 o superior | `python3 --version` (Windows: `python --version`) |
| Node.js | 20.9 o superior (recomendado 22) | `node --version` |
| Espacio en disco | ~3 GB libres | El backend trae el dataset (≈ 400 MB) y lo descomprime la primera vez (≈ 1,9 GB) |

También necesitas acceso a los dos repos en GitHub. Si no puedes hacer `push`, pídele al dueño que te agregue como colaborador.

---

## 1. Los dos repositorios

| Repo | Qué tiene | Rama de trabajo |
|---|---|---|
| **Frontend** — [junher30/RK_Vanguard_EarthScopeAI](https://github.com/junher30/RK_Vanguard_EarthScopeAI) | La web (`web/`) y toda la documentación (`docs/`) | `main` |
| **Backend** — [jose6668/RK_Vanguard_EarthScopeAI-BACK](https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK) | Ciencia, API, datos NASA y dataset completo | `Develop` |

**Regla de oro:** la web **nunca** calcula ciencia. Todo cálculo va en `science/` del Backend.

---

## 2. Clonar (una sola vez)

Clona los **dos repos en la misma carpeta**, uno al lado del otro:

```bash
cd ~/Documents
git clone https://github.com/junher30/RK_Vanguard_EarthScopeAI.git
git clone https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK.git
```

Debe quedar así:
```
Documents/
├── RK_Vanguard_EarthScopeAI/        ← Frontend
└── RK_Vanguard_EarthScopeAI-BACK/   ← Backend (trae el dataset completo; el clon tarda 1–3 min)
```

> ⚠️ **Mientras no se una el PR de reorganización**, el `main` del Frontend todavía tiene la versión vieja. Hasta entonces, usa la rama nueva:
> ```bash
> cd RK_Vanguard_EarthScopeAI
> git checkout feat/web-nextjs-global-data
> ```

---

## 3. Levantar el Backend (API)

```bash
cd ~/Documents/RK_Vanguard_EarthScopeAI-BACK
python3 -m venv .venv
source .venv/bin/activate                # Windows: .venv\Scripts\activate
pip install -r requirements-backend.txt
uvicorn api.main:app --reload --port 8000
```

Comprueba que funciona abriendo **http://localhost:8000/api/v1/health**. Cada variable debe decir `"source": "full"` y `"months": 288`.

- La **primera consulta** de cada variable tarda unos segundos porque descomprime el dataset en `data/.cache/`. Las siguientes son instantáneas.
- La documentación interactiva de la API está en **http://localhost:8000/docs**.
- Deja esta terminal abierta.

---

## 4. Levantar el Frontend (web)

En **otra terminal**:

```bash
cd ~/Documents/RK_Vanguard_EarthScopeAI
npm --prefix web install                 # solo la primera vez
npm --prefix web run dev
```

Abre **http://localhost:3000** y prueba:
1. **Start exploring**, y luego elige una capa abajo (por ejemplo, *Air temp.*).
2. Escribe unas coordenadas en "Go to coordinates" y pulsa **Confirm study zone**.
3. A la izquierda debe aparecer el panel **"Your point"** con la serie y la tendencia. Si dice *"The analysis server is offline"*, revisa que el Backend (paso 3) siga corriendo.

✅ Si llegaste aquí, tu entorno está listo.

---

## 5. Cómo trabajar cada día

### 5.1. Elige o crea una Historia de Usuario (HU)
1. Mira el backlog: [docs/gestion/BACKLOG_HU.md](gestion/BACKLOG_HU.md).
2. Crea un **issue** con la plantilla **"Historia de usuario"** en el repo que corresponda. Si la HU toca los dos repos, crea un issue en cada uno y enlázalos.
3. Califícala con la [rúbrica](gestion/RUBRICA_HISTORIAS_DE_USUARIO.md). Para empezar necesita **≥ 13/16 y ningún criterio en 0**.
4. Pon tu nombre como responsable (en el issue y en el backlog).

Formato mínimo:
```
HU-07 · Ver el valor de una celda
Como estudiante, quiero hacer clic en el mapa y ver el valor exacto,
para leer el dato sin adivinarlo por el color.
CA-1: Dado que hay una capa visible, cuando hago clic, entonces veo valor, unidad, año y fuente.
```

### 5.2. Crea tu rama

**Frontend** (sale de `main`):
```bash
cd ~/Documents/RK_Vanguard_EarthScopeAI
git checkout main && git pull
git checkout -b feat/HU-07-valor-celda
```

**Backend** (sale de `Develop`):
```bash
cd ~/Documents/RK_Vanguard_EarthScopeAI-BACK
git checkout Develop && git pull
git checkout -b feat/HU-07-valor-celda
```

Tipos de rama: `feat` (función nueva) · `fix` (corrección) · `docs` · `data` · `chore`.

### 5.3. Trabaja y guarda con commits pequeños
```bash
git add <archivos>
git commit -m "feat(web): show cell value on click (HU-07)"
```

### 5.4. Prueba antes de subir

**Frontend:**
```bash
cd web && npm run typecheck && npm run lint && npm run build
```

**Backend:**
```bash
export EARTHSCOPE_DATA=sample            # Windows PowerShell: $env:EARTHSCOPE_DATA="sample"
python tests/test_trends.py && python tests/test_whatif.py && python tests/test_global_trends.py
python tests/test_area.py && python tests/test_api.py
EARTHSCOPE_DATA=full python tests/test_dataset.py
```

### 5.5. Sube y abre un Pull Request
```bash
git push -u origin feat/HU-07-valor-celda
```
- GitHub te muestra un botón **"Compare & pull request"**.
  - Destino en el **Frontend**: `main`.
  - Destino en el **Backend**: `Develop`.
- Llena la plantilla y escribe `Closes #<número del issue>`.
- Espera a que la **CI** esté en verde ✅ y a que **otra persona** lo apruebe.
- Al unirlo, marca la HU como ✅ en [BACKLOG_HU.md](gestion/BACKLOG_HU.md) y la tarea en [PLAN_DE_TRABAJO.md](PLAN_DE_TRABAJO.md).

---

## 6. Casos especiales

| Si vas a… | Haz esto |
|---|---|
| **Cambiar la respuesta de la API** | PR en los dos repos: Backend (`api/`, `tests/test_api.py`) y Frontend (`web/lib/api.ts`, `web/components/data/InsightPanel.tsx`). Enlázalos y únanlos juntos |
| **Cambiar colores, escalas o capas del mapa** | Edita `export/` en el Backend y ejecuta `python export/build_global_data.py`: escribe solo en `../RK_Vanguard_EarthScopeAI/web/public/data/`. Sube esos archivos en un PR del Frontend |
| **Agregar una región predefinida** | `science/variables.py` (Backend) **y** `web/lib/regions.ts` (Frontend) |
| **Agregar una variable o descargar datos nuevos** | Sigue [DATASET.md del Backend](https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK/blob/main/docs/DATASET.md). Necesitas una cuenta Earthdata y `pip install -r requirements.txt` completo |
| **Trabajar rápido sin el dataset completo** | `EARTHSCOPE_DATA=sample uvicorn api.main:app --reload --port 8000` usa la muestra de 2°. Sus resultados son solo para desarrollo |
| **Editar documentación** | Frontend, carpeta `docs/`. Mantén al día los estados ✅ 🟡 ⏳ |
| **Tocar la web** | Lee antes `web/AGENTS.md`: Next.js 16 cambió mucho respecto a versiones anteriores |

---

## 7. Reglas que no se rompen
1. La web no calcula ciencia; la ciencia vive en `science/` del Backend.
2. Todo texto visible en la web va en **inglés**.
3. Todo dato muestra su **fuente y DOI**; MERRA-2 se marca como **reanálisis**.
4. Nadie sube directo a `main` (ni a `Develop` en el Backend): todo entra por PR revisado y con la CI en verde.
5. No se suben `data/global/`, `data/.cache/`, `.env`, `node_modules/` ni archivos crudos de NASA.
6. Nada de imágenes, voces ni nombres de menores en el producto ni en el demo (regla del evento).

---

## 8. Problemas comunes

| Problema | Solución |
|---|---|
| `Address already in use` (puerto 8000 o 3000) | Ya hay otra API o web abierta. Ciérrala, o usa otro puerto: `--port 8001` (y en la web, `NEXT_PUBLIC_API_URL=http://localhost:8001`) |
| La web dice *"The analysis server is offline"* | El Backend no está corriendo, o está en otro puerto (paso 3) |
| La primera consulta de la API es lenta | Normal: está descomprimiendo el dataset en `data/.cache/`. Solo pasa una vez por variable |
| `pip install` falla con `pyhdf` o `h5py` | Usa `requirements-backend.txt`; esas librerías solo hacen falta para descargar datos de NASA |
| `npm install` falla o la web no arranca | Revisa `node --version` (≥ 20.9). Borra `web/node_modules` y repite `npm --prefix web install` |
| `git push` rechazado en `main` o `Develop` | Las ramas están protegidas: sube tu rama y abre un PR |
| El clon del Backend tarda mucho | Normal, trae el dataset (≈ 400 MB). Hazlo con buena conexión |
| La web no muestra capas globales | Asegúrate de estar en `main` actualizado (o en `feat/web-nextjs-global-data` mientras no se una el PR) |
| `EARTHSCOPE_DATA=...` no funciona en Windows | PowerShell: `$env:EARTHSCOPE_DATA="sample"` · CMD: `set EARTHSCOPE_DATA=sample` |

---

## 9. Checklist del primer día
- [ ] Cloné los dos repos uno al lado del otro.
- [ ] `http://localhost:8000/api/v1/health` responde `"source": "full"`.
- [ ] `http://localhost:3000` muestra el globo, y "Your point" muestra un análisis.
- [ ] Leí la [rúbrica de HU](gestion/RUBRICA_HISTORIAS_DE_USUARIO.md) y el [backlog](gestion/BACKLOG_HU.md).
- [ ] Elegí una HU, le puse mi nombre y creé mi rama.
- [ ] Sé qué pruebas correr antes de mi PR (paso 5.4).

**Más información:** [README del Frontend](../README.md) · [README del Backend](https://github.com/jose6668/RK_Vanguard_EarthScopeAI-BACK#readme) · [Mapa de documentos](README.md) · [Arquitectura](05_ARQUITECTURA.md) · [Plan de trabajo](PLAN_DE_TRABAJO.md)
