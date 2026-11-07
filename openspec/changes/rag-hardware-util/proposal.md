# Proposal

## Why

El RAG está restringido a una ficha Kingston y al documento generado de conocimiento general: demuestra la infraestructura, pero no responde suficientes preguntas sobre las piezas que usa la aplicación. Brandon pidió dejar preparada una ampliación útil para que Claude la implemente después del trabajo en curso.

## What Changes

- Admitir varias fuentes oficiales curadas, sin hashes de un único documento fijados en el código.
- Primera entrega: al menos seis documentos oficiales distintos, de cuatro categorías de hardware, seleccionados por su relación con PCs de demostración y alternativas reales del catálogo. La ficha existente puede contar; el documento generado no cuenta como fuente oficial adicional.
- Mantener procedencia, revisión y localizador; distinguir modelo exacto, familia y guía general al recuperar información.
- Excluir revisiones retiradas y evitar atribuir a una variante datos de otra.
- Medir utilidad con preguntas en español, citas comprobables y casos sin respuesta; documentar preparación e ingesta reproducibles.
- Conservar la explicación general generada desde las tablas del motor.

Fuera de alcance: búsqueda web durante el chat, cargas de usuarios, nuevas herramientas MCP, escritura de datos técnicos desde RAG, cambio del proveedor LLM y habilitación de RAG en Docker. Esta última necesita un cambio separado de despliegue.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `asistente`: corpus documental multifuente, recuperación por identidad y citas verificables con evaluación de cobertura.

## Impact

`assistant/rag.py`, `ingest.py`, `reference_doc.py`, herramientas y pruebas RAG; `tools/public-corpus.json` y documentación de preparación. Mantener el contrato de citas existente. Coordinar archivos compartidos con `chat-groq`; no modificar el trabajo concurrente de Claude.
