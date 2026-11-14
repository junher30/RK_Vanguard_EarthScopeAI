# Amazon Climate Intelligence (ACI)

**Especificación técnica para desarrollar una plataforma de detección de tendencias y análisis predictivo atmosférico en la Amazonía.**

Estado: especificación inicial; no representa todavía una plataforma implementada ni un pronóstico meteorológico operativo.

## Documentos de referencia

1. [Especificación del producto](PRODUCT_SPEC.md)
2. [Stack tecnológico y versiones](TECH_STACK.md)
3. [Arquitectura](ARCHITECTURE.md)
4. [Fuentes de datos y geografía](DATA_SOURCES.md)
5. [Métodos científicos y ML](SCIENCE_AND_ML.md)
6. [Contratos de API](API_CONTRACTS.md)
7. [Plan de implementación](ROADMAP.md)
8. [Decisiones de arquitectura](DECISIONS.md)
9. [Guía de ejecución para Codex](CODEX_BOOTSTRAP_PROMPT.md)

Las instrucciones obligatorias para agentes de código están en el [AGENTS.md de la raíz](../../AGENTS.md).

## Producto en una frase

ACI integra reanálisis históricos, observaciones satelitales y pronósticos numéricos para analizar tendencias de temperatura y presión, detectar patrones atmosféricos relevantes y mostrar la evolución esperada de la presión y de condiciones propicias para olas de calor en la cuenca amazónica.

## Relación con el repositorio actual

Este repositorio ya contiene un prototipo EarthScope AI/Streamlit y experimentos con productos NASA. ACI es la evolución arquitectónica propuesta. El prototipo actual debe conservarse y auditarse antes de cualquier migración. No asumir que los módulos antiguos ya cumplen los contratos, límites espaciales o criterios científicos definidos aquí.

## Alcance geográfico

ACI mantiene dos máscaras geográficas distintas:
- **Cuenca hidrográfica amazónica:** límite de drenaje hacia el sistema amazónico.
- **Bioma amazónico por país:** intersección de la geometría del bioma con los límites nacionales, para comparar las porciones amazónicas de Brasil, Perú, Colombia, Bolivia, Ecuador, Venezuela, Guyana, Surinam y Guayana Francesa.

No se debe confundir la cuenca, el bioma y el territorio completo de un país.

## Prioridad del producto

La prioridad funcional es doble: análisis estadístico reproducible y evaluación predictiva. Para el componente predictivo, el pronóstico numérico GFS será primero la referencia operativa; un modelo ML propio solo se presentará como pronóstico cuando supere una validación temporal independiente y disponga de datos de entrenamiento adecuados.

## Cómo empezar

1. Leer [AGENTS.md](../../AGENTS.md).
2. Leer los documentos de esta carpeta.
3. Ejecutar la auditoría descrita en [CODEX_BOOTSTRAP_PROMPT.md](CODEX_BOOTSTRAP_PROMPT.md).
4. Trabajar por fases de [ROADMAP.md](ROADMAP.md), sin implementar todo de una vez.
