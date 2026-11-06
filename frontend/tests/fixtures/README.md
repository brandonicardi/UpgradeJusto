# Fixtures de muestra

## `assistant-sample-messages.json`

**Datos de muestra, no reales.** Respuesta de ejemplo de
`GET /api/conversations/{id}/messages?page=1&page_size=20`, para que
`scripts/comparar-pantalla.mjs` pueda interceptarla con `page.route` y mostrar el
Markdown del asistente sin backend ni modelo.

Formato (igual a `PageOf<Message>` de `frontend/lib/assistant.ts`):

- Página: `{ items, total, page, page_size }`.
- Cada mensaje: `id` (UUID), `sequence` (entero desde 1), `role` (`user` | `assistant`),
  `content` (texto; el del asistente es Markdown), `status`
  (`pending` | `completed` | `failed` | `interrupted`), `citations` (lista; vacía acá) y
  `created_at` (ISO 8601).

Uso: `route.fulfill({ json: JSON.parse(fs.readFileSync("frontend/tests/fixtures/assistant-sample-messages.json", "utf8")) })`.
Hace falta además que la lista de conversaciones devuelva una conversación
(`Conversation`: `id`, `title`, `created_at`, `updated_at`) para poder abrirla.
