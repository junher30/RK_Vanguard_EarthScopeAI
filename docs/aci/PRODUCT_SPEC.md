# Especificación del producto — LACI

## 1. Visión
Construir **LatAm Climate Intelligence (LACI)**, una plataforma de investigación y análisis climático para América Latina y el Caribe. Debe ayudar a identificar qué está cambiando, dónde ocurre, la robustez de la evidencia y cómo podrían evolucionar en el corto plazo los patrones térmicos y de presión atmosférica.

LACI no sustituye a servicios meteorológicos nacionales ni emite alertas oficiales.

## 2. Decisiones de alcance
- **Cobertura geográfica:** toda América Latina y el Caribe desde el diseño del producto.
- **Entrega:** progresiva por regiones; el catálogo geográfico y los contratos son continentales, pero la cobertura real se declara por dataset, variable, periodo y región.
- **Arquitectura IA:** modelos regionales especializados con pipelines, artefactos y evaluación independientes.
- **Prioridad científica:** equilibrio entre temperatura/eventos de calor y presión/circulación atmosférica.
- **Primer piloto recomendado:** Amazonia, sin convertirla en límite arquitectónico.

## 3. Objetivos
- Analizar temperatura del aire a 2 m, LST, presión superficial, presión a nivel del mar, viento, humedad y precipitación cuando las fuentes lo permitan.
- Detectar anomalías térmicas, episodios de calor y anomalías/cambios de presión.
- Calcular tendencias por celda, región y país con significancia, incertidumbre y cobertura.
- Caracterizar patrones espaciales de presión y circulación.
- Mostrar pronósticos numéricos con inicialización, tiempo válido, horizonte y fuente.
- Entrenar y evaluar modelos propios por región únicamente si existen datos compatibles y habilidad demostrada.
- Comparar regiones y comunicar vacíos de observación/datos.

## 4. Usuarios
Investigadores, docentes, estudiantes, analistas ambientales, instituciones de gestión de riesgo y público interesado en interpretar datos climáticos.

## 5. Regiones y jerarquía geográfica
El catálogo debe soportar:
- países y territorios;
- subregiones administrativas;
- regiones climáticas/analíticas (no necesariamente contiguas ni mutuamente excluyentes);
- cuencas hidrográficas y biomas;
- celdas de grilla.

Regiones iniciales candidatas (límites exactos pendientes de selección y validación): México, Centroamérica, Caribe, Andes del Norte, Andes Centrales, Amazonia, Nordeste de Brasil, Brasil tropical/central, vertiente Pacífica sudamericana y Cono Sur. Se podrán subdividir o agrupar según homogeneidad climática, datos y evaluación. No asumir que esta lista es una clasificación oficial universal.

## 6. Funcionalidades
### F-01. Explorador continental
Mapa con países/territorios, regiones analíticas, cuencas y biomas. Permitir filtros por región, país, variable, fuente, periodo y tipo de dato. La capa debe informar resolución nativa, unidad y disponibilidad real.

### F-02. Explorador temporal
Series por variable y región; frecuencia compatible con fuente; cobertura faltante visible; comparación de fuentes sin mezclarlas silenciosamente.

### F-03. Laboratorio de tendencias
Climatologías, anomalías, pendiente de Sen, Mann-Kendall/Seasonal Mann-Kendall, tratamiento de autocorrelación, intervalos y corrección FDR. Mostrar periodo, método, cobertura y número de observaciones.

### F-04. Eventos de calor y presión
Detectar episodios de calor con definición local explícita y anomalías de presión/cambios rápidos/gradientes. Agrupar celdas y seguir eventos, conservando algoritmo, parámetros y procedencia.

### F-05. Centro de pronóstico
GFS como baseline numérico inicial. Mostrar PS y MSLP por separado, campos de temperatura/viento disponibles, ciclo, valid_time, lead_time, resolución y antigüedad. Predicciones propias solo si superan validación independiente regional.

### F-06. Modelos regionales
Registro por modelo: región/dominio, variables, target, horizonte, fuentes, periodo de entrenamiento, versión de datos/features, métricas por horizonte y baseline, incertidumbre y estado (experimental/validado/degradado). Una región sin modelo validado no hereda automáticamente el modelo de otra.

### F-07. Comparador regional
Comparar tendencias y eventos entre regiones, mostrando diferencias de resolución, climatología, disponibilidad y calidad. Evitar escalas visuales que induzcan comparaciones físicas inválidas.

### F-08. Trazabilidad
Cada capa/cálculo/evento/predicción conserva fuente, producto, versión, unidad, periodo, resolución, método, parámetros, versión de código/modelo y limitaciones.

## 7. Tipos de datos
`observation`, `reanalysis`, `forecast`, `laci_prediction`, `scenario`. Nunca indistinguibles en API o UI.

## 8. Variables normalizadas
- `tas2m`: temperatura del aire a 2 m.
- `tasmax2m`: máxima diaria de temperatura del aire a 2 m.
- `ts`: temperatura superficial terrestre (LST).
- `ps`: presión superficial.
- `msl`: presión reducida al nivel del mar.
- `u10`, `v10`: viento a 10 m.
- `u850`, `v850`: viento a 850 hPa, si está disponible.
- `q2m`, `rh2m`: humedad, si está disponible.
- `pr`: precipitación con intervalo explícito.

## 9. No objetivos del MVP
No se promete pronóstico climático decadal, atribución causal, alertas oficiales, predicción de incendios, asimilación propia en tiempo real ni despliegue de modelos profundos continentales sin evidencia. No se exige que todas las regiones estén operativas en el primer MVP.

## 10. Criterios de aceptación del MVP
1. Catálogo geográfico con cobertura prevista para Latinoamérica y Caribe, con geometrías y fuentes trazables.
2. API puede devolver disponibilidad por región/variable/fuente/periodo, incluso si es “no disponible”.
3. Al menos un piloto regional procesado de extremo a extremo con temperatura y presión.
4. Tendencias y eventos tienen tests científicos y cobertura explícita.
5. GFS se presenta con ciclo y tiempo válido cuando esté disponible.
6. Cada modelo predictivo está asociado a una región y métricas independientes.
7. La UI distingue observación, reanálisis, GFS y predicción experimental LACI.
8. El prototipo Streamlit existente sigue ejecutándose.
9. Instalación local reproducible y documentación de limitaciones.
