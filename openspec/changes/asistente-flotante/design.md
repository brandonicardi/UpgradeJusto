# Design

Panel flotante sobre el chat actual. No hay backend, LLM ni MCP nuevos.

## Decisión central: mover el estado del chat
Hoy `Chat()` guarda en estado local la lista, la charla, el historial, la respuesta en curso, el
`AbortController` y los candados. Al navegar se desmonta y corta el turno, así que panel y `/chat` no
pueden compartir nada. Se extrae todo a un controlador `useChatSession` dentro de un
`AssistantProvider` montado en `Shell`, que persiste entre rutas. `chat.tsx` y el panel pasan a ser
dos vistas del mismo controlador: una sola generación activa y un solo borrador.

Este paso es el riesgo del cambio: se hace primero y sin tocar lo visual, con la regresión de `/chat`
en verde antes de sumar el panel.

## Decisiones
- **Montaje perezoso:** el proveedor no consulta conversaciones hasta que se abre el panel o `/chat`.
  Sin sesión confirmada, y en `/chat`, `/admin` o rutas compartidas, no hay botón ni pedidos.
- **Sesión:** reutiliza `createRoleProbe` y `sessionChangedEvent`. Al perder o cambiar la sesión se
  aborta el turno y se limpian charla, borrador y selección.
- **Cerrar no cancela:** cerrar el panel solo cambia la vista; el turno sigue en el proveedor. Volver a
  abrir muestra su estado real, sin confirmarlo como guardado.
- **Foco:** al abrir entra al panel, y Escape o la cruz lo devuelven a «¿Dudas?», con `aria-expanded`.
- **«Sobre: pantalla»:** etiqueta derivada de la ruta y nada más. Solo PC y criterios elegidos a mano
  viajan al turno; nunca se envía una pieza o un plan implícito. Es una regla de identidad y contexto.
- **Sugerencias:** tres textos fijos por pantalla que completan el compositor sin enviar. Son preguntas,
  no respuestas prefabricadas.
- **Mensajes:** `ChatBubble` con Markdown en ambas vistas, y estados provisional, interrumpido y guardado.
- **Tokens de Groq:** no cambia lo que se manda al modelo.

## Dependencias
Después de los cambios de pantallas. `chat-groq` puede seguir sin archivar por 4.2, pero la prueba de
Brandon conviene antes de mover este código.

## Composición
Panel lateral compacto a 1440; ancho disponible con márgenes a 390, sin tapar la acción principal.
