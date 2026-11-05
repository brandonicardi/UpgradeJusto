# Proposal

## Why
Hoy el chat solo vive en `/chat`. Se necesita el panel `AsistenteFlotante` para consultar sin abandonar una pantalla y continuar la misma conversación en vista completa.

## What Changes
- Botón «¿Dudas?» y panel accesible para sesiones autenticadas en rutas permitidas.
- Reusar la sesión de chat, streaming e historial existentes entre panel y `/chat`; `ChatBubble` y Markdown para mensajes.
- Tres preguntas sugeridas como borradores editables; abrir o elegir sugerencia no envía mensajes.
- Adecuar la presentación de `/chat` a `PantallaAsistente` en los mismos componentes compartidos.
- Fuera de alcance: backend/LLM/MCP nuevo, renombrar conversaciones, escribir PCs/planes desde chat, contexto automático de piezas/planes, respuestas demo o enviar turnos al abrir.

## Capabilities
### New Capabilities
Ninguna.

### Modified Capabilities
- `sistema-diseno`: acceso flotante y continuidad de conversación con la vista completa.

## Impact
`frontend/app/chat/chat.tsx`, `components/shell.tsx`, `components/tower-chat-context.tsx`, nuevos componentes/controlador compartidos dentro de frontend y pruebas. Reusar `lib/assistant.ts`, `assistant-context.ts`, `components/uj/chat-bubble.tsx` y renderizadores actuales.

Regresión: unit `assistant.test.ts`, `assistant-context.test.tsx`, `markdown.test.tsx`, `shell-nav.test.tsx`; recorrido de continuidad y comprobación real con `tests/live/tower-context.spec.ts` cuando esté habilitado.

Brecha: el contexto soporta PC y criterios por turno; «Sobre: pantalla» será una etiqueta visual, no una selección implícita ni acceso a un plan. La maqueta de chat contiene escrituras no autorizadas por el contrato actual.

Revisión humana antes de apply; coordinar después de los cambios de pantallas y de liberar `chat-groq`. Un escritor frontend y revisor independiente; ningún cambio existente se modifica durante esta planificación.
