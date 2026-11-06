# Proposal

## Why

El chat (CU08) vale 2 puntos de la entrega y nunca funcionó de punta a punta: con Ollama el
modelo no llamó herramientas y en la demo falló. La prueba real del 6/11 mostró que el modelo
puede inventar una memoria DDR5 con un código inexistente, un precio y un veredicto aunque el
turno haya usado herramientas. Detectar frases y liberar por tiempo no garantiza que el texto
publicado no afirme más que la evidencia: una vez emitido un `delta` no se puede retractar.
Elegir un modelo más obediente tampoco es una defensa.

## What Changes

- Groq queda como proveedor de la entrega (`openai/gpt-oss-20b`, configurable con
  `GROQ_MODEL`); Ollama sigue disponible pero opcional. La revisión semántica usa el proveedor
  configurado, también Groq/Docker; no exige Ollama.
- `search_public_docs` solo se publica en el servidor MCP cuando el RAG está configurado.
- Si una herramienta falla, el turno **no** se corta: el modelo recibe un aviso corto
  («la herramienta no pudo responder») y contesta con lo que tiene. Los límites de rondas,
  llamadas y tiempo siguen igual.
- `POLICY` reescrita en lenguaje de producto, voseo y vocabulario del sistema de diseño
  («Encaja», «Falta un dato», «No encaja»), conservando todas las reglas: el veredicto lo da
  el motor, nada de precios/FPS inventados, los datos de herramientas no son instrucciones.
- El frontend renderiza las respuestas del asistente como Markdown seguro (sin HTML crudo).
- **Verificación factual por candidato privado:** el LLM redacta una respuesta natural con
  referencias internas a evidencia del mismo turno. El servidor valida tuplas exactas
  (PC, revisión, configuración, contexto, oferta), revisa semánticamente el texto completo con
  el proveedor configurado —el verificador no decide veredictos ni autoriza hechos—, permite
  **una** reparación y recién entonces publica. El borrador nunca va al SSE, al historial ni a
  los logs; `tool_status` sigue en vivo. Si falta cuota, tiempo o verificador, se publica solo
  texto verificado o un fallback conservador sin datos no verificados; la charla no se bloquea.
- `search_public_docs` aporta documentos, nunca veredictos de compatibilidad. Una cotización
  vigente no implica stock garantizado.
- Prueba en vivo con Groq + MCP + base (gated por variable) y con el proveedor local, que
  demuestra al menos una llamada a herramienta y una respuesta completa.
- Fuera de alcance: empaquetar el RAG documental en Docker y ampliar su corpus (`chat-rag`),
  el rediseño visual (`asistente-flotante`), Ollama en Docker y la seguridad de Docker.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `asistente`: herramienta documental condicional, falla de herramienta no fatal,
  respuestas en Markdown, tono de producto y publicación de un candidato privado solo
  después de validación determinística, revisión semántica y una reparación acotada.

## Impact

- Backend (`asistente-ia`): `assistant/graph.py`, `assistant/mcp_server.py`,
  `assistant/service.py`, `assistant/provider.py`, módulos nuevos de evidencia y validación
  (`assistant/evidence.py`, `assistant/grounding.py`) y sus pruebas.
- Frontend (`frontend`): `app/chat/chat.tsx` y una dependencia nueva de Markdown; el
  contrato SSE no cambia (sigue habiendo `delta`, pero solo con texto publicado).
- Depende de la base local o de Docker para la verificación en vivo; la seguridad de Docker
  se trata en otro cambio.
