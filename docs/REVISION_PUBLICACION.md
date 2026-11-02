# Revisión previa a publicación — commits SOLO LOCALES37

**No hay autorización de push.** Este manifiesto no habilita publicación.
Los avances acumulados se registrarán con fecha/autor configurados reales, no como
historia diaria retrospectiva. Los cinco commits originales se conservan.

**38 en curso:** además de la base37 inferior existen avances locales posteriores.
Antes de publicar, revisar también estos commits y el delta pendiente, no publicar
solo por tener este manifiesto de base. Ningún commit se subió automáticamente.

| Adicional | Hash real | Archivos exactos |
|---|---|---|
|Transporte local CU08, aceptación bloqueada27/10|`5f5ced3`|`docs/specs/CU08-asistente.md#origen-backend-integral92-local-contract-md`, `backend/pyproject.toml`, `backend/uv.lock`, `backend/upgradejusto/assistant/graph.py`, `backend/upgradejusto/assistant/provider.py`, `backend/upgradejusto/assistant/ollama_schema.py`, `backend/tests/test_assistant92_local_provider.py`;35puros PASS, turno real0tools FAIL; sin push|
|Registro administrativo37|`fcfdf6e`|`docs/REVISION_PUBLICACION.md`, `docs/CONTINUAR.md`, `docs/ai-log/2026-10-26-revision37-seguridad-git.md`|
|Adquisición/referencias38|`89a9e69`|`docs/REFERENCIAS_RENDIMIENTO38.md`, `scripts/fetch-store-catalog.py`, `scripts/review-publication.py`, `scripts/test-store-catalog.py`|
|Torre38A|`cd4f286`|33 archivos exactos enumerados debajo; CRUD/persistencia aceptados, no motor torre integral|
|Adquisición Venex38|`4e20451`|`scripts/fetch-venex-offers.py`, `scripts/test-venex-offers.py`; adaptador propio acotado y guardas, no publicación del catálogo|
|Motor puro torre38|`ca9a962`|`docs/ai-log/2026-10-27-entregas-tecnicas-historicas.md#origen-backend-integral38-engine-handoff-md`, `backend/tests/test_tower38_engine.py`, `backend/upgradejusto/compatibility/tower_contract.py`, `backend/upgradejusto/compatibility/tower_engine.py`; no adapter/API ni datos reales aprobados por ese commit|
|Preparación comercial38|`77ecc96`|`scripts/prepare-retail-batches.py`, `scripts/test-retail-batches.py`; conversión/guardas, raw y prueba navegador solo locales|
|Google backend38B1|`89015c8`|19 archivos enumerados debajo; aceptación backend local, no login humano|
|Recursos retail38B2|`b0ec116`|14 archivos enumerados debajo; publicación real solo TEST, sin atributos técnicos inventados|
|Conservación por espacios38|`4f2233b`|`docs/ai-log/2026-10-27-entregas-tecnicas-historicas.md#origen-backend-integral38-retail-handoff-md`, `backend/tests/test_retail38_models.py`, `backend/tests/test_retail38_postgres.py`, `backend/upgradejusto/administration/repository.py`, `backend/upgradejusto/retail/models.py`|
|Evaluación/simulación API38|`4bdad0d`|9 archivos enumerados debajo; no positivo de hardware real por este commit|
|Representación técnica38|`043eb78`|12 archivos enumerados debajo; publicación tipada aprobada, resolver y hechos reales pendientes|
|Resolver técnico38|`01b3028`|`docs/ai-log/2026-10-27-entregas-tecnicas-historicas.md#origen-backend-integral38-technical-handoff-md`, `backend/tests/test_tower38_technical_resolver.py`, `backend/upgradejusto/compatibility/tower_evidence.py`, `backend/upgradejusto/compatibility/tower_technical_resolver.py`; no cambio de política de fans|
|Objetivos/extracción torre38|`ccda5ca`|19 archivos enumerados debajo; aceptación local de contratos/PG, Groq vivo502 pendiente|
|Contexto pertinente extracción38|`d669ec3`|`docs/ai-log/2026-10-27-entregas-tecnicas-historicas.md#origen-backend-integral38-extraction-handoff-md`, `backend/tests/test_tower38_extraction.py`, `backend/tests/test_tower38_extraction_context.py`, `backend/tests/test_tower38_extraction_pg.py`, `backend/upgradejusto/extraction/tower_context.py`, `backend/upgradejusto/extraction/tower_provider.py`, `backend/upgradejusto/extraction/tower_service.py`, `docs/specs/CU02-extraccion.md`; no cambio TLS/proveedor|

Lotes locales posteriores revisados, sin push:

|Lote|Commit|Alcance|
|---|---|---|
|Planes privados torre38|`a9a6764`|17 archivos enumerados debajo; historial/etapas/ingress, frontend y CU09 separados|
|MCP torre38|`1a34cd4`|20 archivos enumerados debajo; siete lecturas y contexto, streaming LLM propio pendiente|
|Correlación MCP y binding38|`e499ac3`|5 archivos exactos debajo; contrato de simulación corregido, no solución LIVE|

Archivos de `e499ac3`:
- `docs/specs/CU08-asistente.md#origen-backend-integral38-assistant-contract-md`.
- `backend/upgradejusto/assistant/mcp_schema.py` y `mcp_server.py`.
- `backend/tests/test_tower38_mcp_schema_contract.py` y `test_mcp38_tower_pg.py`.

Revisión de contenido y stagedpor nombre, diff--cached--check0;13puros y gate real
stdio/PG/conversión/binding1PASS4.04s, lint/formato0. Revisión funcional acotada aceptó
la corrección. Único LIVE postreparación FAIL4.39s, get_pc completó y segundo stream
tool_use_failed: no presentar el commit como chat resuelto. Después del commit los
cinco originales fueron comprobados ancestros mediante merge-base, índice vacío.
Fuente/capturas privadas, perfiles, .env y salidas locales no incluidos. Sin push.

Archivos de `a9a6764`:
- `backend/`: `INTEGRAL38_PLAN_CONTRACT.md`, `INTEGRAL38_PLAN_HANDOFF.md`.
- `backend/alembic/versions/`: `38_d_001_tower_plans.py`.
- `backend/tests/`: `test_tower38_plan_migration.py`, `test_tower38_plan_mounted.py`, `test_tower38_plan_pg.py`, `test_tower38_plan_pure.py`.
- `backend/upgradejusto/api/`: `proxy_ip.py`, `tower_plans.py`.
- `backend/upgradejusto/`: `main.py`.
- `backend/upgradejusto/plans/`: `tower_calculation.py`, `tower_models.py`, `tower_repository.py`, `tower_service.py`, `tower_tables.py`.
- `docs/specs/`: `CU07-planes.md`, `CU09-compartir.md`.

Archivos de `1a34cd4`:
- `backend/`: `INTEGRAL38_ASSISTANT_CONTRACT.md`, `INTEGRAL38_ASSISTANT_HANDOFF.md`.
- `backend/tests/`: `test_mcp38_tower_pg.py`, `test_mcp38_tower_plans_pg.py`, `test_tower38_assistant_plan_projection.py`, `test_tower38_assistant_pure.py`.
- `backend/upgradejusto/assistant/`: `graph.py`, `mcp_server.py`, `models.py`, `repository.py`, `service.py`, `tool_inputs.py`, `tool_projection.py`, `tower_context.py`, `tower_inputs.py`, `tower_plan_projection.py`, `tower_plans.py`, `tower_projection.py`, `tower_tools.py`.
- `docs/specs/`: `CU08-asistente.md`.

Archivos de `ccda5ca`:
- `backend/`: `INTEGRAL38_EXTRACTION_HANDOFF.md`, `INTEGRAL38_RECOMMEND_HANDOFF.md`.
- `backend/tests/`: `test_tower38_extraction.py`, `test_tower38_extraction_pg.py`, `test_tower38_recommend_pg.py`, `test_tower38_recommend_pure.py`.
- `backend/upgradejusto/api/`: `body_limits.py`, `tower_extraction.py`, `tower_recommendations.py`.
- `backend/upgradejusto/extraction/`: `tower_models.py`, `tower_provider.py`, `tower_service.py`.
- `backend/upgradejusto/`: `main.py`.
- `backend/upgradejusto/recommendations/`: `tower_cost.py`, `tower_models.py`, `tower_references.py`, `tower_repository.py`, `tower_service.py`.
- `docs/specs/`: `CU06-recomendaciones.md`.

Archivos de `043eb78`:
- `backend/`: `INTEGRAL38_TECHNICAL_CONTRACT.md`, `INTEGRAL38_TECHNICAL_HANDOFF.md`.
- `backend/tests/`: `test_tower38_technical_models.py`, `test_tower38_technical_postgres.py`.
- `backend/upgradejusto/administration/`: `models.py`, `repository.py`, `validation.py`.
- `backend/upgradejusto/retail/`: `technical_models.py`, `technical_parser.py`, `technical_validation.py`.
- `docs/specs/`: `CU05-compatibilidad.md`, `CU10-administracion.md`.

Archivos de `4bdad0d`:
- `backend/`: `INTEGRAL38_ENGINE_HANDOFF.md`.
- `backend/tests/`: `test_tower38_api.py`, `test_tower38_application.py`.
- `backend/upgradejusto/api/`: `tower_compatibility.py`.
- `backend/upgradejusto/compatibility/`: `tower_application.py`, `tower_engine.py`, `tower_evidence.py`, `tower_http_models.py`.
- `backend/upgradejusto/`: `main.py`.

Archivos de `89015c8`:
- `backend/`: `INTEGRAL38_B1_HANDOFF.md`, `pyproject.toml`, `uv.lock`.
- `backend/alembic/versions/`: `38_b_001_google_identity.py`.
- `backend/tests/`: `google38_fixtures.py`, `test_google38_migration.py`, `test_google38_pg.py`, `test_google38_verifier.py`.
- `backend/upgradejusto/api/`: `google_auth.py`.
- `backend/upgradejusto/auth/`: `google_models.py`, `google_repository.py`, `google_service.py`, `google_tables.py`, `google_verifier.py`, `maintenance.py`, `repository.py`, `service.py`.
- `backend/upgradejusto/`: `main.py`.
- `backend/upgradejusto/persistence/`: `schema.py`.

Archivos de `b0ec116`:
- `backend/`: `INTEGRAL38_RETAIL_HANDOFF.md`.
- `backend/alembic/versions/`: `38_c_001_retail.py`.
- `backend/tests/`: `test_retail38_models.py`, `test_retail38_postgres.py`.
- `backend/upgradejusto/administration/`: `repository.py`.
- `backend/upgradejusto/catalog/`: `models.py`, `postgres.py`.
- `backend/upgradejusto/retail/`: `__init__.py`, `importer.py`, `models.py`, `reading.py`, `repository.py`, `service.py`, `tables.py`.

Archivos de `cd4f286`, contrastados mediante `git diff-tree` (prefijos concatenados):
- `backend/`: `INTEGRAL38_A_HANDOFF.md`, `INTEGRAL38_CONTRACT.md`.
- `backend/alembic/versions/`: `38_a_001_towers.py`.
- `backend/tests/`: `test_catalog.py`, `test_extraction.py`, `test_pcs_postgres.py`, `test_towers38_models.py`, `test_towers38_pg.py`.
- `backend/upgradejusto/administration/`: `models.py`.
- `backend/upgradejusto/api/`: `proxy_ip.py`, `towers.py`.
- `backend/upgradejusto/catalog/`: `models.py`.
- `backend/upgradejusto/compatibility/`: `http_models.py`.
- `backend/upgradejusto/extraction/`: `models.py`, `service.py`.
- `backend/upgradejusto/`: `main.py`.
- `backend/upgradejusto/pcs/`: `models.py`, `repository.py`, `tower_models.py`, `tower_repository.py`, `tower_service.py`, `tower_tables.py`.
- `backend/upgradejusto/persistence/`: `schema.py`.
- `docs/specs/`: `CU01-cuentas.md`, `CU02-extraccion.md`, `CU03-pcs.md`, `CU04-catalogo.md`, `CU05-compatibilidad.md`, `CU06-recomendaciones.md`, `CU07-planes.md`, `CU08-asistente.md`, `CU09-compartir.md`, `CU10-administracion.md`.

38 todavía no aceptado integralmente. La evidencia CPU/GPU es una referencia con
contexto, no FPS/benchmark de PC propia; raw/capturas protegidas no se redistribuyen.

## Destino contrastado

- Repositorio: `https://github.com/brandonicardi/UpgradeJusto`, **público**.
- Origin local: el mismo HTTPS; rama local `codex/base-backend`.
- GitHub MCP real: identidad `brandonicardi`, repositorio owner correcto, permisos
  admin/push; `list_commits` respondió409 repositorio vacío. No se hizo push.
- Antes de publicar: mostrar este manifiesto completado, commits, archivos, destino
  y visibilidad al usuario para su revisión. No force-push ni borrado remoto.

## Historia preservada y lotes previstos

Originales, antiguos primero: `388818d`, `c25ff31`, `ee7248e`, `347a87a`, `c1ced9e`.
Respaldo bundle local verificado. Autor configurado coincide con los cinco; correo
no noreply, no se reproduce su valor aquí. Publicar Git revela metadatos de autor.

Ocho commits nuevos reales (348 archivos), creados hoy y seleccionados por nombre:

| Lote | Commit | Archivos | Alcance |
|---|---|---:|---|
|1|`9727c346fc0d0ca97e1b3d1aa24121be43b63068`|18|Cuentas/persistencia y presupuesto compartido|
|2|`9b0abc2dfe183ebd920c512e8f7ee3ec39a0d300`|58|PCs/compatibilidad/catálogo/importación|
|3|`13935664615626fa4eaa0fe33d0831942146ba35`|25|Recomendaciones/planes/shares|
|4|`17d28cf03a608238e37ee6c0cf957146728d6848`|26|Asistente/MCP/RAG|
|5|`a25eaaaceaaa2e51abd3bbaca50963fb59706dc0`|24|Extracción/admin/composición37|
|6|`e08ec3ab14d63bc119cd061b7a482112705ef065`|61|Contratos/proxies web|
|7|`3b362b5f78d822d47a9df7dd89760da796fb1e6b`|69|Rediseño y recorridos36|
|8|`22d31d9a213500a952dd15ade67cd535e40ad024`|67|Operación/documentación|

Dependencias y orden:

1. Persistencia/cuentas: runtime PG, autenticación, seguridad/cuotas y migraciones.
2. PCs/compatibilidad/catálogo: dominio básico, importador curado y fuentes/licencias.
3. Recomendaciones/planes/shares: servicios, contratos y snapshots versionados.
4. Asistente/MCP/RAG: coordinación, herramientas, streaming e historial.
5. Extracción/admin y composición HTTP: confirmación, roles y wiring compartido.
6. Frontend funcional y rediseño: consumidores, límites de entrada y pruebas.
7. Operación/documentación/herramientas: scripts revisados y evidencia declarada.

Archivos compartidos no fraccionados artificialmente: esquema PG completo en1,
composición HTTP/migración37 con padre33 en5; commits intermedios no se presentan
como ejecutables independientemente. Backend agrega dependencias exactas y lock
ya aceptados en los incrementos anteriores; frontend cambia scripts, no dependencias.
Lista completa por lote debajo; contrastada con `git diff-tree` de cada hash real.
Este manifiesto y su registro administrativo posterior no inventan commits diarios;
su propio commit se identifica mediante `git log -1 -- docs/REVISION_PUBLICACION.md`.

## Exclusiones y límites de la evidencia

Fuera de Git: `.env`, credenciales, keyring, `.local/`, `.tools/`, `.opencode/`,
workspace privado, material del curso privado, temporales, bases/respaldos, capturas
locales y conversaciones internas. Ignorar no basta: scanner contrasta también los
archivos seguidos y blobs históricos. No leer ni copiar secretos para comprobarlo.

Las capturas referidas mediante rutas locales ignoradas **no están en GitHub**.
Los registros de ejecuciones históricas son evidencia registrada, no pruebas nuevas.
Los nuevos handoffs no prueban aceptación; los tests37 corresponden a Build TEST.

Muestra de hardware: BuildCores OpenDB revisión
`2403cab88630625912cdd2f152f1bb1e27f8ff4d`, CC BY-NC-SA4.0 (no permiso comercial);
docyx pc-part-dataset revisión `c52a04ca9465c83997ed335f7767b09a2005dd26`, MIT.
Licencias y NOTICE conservados en `backend/data/hardware-import/`; raw-sample e
índice seleccionan registros y el importador normaliza/quarantina sin ejecutar
scripts externos. Precios docyx históricos USD no se convierten en ARS actuales.
Si se publican adaptaciones de datos BuildCores sujetas a licencia, mantener
atribución/cambios/ShareAlike aplicables; no atribuir esa licencia al código propio.

Scanner heurístico y revisión manual: sin tokens de proveedor/GitHub ni claves
privadas detectados; hits clasificados de fixtures sintéticas, URL dinámica y rutas
del proyecto/evidencia. No equivale a certificación de ausencia de secretos. Un
secreto real bloqueará publicación; eliminarlo cosméticamente no sanea el historial.
Identificadores internos innecesarios retirados de documentos nuevos con respaldo
local. Cinco originales no reescritos por rutas inocuas.

## Gates37 y pendiente de publicación

- Seguridad37 aceptada localmente por revisión independiente, tras corregir deadline
  ASGI. Build:15 body/7 PG/67 regresiones backend,127+3 frontend focales, tipos/lint/
  Ruff0; tests solapados no se presentan como suite única. No pentest.
- Diffs preparados y nombres revisados por lote; scanner adicional del índice en3–8.
  Única excepción de whitespace: licencia BuildCores upstream termina en línea vacía,
  `diff --check`2 en lote2, conservada sin alterar texto legal. Otros lotes check0.
- Reescaneo tras ocho lotes:394 candidatos,13 commits auditados,445 blobs únicos;
  cero tokens proveedor/GitHub/claves privadas heurísticos y cero IDs internos de
  sesión. Los hits duplicados worktree/historia corresponden a fixtures y patrones
  ya clasificados; no leer esto como garantía exhaustiva.
- Cinco originales siguen ancestros de HEAD; working tree limpio al cierre de los
  ocho lotes. Respaldo original verificado, sin push ni publicación.
- Mostrar manifiesto final antes de cualquier publicación; esperar no detiene38.

## Archivos exactos por lote

Cada prefijo siguiente se concatena con cada nombre enumerado; no hay globs ni
selecciones de directorios a ciegas. Puede reproducirse la lista de cada lote con
`git diff-tree --no-commit-id --name-only -r <hash-de-la-tabla>`.

### Lote1
- `backend/`: `pyproject.toml`, `uv.lock`.
- `backend/alembic/versions/`: `32_b_001_auth.py`.
- `backend/tests/`: `conftest.py`, `test_auth_postgres.py`, `test_auth_security.py`, `test_proxy_ip.py`.
- `backend/upgradejusto/api/`: `auth.py`, `proxy_ip.py`.
- `backend/upgradejusto/auth/`: `__init__.py`, `limits.py`, `maintenance.py`, `provider_budget.py`, `repository.py`, `security.py`, `service.py`.
- `backend/upgradejusto/persistence/`: `runtime.py`, `schema.py`.

### Lote2
- `backend/alembic/versions/`: `32_c_001_pcs.py`.
- `backend/data/hardware-import/`: `buildcores-LICENSE.txt`, `buildcores-NOTICE.md`, `docyx-LICENSE.txt`, `raw-sample.json`, `sample-index.json`.
- `backend/data/hardware-import/schemas/`: `CPU.schema.json`, `GPU.schema.json`, `Motherboard.schema.json`, `PCCase.schema.json`, `PSU.schema.json`, `RAM.schema.json`.
- `backend/tests/`: `test_basic_stock_contract.py`, `test_basic_stock_engine.py`, `test_basic_stock_imported_ram.py`, `test_basic_stock_pg.py`, `test_basic_stock_scenarios.py`, `test_basic_stock_socket.py`, `test_catalog.py`, `test_catalog_import.py`, `test_catalog_import_pg.py`, `test_compatibility_api.py`, `test_compatibility_d.py`, `test_pcs_postgres.py`, `test_platform_postgres.py`, `test_platform_rules.py`, `test_resource_rules.py`.
- `backend/upgradejusto/api/`: `catalog.py`, `compatibility.py`, `pcs.py`.
- `backend/upgradejusto/catalog/`: `models.py`, `postgres.py`, `service.py`.
- `backend/upgradejusto/catalog_import/`: `__init__.py`, `__main__.py`, `executor.py`, `proposal.py`.
- `backend/upgradejusto/compatibility/`: `application.py`, `basic_contract.py`, `basic_evaluation.py`, `basic_manufacturer.py`, `basic_policy.py`, `basic_specs.py`, `cpu_rule.py`, `curation.py`, `evaluation.py`, `http_models.py`, `models.py`, `observations.py`, `platform_curation.py`, `platform_rules.py`, `resource_curation.py`, `resource_models.py`, `resource_rules.py`.
- `backend/upgradejusto/pcs/`: `__init__.py`, `models.py`, `repository.py`, `service.py`.

### Lote3
- `backend/alembic/versions/`: `32_g_001_plans.py`, `32_h_001_shares.py`.
- `backend/tests/`: `test_plans.py`, `test_plans_postgres.py`, `test_recommendations.py`, `test_recommendations_api.py`, `test_shares.py`, `test_shares_postgres.py`.
- `backend/upgradejusto/api/`: `plans.py`, `recommendations.py`, `shares.py`.
- `backend/upgradejusto/plans/`: `__init__.py`, `calculation.py`, `models.py`, `repository.py`, `service.py`.
- `backend/upgradejusto/recommendations/`: `__init__.py`, `domain.py`, `models.py`, `service.py`.
- `backend/upgradejusto/shares/`: `__init__.py`, `models.py`, `projection.py`, `repository.py`, `service.py`.

### Lote4
- `backend/alembic/versions/`: `32_i_001_assistant.py`.
- `backend/tests/`: `test_assistant.py`, `test_assistant_cancellation.py`, `test_assistant_graph.py`, `test_assistant_live.py`, `test_assistant_mcp_contract.py`, `test_assistant_middleware.py`, `test_assistant_postgres.py`, `test_assistant_rag_postgres.py`, `test_assistant_tool_projection.py`, `test_basic_stock_assistant.py`.
- `backend/upgradejusto/api/`: `assistant.py`.
- `backend/upgradejusto/assistant/`: `HANDOFF.md`, `__init__.py`, `graph.py`, `ingest.py`, `mcp_server.py`, `middleware.py`, `models.py`, `provider.py`, `rag.py`, `repository.py`, `service.py`, `tables.py`, `tool_inputs.py`, `tool_projection.py`.

### Lote5
- `backend/alembic/versions/`: `33_001_administration.py`, `37_001_provider_budget.py`.
- `backend/tests/`: `test_administration_bootstrap.py`, `test_cu02_cu10_postgres.py`, `test_extraction.py`, `test_extraction_live.py`, `test_security37_body.py`, `test_security37_pg.py`.
- `backend/upgradejusto/administration/`: `__init__.py`, `bootstrap.py`, `initial.py`, `models.py`, `repository.py`, `service.py`, `tables.py`, `validation.py`.
- `backend/upgradejusto/api/`: `administration.py`, `body_limits.py`, `extraction.py`.
- `backend/upgradejusto/extraction/`: `__init__.py`, `models.py`, `provider.py`, `service.py`.
- `backend/upgradejusto/`: `main.py`.

### Lote6
- `frontend/`: `next.config.ts`, `package.json`, `server.mjs`.
- `frontend/app/api/`: `admin/[...segments]/route.ts`, `auth/[action]/route.ts`, `conversations/[id]/messages/route.ts`, `conversations/[id]/route.ts`, `conversations/route.ts`, `pcs/[id]/compatibility/evaluate/route.ts`, `pcs/[id]/compatibility/simulate/route.ts`, `pcs/[id]/recommendations/preview/route.ts`, `pcs/[id]/route.ts`, `pcs/extract/confirm/route.ts`, `pcs/extract/route.ts`, `pcs/route.ts`, `plans/[id]/route.ts`, `plans/[id]/shares/[shareId]/route.ts`, `plans/[id]/shares/route.ts`, `plans/route.ts`, `shared-plans/[token]/route.ts`.
- `frontend/lib/`: `admin-contract.ts`, `assistant-presentation.ts`, `assistant-proxy.ts`, `assistant.ts`, `auth.ts`, `catalog-evidence.ts`, `catalog.ts`, `compatibility-proxy.ts`, `compatibility.ts`, `curation-proxy.ts`, `curation.ts`, `evaluation-presentation.ts`, `extraction-presentation.ts`, `gateway.ts`, `message-presentation.ts`, `pcs-proxy.ts`, `pcs.ts`, `plans-proxy.ts`, `plans.ts`, `presentation.ts`, `product-visuals.ts`, `recommendations-proxy.ts`, `recommendations.ts`, `request-body.ts`, `retry-after.ts`, `session-role.ts`, `shared-html.ts`, `shares-proxy.ts`, `shares.ts`.
- `frontend/tests/unit/`: `assistant.test.ts`, `auth.test.ts`, `compatibility.test.ts`, `curation.test.ts`, `gateway.test.ts`, `pcs.test.ts`, `plans.test.ts`, `recommendations.test.ts`, `request-body-proxies.test.ts`, `request-body.test.ts`, `shares.test.ts`, `socket-proxy.test.ts`.

### Lote7
- `frontend/app/`: `account/page.tsx`, `admin/page.tsx`, `catalog/[id]/page.tsx`, `catalog/page.tsx`, `catalog/presentation.tsx`, `chat/chat.tsx`, `chat/page.tsx`, `error.tsx`, `globals.css`, `layout.tsx`, `not-found.tsx`, `pcs/compatibility.tsx`, `pcs/evaluation-summary.tsx`, `pcs/import/page.tsx`, `pcs/import/proposal.tsx`, `pcs/page.tsx`, `pcs/pcs.tsx`, `pcs/recommendations.tsx`, `plans/page.tsx`, `plans/plans.tsx`, `plans/replacements.tsx`, `plans/shares.tsx`, `shared/[token]/route.ts`.
- `frontend/components/`: `message-render.tsx`, `product-name.tsx`, `product-visual.tsx`, `shell.tsx`, `ui.tsx`.
- `frontend/`: `playwright.config.ts`, `playwright.curation.config.ts`, `playwright.design.config.ts`, `playwright.evidence.config.ts`, `playwright.live.config.ts`.
- `frontend/public/illustrations/`: `case.svg`, `cpu.svg`, `gpu.svg`, `motherboard.svg`, `psu.svg`, `ram.svg`.
- `frontend/tests/curation/`: `curation.spec.ts`.
- `frontend/tests/e2e/`: `auth.spec.ts`, `catalog.spec.ts`, `compatibility.spec.ts`, `fixtures.ts`, `gateway.spec.ts`, `pcs.spec.ts`, `plans.spec.ts`, `recommendations.spec.ts`, `shares.spec.ts`.
- `frontend/tests/evidence/`: `current.spec.ts`, `design-reference.spec.ts`, `final.spec.ts`, `visual-final.spec.ts`.
- `frontend/tests/live/`: `assistant.spec.ts`.
- `frontend/tests/support/`: `basic-scope.ts`, `hydration-diagnostic.ts`, `safe-exception.ts`, `socket-proxy.ts`, `visual-evidence.ts`.
- `frontend/tests/unit/`: `basic-scope.test.tsx`, `design-config.test.ts`, `extraction-presentation.test.ts`, `message-render.test.tsx`, `playwright-config.test.ts`, `presentation.test.ts`, `safe-exception.test.ts`, `session-role.test.ts`, `visual-central.test.tsx`, `visual-rest.test.ts`.

### Lote8
- Raíz: `.env.example`, `AGENTS.md`, `README.md`.
- `backend/`: `BASIC_HANDOFF.md`, `CU02_CU10_HANDOFF.md`, `IMPORT_HANDOFF.md`, `README.md`, `SECURITY37_HANDOFF.md`.
- `docs/`: `CIERRE_GIT_SPRINT32.md`, `CONTINUAR.md`, `DEMO.md`, `ENTREGA_LOCAL_INVENTARIO.md`, `HARDWARE_DEMO.md`, `REVISION_PUBLICACION.md`, `SPRINT32.md`, `SPRINT33.md`.
- `docs/ai-log/`: `2026-10-21-sprint32.md`, `2026-10-24-cu02-cu10.md`, `2026-10-25-alcance-basico-datasets.md`, `2026-10-25-cu05-cu06-evidencia.md`, `2026-10-26-entrega-visual.md`, `2026-10-26-revision37-seguridad-git.md`.
- `docs/specs/`: `CU01-cuentas.md`, `CU02-extraccion.md`, `CU03-pcs.md`, `CU05-compatibilidad.md`, `CU06-recomendaciones.md`, `CU07-planes.md`, `CU08-asistente.md`, `CU09-compartir.md`, `CU10-administracion.md`.
- `frontend/`: `ASSETS.md`, `CU02_CU10_CHECKPOINT.md`, `DESIGN-CHECKPOINT.md`, `README.md`, `SECURITY37-CHECKPOINT.md`.
- `scripts/`: `bootstrap-admin.py`, `check-groq.py`, `check.ps1`, `dev.ps1`, `fetch-hardware-sample.py`, `install-pgvector.ps1`, `install-postgresql.ps1`, `local-env.ps1`, `migrate.ps1`, `postgres.ps1`, `postgres_admin.py`, `prepare-admin-demo.py`, `prepare-embeddings.py`, `prepare-rag.py`, `prepare-test-tls.ps1`, `publish-hardware-sample.py`, `review-publication.py`, `test-assistant-browser.ps1`, `test-backend.ps1`, `test-browser.ps1`, `test-setup-guards.py`, `verify-assistant-runtime.py`, `verify-auth-runtime.py`, `verify-browser-mcp.py`, `verify-postgres.py`, `verify-rag.py`.
- `tools/browser-mcp/`: `config.json`, `package-lock.json`, `package.json`.
- `tools/`: `embeddings-model.json`, `public-corpus.json`.

Detalle de herramientas, comandos, resultados y fallos corregidos en
[bitácora37](ai-log/2026-10-26-revision37-seguridad-git.md).
