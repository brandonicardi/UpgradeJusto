# CU08 Integral38 — contrato previo a implementación

Estado: ACEPTADO por Build26/10/2026; delta CU08 aplicado ANTES de habilitar código.
Incremento autorizado: herramientas/contexto/proyección. Interfaz exacta get_plan
TORRE recibida de B1 durante implementación: rama preparada con servicio real;
verificación propia pendiente. get_plan legacy se conserva, sin octava herramienta.
Inspección limitada a assistant/{mcp_server,tool_inputs,tool_projection,graph,service,
models,repository}.py estables. No lectura de implementaciones activas de planes ni
extracción. No adaptación de siete MCP, llamada proveedor o recorrido vivo acreditado
por este documento. Resolver01b3028 aceptado según Build; presupuesto global de fans
sigue pendiente de política y actualmente afecta T10: este bloque no toca motor.

## 1. Inventario real: SIETE nombres, todos de lectura

| Herramienta | Entrada actual | Delta propuesto |
|---|---|---|
| catalog_search | q:string<=100,category:nueve categorías|null | page>=1 default1,page_size1..20 default12; catálogo PG completo filtrado/paginado, sin corte50/60 |
| get_pc | pc_id:UUID | mantiene entrada; servidor distingue PC legacy/torre propia |
| evaluate_pc | pc_id,data:EvaluateRequest | unión cerrada por configuration_schema1/2; data.expected_pc_revision; servicio apropiado |
| simulate_pc | pc_id,data:SimulateRequest | unión cerrada1/2; torre usa acciones/UUID/cantidades/contexto BIOS del contrato38 |
| preview_recommendations | pc_id,data:PreviewRequest | unión cerrada1/2; torre reusa preview objetivo/budget/condición/workload/materiales/alternativas del contrato38 |
| get_plan | plan_id:UUID | mantiene entrada; lectura propia legacy/torre con discriminación servidor; interfaz torre pendiente §6 |
| search_public_docs | query:string1..500,top_k:int1..5 default3 | sin nuevos argumentos; búsqueda pública curada/pgvector existente |

No save_plan, apply_plan, extracción/confirmación, share, SQL, hardware detector ni
octava herramienta. catalog_search no es actualmente búsqueda vectorial: PG estructurado
para componentes; search_public_docs es recuperación documental pública separada.
UUID seleccionado por modelo no es autoridad: todos los servicios revalidan propiedad.
El lookup de un ID seleccionado usa snapshot completo servidor, nunca los primeros
resultados de búsqueda. Paginación no autoriza acceso a datos privados de adquisición.

Para evaluate/simulate/preview: llamada legacy sin configuration_schema equivale1;
alternativa torre exige configuration_schema:2, schema discriminado y cerrado. Mismatch
con configuración real se rechaza, nunca se trunca torre a seis categorías. Revisión
PC/catálogo, acciones, candidatos y límites conservan contratos de servicios existentes.
Sin flags para apagar pendientes ni resultados/scopes/cobertura aportados por modelo.
La capa herramienta no determina compatibilidad ni reinterpreta reglas.

## 2. Transporte y proyección versionados

PC legacy y resultados legacy conservan DTO/projection_version:"1". Nuevos resultados
de configuración torre usan wrapper cerrado interno MCP:
`{configuration_schema:2,data:<DTO torre existente>}`. get_pc.data es Tower completo
normalizado; evaluate/simulate.data es evaluación torre; preview.data es preview torre.
get_plan torre queda condicionado a DTO aceptado y suministrado por su autor, no a
inferirlo de campos legacy. Catalog/docs mantienen transporte actual; no discriminador
de PC artificial para sus resultados. Proyección torre usa projection_version:"2" y
conserva configuration_schema:2; nunca entrega JSON torre a validador PC/Plan legacy.

get_pc proyecta exactamente nueve category_status (present/unknown/absent) y TODAS
las líneas (hasta límites36), con line_id servidor, categoría, cantidad, component_id
o declared_model, id/revisión/schema/origin_schema. Resumen por nueve categorías NO
colapsa varios discos/fans ni reemplaza unknown por absent. Nombre declarado no genera
especificaciones. context.bios_version se conserva; context.notes se elimina de toda
proyección al modelo. Sin owner/session/email/notas privadas. Objetivo/presupuesto
vienen de selección explícita del usuario o argumentos de preview, no se infieren
como permisos ni se guardan en PC al consultar.

Evaluación/propuestas preservan íntegros estados, hechos, conditions, faltantes,
coverage, scope/rules/data/PC versions, advertencias, dependencias, beneficios y costes
documentados. Referencias solo desde campos de evidencia validados; no regex que
promueva texto del usuario a fuente. Imposibilidad de proyectar dentro de cotas =>
tool_output_limit_full_api_required, jamás cortar reglas/líneas para producir verde.
Compatible básico histórico no se renombra compatible torre ni certificación física.
Motor conserva conocido fail más faltantes; LLM solo explica alcance y desconocidos.

Catálogo al modelo: proyección explícita y validada de id/nombre/categoría, atributos
de presentación curados, fuentes, imagen disponible y ofertas con moneda/condición/
observed_at/expires_at/status/stock. En su proyección se excluyen strings internos
basic_stock_v1/tower_stock_v1, no se reinterpretan como instrucciones. La evidencia
técnica utilizada sigue en evaluación determinística; excluir JSON técnico crudo del
resumen de catálogo no altera la evaluación ni oculta cobertura. Recursos/URLs son
metadatos, no destinos de fetch. Precio histórico no se convierte en oferta actual;
stale/unavailable/unknown no equivalen a cero ni presupuesto completo. Si catálogo
excede presupuesto de proyección se informa límite y se usa paginación explícita,
no respuesta parcial etiquetada como completa ni recorte silencioso del total.

## 3. Contexto de conversación: elección mínima sin migración

MessageCreate conserva content1..8000/client_request_id UUID y añade context opcional:
`{context_version:2,configuration_schema:1|2,pc_id:UUID,expected_pc_revision:int>=1,
objective:general|gaming|productivity|null,budget_ars:Decimal-string|null,
price_condition:cash|list,workload:blender-cpu|null}`. Claves cerradas; objetivo/workload
no conceden evidencia ni compatibilidad. Budget usa mismo validador Decimal ARS del
servicio de recomendaciones, sin float ni gastos excluidos ocultos. No snapshot,
owner_id,user_id,rol,path o URL arbitraria suministrada por modelo/cliente.

Servidor obtiene configuración propia por ID/revisión antes de generar contexto y
resuelve esquema real; cambio/mismatch rechaza sin reinterpretación. Cada operación
posterior verifica su revisión y propiedad de nuevo. Snapshot privado saneado se
entrega al grafo como DATOS delimitados/versionados, no SystemMessage con autoridad
ni sustituto de permisos. Datos recuperados y texto del usuario nunca son instrucciones
para ejecutar código ni para cambiar identidad. Herramientas siguen obligatorias para
veredictos; contexto guardado en historial no autoriza accesos futuros.

Elección mínima: context/snapshot es POR TURNO, no persistido en columnas nuevas ni
embebido como JSON autoritativo en content legacy. Persisten texto original, respuesta,
citas y estados con ownership actual. Tras recargar, usuario debe volver a seleccionar
PC/contexto; no se promete selección durable. Historial anterior sigue texto, nunca
se retroproyecta ni se intenta reconocer JSON pegado como contexto confiable.
Si se exige selección durable, requiere contrato/migración y ownership separados,
no escribir context JSON torre dentro de un modelo de seis piezas sin versionado.

## 4. Identidad, confirmaciones, persistencia y cotas37

MCP actual captura sesión/conversación desde entorno privado de hijo, elimina esas
variables y ejecuta auth.current + Repository.get de conversación por herramienta.
Se preserva esa revalidación; identidad NO proviene del modelo ni de un fake profile.
PC/plan deben pasar propiedad servidor además de conversación. Roles/credenciales
no figuran en schemas ni retornos; stdio no hereda key proveedor y no hay despacho
Python alternativo que eluda MCP/servicios. Errores sanitizados sin SQL/rutas/tokens.

Las siete herramientas actuales NO escriben PC/plan/share: no existe confirmación
de guardado que preservar dentro de MCP. Deben seguir de lectura. Consultar/simular/
preview no guarda; leer plan conserva quotes/snapshots sin recotizar. Propuesta de
extracción no se confirma desde chat. Escrituras explícitas se mantienen en flujos
web propietarios separados con servicios servidor; `confirmed:true` del LLM no es
confirmación humana verificable. Ningún link público se crea automáticamente.

Repository.begin mantiene bloqueo PG por conversación, client_request_id único y
409 duplicate_request sin segundo gasto/turno; reserva proveedor37 en misma transacción.
finish/interrupt_pending respetan propietario, mensaje pendiente y estados terminales;
no se reescriben respuestas anteriores. Borrado conserva guard de generación activa.
Contexto inválido debe rechazarse antes de reservar/generar un turno nuevo; ninguna
validación posterior puede dejar pending huérfano ni eludir cleanup existente.

Sin ampliaciones: grafo4 rondas/8 calls por ronda/recursion14; historial20 completados;
cola64, salida visible32000; proyección24000 bytes, entrada MCP2MB/nodos50000/depth24.
Servicio conserva asyncio.timeout90s; deadlines ASGI/proveedor37 más estrictos siguen
prevaleciendo. No asumir70s a partir de notas ni aumentar timeout por nuevos DTO.
Cleanup2s/persist3s, cancelación, TTL/cuotas PG/headers/caps37 se conservan. Sin logs
de tokens, contextos privados, resultados crudos, trazas en temporales ni reconfiguración.

Transporte interno mínimo propuesto sin cambiar rutas: Repository.begin conserva
su retorno `(message_id,history)` cuando include_history=True. history puede ser
TurnHistory (lista de filas role/content con atributo context_snapshot opcional,
versionado y saneado por servidor). AssistantService transmite ese objeto existente
al runner; run_turn conserva cuatro argumentos y trata context_snapshot como datos.
Historia legacy/lista normal equivale contexto ausente. No serializar dicho atributo
como nuevas filas ni inferirlo del contenido pegado. El cargador privado valida
propiedad/revisión tras comprobar conversación y antes de la reserva proveedor.

## 5. Gates focales posteriores a aceptación, no resultados actuales

- Inventario real MCP exactamente siete nombres; schemas cerrados, UUID/argumentos
  acotados, user_id/owner/rol/path/URL/disable_pending rechazados. Mismo control por
  web y MCP/servicio, sin dobles como prueba de autoridad real.
- PG TEST A/B: conversación y PC/plan propios/ajenos, sesión revocada, revisión
  obsoleta, turno duplicado/concurrente, cancelación/pending/cleanup/cuota37 intactos.
- Torre con varias líneas/unknown/absent/cantidades/UUID, tres estados; conocido fail
  conserva faltantes. Positivo sintético no certifica hardware real. IDs>50 en lookup
  y herramientas; catalog_search pagina total completo, no presupuesto de página1.
- Proyección2 completa, sin notas ni raw envelopes, fuentes y condiciones/fechas
  conservadas; overflow explícito, no truncar cobertura. False/unknown distinguibles.
- Plan histórico GET sin recálculo ni cambio de quotes; lectura torre pendiente §6.
  Conversaciones legacy se leen igual, selección de contexto no se persiste falsamente.
- Streaming/historial y proveedor real requieren evidencia propia Build, no imports,
  mocks ni los17 tests del resolver. El 502 previo APIConnectionError sin respuesta
  HTTP no demuestra JSON/cuota/éxito proveedor: no se reconfigura por este contrato.

## 6. Interfaz de planes transmitida durante implementación

Resumen transmitido: `/api/tower-plans` separado; guardado recalcula servidor con
acciones/etapas/snapshot, revisión PC/catálogo e idempotencia. Solo esto está disponible
para diseño: no se inventan clase/método/DTO ni se leen archivos activos de otro autor.
Interfaz exacta posterior recibida: TowerPlanService(TowerPlanRepository(engine)).get(
owner,plan_id,revision=None), salida TowerPlanRead.model_validate(raw).model_dump(json).
kind:tower_plan/schema_version2; snapshot contiene base_configuration,stages con
evaluated_configuration/evaluation y quotes/versiones congelados. Constructor/get
no requieren catálogo ni reloj; no recálculo/escritura. PC eliminado no autoriza
consultar un plan ajeno. No inventar recuperación de revisiones404.

Rama preparada: lectura por propietario de ambos formatos; colisión viva del mismo
UUID en legacy/torre propios rechaza409, no selecciona una proyección truncada. Solo
404 habilita buscar el otro formato, no errores de infraestructura. Proyección torre
allowlist de outer/snapshot/stages/versions elimina campos futuros no autorizados,
y notas en base, configuración de etapa y configuración dentro de su evaluación
(también contextos anidados permitidos). Stages/acciones/faltantes/cobertura/quotes
no se recortan; overflow explícito. get_plan legacy mantiene projection_version1.
Creación para fixture PG recibida: TowerPlanCreate + svc.save(owner,request) devuelve
(raw,replayed); helper estable test_tower38_plan_pg.plan_context/body. Se usa SOLO en
tests sintéticos propios, nunca como herramienta. Históricos de prueba son INSERTs
propios en headers/revisions, sin UPDATE de revisiones ni desactivar guardas.
Ninguna de estas interfaces autoriza save_plan ni shares. CU09 sigue separado.

Future ownership tras aceptación: assistant/tower_*.py y cambios necesarios en los
siete archivos inspeccionados, tests propios y handoff; sin tocar otros servicios,
provider/auth/main ni implementaciones activas. No código por este contrato.
