# Backlog de Historias de Usuario

Numeración única para los dos repositorios. Reglas: [RUBRICA_HISTORIAS_DE_USUARIO.md](RUBRICA_HISTORIAS_DE_USUARIO.md).
Al crear una HU como issue, agrega aquí su enlace.

| HU | Título | Repo | Prioridad | Pts | CU / RF | Estado | Issue |
|---|---|---|---|---|---|---|---|
| HU-01 | Explorar el globo 3D | Frontend | Must | 3 | CU-01 · RF-01 | ✅ Hecha | — |
| HU-02 | Dibujar, editar y validar un polígono | Frontend | Must | 8 | CU-02…06 · RF-02…08 | ✅ Hecha | — |
| HU-03 | Ver capas NASA con línea de tiempo y leyenda | Ambos | Must | 5 | CU-08…10, 12 · RF-09, 10, 12, 15 | ✅ Hecha | — |
| HU-04 | Ver la tendencia y robustez de cualquier área | Ambos | Must | 8 | CU-07 · RF-16, 17 | ✅ Hecha | — |
| HU-05 | Mapa de tendencias por celda | Ambos | Should | 5 | RF-18 | ✅ Hecha | — |
| HU-06 | Dataset global completo disponible al clonar | Backend | Must | 3 | RNF-13 | ✅ Hecha | — |
| HU-07 | Ver el valor de una celda | Ambos | Should | 5 | CU-11 · RF-14 | ⏳ Backlog | |
| HU-08 | Recortar la capa al área dibujada | Frontend | Should | 3 | CU-10 · RF-13 | ⏳ Backlog | |
| HU-09 | Publicar la API | Backend | Must | 5 | RNF-01 | ⏳ Backlog | |
| HU-10 | Simular escenarios en cualquier área | Ambos | Could | 8 | — | ⏳ Backlog | |
| HU-11 | Publicar la web en Vercel | Frontend | Must | 2 | RNF-01 | ⏳ Backlog | |
| HU-12 | Panel de análisis en móvil | Frontend | Should | 3 | RNF-10 | ⏳ Backlog | |
| HU-13 | Botón "Reintentar" ante fallos | Frontend | Should | 1 | RF-19 | ⏳ Backlog | |
| HU-14 | Seleccionar mes (resolución mensual) | Ambos | Could | 5 | RF-11 | ⏳ Backlog | |
| HU-15 | Descargar informe reproducible del área | Ambos | Could | 5 | RF-20 | ⏳ Backlog | |

## EarthScope IA (rama de korhan6, integrada en `feat/HU-16-earthscope-ia` del Backend)

| HU | Título | Repo | Prioridad | Pts | Estado | Notas |
|---|---|---|---|---|---|---|
| HU-16 | Asistente de IA (chat) que responde con la ciencia del backend y mueve el globo | Ambos | Should | 8 | 🟡 Backend ✅ · Frontend ⏳ | `/api/v1/agent/chat`. Falta el panel de chat en la web, que no está en el repo Frontend |
| HU-17 | Consultar al asistente por voz | Ambos | Could | 3 | 🟡 Backend ✅ · Frontend ⏳ | `/api/v1/agent/voice` (ElevenLabs o Gemini) |
| HU-18 | Proyección experimental 2025–2030 con red neuronal | Ambos | Could | 8 | 🟡 Backend ✅ (marcada experimental) | Falta validar la habilidad por horizonte (1–12 meses) antes de llamarla pronóstico; la capa web está pendiente |
| HU-19 | Eventos naturales activos (NASA EONET) en el globo | Ambos | Should | 3 | 🟡 Backend ✅ · Frontend ⏳ | `/api/v1/events` |
| HU-20 | Satélites NASA en vivo (TLE CelesTrak) | Ambos | Could | 3 | 🟡 Backend ✅ · Frontend ⏳ | `/api/v1/satellites` |
| HU-21 | Imagen Docker del Backend | Backend | Should | 2 | ✅ (sin probar el build en local) | `Dockerfile`, `docker-compose.yml` |
