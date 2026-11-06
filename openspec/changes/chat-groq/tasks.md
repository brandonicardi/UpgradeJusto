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

## 5. Reparación del chat real (diagnóstico del 6/11, autorizado por Brandon)
Fallo reproducido con la PC demo `d965addc-b2af-40d4-80ec-9edd32a31f62` y presupuesto gaming
ARS 2.000.000: las tres preguntas terminaron `generation_failed`, sin texto final. Las
herramientas se llamaron (`evaluate_pc` completó; `preview_recommendations` falló con tool_status
failed). No es un problema de la PC ni del motor: evaluación `compatible` y preview por servicio
dan dos propuestas reales.
- [x] 5.1 Diagnóstico registrado antes de tocar código:
      - TLS: la red intercepta HTTPS con certificado self-signed; `UJ_TLS_TRUST=certifi` (default)
        falla y `UJ_TLS_TRUST=system` (mecanismo existente de `scripts/dev.ps1 -SystemTrust`)
        responde. No se desactiva validación.
      - Modelo default `openai/gpt-oss-20b` con `max_tokens=800`: es razonador y devuelve contenido
        vacío; probado en vivo. Con `reasoning_effort=low` devuelve texto. `openai/gpt-oss-120b`
        también falló. No se cambia el modelo del producto por tanteo.
      - Tool `preview_recommendations`: con `configuration_schema=1` sobre una PC schema2 el
        servicio lanza `PCError 409`; el schema que ve el modelo exige 2, pero el servidor acepta
        la omisión con default 1. Esa es la causa concreta del tool_status failed.
      - Groq valida las herramientas del lado del servidor: cuando el modelo manda `pc_id: "?"` o
        omite `expected_pc_revision`, la API devuelve 400 "tool call validation failed" antes de
        llegar a nuestro MCP. El reintento actual no alcanza si el contexto no da el UUID exacto.
        Probado: con el `pc_id` y la revisión explícitos en el contexto, el modelo llama `get_pc`
        con el UUID correcto y valida.
      - El servicio `preview` fuera del chat, con schema2 y los mismos datos, funciona.
- [x] 5.2 Prueba primero y corregir el presupuesto de razonamiento: mantener
      `openai/gpt-oss-20b` y `max_tokens=800`, agregar `reasoning_effort="low"` solo para modelos
      gpt-oss. Prueba: provider falso verifica el parámetro; prueba real acotada con texto final.
- [x] 5.3 Prueba primero y corregir la llamada tower: si el modelo omite
      `configuration_schema` en `evaluate_pc`, `simulate_pc` o `preview_recommendations`, no debe
      caer en el servicio legacy ni en 409. Emitir tool_status failed con código seguro y un
      ToolMessage que pida reintentar con 2, para que el turno conserve la respuesta final.
      Prueba: grafo con herramienta que falla y luego responde; schema del modelo exige 2.
- [x] 5.4 Regresión de causa raíz: `preview_recommendations` schema2 con la PC demo funciona;
      schema1/omitido no se presenta como éxito ni como `generation_failed` genérico.
      Diagnóstico adicional reproducido: MCP schema2 responde bien, pero su proyección supera
      6000 bytes incluso con una propuesta. Compactar duplicados/metadatos sin perder veredicto,
      faltantes, alcance, acciones, costos, fuentes ni limitaciones. Cubrir resultado vacío.
      Groq omite `data.expected_pc_revision`: aclarar la ubicación en el contexto del servidor y
      probar que el esquema compacto conserva las referencias requeridas.
      Segundo fallo tras corregir lo anterior: el modelo copia `configuration` entera en
      `evaluate_pc` y genera JSON inválido; Groq responde `tool_use_failed` con otro mensaje
      («Failed to parse tool call arguments as JSON») que el reintento no reconocía. Reintentar
      por código y dar los argumentos literales armados desde el contexto del servidor.
      Tercer fallo: Groq gratis da 8000 tokens/min y un turno pedía más de 15000. Recortar lo que
      el modelo no usa (hashes, reglas repetidas, definiciones muertas, PC con UUIDs) y esperar
      `retry-after` una vez por ronda, también durante el reintento de esquema.
      Cuarto fallo, solo visible por la interfaz: `use-chat-session` borraba la PC después de cada
      turno, la repregunta llegaba sin contexto y el modelo inventó una fecha y una memoria. La PC
      sigue elegida en la charla (se reenvía y se revalida cada turno; un 409 la limpia) y precios,
      fechas y veredictos salen solo de una herramienta del mismo turno.
      Quinto fallo: el cliente MCP envuelve toda excepción del turno en `ExceptionGroup` anidado,
      y `service.py` clasificaba el grupo: cuota, rondas y llamada inválida salían todas como
      `generation_failed`. Clasificar la causa original y esperar hasta 45 s por ronda.
- [ ] 5.5 Prueba real headless: PC explícita, ARS2M, recomendación con herramienta, precio/fuente
      reales y veredicto del motor; repregunta conserva contexto; ninguna PC modificada; sin FPS
      inventados. Validar también stream/historial en la UI, no solo API.
      Estado 6/11: el flujo funciona por interfaz y API, PC sin cambios, historial correcto. NO
      cerrada: con Groq `gpt-oss-20b` el turno 3 inventó una memoria DDR5 con código `cg-18234`
      (no existe en el catálogo), precio y veredicto. Local `qwen3:14b`: 5 de 5 turnos sin piezas
      inventadas; omite a veces la fecha y en la repregunta de RAM afirma veredicto sin llamar a
      la herramienta. La defensa que no dependa de la obediencia del LLM se implementa en 6.1–6.5;
      esta tarea no se cierra con mocks ni con solo cambiar de modelo.
      Revisión independiente 6/11 (agente general; el revisor de otra familia cayó por cuota):
      aprobar con observaciones. Corregidas M1 (404 limpia PC), M2 (cuerpo HTTP 400), M4 (espera
      que no entra en el turno), prueba de orden, POLICY y documentos. Abiertas: M3 (los tres 409
      limpian igual, el proxy descarta el detalle) y prueba del hook `use-chat-session`.
- [ ] 5.6 `pytest` dirigido de asistente/MCP, `ruff`, pruebas frontend de stream si cambian, y
      revisor independiente. No declarar arreglado con mocks.

## 6. Verificación factual por candidato privado (aprobada por Brandon, 6/11)
No implementar sin revisar el diseño. Agente `asistente-ia`; pruebas sin base salvo donde se indique.
Enfoque: el LLM redacta un candidato natural, el servidor valida tuplas exactas, revisa
semánticamente con el proveedor configurado (Qwen o Groq; no exigir Ollama para Groq/Docker),
hace una sola reparación y recién entonces publica. El motor decide los veredictos; el
verificador solo agrega dudas. El borrador nunca va al SSE, historial ni logs.
- [x] 6.1 Prueba primero: módulo `assistant/evidence.py` con `TurnEvidence` armado desde el
      resultado crudo ya validado **antes** de `project_tool_result`. Registra PC, revisión
      normalizada a entero, huella de la configuración evaluada y del contexto (objetivo,
      presupuesto, condición, workload), veredicto y faltantes del motor, ofertas (importe,
      moneda, tienda, fecha, condición, `availability`, `stock_quantity`), piezas (`component_id`,
      nombre normalizado, categoría) y citas. Un fallo, proyección inválida o resultado truncado
      no es evidencia; no se guardan textos crudos del proveedor.
      Casos: misma PC/revisión/configuración/contexto, revisión distinta, oferta sin stock,
      pieza de otra configuración y `pc_revision` `str` contra `int`.
      Verificar: `$env:UJ_TEST_POSTGRES="0"; .\.venv\Scripts\python.exe -m pytest -q tests/test_assistant_evidence.py`
      y `.\.venv\Scripts\ruff.exe check .`.
- [x] 6.2 Prueba primero: `assistant/grounding.py` valida el texto visible completo por párrafos
      con tuplas exactas: veredicto con misma PC/revisión/configuración/contexto; sujeto PC contra
      sujeto pieza (un veredicto de la PC base no prueba compatibilidad con una pieza); pieza por
      id exacto o nombre de catálogo normalizado («DDR5», «AM5» y «PCIe» no la identifican);
      precio con importe, moneda, tienda, fecha y condición de la misma oferta; stock solo con
      `availability` y, si se afirma cantidad, `stock_quantity`; RAG solo como fuente, nunca
      veredicto. Sin `cg-*` como única defensa.
      Casos adversarios: claim omitido en el texto, claim mal clasificado (veredicto declarado
      como otro tipo), número/precio/fecha/código/URL/palabra de veredicto no cubiertos, consejo
      general sin datos específicos que sí pasa.
- [x] 6.3 Prueba primero: `service.py` y `graph.py` separan borrador de publicado. Los deltas del
      modelo se acumulan en un buffer privado; `tool_status` y `citation` siguen saliendo en vivo.
      Al cerrar, solo se publican como `delta` los párrafos que pasaron validación. `finish` e
      `interrupt_pending` persisten solo lo publicado; desconexión o error descartan el borrador.
      Ningún texto del borrador aparece en SSE, historial ni logs.
      Prueba: evento SSE sin borrador, `tool_status` visible, historial sin original, buffer
      vaciado al cierre y cancelación sin publicar.
- [ ] 6.4 (Parcial: hecha la reparación única y el fallback en `assistant/publication.py`; falta
      la revisión semántica con un segundo llamado al modelo.) Prueba primero con modelo falso: revisión semántica con el proveedor configurado
      (abstracción en `provider.py` con timeout y modelo de revisión; en Groq respeta cuota y
      errores seguros). El verificador solo agrega dudas: un falso negativo no autoriza un
      veredicto ni un dato, y la validación determinística sigue mandando. Una **sola**
      reparación de los párrafos afectados con revalidación de lo reparado.
      Casos: inventa DDR5/código inexistente, precio o veredicto → no se publica; `evaluate_pc`
      real con misma PC/revisión/configuración → pasa; herramienta fallida → solo «no pude
      consultar»; precio sin stock → no afirma stock; RAG solo → no emite veredicto; reparación
      que no mejora → fallback parcial; sin cuota/tiempo/verificador → solo validado + aviso;
      ninguna pieza inventada se publica.
      Verificar: `$env:UJ_TEST_POSTGRES="0"; .\.venv\Scripts\python.exe -m pytest -q tests/test_assistant_grounding.py tests/test_assistant_service.py`
      y `.\.venv\Scripts\ruff.exe check . ; .\.venv\Scripts\ruff.exe format --check .`.
- [ ] 6.5 En vivo con el proveedor configurado (local `qwen3:14b` sin cupo de Groq y, si hay
      clave, Groq gated por `UJ_TEST_ASSISTANT_LIVE=1`): 3 turnos con PC explícita y ARS
      2.000.000; ninguna pieza inventada, veredicto exacto del motor, precio con moneda/fuente/
      fecha, repregunta con contexto, `tool_status` en vivo, borrador ausente antes de publicar y
      revisión de stream/historial en la UI. Medir latencia real contra los 90 s del turno y
      documentar si la revisión o la reparación no entran. No usar la PC «Mi primer pc gamer»
      para escrituras ni modificar sus datos.
- [ ] 6.6 Revisor independiente: evidencia cruda vs. proyección, sujeto PC vs. pieza, claims
      omitidos y mal clasificados, falso negativo del verificador, sin `user_id` del cliente ni
      del modelo, RAG sin veredicto, sin fuga en streaming/persistencia/logs, una sola reparación,
      fallback que no bloquea la charla y límites declarados sin prometer garantía semántica.
