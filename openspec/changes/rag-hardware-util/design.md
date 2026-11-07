# Design

## Context

Ver motivación en `proposal.md`. `rag.py` admite una fuente, valida constantes Kingston y consulta `sources[0]`; `ingest.py` ya itera fuentes. Su extracción limita páginas a 20 y fragmentos a 200, insuficiente para algunos manuales. `reference_doc.py` comparte encoder y tabla. El trabajo `chat-groq` modifica publicación: integrar después de liberar sus archivos.

## Goals / Non-Goals

**Goals:** ampliar cobertura sin cambiar proveedor, dimensiones del encoder ni contrato básico de citas.

**Non-Goals:** convertir documentos en hechos del motor, navegar durante un turno o desplegar Docker. La spec vigente mantiene RAG apagado en Docker; este cambio no lo contradice.

## Decisions

- Manifiesto curado como lista autorizada, en vez de hash único compilado. Conservar URL, hash, tamaño, páginas, fecha y derechos; agregar categoría, modelos exactos, aliases revisados y alcance. Aceptar el manifiesto antiguo normalizando Kingston explícitamente. Rechazar identidades duplicadas.
- Primera versión solo PDFs oficiales con texto extraíble; conservar límites explícitos por archivo y totales, ajustados a manuales seleccionados. Sin OCR ni HTML en esta tanda. Si una fuente no es apta, registrar el motivo y elegir otra oficial, sin inventar URLs.
- Reutilizar ingesta por documento e idempotencia. Recuperar la unión de pares fuente/revisión activos, nunca todas las filas históricas. Construir y verificar el índice nuevo antes de activar su manifiesto.
- Priorizar identidad exacta normalizada y luego similitud; no basta buscar substrings como B550. Los aliases salen de curación, no del modelo. Resolver metadatos desde el manifiesto permite conservar la tabla actual; incluir alcance en la proyección MCP sin quitar campos existentes.
- Mantener embeddings multilingües locales y umbral calibrado. Evaluar doce preguntas con respuestas/localizadores esperados definidos antes de ajustar la recuperación; registrar fallos y latencia, no solo cantidad de documentos.

## Risks / Trade-offs

- Manuales extensos o tablas mal extraídas → fragmentos con localizador y revisión manual de evidencia esperada.
- Fuentes parecidas → controles de variantes y ausencia de evidencia específica.
- Derechos de fabricante → versionar metadatos; archivos completos locales salvo permiso verificable.
- Calidad del LLM distinta de recuperación → probar ambos niveles y conservar la validación de publicación existente.

## Migration Plan

Preparar corpus e índice en base de prueba, comprobar regresión Kingston/documento general y luego activar manifiesto multifuente. Rollback: restaurar manifiesto previo; no borrar PCs, conversaciones ni documentos históricos.
