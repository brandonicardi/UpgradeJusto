# Tasks

Ya implementado en los commits `7ae1147` y `62997f2`. Esta lista documenta lo hecho: cada tarea se marca
solo con la prueba indicada. Donde la prueba no se volvió a correr en esta revisión, se dice.

## 1. Conocimiento general y motor
- [x] 1.1 Tablas `plataformas.json`, `gpus.json` y `cpus.json` con fuente por fila y `consulted_on`. Prueba: `tests/test_reference_knowledge.py`.
- [x] 1.2 Identificación por nombre; prioridad fabricante > referencia > desconocido; nombre ambiguo o contradictorio sin hechos. Prueba: `tests/test_reference_knowledge.py`.
- [x] 1.3 Rotulado «según datos de referencia», avisos «Chequeá…» sin bloqueo e incompatibilidad dominante. Prueba: `tests/test_tower38_technical_resolver.py`.
- [x] 1.4 Fuentes de referencia: AMD (Radeon RX 6000/7000/9000), NVIDIA (series 30/40/50), PassMark (índice GPU) y Blender Open Data (índice CPU), como índices relativos y nunca FPS. Prueba: revisión de `source_id` y `locator` en cada tabla.

## 2. Recomendador
- [x] 2.1 Orden por valor dentro de cada estado (`value_score`). Prueba: `tests/test_tower38_recommend_pure.py`.
- [x] 2.2 Sin precio vigente no se propone en modo automático. Prueba: `tests/test_recommendations.py`.
- [x] 2.3 Si nada entra en el presupuesto, muestra la mejora real más cercana. Prueba: `tests/test_tower38_recommend_pure.py`.
- [x] 2.4 Elección de la IA local solo entre propuestas verificadas, con orden determinístico como respaldo. Prueba: `tests/test_recommendation_advisor.py`.

## 3. Conocimiento para el chat (RAG)
- [x] 3.1 `reference_doc.py` genera `docs/conocimiento-hardware.md` desde las tablas e ingiere en pgvector. Prueba: `tests/test_reference_doc.py`.
- [x] 3.2 Búsqueda con prioridad a términos exactos (B550, RTX 3060). Prueba: `tests/test_assistant_rag_postgres.py`. No re-corrida en esta revisión (requiere PostgreSQL).
- [x] 3.3 RAG no activo en Docker, documentado en README y en la spec. Prueba: revisión de `docker-compose.yml` y del README.

## 4. IA local opcional
- [x] 4.1 `scripts/llama-local.ps1` levanta llama.cpp (Vulkan) en 127.0.0.1:8081. Prueba: arranque manual en RX 9070 XT.
- [x] 4.2 `UJ_CHAT_PROVIDER=llamacpp` usa el modelo local; Groq sigue por defecto. Prueba: `tests/test_assistant92_local_provider.py`.
- [x] 4.3 Medición: ~35 tok/s, ~2 s por elección y tool calling correcto en RX 9070 XT. Prueba: medición manual del autor; no es una prueba automatizada.

## 5. Primera PC
- [x] 5.1 `first_build.py` validado por el motor y expuesto en `GET /api/catalog/components/first-build`. Prueba: `tests/test_first_build.py`.
- [x] 5.2 Borrador editable en `/build`, sin guardar hasta confirmar. Prueba: `npm test` del frontend (declarada por el autor; no re-corrida en esta revisión).

## 6. Interfaz
- [x] 6.1 Chat que nace con el primer mensaje, «Tu cuenta» igual al menú y encabezado estable. Prueba: `npm test` del frontend (declarada por el autor; no re-corrida en esta revisión).
- [x] 6.2 Presupuesto con deslizador hasta $5.000.000 y sin tope al escribir. Prueba: `npm test` del frontend (declarada por el autor; no re-corrida en esta revisión).
- [x] 6.3 Inicio con «Mejorar la PC que tengo» y «Armar mi primera PC». Prueba: `npm test` del frontend (declarada por el autor; no re-corrida en esta revisión).

## 7. Documentación y configuración
- [x] 7.1 README: arquitectura, «Conocimiento de hardware», «IA local (opcional)» y «Setup de IA del proyecto». Prueba: revisión manual contra el código.
- [x] 7.2 `docs/ARQUITECTURA.md` y `docs/MCP.md` al día. Prueba: revisión manual contra `.mcp.json` y `opencode.json`.
- [x] 7.3 `.env.example` con `UJ_CHAT_PROVIDER` y `UJ_LOCAL_ADVISOR` comentados, sin claves reales. Prueba: revisión del archivo.
- [x] 7.4 `AGENTS.md` regla 2 con la referencia por familia y el aviso por modelo. Prueba: revisión manual.
- [x] 7.5 Guion de video con el tramo nuevo y entrega en `.local/ENTREGA-PDF.md`. Prueba: revisión manual (`.local/` no se versiona).

## 8. Verificación
- [x] 8.1 `openspec validate conocimiento-hardware --strict` pasa. Prueba: comando de OpenSpec.
- [x] 8.2 Suite completa de backend con PostgreSQL y `ruff`: 1413 aprobadas, 7 fallas y 1 error, previas a este cambio (base de test, Groq en vivo, `grounding` sin integrar).
- [x] 8.3 `test_stock_of_piece_a_with_offer_of_piece_b_fails` no pertenece a este cambio: `grounding.py` es de `chat-groq` (6.2 a 6.6, sin integrar) y se resuelve allí.
