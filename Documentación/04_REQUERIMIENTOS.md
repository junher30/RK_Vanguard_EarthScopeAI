# EarthScope AI — Planetary Investigation Lab
## Documento 04. Especificación de requerimientos

**Equipo:** RoboKids  
**Versión:** 0.1 — Línea base propuesta  
**Estado:** Para revisión del equipo  
**Documentos base:** [01 — Visión](01_VISION_Y_FUNCIONAMIENTO.md) · [02 — Casos de uso](02_CASOS_DE_USO.md) · [03 — Modelo conceptual](03_MODELO_CONCEPTUAL.md)

---

## 1. Propósito

Definir los requerimientos funcionales, no funcionales y restricciones de EarthScope AI, con criterios de aceptación que puedan verificarse independientemente de una tecnología concreta.

Los requerimientos de la primera etapa se centran en el Módulo 01: exploración global, selección poligonal y visualización ambiental histórica. Las capacidades científicas avanzadas se distinguen como evolución.

## 2. Convenciones

- **RF:** requerimiento funcional.
- **RNF:** requerimiento no funcional.
- **RN:** regla de negocio definida en el Documento 01.
- **Prioridad A:** esencial para la primera etapa.
- **Prioridad M:** mejora deseable o siguiente iteración.
- **Prioridad F:** fase futura.
- **Estado:** propuesto; este documento no afirma que un requerimiento ya esté implementado.

## 3. Requerimientos funcionales

| ID | Requerimiento | CU | Prioridad | Criterio de aceptación |
|---|---|---|---|---|
| RF-01 | El sistema deberá presentar un globo terráqueo tridimensional navegable. | CU-01 | A | El visitante puede rotarlo y acercar o alejar la vista. |
| RF-02 | El sistema deberá permitir activar y desactivar el modo de selección poligonal. | CU-02 | A | Al activarlo, los clics sobre el globo permiten añadir vértices; al cancelarlo dejan de hacerlo. |
| RF-03 | El sistema deberá permitir crear un polígono mediante vértices seleccionados directamente sobre el globo. | CU-03 | A | Cada punto agregado aparece visualmente conectado con los anteriores. |
| RF-04 | El sistema deberá permitir cerrar una selección poligonal. | CU-03 | A | Solo permite cerrar una figura con al menos tres vértices distintos. |
| RF-05 | El sistema deberá permitir mover, insertar y eliminar vértices de una selección provisional. | CU-04 | A | La geometría se actualiza después de cada modificación. |
| RF-06 | El sistema deberá permitir deshacer modificaciones durante el dibujo o la edición. | CU-03/04 | A | La última modificación reversible puede deshacerse sin reiniciar toda la selección. |
| RF-07 | El sistema deberá validar la geometría del polígono e informar las condiciones incumplidas. | CU-04/05 | A | No permite confirmar una geometría inválida y presenta un mensaje comprensible. |
| RF-08 | El sistema deberá permitir confirmar un área geométricamente válida. | CU-05 | A | La región queda identificada como área de estudio durante la sesión. |
| RF-09 | El sistema deberá permitir cancelar o reemplazar el área seleccionada. | CU-06 | A | Puede iniciar otra selección sin necesidad de recargar la plataforma. |
| RF-10 | El sistema deberá conservar temporalmente el área confirmada mientras el visitante continúa su investigación. | CU-05/08/09 | A | Cambiar de variable o período no elimina el polígono. |
| RF-11 | El sistema deberá ofrecer un catálogo de variables ambientales. | CU-08 | A | Cada opción muestra nombre, definición, unidad y fuente científica. |
| RF-12 | El sistema deberá permitir seleccionar períodos históricos compatibles con la variable. | CU-09 | A | No presenta como disponibles fechas ajenas a la cobertura del producto. |
| RF-13 | El sistema deberá comprobar la disponibilidad de información para área, variable y período. | CU-07 | A | Diferencia cobertura suficiente, parcial, inexistente y error de consulta. |
| RF-14 | El sistema deberá mostrar capas ambientales espaciales con leyenda. | CU-10 | A | La visualización identifica colores, valores, unidades, período y fuente. |
| RF-15 | El sistema deberá diferenciar explícitamente las zonas sin datos válidos. | CU-10 | A | Las celdas sin dato no se representan como valores numéricos válidos. |
| RF-16 | El sistema deberá permitir mostrar u ocultar una capa sin borrar la región seleccionada. | CU-12 | A | La selección y los filtros se mantienen al cambiar la visibilidad. |
| RF-17 | El sistema deberá informar fallos de carga o consulta y permitir intentar de nuevo. | CU-01/07/10 | A | Un fallo genera mensaje y acción de reintento, sin inventar resultados. |
| RF-18 | El sistema deberá permitir consultar el valor de una celda cuando la fuente lo soporte. | CU-11 | M | Presenta valor, unidad, período, fuente y estado de calidad. |
| RF-19 | El sistema deberá permitir consultar períodos mensuales cuando existan datos y se apruebe su incorporación. | CU-09 | M | Solo ofrece meses disponibles para la variable seleccionada. |
| RF-20 | El sistema deberá permitir delimitar visualmente la capa respecto del área seleccionada. | CU-10 | M | El comportamiento de recorte o resaltado cumple la política de visualización aprobada. |
| RF-21 | El sistema deberá permitir comparar períodos históricos. | Evolución | F | Identifica ambos períodos, diferencias y fuentes sin confundir unidades. |
| RF-22 | El sistema deberá presentar análisis de tendencias con método y robustez. | Evolución | F | Toda conclusión muestra período, método, magnitud y advertencias. |
| RF-23 | El sistema deberá permitir explorar escenarios hipotéticos científicamente validados. | Evolución | F | Los resultados se identifican como simulación, no como pronóstico. |
| RF-24 | El sistema deberá permitir exportar resultados reproducibles. | Evolución | F | El informe incluye área, variable, período, fuente, método y limitaciones. |

## 4. Requerimientos no funcionales

| ID | Categoría | Requerimiento | Verificación propuesta |
|---|---|---|---|
| RNF-01 | Acceso | La plataforma deberá ser pública y utilizable sin registro. | Recorrido completo desde una sesión sin autenticación. |
| RNF-02 | Usabilidad | La selección geográfica deberá poder realizarse visualmente, sin escribir coordenadas. | Prueba de tarea con dibujo y edición de un polígono. |
| RNF-03 | Idioma | La interfaz destinada a la presentación del reto deberá estar en inglés. | Revisión de textos visibles, mensajes y leyendas. |
| RNF-04 | Integridad científica | La interfaz no deberá sustituir el cálculo científico validado por estimaciones improvisadas. | Revisión del flujo de obtención y cálculo de resultados. |
| RNF-05 | Trazabilidad | Cada capa o resultado deberá identificar la procedencia científica. | Verificar nombre del producto, período y referencia identificable. |
| RNF-06 | Honestidad científica | El sistema deberá diferenciar observaciones, datos derivados, reanálisis y simulaciones. | Revisar etiquetas y advertencias por producto y resultado. |
| RNF-07 | Privacidad | No deberá requerirse información personal para seleccionar regiones. | Verificar recorrido sin datos de identidad y ausencia de historial permanente. |
| RNF-08 | Disponibilidad | Los errores de consulta no deberán impedir innecesariamente la navegación geográfica. | Simular fallo de fuente y comprobar que el globo sigue utilizable. |
| RNF-09 | Compatibilidad | Se deberán definir y probar navegadores y dispositivos objetivo. | Matriz de pruebas aprobada por el equipo. |
| RNF-10 | Diseño adaptable | Los controles esenciales deberán ser accesibles en los tamaños de pantalla definidos. | Pruebas en anchos de referencia aprobados. |
| RNF-11 | Accesibilidad | La interfaz deberá incluir navegación, contraste e información no dependiente solo del color. | Auditoría de accesibilidad contra un nivel acordado. |
| RNF-12 | Rendimiento | La carga inicial y la consulta de datos deberán cumplir tiempos objetivo definidos. | Mediciones repetibles en red y dispositivos de referencia. |
| RNF-13 | Reproducibilidad | Los análisis científicos deberán conservar información suficiente para su revisión. | Comprobar fuente, versión, período, método y parámetros pertinentes. |
| RNF-14 | Calidad | Las funciones críticas deberán contar con pruebas de comportamiento y de casos límite. | Evidencia de pruebas de geometría, consulta, cobertura y errores. |

### 4.1. Umbrales aún por acordar

No se establecen cifras arbitrarias como requisitos definitivos. El equipo debe aprobar:

- Tiempo máximo de carga inicial en condiciones de red especificadas.
- Tiempo máximo de respuesta para consultas de área.
- Navegadores y versiones soportadas.
- Tamaños de pantalla objetivo.
- Nivel de accesibilidad perseguido.
- Límites de tamaño o complejidad de polígonos.
- Política de cobertura mínima para presentar estadísticas de una región.

Una vez aprobados, estos valores se incorporarán como criterios de aceptación cuantificables.

## 5. Restricciones

| Código | Restricción |
|---|---|
| RES-01 | La información ambiental deberá proceder de fuentes científicas identificables y compatibles con el propósito del proyecto. |
| RES-02 | La disponibilidad de datos dependerá de la variable, región, período y calidad del producto. |
| RES-03 | La validez geométrica no dependerá de que existan datos ambientales. |
| RES-04 | No se implementarán cuentas ni almacenamiento permanente de regiones en el alcance inicial. |
| RES-05 | Las diferencias entre temperatura superficial y del aire, índices de vegetación y humedad deberán conservarse en etiquetas y explicaciones. |
| RES-06 | Los resultados hipotéticos no deberán presentarse como pronósticos. |
| RES-07 | La elección de infraestructura y tecnologías deberá justificarse frente a los requisitos, no imponerse desde este documento. |

## 6. Trazabilidad

| Necesidad | Casos de uso | Requerimientos |
|---|---|---|
| Explorar el planeta | CU-01 | RF-01, RNF-02 |
| Delimitar y editar un área | CU-02, CU-03, CU-04 | RF-02 a RF-07 |
| Confirmar y conservar selección | CU-05, CU-06 | RF-08 a RF-10, RNF-07 |
| Consultar datos disponibles | CU-07, CU-08, CU-09 | RF-11 a RF-13, RNF-05, RNF-06 |
| Visualizar información ambiental | CU-10, CU-12 | RF-14 a RF-17 |
| Examinar celdas | CU-11 | RF-18 |
| Ampliar la investigación | Evolución | RF-19 a RF-24 |

## 7. Escenarios de aceptación prioritarios

### EA-01. Dibujo válido

**Dado** que el visitante activó el modo dibujo, **cuando** agrega tres o más vértices que forman un polígono simple y lo cierra, **entonces** el sistema permite confirmar la región.

### EA-02. Geometría inválida

**Dado** un polígono cuyos lados se cruzan, **cuando** el visitante intenta confirmarlo, **entonces** el sistema impide la confirmación e informa el motivo.

### EA-03. Edición de vértices

**Dado** un polígono provisional, **cuando** el visitante desplaza, agrega o elimina un vértice, **entonces** se actualiza el contorno y se vuelve a validar la geometría.

### EA-04. Geometría válida sin datos

**Dado** un polígono geométricamente válido, **cuando** el visitante selecciona una variable y un período sin cobertura utilizable, **entonces** el sistema mantiene la región confirmada e informa la ausencia de datos.

### EA-05. Cambio de filtros

**Dado** que el visitante confirmó un área, **cuando** cambia la variable o el período, **entonces** el polígono se conserva y la información ambiental se actualiza o informa su indisponibilidad.

### EA-06. Trazabilidad

**Dado** que una capa ambiental se encuentra visible, **cuando** el visitante consulta su leyenda o información asociada, **entonces** puede identificar la variable, unidad, período, fuente y limitaciones relevantes.

### EA-07. Fallo de consulta

**Dado** que falla la obtención de datos, **cuando** se presenta el error, **entonces** la plataforma muestra un mensaje claro y permite reintentar sin sustituir los valores por datos inventados.

## 8. Condiciones de aprobación de la línea base

Antes de aprobar la versión 1.0, el equipo deberá:

1. Confirmar que el Módulo 01 incluye selección poligonal y visualización ambiental histórica.
2. Aprobar las interacciones exactas de cierre y edición del polígono.
3. Definir los umbrales geométricos y de rendimiento pendientes.
4. Resolver la política de recorte visual y cobertura parcial.
5. Verificar la correspondencia de los requerimientos con los casos de uso y el modelo conceptual.
6. Establecer el alcance de las funciones futuras sin presentarlas como compromisos de la primera etapa.

---

**Fin de la línea base conceptual.** El diseño de arquitectura debe elaborarse a partir de estos requerimientos aprobados.
