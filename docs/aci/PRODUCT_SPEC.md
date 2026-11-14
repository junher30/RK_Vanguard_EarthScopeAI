# Especificación del producto — ACI

## 1. Visión

Construir **Amazon Climate Intelligence (ACI)**, una plataforma de investigación climática que permita descubrir qué está cambiando en la Amazonía, dónde ocurre, cuánto cambia, qué tan robusta es la evidencia estadística y cómo podrían evolucionar ciertos patrones atmosféricos en el corto plazo.

ACI no pretende sustituir a los servicios meteorológicos nacionales ni emitir alertas oficiales. Es una herramienta científica de análisis y apoyo a la investigación.

## 2. Problema que aborda

La información atmosférica y satelital de la Amazonía procede de múltiples misiones, reanálisis y modelos. Las variables tienen distintas resoluciones espaciales y temporales, unidades, periodos y convenciones. Esto dificulta comparar territorios, estudiar tendencias y presentar predicciones con trazabilidad.

ACI centralizará el flujo de trabajo: catálogo de datos, normalización, geografía, análisis de tendencias, detección de eventos, pronósticos de referencia y visualización.

## 3. Objetivos

### Objetivos principales
- Analizar tendencias de temperatura del aire, temperatura superficial, presión superficial, presión a nivel del mar, viento, humedad y precipitación.
- Identificar anomalías térmicas y de presión respecto de climatologías de referencia.
- Determinar la magnitud y significancia estadística de las tendencias por celda, región y país.
- Analizar configuraciones espaciales de presión y circulación atmosférica.
- Mostrar pronósticos de presión y variables relacionadas para horizontes de corto plazo, con fuente, tiempo de inicialización, tiempo válido e incertidumbre.
- Evaluar la capacidad de modelos propios para anticipar anomalías de presión y condiciones de calor extremo.

### Objetivos secundarios
- Comparar la cuenca hidrográfica con el bioma amazónico dividido por país.
- Relacionar anomalías de presión, temperatura, viento, humedad, precipitación y condiciones terrestres.
- Facilitar exportación de gráficas, resultados tabulares y metadatos de fuentes.

## 4. Usuarios principales
- Estudiantes e investigadores que exploran cambios ambientales.
- Docentes y participantes del NASA Space Apps Challenge.
- Analistas ambientales y organizaciones interesadas en el comportamiento climático amazónico.
- Público general que necesita interpretar visualizaciones científicas sin manipular directamente archivos de reanálisis.

## 5. Funcionalidades

### F-01. Explorador geográfico
- Mostrar el polígono de la cuenca amazónica.
- Mostrar el bioma amazónico y sus intersecciones con países.
- Permitir elegir una máscara geográfica y un nivel de agregación.
- Mostrar temperatura, presión, viento, humedad, precipitación y anomalías.
- Mostrar la fuente, resolución, unidad, periodo y hora de validez de la capa.

### F-02. Explorador temporal
- Consultar series temporales por variable, ubicación, país, subregión o celda.
- Comparar fuentes sin mezclarlas silenciosamente.
- Permitir agregaciones horarias, diarias, mensuales y anuales cuando la fuente lo permita.
- Señalar periodos faltantes y calidad de cobertura.

### F-03. Laboratorio de tendencias
- Calcular anomalías respecto de una climatología seleccionable.
- Calcular tendencia, pendiente de Sen, pruebas de Mann-Kendall adecuadas a la estacionalidad y autocorrelación, valor p e intervalo de confianza.
- Corregir pruebas múltiples al generar mapas de miles de celdas.
- Mostrar la cobertura temporal y el número de observaciones válidas.
- Diferenciar tendencias estadísticamente significativas de cambios visuales no significativos.

### F-04. Detección de eventos
- Detectar episodios de presión anómala y cambios rápidos de presión.
- Caracterizar gradientes espaciales y evolución temporal.
- Detectar episodios de calor con una definición local y explícita.
- Agrupar celdas conectadas y seguir la evolución del evento.
- Conservar evidencia, umbrales y versión de algoritmo.

### F-05. Centro predictivo
- Mostrar el pronóstico numérico GFS como referencia operativa.
- Mostrar presión superficial y presión a nivel del mar por separado.
- Mostrar campos de viento y anomalías esperadas.
- Mostrar horizonte, inicialización, tiempo válido, fuente y antigüedad del pronóstico.
- Permitir visualizar predicciones propias de ACI únicamente cuando hayan superado validación fuera de muestra.
- Mostrar incertidumbre y métricas de habilidad del modelo.

### F-06. Comparador geográfico
- Comparar cuenca completa, subregiones y porciones del bioma por país.
- Permitir gráficos de series y mapas con una escala común cuando la comparación física sea válida.
- Advertir cuando las resoluciones o definiciones de variable no sean comparables.

### F-07. Trazabilidad
Cada capa, cálculo, evento y predicción debe permitir consultar:
- fuente y producto;
- fecha/versión de descarga;
- periodo y resolución;
- variable original y variable normalizada;
- unidad original y unidad mostrada;
- método, parámetros y versión de código/modelo;
- limitaciones y nivel de calidad.

## 6. No objetivos de la primera versión
- Predicción climática de décadas o escenarios de cambio climático.
- Atribución causal de tendencias a deforestación, ENSO u otras causas.
- Sustituir pronósticos o alertas de servicios meteorológicos oficiales.
- Predicción operativa de incendios forestales.
- Asimilación de estaciones meteorológicas propias en tiempo real.
- Plataforma de microservicios distribuida, Kubernetes, Kafka o Airflow.
- Acceso público con autenticación multiusuario compleja.

## 7. Definiciones científicas y de producto

### Tipos de datos
- `observation`: medición observacional o producto de observación satelital.
- `reanalysis`: reconstrucción histórica que combina modelo y observaciones.
- `forecast`: salida de un modelo numérico inicializado en un momento determinado.
- `aci_prediction`: estimación del modelo estadístico/ML de ACI.
- `scenario`: experimento hipotético; no es pronóstico.

Estos tipos nunca deben ser indistinguibles en la interfaz o base de datos.

### Variables
- `tas2m`: temperatura del aire a 2 m.
- `tasmax2m`: máxima diaria de temperatura del aire a 2 m, derivada de datos horarios.
- `ts`: temperatura superficial terrestre (LST).
- `ps`: presión atmosférica en superficie.
- `msl`: presión reducida al nivel del mar.
- `u10`, `v10`: componentes zonal y meridional del viento a 10 m.
- `u850`, `v850`: componentes del viento a 850 hPa cuando estén disponibles.
- `q2m`: humedad específica a 2 m, si está disponible.
- `rh2m`: humedad relativa a 2 m, si está disponible.
- `pr`: precipitación acumulada o tasa, con intervalo claramente especificado.

Mantener la correspondencia entre nombres normalizados y variables originales de cada producto.

## 8. Criterios de aceptación del MVP
1. El usuario puede seleccionar la máscara de cuenca o la máscara de bioma por país.
2. El sistema puede consultar al menos una serie histórica MERRA-2 de temperatura y una de presión, documentando la resolución original.
3. El sistema puede calcular y visualizar tendencias con pruebas estadísticas y cobertura válida.
4. Las salidas distinguen presión superficial de presión a nivel del mar.
5. El sistema puede mostrar un pronóstico GFS con inicialización y tiempo válido; no simula datos reales cuando la descarga no está disponible.
6. El sistema distingue datos reales de fixtures sintéticos de desarrollo.
7. El prototipo Streamlit existente sigue ejecutándose durante la transición.
8. La ejecución local está documentada y se inicia con Docker Compose.
9. Hay pruebas automatizadas para conversiones, series, geometría y métodos estadísticos.
10. La interfaz nunca presenta una salida ACI como pronóstico validado si no se han calculado y publicado sus métricas fuera de muestra.

## 9. Principios de diseño
- Primero evidencia y trazabilidad; después visualización.
- La resolución nativa es parte de la información.
- No extrapolar detalle espacial.
- Comparación solo entre variables físicamente equivalentes.
- Toda predicción lleva incertidumbre, horizonte y baseline.
- Arquitectura modular, no microservicios prematuros.
