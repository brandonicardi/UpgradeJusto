# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `AsistenteFlotante`,
`PantallaAsistente` y `ChatBubble`. Requiere revisión humana y `pantallas-compartir-y-admin` archivado.

## 1. Controlador compartido (sin cambio visual)
- [x] 1.1 Extraer `useChatSession` y `AssistantProvider` en `Shell`, sin pedidos al montar.
      Prueba: `tests/unit/assistant.test.ts` y `assistant-context.test.tsx` en verde; `/chat` igual.
- [x] 1.2 Limpiar charla, borrador y selección al cerrar o cambiar de sesión.
      Prueba: otra cuenta no ve nada de la anterior.

## 2. Panel (prueba primero)
- [x] 2.1 Botón «¿Dudas?» solo con sesión confirmada y fuera de rutas excluidas.
      Prueba: `tests/unit/shell-nav.test.tsx`; sin botón ni pedidos en rutas excluidas.
- [x] 2.2 Abrir y cerrar con foco, Escape y `aria-expanded`.
      Prueba: el foco entra y vuelve al disparador.
- [x] 2.3 Continuidad: expandir durante un turno sin reenviar; cerrar no cancela.
      Prueba: una sola petición y un mismo turno en ambas vistas.
- [x] 2.4 Tres sugerencias por pantalla que completan el compositor sin enviar.
      Prueba: ningún turno enviado al elegir.
- [x] 2.5 Etiqueta «Sobre: pantalla» separada del contexto del turno.
      Prueba: sin selección manual, el pedido no lleva PC, pieza ni plan.

## 3. Mensajes y `/chat`
- [x] 3.1 `ChatBubble` y Markdown en ambas vistas, con estados provisional, interrumpido y guardado.
      Prueba: `tests/unit/markdown.test.tsx` y stream interrumpido con recuperación sin reenviar.
- [x] 3.2 `/chat` según `PantallaAsistente`, sin escrituras que el contrato no autoriza.
      Prueba: sin acciones de guardar PC o plan desde el chat.

## 4. Verificación
- [x] 4.1 `npm test`, `npm run typecheck`, `npm run lint`. (709 pruebas; lint con 1 aviso en `use-chat-session.ts`, sin errores.)
- [ ] 4.2 Capturas reales del panel a 1440 y 390 y recorrido de continuidad.
      Capturas de `/chat` a 1440 y 390 con mensajes de muestra (fixture local interceptado, sin Groq):
      es una prueba de presentación y NO prueba continuidad real. El recorrido de continuidad real
      queda pendiente y depende de habilitar 4.3, que gasta cuota de Groq.
- [ ] 4.3 `tests/live/tower-context.spec.ts`, si Brandon lo habilita: gasta cuota real de Groq.
- [x] 4.4 Revisor: identidad en servidor, contexto explícito y alcance.
      (Revisor independiente: bloqueante de privacidad corregido y revalidado.)
