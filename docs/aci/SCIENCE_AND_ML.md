# Métodos científicos, detección de eventos y aprendizaje automático

## 1. Separar tres problemas

ACI no tratará todos los resultados como una única predicción.

1. **Tendencia climática:** ¿cómo ha cambiado históricamente una variable?
2. **Detección de evento:** ¿está ocurriendo ahora una anomalía o patrón atmosférico relevante?
3. **Pronóstico:** ¿qué condiciones futuras indica un modelo numérico o un modelo ACI validado?

El análisis de tendencias usa reanálisis y observaciones; la predicción de los próximos días requiere pronósticos numéricos o un modelo entrenado con datos de pronóstico/hindcast comparables.

## 2. Climatologías y anomalías

- Definir inicialmente 1991–2020 como periodo de referencia cuando la cobertura de datos lo permita.
- Para series mensuales, comparar contra la media/mediana del mismo mes del calendario.
- Para series diarias, construir climatología por día del año usando una ventana móvil de días vecinos, con reglas para años bisiestos.
- Documentar el periodo de referencia y cobertura mínima.
- Evitar climatologías calculadas con periodos que incluyan datos futuros respecto de una evaluación retrospectiva.
- Producir tanto anomalía absoluta como anomalía estandarizada cuando la desviación sea adecuada.

## 3. Motor de tendencias

### Métodos
- Mann-Kendall: prueba de tendencia monotónica.
- Seasonal Mann-Kendall o método equivalente: cuando la serie conserva estacionalidad mensual.
- Corrección por autocorrelación: aplicar método documentado (por ejemplo, trend-free pre-whitening o variante apropiada), no asumir independencia temporal.
- Pendiente de Sen: magnitud robusta del cambio.
- Regresión lineal: como estadístico complementario, no sustituto automático de Sen.
- Intervalos de confianza y número de observaciones válidas.
- Benjamini-Hochberg/FDR para mapas con muchas pruebas por celda.

### Salidas
- dirección de tendencia (increasing/decreasing/no trend/insufficient data);
- pendiente por año y por década;
- intervalo de confianza;
- p-value sin ajustar y q-value ajustado;
- periodo de estudio y cobertura;
- método y parámetros utilizados;
- bandera de calidad/robustez.

No etiquetar una tendencia como significativa basándose únicamente en el signo de la pendiente. La significancia se evalúa con prueba y corrección definidas.

## 4. Detección de anomalías de presión

Variables mínimas:
- presión superficial (`ps`);
- presión a nivel del mar (`msl`);
- anomalía de presión respecto de climatología local;
- variación temporal `dP/dt`;
- gradiente espacial `∇P`;
- componentes y magnitud del viento;
- cuando esté disponible, viento a 850 hPa y geopotencial.

Mantener `ps` y `msl` separadas. La presión a nivel del mar puede ser problemática en áreas de gran elevación; reportar ambos campos y documentar el uso de cada uno.

### Evento candidato
Un evento se define inicialmente como un conjunto de celdas vecinas que superan umbral de anomalía o de cambio de presión durante una ventana temporal. El umbral (por ejemplo, percentil local o z-score) debe calibrarse con la climatología y evaluarse históricamente; no fijar un umbral universal sin validación.

### Seguimiento
- Identificar componentes conectados en mapas de anomalías.
- Asociar componentes entre tiempos por solapamiento espacial, proximidad y consistencia de movimiento.
- Usar viento como variable contextual; no asumir que el centro de presión se mueve igual que el viento en superficie.
- Conservar centro, área, intensidad, duración y trayectoria.
- Evitar llamar "frente" o "ciclón" a un patrón si la clasificación física no se ha comprobado.

## 5. Definición operativa de ola de calor

Para una primera definición investigativa:
- variable: máxima diaria de temperatura del aire a 2 m (`tasmax2m`), no LST;
- umbral: percentil 90 local de la climatología 1991–2020 para el día del año (ventana móvil);
- duración: al menos 3 días consecutivos;
- evaluar por celda o zona y agrupar espacialmente.
- realizar análisis de sensibilidad con otros percentiles/duraciones.

Esta es una definición operativa inicial de ACI, no una definición universal ni un aviso oficial. Si solo hay LST satelital disponible, crear una capa diferente de anomalías de temperatura superficial y no llamarla ola de calor del aire.

## 6. Arquitectura predictiva

### 6.1 Baseline operacional
Integrar GFS como pronóstico numérico externo. Guardar el ciclo de inicialización y los tiempos válidos. En la primera versión, mostrar GFS como fuente de pronóstico y usarlo como referencia de habilidad.

### 6.2 Modelo propio de ACI
No entrenar un modelo de pronóstico con reanálisis histórico y afirmar que su salida es un pronóstico real sin analizar el sesgo entre reanálisis y pronóstico.

Para predecir campos futuros, conseguir un archivo histórico de pronósticos/hindcasts del sistema utilizado o construir un dataset temporal equivalente con:
- campos de entrada conocidos en la fecha de inicialización;
- lead time específico;
- campo objetivo futuro;
- fecha de inicialización y tiempo válido;
- producto y versión de modelo.

Si no existe cobertura suficiente de hindcasts para entrenar el modelo, limitar el ML inicial a detección/clasificación de anomalías o nowcasting, y mantener GFS como pronóstico.

### 6.3 Modelos por fase
- Baseline estadístico de persistencia/climatología.
- XGBoost para clasificación/regresión tabular con características espacio-temporales.
- Random Forest solo como benchmark adicional si aporta valor.
- ConvLSTM/U-Net u otro modelo espacial profundo: fase posterior, solo con volumen de datos y validación suficientes.

No incluir redes profundas en el MVP solo por apariencia tecnológica.

### 6.4 Predicciones
Horizontes de desarrollo:
- MVP: 24 y 48 horas.
- Siguiente incremento: 72 horas.
- 7 días: fase posterior, si la habilidad se mantiene y el producto de origen lo permite.

Variables objetivo iniciales:
- anomalía de presión superficial y/o MSLP (separadas);
- cambios de presión;
- componentes de viento;
- probabilidad de condición de calor extremo cuando los datos permitan evaluación.

## 7. Validación

### Separación
- Entrenamiento/validación/prueba cronológica.
- Evaluación rolling-origin cuando corresponda.
- Prohibido usar split aleatorio de filas para series temporales.
- Agregar evaluación espacial bloqueada: reservar zonas completas para probar generalización.
- Evitar fuga de información en climatologías, normalizadores, imputación y selección de features.

### Métricas
Para regresión:
- MAE;
- RMSE;
- bias medio;
- correlación/anomaly correlation;
- evaluación por horizonte y región.

Para eventos:
- precision, recall, F1;
- Brier Score y calibración;
- Critical Success Index/F1 según prevalencia y definición;
- comparación con persistencia y climatología.

Para modelos probabilísticos/ensambles:
- CRPS cuando la salida lo permita;
- reliability diagrams y cobertura de intervalos.

Publicar métricas por variable, horizonte, sector y periodo; no ocultar regiones con mal rendimiento mediante un único promedio amazónico.

## 8. Incertidumbre y comunicación
Toda predicción ACI publicada debe incluir:
- intervalo o distribución/probabilidad;
- horizonte y tiempo válido;
- baseline de comparación;
- skill score en test independiente;
- advertencia sobre regiones/horizontes con bajo desempeño.

La interfaz debe diferenciar:
- "reanálisis histórico";
- "observación satelital";
- "pronóstico GFS";
- "predicción experimental ACI";
- "escenario hipotético".

## 9. Pruebas científicas
Crear tests sintéticos conocidos para:
- tendencia creciente, decreciente y nula;
- serie con ciclo estacional;
- autocorrelación;
- valores faltantes;
- outliers;
- conversión de unidades;
- derivación de máximas diarias;
- olas de calor con umbral y duración conocidos;
- campo de presión con anomalía espacial artificial y trayectoria conocida;
- detección de fuga temporal.

Guardar notebooks como material exploratorio, pero mover los métodos usados en producción a módulos testeados.
