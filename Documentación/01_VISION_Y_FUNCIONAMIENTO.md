# EarthScope AI — Planetary Investigation Lab
## Documento 01. Visión y definición del proyecto

**Equipo:** RoboKids  
**Contexto:** NASA Space Apps Challenge 2026 — *Be an Earth System Trend Detective*  
**Versión:** 0.1 — Propuesta conceptual  
**Estado:** Para revisión del equipo  
**Idioma de documentación:** Español

---

## 1. Propósito del documento

Establecer el problema que aborda EarthScope AI, la solución propuesta, sus objetivos, usuarios, alcance y funcionamiento esperado. Este documento describe **qué se desea construir y por qué**, sin depender de tecnologías o implementaciones específicas.

## 2. Contexto y problema

La NASA ofrece conjuntos de datos de observación terrestre y reanálisis que permiten estudiar fenómenos ambientales a lo largo del tiempo. Sin embargo, interpretar esos datos puede exigir conocimientos de coordenadas, cobertura espacial, resolución temporal, unidades y métodos estadísticos.

Para estudiantes, docentes, investigadores en formación y público general, delimitar un área de interés, seleccionar variables comparables y comprender sus cambios históricos puede resultar complejo. También existe el riesgo de interpretar una visualización como una medición exacta o confundir una simulación hipotética con un pronóstico.

**Problema central:** se necesita una experiencia accesible que permita investigar cambios ambientales en regiones geográficas elegidas por el visitante, conservando la trazabilidad científica y comunicando las limitaciones de la evidencia.

## 3. Visión del producto

EarthScope AI será una plataforma web pública de exploración e investigación ambiental. El visitante podrá explorar un globo terráqueo tridimensional, dibujar una región de estudio mediante un polígono editable, seleccionar variables y períodos históricos y consultar representaciones espaciales y temporales basadas en datos científicos.

En fases posteriores, la plataforma incorporará análisis de tendencias, evaluación de robustez, comparación de períodos y un laboratorio de escenarios hipotéticos, diferenciando explícitamente los datos observados o derivados de las simulaciones.

La plataforma no requerirá cuentas de usuario ni almacenará permanentemente las regiones que dibuje cada visitante.

## 4. Objetivos

### 4.1. Objetivo general

Desarrollar una plataforma web interactiva para explorar regiones del planeta, consultar información ambiental histórica y apoyar la investigación de tendencias del sistema terrestre mediante visualizaciones comprensibles y evidencia científica trazable.

### 4.2. Objetivos específicos

1. Ofrecer un globo terráqueo 3D que permita navegar y localizar regiones de interés.
2. Permitir delimitar libremente un área mediante un polígono geográfico editable.
3. Validar la geometría antes de confirmar una región de estudio.
4. Integrar un catálogo de variables ambientales con sus unidades, fuentes, cobertura y limitaciones.
5. Permitir consultar períodos históricos disponibles y representar los datos mediante capas temáticas y leyendas.
6. Comunicar claramente la ausencia de datos, la resolución de los productos y las diferencias entre variables.
7. Incorporar progresivamente análisis de tendencias y simulaciones hipotéticas sustentadas en métodos y validaciones científicas.
8. Facilitar la interpretación y trazabilidad de los resultados.

## 5. Público objetivo

- **Estudiantes:** explorar relaciones ambientales mediante una experiencia visual.
- **Docentes:** apoyar actividades de enseñanza de geografía, ciencias y análisis de datos.
- **Investigadores en formación:** examinar áreas, variables, períodos y evidencias.
- **Público general:** comprender información ambiental sin necesitar herramientas SIG especializadas.
- **Evaluadores del reto:** recorrer una demostración pública y comprensible de la investigación.

### 5.1. Actor principal

**ACT-01 — Visitante:** persona que utiliza la plataforma sin autenticación. En el alcance inicial no existen roles ni permisos diferenciados.

## 6. Solución propuesta y módulos

| Módulo | Propósito | Alcance |
|---|---|---|
| M01. Exploración global y visualización ambiental histórica | Navegar el planeta, seleccionar un área y visualizar información ambiental | Primera etapa |
| M02. Detector de tendencias | Estudiar cambios históricos, significancia y robustez | Evolución |
| M03. Laboratorio What-If | Explorar escenarios hipotéticos sujetos a validación científica | Evolución |
| M04. Evidencia e interpretación | Mostrar fuentes, métodos, incertidumbres y limitaciones | Transversal; ampliación progresiva |
| M05. Asistente de IA | Ayudar a interpretar resultados sin sustituir la evidencia | Opcional |

**Principio de diseño:** la interfaz presenta resultados; los cálculos científicos deben proceder de un proceso de análisis identificable, validado y reproducible.

## 7. Alcance de la primera etapa: M01

### 7.1. Incluye

- Acceso público sin registro.
- Globo tridimensional con rotación, acercamiento y alejamiento.
- Herramienta de selección poligonal directamente sobre el globo.
- Adición, desplazamiento y eliminación de vértices; deshacer cambios y cancelar.
- Visualización de límites y superficie seleccionada.
- Validación geométrica antes de confirmar.
- Conservación temporal de la región durante la sesión de uso.
- Selección de variables ambientales disponibles.
- Selección de períodos históricos compatibles con cada fuente.
- Capas ambientales con leyenda, unidades, fuente y tratamiento explícito de zonas sin datos.
- Mensajes de cobertura, error o ausencia de información.
- Posibilidad de ocultar una capa sin perder la selección.

### 7.2. No incluye

- Registro, autenticación o perfiles.
- Almacenamiento permanente de polígonos o historial personal.
- Garantía de disponibilidad de todas las variables en cualquier lugar y fecha.
- Pronósticos meteorológicos.
- Presentar escenarios hipotéticos como predicciones verificadas.
- Cálculo de tendencias o simulaciones dentro de la herramienta de dibujo.

### 7.3. Funciones de evolución

El análisis de tendencias para un polígono, los mapas de tendencia por celda, la consulta puntual de valores, los filtros mensuales, la comparación de períodos, los informes descargables y las simulaciones se priorizarán conforme a la validación de fuentes, métodos y experiencia de usuario.

## 8. Funcionamiento esperado

1. El visitante abre la plataforma y observa el globo 3D.
2. Navega hasta la región que desea estudiar.
3. Activa la herramienta de selección de área.
4. Hace clic directamente sobre el globo para crear los vértices de un polígono.
5. Observa el contorno durante el dibujo y puede modificar los vértices, insertar otros o eliminarlos.
6. Cierra la figura. El sistema verifica su validez geométrica.
7. Si la figura es válida, confirma el área; si no, recibe una explicación para corregirla.
8. Selecciona una variable y un período disponibles.
9. El sistema determina si existen datos utilizables para esa combinación de área, variable y período.
10. Si existen, presenta la capa y su leyenda; si no, explica la limitación sin confundirla con un error geométrico.
11. El visitante puede cambiar la variable o el período sin perder el área confirmada.

La región se mantiene de forma temporal para continuar la investigación durante la sesión. No se registra como una región asociada a una cuenta.

## 9. Variables ambientales consideradas

| Variable | Interpretación | Precaución |
|---|---|---|
| Precipitación | Cantidad de lluvia en un período | La unidad y la agregación deben indicarse |
| Temperatura de superficie terrestre | Temperatura de la superficie observada | No equivale a temperatura del aire |
| Temperatura del aire | Condición atmosférica cercana a la superficie | Puede proceder de reanálisis |
| Humedad relativa del aire | Porcentaje de humedad relativa | No debe confundirse con humedad del suelo |
| Vegetación (EVI/NDVI) | Índices relacionados con el verdor de la vegetación | No equivalen directamente a deforestación |

**Fuentes candidatas identificadas en la documentación del proyecto:** GPM IMERG, MODIS y MERRA-2. Su cobertura, disponibilidad, resolución y licencia deben verificarse para cada uso. La cobertura de un producto no garantiza datos válidos para todas las celdas o fechas.

## 10. Reglas de negocio generales

| ID | Regla |
|---|---|
| RN-01 | El acceso será público y no requerirá autenticación. |
| RN-02 | El mecanismo principal para delimitar un área será un polígono dibujado directamente sobre el globo. |
| RN-03 | El polígono deberá cumplir las condiciones de validez geométrica definidas para la selección. |
| RN-04 | Solo se podrá confirmar un polígono geométricamente válido. |
| RN-05 | Antes de confirmarlo, el visitante podrá editar sus vértices y deshacer acciones. |
| RN-06 | El visitante podrá cancelar o reemplazar su selección. |
| RN-07 | La disponibilidad de datos se evaluará separadamente de la validez geométrica, considerando área, variable y período. |
| RN-08 | La región confirmada permanecerá disponible temporalmente durante la sesión. |
| RN-09 | No se guardarán permanentemente las regiones del visitante. |
| RN-10 | Toda visualización ambiental identificará la variable, unidad, período y fuente. |
| RN-11 | La ausencia de datos no se representará como un valor ambiental válido. |
| RN-12 | Los resultados derivados y las simulaciones se distinguirán de las observaciones y de los pronósticos. |
| RN-13 | Cambiar la variable o el período no eliminará la región confirmada. |
| RN-14 | Las limitaciones relevantes de cada producto se comunicarán al visitante. |
| RN-15 | La interfaz de presentación para el reto se proyecta en inglés; la documentación de trabajo podrá estar en español. |

## 11. Restricciones y supuestos

- La plataforma depende de la cobertura y calidad de fuentes científicas externas.
- Las diferentes variables pueden tener resoluciones espaciales y temporales distintas.
- La selección geométrica puede ser más pequeña que una celda de datos: esto deberá comunicarse y tratarse según una política científica explícita.
- Los resultados de análisis avanzado exigirán métodos estadísticos apropiados y validación.
- Las decisiones de arquitectura, infraestructura y almacenamiento se documentarán después de definir el comportamiento y los requisitos.

## 12. Criterios de éxito de la primera etapa

Se considerará satisfactoria cuando un visitante pueda navegar el globo, dibujar y corregir un polígono, confirmar una geometría válida, seleccionar una variable y un período y obtener una capa ambiental correctamente etiquetada o un mensaje claro de falta de datos, todo ello sin autenticación.

## 13. Decisiones pendientes de validación

1. Alcance exacto de la visualización de capas respecto del contorno del polígono.
2. Resoluciones temporales mínimas que se ofrecerán inicialmente.
3. Política de análisis para polígonos pequeños y coberturas parciales.
4. Criterios cuantitativos de rendimiento, compatibilidad y accesibilidad.
5. Orden y condiciones de incorporación de los módulos científicos posteriores.

---

**Siguiente documento:** [02 — Casos de uso y flujos](02_CASOS_DE_USO.md).
