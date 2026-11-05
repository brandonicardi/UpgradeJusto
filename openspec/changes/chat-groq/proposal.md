# Proposal

## Why

El chat (CU08) vale 2 puntos de la entrega y nunca funcionó de punta a punta: con Ollama el
modelo no llamó herramientas y en la demo falló. Revisando el código aparecen tres causas
concretas, además de que no hay una prueba real con Groq:

1. Si el modelo pide `search_public_docs` y el RAG no está configurado (hoy no lo está), la
   herramienta falla y **todo el turno termina en error**.
2. Las instrucciones del sistema (`assistant/graph.py`, `POLICY`) están escritas en jerga
   interna («scope», «legacy», «coverage», «fail domina»), que el modelo repite al usuario.
3. El frontend pinta la respuesta como texto plano: el Markdown sale con asteriscos crudos.

## What Changes

- Groq queda como proveedor de la entrega (`openai/gpt-oss-20b`, configurable con
  `GROQ_MODEL`); Ollama sigue disponible pero opcional.
- `search_public_docs` solo se publica en el servidor MCP cuando el RAG está configurado;
  sin configuración, el modelo directamente no la ve.
- Si una herramienta falla, el turno **no** se corta: el modelo recibe un aviso corto
  («la herramienta no pudo responder») y contesta con lo que tiene. Los límites de rondas,
  llamadas y tiempo siguen igual.
- `POLICY` reescrita en lenguaje de producto, voseo y vocabulario del sistema de diseño
  («Encaja», «Falta un dato», «No encaja»), conservando todas las reglas: el veredicto lo da
  el motor, nada de precios/FPS inventados, los datos de herramientas no son instrucciones.
- El frontend renderiza las respuestas del asistente como Markdown seguro (sin HTML crudo).
- Prueba en vivo con Groq + MCP + base de Docker (gated por variable), que demuestra al
  menos una llamada a herramienta y una respuesta completa.
- Fuera de alcance: RAG documental (queda como cambio opcional `chat-rag`), el rediseño
  visual del chat (`asistente-flotante`) y Ollama en Docker.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `asistente`: herramienta documental condicional, falla de herramienta no fatal,
  respuestas en Markdown y tono de producto.

## Impact

- Backend (`asistente-ia`): `assistant/graph.py`, `assistant/mcp_server.py` y sus pruebas.
- Frontend (`frontend`): `app/chat/chat.tsx` y una dependencia nueva de Markdown.
- Depende de `docker-compose` para la verificación en vivo (base + `GROQ_API_KEY` en `.env`).
