# LatAm Climate Intelligence (LACI)

**Plataforma de inteligencia climática para analizar tendencias, detectar eventos y evaluar la evolución de temperatura/calor y presión/circulación atmosférica en América Latina y el Caribe.**

Estado: especificación técnica; no representa todavía una plataforma continental implementada ni un servicio de pronóstico operativo.

## Decisiones oficiales del producto
- Cobertura: América Latina y el Caribe.
- Implementación: arquitectura continental, despliegue y validación progresivos por región.
- IA: modelos regionales especializados.
- Prioridad científica equilibrada: temperatura/calor y presión/circulación.

## Documentos
1. [Especificación del producto](PRODUCT_SPEC.md)
2. [Stack tecnológico](TECH_STACK.md)
3. [Arquitectura](ARCHITECTURE.md)
4. [Fuentes y geografía](DATA_SOURCES.md)
5. [Métodos científicos y ML](SCIENCE_AND_ML.md)
6. [Contratos API](API_CONTRACTS.md)
7. [Roadmap](ROADMAP.md)
8. [Decisiones de arquitectura](DECISIONS.md)
9. [Prompt de inicio para Codex](CODEX_BOOTSTRAP_PROMPT.md)

Las instrucciones obligatorias para agentes están en [AGENTS.md](../../AGENTS.md).

## Producto en una frase
LACI integra observaciones, reanálisis y pronósticos numéricos para describir tendencias, detectar anomalías térmicas y de presión, y evaluar modelos predictivos regionales con trazabilidad, incertidumbre y validación independiente.

## Alcance geográfico y estrategia
El sistema se diseña desde el inicio para América Latina y el Caribe, incluidos México, Centroamérica, Caribe y Sudamérica. La cobertura continental del catálogo y de los contratos no significa que todas las regiones tengan datos procesados o modelos validados desde el primer release. La ingesta, el análisis y los modelos se habilitan por etapas según disponibilidad y calidad de datos.

Las regiones analíticas pueden solaparse (por ejemplo, Amazonia y Andes) y no deben confundirse con países ni con límites de cuencas/biomas. La Amazonia se conserva como primer piloto científico, no como límite del producto.

## Prioridad científica
Temperatura y calor, así como presión y circulación, tienen prioridad equivalente en el diseño. Se deben mantener separadas las variables físicamente distintas: temperatura del aire a 2 m vs. LST; presión superficial (PS) vs. presión a nivel del mar (MSL/SLP).

## Relación con el repositorio
Este repositorio ya contiene un prototipo EarthScope AI/Streamlit y experimentos NASA. LACI es una evolución arquitectónica propuesta. Auditar antes de migrar; conservar el prototipo y no asumir que sus máscaras actuales representan el continente.

## Cómo empezar
1. Leer [AGENTS.md](../../AGENTS.md).
2. Leer todos los documentos de esta carpeta.
3. Ejecutar solo la auditoría de Fase 0 descrita en [CODEX_BOOTSTRAP_PROMPT.md](CODEX_BOOTSTRAP_PROMPT.md).
4. Seguir el [roadmap](ROADMAP.md) por entregables verificables.
