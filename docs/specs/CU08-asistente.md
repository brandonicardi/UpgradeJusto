# CU08 — plan y contrato inicial, Sprint32 I

## Delta autorizado38 — antes de implementar

Conservar siete herramientas MCP y nombres/identidad servidor; resolver DTO torre
por schema/scope sin truncar ni autorizar con user_id/SQL del modelo. Get PC/evaluate/
simulate/recommend/plan reutilizan servicios. Contexto PC visible, preguntas útiles,
Markdown seguro/fuentes/progreso/cancelación/errores recuperables/historial; orientar
confirmación sin saltarla. RAG pertinente curado, no PDF por cantidad ni precio viejo
como oferta viva. Contrato [§7](../../backend/INTEGRAL38_CONTRACT.md).
Aceptación: herramientas con torre/declarados/propiedad y streaming/UUID/cancelación/
cuotas37, pocas llamadas reales justificadas; no atribuir mocks a Groq real.
No es cierre38; resultados inferiores conservados para sus incrementos.

### Contrato torre aceptado antes de implementación

[Asistente38](../../backend/INTEGRAL38_ASSISTANT_CONTRACT.md) conserva exactamente
`catalog_search/get_pc/evaluate_pc/simulate_pc/preview_recommendations/get_plan/
search_public_docs`, todas de lectura. No guardar/confirmar/compartir por argumento
del modelo. Nueva proyección2 discrimina torre sin truncar líneas/cobertura; legacy
mantiene proyección1 y valores históricos. Overflow explícito obliga a interfaz
completa, nunca recorte parcial con verde. Catálogo completo paginado y lookup porID
independiente de página; sin JSON técnico crudo como instrucciones.
Contexto opcional por turno, cerrado/versionado, obtiene PC propia/revisión en servidor
antes de reservar generación. No notas, permisos ni snapshot autoritativo del cliente;
contexto tratado como datos, no mensaje de autoridad. Conversaciones conservan texto,
respuesta/citas/estados persistentes; selección por turno no se promete persistida.
Sesión/conversación/propiedad se revalidan también en MCP; conservar cotas37,
cancelación/cleanup/UUID idempotente y siete nombres sin dispatcher alternativo.
Lectura de planes torre espera interfaz real del autor y gate propio: no simular
esa rama ni adaptar snapshot privado por conjetura. Contrato aceptado no acredita
implementación de siete ramas, proveedor real ni ampliación de cuotas/timeout.

## Estado vigente24/10 — FUNCIONAL LOCAL VERIFICADO

Revisor independiente FINAL: incremental APROBADO sin bloqueantes. CierreBuild
323passed/0skips/Ruff0/front68/tiposlintbuild0/normalE2E9/WEBLIVE1, PGpost0;
streaming incremental fetchmismosbytes/citas/tools/history/A-B/UUID409/cancel+borrado,
MCPpropio+Groq+LangGraph+RAGpgvector REAL y reinicioAPI+PGhistorial/citas/sesión0.
Pending abandonado→interrupted sin replay. UnAPIworkerlocal/BD explícito aceptado;
NO certificación multiworker/cuotafutura/despliegue ni relevanciaRAGuniversal.
Calibración vigente9/9SQLreal, threshold0.43721892096570775; fuente/modelpins iguales.
TLSsystem opt-in validacióncert/hostnameON; defaultcertifi, sin bypass.

Cierre documental/privacidad/índice corroborado Build24/10 22:01:18-03:00, no pendientes.
READMEraíz/backend/assistantHANDOFF/frontend coherentes según lectura Build;
DEVcorpus3chunks/RAG9/9 preparado sin testscontraDEV ni PCsusuario alteradas.
Wrapper nuevo scripts/test-assistant-browser.ps1 LIVE -SystemTrust syntaxPASS,
NO ejecutado para evitarcuota; subyacente equivalente ejecutado, no nuevo test.
SeisCUfuncionales+dosparciales05/06, CU02/10pendientes; NO ochoCUcompletos.
[Evidencia y matriz vigentes](../SPRINT32.md),
[resultados/fallos/correcciones y cierre](../ai-log/2026-10-21-sprint32.md).
Solo estado/evidencia: NO nuevas APIs ni cambios de contrato/aceptación.

## Preparación histórica — NO estado vigente de implementación

Los párrafos de preparación siguientes preservan probes previos (incluidos
«NO implementado», «live_assistant=false» y «NO web aprobado»): quedaron superados
por la evidencia vigente anterior, no son bloqueos actuales ni instrucciones nuevas.

Contrato previo a backendI/frontend24/10. Preparación EN CURSO, NO CU08 implementado.
Build informa clave configurada por usuario/helperreloadtrue y probe SDK+ChatGroq
`check-groq.py --system-trust` exit0, modelo verificado `openai/gpt-oss-20b`, respuesta
26chunks y toolstreamtrue; live_assistant=false. No web aprobado ni acción manual
Groq necesaria. Supera bloqueo histórico key_presentFalse, no autoriza declarar
recorrido producto. Urllib403Cloudflare NO prueba clave inválida/cuota agotada.401,
cuota/timeout/permiso son bloqueo operativo, no incapacidad; sin rotar cuentas,
proveedores ni contratar. Specs/imports/mocks NO completan I. CU02/CU10 pendientes.

Setup comprobado por Build, no ejecutado por coordinadora: PyPI oficial y Context7
MCPv2/LangChain/FastEmbed verificados; instalación aditiva fijada langchain1.4.7,
langgraph1.2.17, langchain-groq1.1.3, mcp2.3.0, pgvector0.5.1, fastembed0.9.1;
posteriormente pypdf6.21.2 fijado tras docs oficiales/PyPI, uvlock/sync0/96paquetes
sin actualizar anteriores. Esto NO prueba CU08, extensión PGvector operativa,
MCP real, grafo ni pipeline RAG aprobado. Encoder probado aparte debajo.

## TLS y proveedor congelados antes de backendI

Producto configura `UJ_TLS_TRUST` explícitamente: default portátil `certifi`;
valor `system` opt-in usa SSLContext del almacén de confianza del sistema existente.
Otros valores fallan configuración segura, sin downgrade/fallback silencioso.
En AMBOS modos validar certificado y hostname permanece ON. Sin verify=False,
sin instalar CA, sin cambiar almacén/perfiles ni monkeypatch global. Propagar el
contexto elegido a clientes SDK/ChatGroq y descargas HTTPX del pipeline según
integración verificada, conservando timeout y controles URL. No mezclar políticas
implícitas distintas por cliente ni permitir que modelo/browser elijan trust.

Diagnóstico Build: TLS SSL Windowsroots válido con issuer Kaspersky; certifi falla
verifycode19. Probe con contexto sistema existente validó certificado/hostname y
permitió SDK+ChatGroq streaming/tools. Esto registra confianza local efectiva,
NO certifica portabilidad a otra máquina ni autoriza desactivar seguridad. Modo
certifi que falle debe informar error seguro y opción explícita, nunca retry inseguro.
Modelo de producto inicial `openai/gpt-oss-20b` verificado por probe Build; enviar solo
datos necesarios y no exponer claves. Prueba aún NO usa asistente web integrado.

## Recorrido mínimo autorizado

Web autenticada → API → grafo LangGraph acotado → Groq mediante integración LangChain
verificada/fijada por Build → herramientas MCP propias → mismos servicios/controles
B/C/D/F/G → respuesta streaming e historial PostgreSQL por propietario. Grafo mínimo
entrada/modelo/herramientas/modelo/salida, máximo4 rondas herramientas por turno,
timeout proveedor30s y total90s; al alcanzar límite emitir error final seguro, no loop
ni retry ilimitado. Modelo inicial según pin verificado arriba, configurable servidor
con comprobación real de disponibilidad; no inventar cuota ni estado live producto.

Herramientas iniciales SOLO lectura/simulación: catálogo, obtener PC propia, evaluar/
simular compatibilidad, preview recomendaciones, obtener plan propio, buscar docs
públicas indexadas. No crear/editar PC, planes, shares o catálogo vía IA; web G/H
mantiene confirmación explícita. Identidad desde sesión en servidor, jamás user_id del
modelo; contexto de autorización ligado a cada llamada MCP sin global mutable ni
reusar identidad de otra conversación. Entradas cerradas, límites/tamaños, no SQL
arbitrario ni filesystem/fetch de URLs arbitrarias. Errores seguros propagados, fail
domina y faltantes/cobertura permanecen en explicación. Sin razonamiento interno en
stream, logs o historial; guardar solo mensajes visibles y resumen seguro de tools.

## API propuesta a congelar con backend antes de UI I

- POST `/api/conversations` `{title}` strip1..100:201 `{id,title,created_at,updated_at}`.
- GET `/api/conversations?page=1&page_size=20`:200 paginado CU03, solo dueño.
- GET `/api/conversations/{id}`:200 metadatos propios.
- GET `/api/conversations/{id}/messages?page=1&page_size=20`:200 paginado por secuencia
  ascendente, items `{id,sequence,role,content,status,citations,created_at}`; roles
  user/assistant, status pending/completed/failed/interrupted; sin eventos internos.
- POST `/api/conversations/{id}/messages` `{content,client_request_id}` content strip
 1..8000, UUID idempotencia por conversación. Origin/CSRF y sesión antes de stream.
 200 SSE por fetch POST (no EventSource sin CSRF); eventos tipados `start`, `delta`,
 `tool_status`, `citation`, `done`, `error`, cada uno JSON seguro con message_id y
 secuencia de evento. delta `{text}`, tool_status `{name,status}` sin argumentos
 sensibles; citation `{source_id,url,title,locator,excerpt}` pública trazable;
 done `{status}`. No cookies/tokens/SQL/prompts internos/chain-of-thought.
 `start` tras guardar usuario+assistant pending en PG. Una generación activa por
 conversación;409 si concurrente. UUID repetido devuelve409 con message_id existente,
 NO otra llamada facturable; recuperar por messages, sin prometer replay SSE.
- DELETE `/api/conversations/{id}`:204 confirmada en UI, solo dueño, bloqueada409
 mientras genera. Sin borrar PC/planes ni documentos públicos indexados.

Validación estricta sin extras;401 sin sesión,404 ajeno/inexistente antes de409,
422 inválidos,503 PG previo al stream. Una vez headers enviados, fallo se expresa
`error {code,retryable}` seguro y se persiste failed/interrupted con texto parcial
marcado, no done exitoso ficticio. Cancelación cliente detiene generación/tool calls
cuando posible y finaliza estado; reinicio transforma pending abandonado en interrupted
sin regenerar/cobrar automáticamente. Fallo de persistencia nunca confirma historial
guardado; UI informa explícitamente. No-store, buffer deshabilitado donde corresponda,
gateway allowlist UUID/rutas/métodos cerrada, sin proxy transparente arbitrario.

## RAG vectorial REAL, no embeddings Groq inventados

Corpus solo documentación pública técnica relevante al hardware del catálogo. Antes
de ingesta, manifiesto curado con URL canónica pública exacta, título, alcance,
fecha de consulta, licencia/condiciones de uso y localizador. Primera entrada congelada
por evidencia Build: manifiesto `tools/public-corpus.json`, PDF público Kingston DDR4,
149893bytes/2páginas, SHA256
`b2a2357e5f8d805aa5a2113fbdf9f0d28b97e6a23238b05b57990a988b8345b1`.
Build verificó HTTPX TLSsistema REAL200 y contenido DDR4; PDF local NO Git. Backend
debe resolver URL/título/localizadores y condiciones desde manifiesto público antes
de ingesta, sin inventarlos ni sustituir silenciosamente el documento. Si bytes/hash
cambian, abortar esa revisión y registrar revisión nueva explícita. La coordinadora
no pudo leer manifiesto (permiso denegado), referencia/hashes son evidencia recibida
de Build, no lectura propia ni verificación independiente de esos campos.

Pipeline reproducible por Build/setup y backend/implementación: descarga allowlist
con límites/timeout, extracción textual con localizadores, hash de contenido,
chunks determinísticos identificados por documento/revisión/localizador, embedding
REAL y pgvector PG; reingesta misma revisión idempotente, revisión nueva trazable.
Groq NO proporciona embeddings para este contrato. Encoder congelado por evidencia
Build: FastEmbed0.9.1, multilingualMiniLML12 CPU ONNX, Apache2, revisión
`faf4aa4225822f3bc6376869cb1164e8e3feedd0`,384 dimensiones finitas medidas por
`scripts/prepare-embeddings.py` exit0. Todos los hashes de archivos están en
`tools/embeddings-model.json`: model/tokenizer LFS publicados;3configs con hashes
locales frente a revisión fijada, no afirmar que esos3hashes sean publicados.
Usar identificador exacto del manifiesto y verificar revisión/hashes/dimensión al
cargar/indexar; no alias flotante ni cambio silencioso de encoder. Coordinadora no
pudo leer manifiesto por permiso, no inventa nombre repositorio/archivos/hashes no
recibidos. Build conserva responsabilidad de proporcionar pin resoluble al backend.
Este probe NO acredita pipelinePG ni recuperación/citas. Si descarga/compatibilidad no disponible, registrar
bloqueo RAG, no vector aleatorio ni búsqueda léxica presentada como vectorial.
Build verifica documentación oficial/versiones LangChain/LangGraph/MCP/pgvector,
encoder y transitivas/lock; sin pin inventado en esta spec ni instalación por coordinador.

Consulta genera embedding con MISMO encoder/revisión, búsqueda vectorial pgvector
real sobre corpus público, devuelve top-k máximo5 con URL/localizador/extracto/hash
de revisión; sin hit relevante se abstiene, no fabrica cita. Umbral/normalización
se fijan con pruebas registradas, no número arbitrario como garantía de relevancia.
Mostrar citas que respaldan afirmación, separar «evidencia documental» de veredicto
determinístico CU05; un chunk RAG nunca aprueba regla ni modifica catálogo/reglas.
Texto recuperado es dato no confiable, no instrucción: bloquear inyección de tools,
URLs/SQL, cambio de identidad o extracción de secretos. Corpus público compartible,
historial/PC/planes NO se indexan en colección pública.

## Gates para I — criterios conservados, evidencia vigente enlazada

Estado actual: gates funcionales locales satisfechos y revisión incremental aprobada
según [estado vigente al principio](#estado-vigente2410--funcional-local-verificado)
y [bitácora](../ai-log/2026-10-21-sprint32.md). La instantánea siguiente es HISTÓRICA
de preparación (pipeline/web/MCP pendientes entonces), no pendientes actuales.

Preparación acreditada por Build: probe Groq SDK/ChatGroq, encoder y descarga corpus
reales descritos arriba. AÚN NO pipelinePG/ingesta/recuperación ni producto web.
PlaywrightMCP0.0.83 instalado aparte en tools/browser-mcp manifestlock/config aislado
localorigin, CLIhelp0; NO invocaciónMCP todavía, NO sustituye MCP propio del producto.
Namespace herramientas GitHub ausente: no reclamar uso GitHub ni publicación.

### Criterios de aceptación originales (no redefinidos)

1. Build registra probe Groq real sin clave visible y setup/deps/encoder/PGvector
   utilizables. Si no, código/config preparado y bloqueo honesto; sin fallback final.
2. Backend prueba grafo y MCP REAL con servicios reales, A/B incluso tool invocations
   maliciosas/IDs ajenos, límite de rondas, fallo de tools, sesión expirada y concurrencia;
   no aceptar solo invocación Python directa como recorrido MCP.
3. Ingesta real repetible→filas/vector dimensión→consulta pgvector real→cita verificable,
   negativos sin hit/inyección; registrar corpus/revisiones/comandos y códigos exactos.
4. Browser real envía mensaje→Groq→herramienta MCP→tokens visibles→historial PG;
   reload y reinicio REAL conservan mensajes/estado/citas. Dos usuarios aislados.
   Cancelación, cuota401/429/timeout y PGfail no dejan éxito ficticio ni fuga.
5. Checks comunes secuenciales, PGpost0, revisión Astra crítica auth/MCP/aislamiento/
   inyección/streaming. Mock/fault injection sirve para negativos, NO reemplaza camino
   positivo real Groq+MCP+LangGraph+pgvector con citas. CU08 incompleto si falta alguno.

Build lanza especialistas nuevos por bloque sin duplicar escritores; backend fija
contrato efectivo y emite checkpoint antes de frontend. Si necesita ajustar propuesta
API I, actualizar aquí antes de UI y registrar delta; no inferir aprobación de librerías
por esta descripción. No API administrativa ni herramientas de CU02/CU10.
