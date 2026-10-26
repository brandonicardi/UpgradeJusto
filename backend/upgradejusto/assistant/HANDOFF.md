# Estado vigente I — funcional local, evidencia final de Build

Actualización exclusivamente documental; **todos los checks/códigos aquí son
informados por Build, ninguno ejecutado por este especialista**. La cronología
previa permanece debajo y sus pendientes históricos no describen el cierre actual.

- Cancelación antes del fix: 3 failed/1 passed, exit1; después: 18 targeted passed,
  exit0. Carrera cancel-after-start corregida; persistencia solo si pending,
  conservando parciales y sin sobrescribir estados terminales.
- WEB LIVE final: 1/1, 11.3s, exit0, PGpost0. Normal: 9/9, 20.4s, exit0, PGpost0.
- Backend FINAL: 323 passed, cero skips, 37.99s, exit0; LIVE opt-in, helper de clave,
  TLS system. Ruff y formato (103 archivos): exit0. Frontend: 68 unitarias y
  tipos/lint/build exit0. Revisión independiente final sin bloqueantes y con
  condiciones satisfechas, según cierre comunicado por Build.
- Pruebas raíz G/H e I con reinicio real: exit0, conservando historial/citas/sesión
  e interrumpiendo pendientes sin nueva generación facturable. Vectores DEV/TEST:
  3 chunks públicos, 9/9 consultas SQL calibradas, umbral final
  `0.43721892096570775`; no garantía universal ni sustituto del motor determinístico.

API/MCP/RAG/historial funcionales localmente; sin SQL arbitrario del LLM ni
user_id cliente/modelo como autorización. Herramientas de lectura/simulación.
Límite operativo: **un worker API por BD local**, recuperación exclusiva al arrancar.
Limpieza postcancel acotada y timeouts PG locales; abandonar un waiter no mata un
thread PG ya iniciado. PG fallido no confirma historial; fallo del proveedor no
produce éxito ficticio, y ninguna prueba promete cuota/disponibilidad futura.
CU05/CU06 globales permanecen incompletos. No nuevos probes, suites ni cambios de
producto en esta edición.

# Checkpoint I — no ejecutado por especialista

## Diagnóstico focal posterior a integración Build

Evidencia recibida de Build (no ejecutada aquí): H+I negativos/PG/MCP/grafo
23passed exit0; RAG real2passed exit0, manifiesto normalizado disponible, ingesta3
chunks idempotente. Live exit1: done completed sin evento citation. No se atribuye
todavía al envoltorio MCP. La lectura del SDK continúa denegada al especialista.

Nuevo `tests/test_assistant_mcp_contract.py` permite aislarlo SIN Groq: modelo
determinista de prueba fuerza query exacta pública, pero grafo/MCP/encoder/PG son
reales. Observa el resultado nativo y solo imprime keys/result_keys/citation_count;
exige que las citas reales recuperadas alcancen emit del grafo. No cambia ni
normaliza resultado en producción. Si cuenta>0 y emit0 con result_keys=citations,
quedará demostrado el desajuste del wrapper; si cuenta0, NO inventar citas ni
relajar umbral. En ese caso investigar recuperación exacta, no aplicar parche del
wrapper por hipótesis. Regresión preparada, ejecución pendiente de Build.

También agrega evaluate_pc/simulate_pc vía protocolo real, comparación con el
mismo CompatibilityService.run(owner, identity, request), negativas ajeno/revisión
y verificación de RAM como reemplazo de conjunto y PC guardada intacta. Firma
del servicio inspeccionada y coincide con llamadas actuales; sin cambio runtime.

Desde backend/, con entorno TEST configurado por wrapper de Build, ejecutar por
separado (no imprimir entorno, no --showlocals):

```
.venv/Scripts/python.exe -m pytest -q -s tests/test_assistant_mcp_contract.py::test_real_mcp_search_structured_output_reaches_graph
.venv/Scripts/python.exe -m pytest -q tests/test_assistant_mcp_contract.py::test_real_mcp_evaluate_simulate_match_service_and_do_not_persist
```

No reejecutar Groq hasta observar diagnóstico y corregir causa demostrada. Si
falla contrato, devolver solo shape/conteo y código individual a coordinador.

Escrituras limitadas a assistant/, api/assistant.py, test_assistant*.py y revisión I.
Shell, instalación y cambios comunes prohibidos. Ningún check/código de salida
disponible; no afirmar CU08 implementado ni gates aprobados.

## Integración exclusiva posterior por Build

- Registrar `upgradejusto.api.assistant.router` en app, sin nuevos escritores paralelos.
- `assistant.tables` comparte metadata; importa las tres tablas propias. La migración
  `32_i_001` depende de `32_h_001`, crea extensión vector y tablas. H es dependencia
  externa a este cambio, no se editó ni se comprobó su disponibilidad.
- Arranque exclusivo de un único worker: invocar
  `Repository(runtime_engine()).interrupt_abandoned()` antes de atender solicitudes.
  NO invocar recuperación global con otro worker generando. Multiworker requiere
  arrendamientos/recuperación por instancia antes de habilitarlo.
- Mantener manejo existente de errores auth/Unavailable y no-store privado. SSE
  declara no-store y X-Accel-Buffering:no. Router usa owner/CSRF existentes.
- Verificar API exacta del SDK mcp2.3.0: Client/StdioServerParameters, list_tools().tools,
  Tool.input_schema, call_tool().is_error/structured_content y MCPServer.run() stdio.
  Se implementó con superficie recibida; no pudo inspeccionarse SDK por permisos.
  Prueba real independiente: test_real_mcp_owner_checks_and_live_revocation.
- Ejecutar Ruff formato/check y pytest por separado con wrapper PG existente.
  Formato/imports/compilación también están NO verificados. No ejecutar comandos
  contra una base distinta de la guardada por wrapper/conftest.

## Contrato HTTP conservado

Rutas y cuerpos de CU08 sin modificaciones. Campos SSE message_id y sequence
por evento; start/delta/tool_status/citation/done/error. Idempotencia409 devuelve
detail `{code:duplicate_request,message_id}`; historial paginado ascendente,
sin replay SSE. Una generación pendiente por conversación mediante lock PG e índice.
Reserva/historial se leen en misma transacción. Roles visibles user/assistant.
Errores posteriores a headers no confirman done; persisten failed/interrupted.
Proveedor30s, turno90s, 4 rondas herramientas/8 llamadas por ronda, salida32000chars.
No se guardan prompts internos, tool arguments, resultados internos ni razonamiento.

MCP es subprocess real por turno con sesión opaca y conversación por entorno privado,
sin clave Groq, no argumentos CLI/logs/schema. Cada tool revalida sesión, conversación
y propiedad de PC/plan a través de servicios. No hay herramientas de escritura/SQL.
Grafo valida argumentos cerrados además de schemas propios de servicios. Probar
rechazo de extras también directamente contra SDK: no asumir su política implícita.

## Gate manifiestos/encoder pendiente — sin fallback

Lectura de tools/embeddings-model.json y tools/public-corpus.json denegada. No se
inventó formato ni nombre del encoder. Build debe proporcionar manifiesto normalizado
compatible con `rag.Manifest` y `UJ_ASSISTANT_RAG_CONFIG` (ruta server-only):

- encoder: model_name exacto, revision, model_path, files_sha256 (rutas relativas).
- sources[1]: source_id,url,title,scope,accessed_at,terms,sha256,byte_length,page_count,
  local_pdf. Extraer procedencia real del manifiesto curado, no inventar estos campos.
- max_cosine_distance numérico y calibration_evidence no vacío: calibrar/registrar
  con pruebas relevantes/no-hit, no elegir un número como garantía de relevancia.

Código valida revisión encoder fija, hashes de archivos, 384 dimensiones finitas,
hash/bytes/páginas exactos de corpus autorizado. Encoder FastEmbed local_files_only,
2threads; sin descarga de modelos/fallback. CLI `python -m
upgradejusto.assistant.ingest --config <manifest>`; --download usa URL exacta del
manifiesto sin redirects y TLS explícito. Ingesta chunks página/900chars con100overlap,
PK determinística, ON CONFLICT DO NOTHING. Consulta cosine pgvector topk<=5 con
umbral explícito, sin hits devuelve citas vacías. No indexa historial/PC/planes.

Gate live opt-in UJ_TEST_ASSISTANT_LIVE=1: test_assistant_live.py usa producto HTTP
real tras integrar router/manifiesto. Su skip NO completa I. Pruebas PG/MCP/RAG
escritas pero NO ejecutadas. Faltan browser, reinicio real, inyección/no-hit calibrado,
cuota401/429, desconexión real y revisión independiente. Escalar fallos diagnosticados
antes de iterar o cambiar pins; no instalar, desactivar TLS ni rotar proveedor.
