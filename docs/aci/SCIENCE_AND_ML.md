# Métodos científicos y modelos regionales — LACI

## 1. Tres problemas separados
1. Tendencia histórica.
2. Detección/seguimiento de evento.
3. Pronóstico futuro.
No confundir análisis de reanálisis con forecast. Las métricas se reportan por variable, periodo, horizonte y región.

## 2. Climatologías y anomalías
Periodo candidato 1991–2020 solo donde la cobertura lo permita. Climatologías mensuales por mes calendario; diarias con ventana móvil del día del año y regla de años bisiestos. Registrar periodo, cobertura y método. En backtesting, evitar que la climatología use información futura respecto de la fecha evaluada. Publicar anomalía absoluta y estandarizada cuando sea apropiado.

## 3. Tendencias
Usar Mann-Kendall/Seasonal Mann-Kendall según estacionalidad, tratamiento documentado de autocorrelación, pendiente de Sen, intervalos y Benjamini-Hochberg/FDR para mapas masivos. Salidas: dirección, pendiente/año y década, p y q, intervalo, periodo, observaciones válidas y robustez. No declarar significancia solo por signo de pendiente.

## 4. Temperatura y calor
Separar tas2m/tasmax2m de LST. Definición investigativa inicial de ola de calor: tasmax2m supera percentil 90 local de climatología 1991–2020 durante al menos 3 días consecutivos; validar y realizar sensibilidad por región. No es definición universal ni alerta oficial. Si solo hay LST, informar anomalía de superficie, no ola de calor del aire.

## 5. Presión y circulación
Mantener PS y MSLP separadas. Analizar anomalías locales, dP/dt, gradientes espaciales, viento 10 m/850 hPa y geopotencial cuando existan. La MSLP puede ser problemática en grandes elevaciones; documentar. Eventos iniciales pueden basarse en celdas vecinas que superen umbrales climatológicos locales; calibrar por región, no imponer umbral universal. No etiquetar ciclón/frente sin clasificación física validada.

## 6. Arquitectura de IA regional
LACI adopta modelos regionales independientes. Cada modelo requiere dominio/máscara versionada, datos y periodo, features, targets, horizonte, baseline, validación temporal y espacial, métricas, incertidumbre y artefacto versionado. Compartir código no implica compartir pesos ni generalización.
- Amazonia: primer piloto sugerido.
- Andes, Caribe, Centroamérica/México, Cono Sur y otras regiones: modelos separados cuando datos y QA lo permitan.
- Regiones sin datos suficientes: no entrenar; mostrar GFS/baseline y estado “sin modelo LACI validado”.
- Transfer learning o modelos compartidos solo como experimento, con comparación contra modelos regionales y evaluación externa.

## 7. Datos para forecasting
GFS es baseline numérico. Para entrenar predicción de campos futuros, priorizar hindcasts/archivo de pronósticos del sistema con fechas de inicialización y lead time. Entrenar con reanálisis y afirmar forecast sin analizar domain shift es inválido. Si no hay hindcasts suficientes, limitar ML a detección/clasificación/nowcasting y mantener GFS como pronóstico.

Modelos candidatos: persistencia/climatología; XGBoost tabular; Random Forest benchmark opcional; modelos profundos espaciales solo en fase posterior con volumen y validación suficientes.

## 8. Validación y métricas
- Split cronológico y rolling-origin; nunca split aleatorio de filas.
- Holdout espacial por bloques/regiones para generalización.
- Ajustar imputación, escalado, climatología y selección de features solo con train.
- Regresión: MAE, RMSE, bias, anomaly correlation.
- Eventos: precision, recall, F1, Brier, CSI según definición.
- Probabilístico: CRPS, calibración y cobertura de intervalos.
Publicar métricas por región/variable/horizonte; no ocultar fallos con un promedio continental.

## 9. Comunicación
Cada predicción lleva horizonte, valid_time, incertidumbre, baseline y skill en test independiente. Diferenciar reanálisis histórico, observación satelital, forecast GFS, predicción experimental/validada LACI y escenario hipotético. No afirmar capacidad predictiva si no supera el baseline predefinido.
