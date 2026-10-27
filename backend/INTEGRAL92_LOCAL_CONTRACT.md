# 92 — chat local, alcance autorizado

Aceptado por Brandon/Build: solo CU08 selecciona UJ_CHAT_PROVIDER=groq (default)
u ollama. provider.model(client) sigue siendo Groq para CU02/extracción;
graph conserva su símbolo model mediante alias de chat_model. Sin fallback.

Ollama nativo: langchain-ollama1.1.0/ollama0.6.3, runtime/modelo instalados solo
por Build. URL exclusiva http://127.0.0.1:11434; modelo local qwen3:4b por defecto,
tag validado; sin pulls, nube, proxies de entorno, redirects ni clave Groq.
reasoning=False, contexto16384, salida1024, temperatura0, keep_alive5m,
timeout30. Sesiones/CSRF/HMAC/PG/MCP/inventario/validación y límites de turno intactos.
No exposición de razonamiento, cuerpos de error, secretos o prompts en diagnósticos.

Build instala/sincroniza y verifica firmas públicas, binding no facturable y UN
turno real local opt-in: get_pc/evaluate_pc, texto final útil e historial completed,
limpieza de recursos propios. Preparación no equivale a éxito E2E. Groq continúa
configurable y STOP de llamadas Groq sigue vigente. Sin cambios globales/env
persistente/frontend/main/CU09 ni endpoints de catálogo nuevos.

## Preparación y verificación focal por Build

Pins añadidos a pyproject; lock/sync y comprobación de firmas a cargo de Build.
No se ejecutaron comandos ni llamadas aquí. Si una firma pública no coincide,
detener y reportar el campo concreto; no cambiar de proveedor ni relajar guardas.

Pruebas no facturables: tests/test_assistant92_local_provider.py (selección CU08,
CU02 permanece Groq, validación de configuración y binding real Ollama con HTTP
bloqueado) y tests/test_catalog92_sort.py (presentación sintética, NO prueba PG).
Build ejecuta Ruff check y format --check por separado sobre los archivos afectados.

Nodo real: tests/test_assistant92_local_actual.py::
test_actual_local_tower_tools_final_text_history_and_cleanup. Requiere wrapper TEST
PG, UJ_CHAT_PROVIDER=ollama, UJ_TEST_ASSISTANT_LOCAL=1 y
UJ_TEST_ASSISTANT_DIAGNOSTIC=1; mensaje UI sintético exacto en
UJ_TEST_ASSISTANT_DIAGNOSTIC_MESSAGE; tracing off, logging WARNING, sin showlocals.
Ollama y qwen3:4b deben estar instalados/cargados por Build; nunca auto-pull.
Un POST real autenticado; get_pc/evaluate_pc completos, final sin tool calls con
smoke de utilidad, done e historial completed, cleanup propio. La utilidad textual
es smoke, no certificación semántica independiente. Reporte solo metadatos cerrados:
proveedor/model tag/hash del TAG (no digest de pesos), contadores, clases seguras,
TTFT desde primer astream y tiempo total incluyendo setup/cleanup. Sin texto,
IDs, cuerpos de error o razonamiento en el reporte. No repetir ante fallo sin causa.

Catálogo92 implementa el contrato CU04 comunicado por Build: sort=id default o
retail_first explícito; filtra AND, ordena grupos evidencia foto exacta/importe ARS
ligado, desempata por id y luego pagina. No oculta seeds ni cambia total/cotizaciones/
vigencia/status; no afirma que oferta histórica sea vigente o pieza compatible.

## Reparación aceptada27/10 — metadatos nativos Ollama

Build reprodujo que SDK/servidor Ollama pierden refs anidados y restricciones raíz.
Antes de bind_tools, solo el proveedor local expande referencias #/$defs/ sobre
copias acotadas; ciclos/externas/no resueltas/solapamientos ambiguos fallan cerrado.
La expansión conserva semántica JSON Schema antes del transporte, incluidos oneOf,
additionalProperties y límites. MCP y validadores autoritativos no cambian.
La proyección nativa no expresa toda esa semántica: es guía, NO validación ni prueba
de aceptación de Groq/Ollama. Se verifica estructura útil de argumentos por HTTP
simulado y parsing de respuesta sintética; eso NO prueba decisión real del modelo
ni causa única de la ausencia de herramientas anterior. Sin cambios de POLICY,
ejecución, permisos, proveedor Groq/CU02 o límites. Build ejecuta primero pruebas
no facturables y solo después decide el único turno local real.

## Extensión aceptada — envelope público por binding

Build reprodujo pérdida de anyOf incluso tras inline. Se autoriza snapshot JSON
inmutable de siete herramientas expandidas por binding y envelope HTTPX público
sync/async para reponer SOLO tools al POST exacto loopback /api/chat. Cada astream
crea modelo nativo/transports nuevos y cierra ambos delegates incluso al cancelar.
Sin acceso a clientes privados SDK, mutación global o cambios de dispatch/POLICY.
Request y metadatos limitados a1MiB; extensión timeout/headers restantes y todos los
campos ajenos a tools se conservan. Formato Go sigue sin expresar toda la semántica
raíz: metadatos son guía; MCP y validadores conservan autoridad. Gates previos:
HTTP mock/parser nativo, aislamiento/concurrencia/cierre y equivalencia pre-native.
Sin otro intento LLM hasta pruebas/revisión; no se afirma causa única ni éxito real.

## Resultado ACTUAL y STOP vigente — cierre documental27/10

Build confirmó35 pruebas puras PASS y Ruff check/format0. El ÚNICO turno real local
posterior a la reparación FALLÓ la aceptación: get_pc0/evaluate_pc0, TTFT21.014s,
total31.987s, texto e historial completed pero CERO herramientas; cleanup completo.
Esto NO es éxito CU08. La única consulta Astra ya usada avaló la ruta envelope,
no el funcionamiento E2E ni una causa única del fallo de decisión del modelo.

CU08 BLOQUEADO, detenido y reportado al supervisor. NO hay autorización vigente
para otro turno, reparación, investigación SDK/proveedor o reintento automático.
Los gates/propuestas anteriores son historia del intento, NO permiso de reanudar.
Conservar fuentes y Groq configurable; ninguna llamada nueva ni cambio de modelo/
cuenta/proveedor por este cierre. Todo trabajo backend queda en PAUSA hasta nuevo
encargo explícito; no rescatar automáticamente la generación o prueba cancelada.
