# Tasks

Backend con el agente `asistente-ia` (desde `backend/`); frontend con `frontend`.
Pruebas sin base: `$env:UJ_TEST_POSTGRES="0"; .\.venv\Scripts\python.exe -m pytest -q`.

## 1. Backend (agente `asistente-ia`)
- [x] 1.1 Prueba primero: con `UJ_ASSISTANT_RAG_CONFIG` sin definir, la lista de herramientas
      del servidor MCP no incluye `search_public_docs`. Luego implementarlo en `build_server()`.
- [x] 1.2 Prueba primero (en `tests/test_assistant_graph.py`, con modelo falso): una herramienta
      que falla emite `tool_status failed`, el modelo recibe el aviso y el turno termina
      `completed`. Luego cambiarlo en `graph.py` según `design.md`.
- [x] 1.3 Reescribir `POLICY` según `design.md` y actualizar las pruebas que dependían del
      texto viejo para que comprueben las reglas nuevas.
      Verificar 1.x: pytest sin base completo sin fallas nuevas; `ruff check .` y
      `ruff format --check .`.

- [x] 1.4 Prueba primero (modelo falso que lanza el error de validación de Groq): el
      turno reintenta una vez y termina bien; con dos rechazos falla; con texto ya emitido
      no reintenta. Implementar según «Llamada inválida del modelo» en `design.md`.
      Verificar: pytest sin base, `ruff check .`, `ruff format --check` en lo tocado.

- [x] 1.5 Prueba primero: presupuesto de tokens según `design.md` (esquemas ≤ 6000
      caracteres, resultado ≤ 6000 bytes sin perder veredicto ni faltantes, historial de 8,
      429 con reintento, 413 con `provider_rate_limited`). Sumar `UJ_ASSISTANT_RAG_CONFIG` al
      entorno de `test_real_mcp_owner_checks_and_live_revocation`.
      Verificar: pytest sin base, `ruff check .`; en vivo, 3 corridas de la prueba 4.1.
- [x] 1.6 (`frontend`) Mostrar `provider_rate_limited` con el texto de `design.md`.
      Verificar: prueba unitaria, `npm test`, `npm run typecheck`, `npm run lint`.

## 2. Frontend (agente `frontend`)
- [x] 2.1 Agregar `react-markdown` y `components/markdown.tsx` según `design.md`, con prueba
      unitaria (negrita, lista, enlace con `rel`, `<script>` escapado).
- [x] 2.2 Usarlo en `app/chat/chat.tsx` para los mensajes del asistente (historial y streaming).
- [x] 2.3 Agregar `remark-gfm` (aprobado por Brandon) a `components/markdown.tsx` para
      que las tablas se vean como tabla; prueba unitaria con una tabla de 2 columnas.
      Verificar 2.x: `npm test`, `npm run typecheck`, `npm run lint`.

## 3. Revisión (agente `revisor`)
- [x] 3.1 Diff contra esta spec y `AGENTS.md`: ninguna regla del producto se perdió en la
      POLICY nueva; las herramientas siguen siendo de solo lectura e identidad del servidor.

## 4. En vivo (requiere base levantada, Docker o local, y `GROQ_API_KEY` en `.env`)
- [x] 4.1 Ajustar y correr `tests/test_assistant_live.py` con `UJ_TEST_ASSISTANT_LIVE=1`:
      ≥ 1 herramienta, estado `completed`, texto no vacío; sin exigir `search_public_docs`.
- [ ] 4.2 Manual en `http://localhost:3000/chat`: preguntar por una pieza del catálogo y por
      la compatibilidad de una PC; la respuesta usa Markdown y el vocabulario del producto.
