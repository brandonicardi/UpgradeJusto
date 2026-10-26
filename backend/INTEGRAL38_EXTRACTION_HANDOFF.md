# CU02 torre38 — contrato previo a implementación

Estado inicial: DTO propuesto para coordinación/frontend; código y checks aún no
verificados. Solo backend asignado, sin wiring main/BFF ni extractor legacy nuevo.

## API cerrada

### Resultado posterior de Build y revisiones

Tras corregir reutilización de una ocurrencia y aceptación del nombre base para
variante extendida:65 puros PASS0, lint/formato0. Dos nodos PG del delta aprobaron
junto a un test HTTP CU06 (3 PASS0);6 PG anteriores fueron otro gate, no sumarlos
como nueva corrida conjunta. Funcional y seguridad aceptaron backend local con esas
verificaciones. Router real registrado antes de CRUD, cap37 exacto conservado.
Frontend recibió revisión seguridad y tipos/lint/build0,21 unitarios; su primer
recorrido Groq real FALLÓ502/APIConnectionError sin statusHTTP, sin propuesta/PC
guardada. Diagnóstico acotado usó admisión compartida y no expuso cuerpos/credenciales.
No afirmar extracción viva aprobada ni atribuir el error a cuota/JSON/TLS sin prueba.
Sin cambio de proveedor, fallback simulado o relajación de confirmación por ese fallo.

POST `/api/towers/extract` `{text:string1..12000}`: sesión servidor/CSRF/Origin,
cap exacto65536 bytes y deadline de lectura37 existente. Una admisión compartida
ProviderBudget PG por extracción nueva, igual a asistente/extractor legacy. Sin
tools/SQL, archivos, navegación, autodetección ni decisión de compatibilidad.
Proveedor Groq/config/TLS actuales, timeout total30s sin retries ni dependencias.

Respuesta200:
`{proposal:TowerCreate,evidence:TowerCategoryEvidence[9],missing_fields:string[],
warnings:string[],catalog_revision:string,requires_confirmation:true}`.

`TowerCategoryEvidence={category,status:present|unknown|absent,
absence_excerpt:string|null,lines:TowerLineEvidence[]}`. Exactly nueve categorías
del contrato torre. `TowerLineEvidence={proposal_line_index:int|null,
component_id:string|null,declared_model:string|null,quantity:int|null,
excerpt:string,quantity_excerpt:string|null,candidate_ids:string[],
resolution:catalog|declared|needs_review}`.

proposal schema2/nombre servidor «Torre extraída», BIOS/notes null; líneas nuevas
line_id=null hasta guardado. Exactamente uno de component_id/declared_model en
líneas propuestas; modelos declarados son etiquetas literales, no atributos.
IDs/categorías resueltos contra TODO catálogo publicado fijado, no primeras50.
Un ID solo se selecciona con nombre exacto no ambiguo en fragmento literal; ofertas,
similitud o texto comercial no acreditan atributos ni compatibilidad.

Cantidad desconocida NO se convierte en1: evidencia conserva quantity=null,
resolution=needs_review, proposal_line_index=null. RAM/storage/fan requieren marcador
literal de cantidad en la misma observación. Si alguna línea de una categoría está
sin resolver, TODA esa categoría queda unknown/sin líneas propuestas, preservando
observaciones en evidence para edición. Evita guardar RAM parcialmente truncada o
afirmar un módulo por «16GB total». Single categories solo una unidad identificada.
Ausencia exige frase negativa literal por categoría, no omisión ni cero; unknown
es distinto de absent. Fragmentos devueltos se restringen a etiqueta de hardware y
marcador de cantidad, no al informe/notas/instrucciones completos del proveedor.

POST `/api/towers/extract/confirm`
`{confirmed:true,proposal:TowerCreate,catalog_revision:string}` →201 Tower.
False,1,"true", extras owner_id/user_id/evidencia/resultados rechazados422.
Propuesta editable: ninguna aprobación de compatibilidad implícita; confirmación
explícita usa TowerService.create/propietario servidor/UUID servidor y CAS catálogo
409, sin LLM ni gasto proveedor. No persistencia durante preview/error/cancelación.
No idempotency nonce nuevo: preview es stateless como legacy; cada POST nuevo
consume admisión compartida37, no se introduce caché/reintento silencioso.

## Wiring posterior por autor original

Router nuevo `upgradejusto.api.tower_extraction.router`, incluir UNA vez antes del
router CRUD `/api/towers/{pc_id}` para evitar captura de `extract` como UUID en rutas
del mismo método. Build/autor main coordinan whitelist/BFF: SOLO POST, query vacía,
fullmatch `/api/towers/extract(?:/confirm)?`, firma método+raw_path exactos. No main
ni proxy_ip modificados por este escritor. Cap exacto /api/towers/extract65536 se
añadirá en body_limits sin cambiar otros límites/deadlines37.

## Verificación pendiente

Build ejecuta puros/mock Groq primero, luego TEST-PG con actores sintéticos propios,
catálogo amplio vigente (sin reset14), cuota compartida37, ownership/CSRF, CAS409,
errores y cancelación liberando lease. Sin secretos/env privados, runners propios,
claim Groq vivo ni cierre CU02/38. Contrato definido antes de implementación; cambios
posteriores/resultado y comandos exactos se anexarán al finalizar incremento.

## READY — implementación aislada preparada, sin ejecución propia

Archivos NUEVOS:
- upgradejusto/extraction/tower_models.py
- upgradejusto/extraction/tower_provider.py
- upgradejusto/extraction/tower_service.py
- upgradejusto/api/tower_extraction.py
- tests/test_tower38_extraction.py
- tests/test_tower38_extraction_pg.py

Único existente modificado: api/body_limits.py, rama EXACTA
`/api/towers/extract ->65536`. Confirm conserva cap general262144; legacy65536,
auth8192 y deadline de lectura5s sin cambios. No modificaciones en motor, main,
proxy, auth, catálogo, retail, extractor legacy ni dependencias.

Implementación conserva contrato anterior. El proveedor solo recibe IDs/categoría/
nombres de TODO catálogo y schema cerrado; no atributos/ofertas, tools ni archivos.
JSON con claves duplicadas o más30000 caracteres es inválido. Timeout total30s,
TLS/modelo/client existentes, callbacks vacíos y tracing desactivado. Errores
502/504/429 sanitizados, cancelación no absorbida; servicio ProviderBudget compartido
controla admisión y liberación PG, sin reintentos automáticos ni bypass por nonce.

Selección requiere nombre completo literal/no ambiguo, límites de palabra y mismo
ID/categoría real. Modelo desconocido se conserva como etiqueta literal (sin inferir
especificaciones) o como needs_review; fragmentos arbitrarios sin etiqueta segura
se omiten de evidence y dejan categoría unknown. No se devuelven notas/instrucciones
del informe: solo etiqueta y marcador de cantidad. El detector lexical adicional
rechaza instrucciones obvias, pero NO se presenta como clasificación semántica
infalible: texto sigue siendo dato no ejecutable, nunca autorización/herramienta.
Cantidad RAM/discos/fans exige marcador adyacente al modelo en fragmento literal;
no acepta sufijo decimal/negativo ni duplica observaciones idénticas para inflar
unidades. Cantidad desconocida permanece null y excluye toda la categoría de las
líneas propuestas; la evidencia queda para edición explícita. BIOS/notes siempre
null en preview. Confirm sí permite la edición explícita de TowerCreate por usuario.

Confirmación no exige conservar exactamente el preview: es editable y stateless
como legacy. Exige confirmed booleano true, revisión catálogo vigente y UUID de línea
null; TowerService.create valida selección completa y CAS del active pointer en la
transacción de creación. Dueño y UUID guardados exclusivamente servidor. Copiar una
propuesta no transfiere propiedad de una PC: cada confirm crea una PC nueva propia,
no cambia PCs existentes ni publica planes. No se implementó idempotencia persistente
de confirmación ni caché de propuestas; repetir confirm explícito puede crear otra PC.

## Wiring y gates para Build/autor main (pendientes)

`from upgradejusto.api.tower_extraction import router as tower_extraction_router`
`app.include_router(tower_extraction_router)` una vez; preferir antes de tower CRUD.
Whitelist/BFF: POST exclusivamente, query vacía, fullmatch
`/api/towers/extract(?:/confirm)?`, firma método/raw_path existente. No se editó main.

Desde backend, separados y registrando cada exit code:
1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction.py`
2. `.venv/Scripts/ruff.exe check upgradejusto/extraction/tower_models.py upgradejusto/extraction/tower_provider.py upgradejusto/extraction/tower_service.py upgradejusto/api/tower_extraction.py upgradejusto/api/body_limits.py tests/test_tower38_extraction.py tests/test_tower38_extraction_pg.py`
3. `.venv/Scripts/ruff.exe format --check upgradejusto/extraction/tower_models.py upgradejusto/extraction/tower_provider.py upgradejusto/extraction/tower_service.py upgradejusto/api/tower_extraction.py upgradejusto/api/body_limits.py tests/test_tower38_extraction.py tests/test_tower38_extraction_pg.py`

Tras wiring, wrapper TEST existente/cluster autorizado, comando interno:
4. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction_pg.py`

Puromock: tres cantidades, múltiples discos/fans, RAM total sin módulos, declarado/
ausente/unknown, selección beyond50, alias por substring rechazado, mal JSON/clave
duplicada/límites/cantidades impropias/inyección, confirm estricto, errores proveedor
y cancelación. Son pruebas sintéticas de algoritmo, NO evidencia de hardware/Groq.

PG: actores/sesiones A/B reales, snapshot amplio vigente sin reset14 ni publicación,
preview sin PC nueva, confirm crea UUID/owner propios y aísla lecturas, auth/CSRF,
catálogo409/CAS409, cap413, cuota/concurrencia compartida37 (proveedor controlado),
error/cancel libera lease real y fallo PG503 sin nuevas PCs. Reutiliza budget_state
TEST37 con exclusión/restore existentes; ejecutar sin otro runner/proveedor activo.

No comandos ejecutados aquí: sin exit codes nuevos, servidor/API activos ni cierre
CU02/38 declarados. Los69 puros/5 API del incremento evaluar/simular anterior NO
verifican extracción. Luego de gates y revisión independiente, Build puede justificar
una llamada Groq real focal por la ruta nueva con texto/cuenta sintéticos propios;
no ejecutar suite viva rutinaria ni cambiar proveedor/config por esta entrega.

## Delta P1 funcional — READY para recheck, no aceptación anticipada

Build informó41 puros y6 PG PASS/exit0, lint8/format8 exit0 ANTES de esta revisión.
Revisora confirmó dos P1; esos resultados anteriores NO acreditan el delta nuevo.

1. La firma de excerpt crudo no conservaba unidades: dos quotes con prefijo o
puntuación distintos podían reutilizar el mismo «2x modelo» original y sumar4.
Ahora las ocurrencias de etiqueta/cantidad se calculan en el texto ORIGINAL y deben
estar contenidas en ventanas literales de excerpt y quantity_excerpt. Asignación
bipartita exclusiva por spans originales, con control de solapamiento y propagación
de conflicto a todo su componente de evidencia. Una ocurrencia no puede respaldar
dos grupos aunque el proveedor cambie prefijos/puntuación. Dos ocurrencias reales
idénticas sí pueden asignarse a dos grupos. Conflicto => needs_review, quantity=null,
component_id=null, sin líneas propuestas de esa categoría; sin inflar totales.
Offsets son internos calculados servidor, no campos autorizantes del proveedor.

2. Un borde de palabra no prueba variante exacta («modelo PLUS», «modelo+», «/OC»).
Ahora selección exige frase completa en el ORIGINAL, también si el LLM recorta la
quote al nombre base. Gramática deliberadamente conservadora: registros separados
por newline o punto y coma; framing opcional de viñeta, «Tengo», «Mi PC tiene» y
etiqueta de categoría con dos puntos; solo whitespace/punto final tras nombre.
No whitelist de variantes/sufijos, aliases ni inferencia de atributos. Extensión o
prosa no reconocida => needs_review sin ID/cantidad seleccionados. Comas/slashes no
se asumen separadores seguros. Nombres completos catalogados, incluida una variante
catalogada cuyo nombre contiene al modelo base, conservan identidad exacta propia.

Límite explícito: esta gramática no interpreta universalmente toda prosa ni prueba
hardware físico; ante framing no probado deja revisión manual. Los fragmentos de
salida siguen acotados a etiqueta y marcador, no se concatena el reporte/instrucciones
o información sensible vecina. DTO público y confirmación/ownership/CAS/cuota37
no cambian. No se tocaron main, proveedor, body_limits, modelos, catálogo ni otras áreas.

Archivos delta:
- upgradejusto/extraction/tower_service.py
- tests/test_tower38_extraction.py
- tests/test_tower38_extraction_pg.py
- INTEGRAL38_EXTRACTION_HANDOFF.md

Regresiones sintéticas: prefijos/puntuación diferentes de una sola mención; dos
ocurrencias idénticas independientes; sufijos PLUS/+/slash/OC/puntuación con quote
completa y recortada; prefijo de variante; nombre exacto y variante completa legítima;
contexto sensible no reflejado. Se ajustó el test de duplicado crudo para comprobar
unknown/null sin propuesta, no una excepción obligatoria: es el comportamiento
conservador requerido, no aceptación del doble conteo.

Build, desde backend y comandos separados:
1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction.py`
2. `.venv/Scripts/ruff.exe check upgradejusto/extraction/tower_service.py tests/test_tower38_extraction.py tests/test_tower38_extraction_pg.py`
3. `.venv/Scripts/ruff.exe format --check upgradejusto/extraction/tower_service.py tests/test_tower38_extraction.py tests/test_tower38_extraction_pg.py`

Servicio observable cambió, por eso gate focal REAL TEST-PG con wrapper existente:
4. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction_pg.py::test_preview_full_catalog_then_explicit_owner_confirmation tests/test_tower38_extraction_pg.py::test_variant_and_reused_quantity_remain_unpersisted_review_data`

Segundo caso usa catálogo amplio real TEST y proveedor controlado; comprueba unknown,
cantidades null, ninguna PC nueva y lease liberado. No ejecutado aquí, sin Groq vivo
ni claims de hardware. Revisión independiente del DELTA pendiente tras checks; no
activar frontend de extracción por los resultados anteriores.
