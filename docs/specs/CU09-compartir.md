# CU09 — compartir y revocar, Sprint32 H

> Vigencia documental 27/10/2026: esta spec reúne requisitos y contratos por versión. Una frase fechada como «antes de implementar», «pendiente» o un resultado Sprint32/38 describe ese incremento; no acredita ni niega el estado de la entrega actual. Estado y aceptación únicos: [CONTINUAR](../CONTINUAR.md) y [matriz](../ENTREGA38_VISUAL.md). Desarrollo detenido; esta consolidación no autoriza ejecutar órdenes históricas.

## Delta autorizado38 — antes de implementar

Compartir torre conserva snapshot versionado de quotes/scope/evidencia/advertencias,
sin notas privadas ni recálculo GET. Revocación y control de propiedad iguales; enlaces
históricos legibles sin reescribirlos. Contrato
[§7](CU03-pcs.md#origen-backend-integral38-contract-md). Aceptación: proyección pública de líneas/
declaraciones filtrada, sin datos privados, revocación A/B, costes/fuentes con fecha
y respuesta legacy preservada. Autorización no equivale a prueba ejecutada38.

### Separación del incremento privado torre38

[Plan38 v1](CU07-planes.md#origen-backend-integral38-plan-contract-md) mantiene CU09 como incremento
posterior a planes privados: no activar stubs ni copiar el snapshot privado entero.
Proyección pública allowlist de revisión fija, título público explícito, sin notas,
emails, IDs privados de PC/líneas/conversaciones ni prompt original. Tokens nuevos
hasheados y revocables; GET sin recotizar ni modificar bytes históricos. La migración
de planes privados38_d_001 no incluye shares nuevos. Contrato específico de CU09,
migración/proyección/privacidad y recorridos se aceptarán y probarán aparte antes
de activarlos; los enlaces legacy permanecen intactos.

### Contrato torre v1 aceptado antes de código

[Share38](CU09-compartir.md#origen-backend-integral38-share-contract-md), incluido apéndice de registros
cerrados, queda aceptado para implementar backend/proyección privada de creación y
lectura pública congelada. No acredita activación de rutas públicas ni logging.
Títulos limitados a los dos valores públicos controlados;100 emisiones totales/plan
y60 intentos/IP/min (válidos/inválidos antes de lookup), contador PG operacional
separado de auth/proveedor. Token256bits revelado una vez, solo hash persistido;
pérdida de respuesta exige listar/revocar/reemitir, no replay de plaintext inventado.
Revocación compara revisión capturada; baja lógica deshabilita lecturas nuevas pero
conserva historial privado y administración de enlaces. GET no reevalúa/recotiza.
Fotos obligatoriamente HTTPS/raster/variante/procedencia histórica; ninguna clase
documental HTTP habilita HTTP para fotos. Fuentes/valores no registrados se reservan
con contador y presentación no verde, sin borrar fallos/faltantes del motor.
Nombres/textos privados y claves futuras se omiten por construcción allowlist; datos
comerciales se reconstruyen de publicación fijada, nunca del texto libre del plan.
Logging/redacción/referrer/no-store de composición y gate montado real son requisitos
ANTES de activar. Sin octava herramienta MCP ni cambios a legacy o a snapshots CU07.
Implementación debe pasar revisión propia; contrato no es detector universal de PII
ni certificación física. No aplicar migración38_e_001 fuera de TEST por esta decisión.

### Consumidor web torre — contrato aceptado, ejecución contra TEST primero

DTO realmente emitido en [Share DTO38](CU09-compartir.md#origen-backend-integral38-share-dto-md);
contrato consumidor/guías Next locales en [Diseño38](../ai-log/2026-10-27-entregas-tecnicas-historicas.md#origen-frontend-integral38-design-md).
Implementar primero contra factory TEST; no montar routers en main productivo por
esta decisión. Rutas distintas de legacy: WEB `/shared-tower-plans/{token}`, gestión
propia `/tower-plans/{id}/shares`, BFF público `/api/shared-tower-plans/{token}` y
privados `/api/tower-plans/{id}/shares`/`/{shareId}`.
Títulos exactos: `Plan de mejora de torre` o `Plan de mejora por etapas`.
CREATE201 incluye projection_version/revoked_at/token; lista solo items con
effective_state, sin bearer; DELETE204 usa revisión capturada. GET público entrega
raíz shared_tower_plan directamente, no envelope snapshot. Referencias pN/lN/qN/rN
locales no habilitan lookup de catálogo o PC privada.
Confirmación reconoce revisión/disclosure de publicación; no preview previo ficticio.
Enlace devuelto una vez, memoria/copia explícita, sin autoemisión/prefetch/storage ni
retry automático de CREATE incierto. Público sin cookies/Authorization/CSRF, con
firma/socket/IP servidor y presupuesto backend para inválidos acotados1..128 ASCII
base64url sin query. No-store/no-referrer/nosniff/noindex en éxito y error: verificar
BFF y WEB reales Next dev/producción con logs acotados sin raw tokens antes de activar.
No extender garantía a APM/locals/binds ni usar cierre backend como prueba Next.
Render público congelado: costes null/subtotal, veredictos/cobertura/evidencia reservada
conservados, sin repricing/TTL nuevo/LLM/compatibilidad decidida por cliente.

## Estado vigente24/10 — FUNCIONAL LOCAL VERIFICADO

Snapshot público/revocación PG/API/web probados: proofHTTPS/reinicioREAL0,
revocaciónpersistente/PGdownpublic503nocache/planDELETEpublic404 y cierreBuild
323/0skips/Ruff0/front68/tiposlintbuild0/E2E9. Revisión incremental favorable.
No compartir aprobación de compatibilidad inexistente, no certificación despliegue.
[Evidencia vigente](../SPRINT32.md), [bitácora](../ai-log/2026-10-21-sprint32.md).
Solo estado/evidencia, sin modificar contratos ni aceptación.

## Preparación histórica (pendiente de implementación era estado previo)

Contrato previo a código/frontend24/10, implementación pendiente. G persistente
es dependencia técnica; no exige CU05 global, plan ready ni Groq. Publicar borrador
unknown/blocked conserva advertencias y NUNCA lo convierte en plan compatible.

## Publicación mínima

Dueño publica SNAPSHOT inmutable de revisión concreta del plan con confirmación
UI del contenido que será público. Ediciones posteriores no cambian publicación;
generar enlace nuevo exige publicación explícita de nueva revisión. El enlace es
capacidad bearer de solo lectura, no concede sesión/propiedad ni acceso a PC original.

Token aleatorio criptográfico32bytes, base64url sin padding,43caracteres; guardar
SOLO digest SHA256, id de enlace UUID, plan/owner/revisión snapshot, created_at y
revoked_at. Valor bruto aparece solo en respuesta201 y URL compartida, nunca logs,
trazas, analítica, listados o localStorage. No derivarlo de UUID/email ni aceptarlo
elegido por cliente. Sin expiración implícita prometida; revocación permanente.

Snapshot público por allowlist: título explícito de publicación y objetivo, presupuesto/
moneda/costes con fuentes históricas, etapas normalizadas/componentes públicos,
evaluaciones/reglas/cobertura/faltantes/beneficio/advertencias y versiones. NO nombre
de cuenta, email, owner_id, pc_id/plan_id privados, notas de PC, conversación ni
contexto libre. Solo contexto técnico requerido por evaluación (p.ej.BIOS) con aviso
en confirmación. Construir proyección pública también dentro de resultados anidados:
no serializar modelo privado completo ni citar notas como evidencia. Citas de
catálogo únicamente públicas; nunca URLs privadas/credenciales. Sin fetch de URLtoken.

## HTTP para H

- POST `/api/plans/{plan_id}/shares` JSON `{expected_plan_revision,title}`:
  title strip1..100 sinNUL;201 `{id,plan_revision,title,created_at,path}` donde path
  `/shared/{token}` relativo al origen configurado. No host arbitrario de request.
- GET `/api/plans/{plan_id}/shares`:200 `{items}` solo dueño; metadatos id/revisión/
  título/created_at/revoked_at, SIN token/path recuperable. Orden id estable.
- DELETE `/api/plans/{plan_id}/shares/{share_id}`:204 revoca en PG atómicamente;
  idempotente si ya revocado por mismo dueño,404 ajeno/inexistente/plan equivocado.
- GET `/api/shared-plans/{token}`:200 snapshot público + published_at/plan_revision;
  sin sesión ni CSRF. Token inválido, inexistente, revocado o plan eliminado:
 404 idéntico `{detail:"Shared plan not found"}`. Sin distinguir estados/existencia.
  No otros métodos;405 no muta. Token válido no sirve en rutas privadas.

Privados requieren sesión/propiedad antes de409 revisión;401/403 Origin-CSRF/422/503
seguros y no-store como G; GET privado sin query. Extras rechazados. Público no-store
también en errores y sin caché estática/ISR/serviceworker/precarga de contenido; cada
lectura consulta PG para revocación (no caché de token). PG indisponible503 sin servir
snapshot cacheado. Revocación garantiza requests iniciados después del commit denegados;
no borra copias ya vistas ni cancela respuestas iniciadas antes. Advertir al compartir.
Gateway solo rutas cerradas correspondientes; mantener auth de rutas privadas intacta.

Página `/shared/{token}` pública de solo lectura, sin botones mutantes ni carga de
PC privada, sin recursos terceros/analítica; Referrer-Policy:no-referrer, noindex,
no-store y título genérico sin token. No registrar URLtoken en accesos/errores.
Build verifica lanzadores/logging raíz sin especialistas editarlos. No abrir permisos.

## Aceptación

PG/API: A publica su plan, B no publica/lista/revoca enlaces de A; token no autoriza
CRUD privado; proyección sin PII/contexto libre en niveles anidados; revisión stale409;
snapshot estable tras editar; revocación/deleteplan→404, reinicio conserva revocación,
token aleatorio/no bruto en DB y errores503 seguros. Sin endpoint admin/SQL del LLM.
Browser real anónimo ve snapshot y advertencias, no acciones; A revoca y siguiente
GET/refresco anónimo404 sin caché. Plan unknown/blocked sigue tal; no greenwashing.
Checks comunes secuenciales + PGpost0 y revisión Astra crítica de capacidad bearer,
aislamiento, redacción y caché; hallazgo bloqueante impide cerrar H. Sin mocks finales.


<a id="origen-backend-integral38-share-contract-md"></a>

## Contrato de referencia consolidado: INTEGRAL38_SHARE_CONTRACT.md

Los detalles técnicos siguientes se conservan desde el contrato de esa etapa. Sus frases de preparación, autorización, implementación pendiente y órdenes de trabajo son HISTÓRICAS, no el estado vigente ni autorización de ejecución. Prevalecen los deltas posteriores de esta spec para su alcance y CONTINUAR/matriz para los resultados comprobados. No se certificó de nuevo el código al consolidar.

<details>
<summary>Detalle contractual y contexto original</summary>

# CU09 torre — contrato propuesto v1, previo a implementación

## Aceptación posterior y entrada pública adicional autorizada

Build confirmó lectura completa, aceptación de base/apéndice A y delta CU09 aplicado
ANTES del código. Autorizado implementar backend CU09 v1 en archivos nuevos propios;
NO montar router público hasta gate REAL de logging/redacción. Main/proxy/scripts/
frontend/proveedores y legacy no autorizados en este bloque. Texto de propuesta
inferior conserva diseño/historia; no acredita implementación ni pruebas.

Entrada ADICIONAL aprobada de manufacturer_manual, `tower-share-url-policy-1`:
source_id `manufacturer38-kingston-nv3-500g-pdf`;
URL EXACTA `https://www.kingston.com/datasheets/SNV3S_us.pdf`;
consulted_on `2026-10-26`;
locator EXACTO `PDF p1 Specifications M.2 2280: Form factor and Interface; p2 Part Numbers M.2 2280: SNV3S/500G; MKD-06162025`.
Binding autorizado componente cg-20214/MPN SNV3S/500G en publicación TEST
revision-3014a27f8dee4150b16d83d756a2a3cb, como evidencia identificada NO whitelist
de elegibilidad por ID. Solo interface M2-NVMe/form2280; no potencia ni certificación
de foto. SHA comunicado abreviado no se completa/inventa. Cualquier reutilización
exige unión exacta de fuente/identidad/variante publicada, no GTIN como MPN. No fetch.

**CONTRACT READY para revisión; PROPUESTA NO ACEPTADA.** Única escritura autorizada
de este incremento: este documento. No código, migración, main/proxy, UI, tools MCP,
runner, instalación, commit ni cambio de proveedor/entorno. Implementar solo después
de aceptación de Build/coordinación y nuevo delta CU09 en su spec por su dueño.

### Decisiones acotadas aceptadas posteriormente por Build

Aceptados PARA EL CONTRATO: dos títulos públicos controlados,100 emisiones TOTALES
por plan y60 intentos de lectura pública/IP/min, válidos e inválidos ANTES de lookup,
con contador PG separado de auth/LLM. No implementación ni activación autorizada.
Resto del contrato y apéndice de registros/URLs requieren lectura/aceptación final
y delta CU09 por Build. Revisión documental identificó P2 de fotos HTTP; corregido
abajo: imagen SIEMPRE HTTPS, clase distinta de enlace documental/comercial.

## 1. Base consultada y alcance

Leídos en este turno: legacy shares/models, projection, repository, service y
api/shares; plans/tower_models, tower_tables, lectura pertinente de tower_repository,
tower_service y snapshot de tower_calculation. Directorio de migraciones y38_d_001:
último archivo38_d_001, parent38_c_001. Esto verifica archivos, NO head de una BD.
Lectura puntual de INTEGRAL38_PLAN_CONTRACT §CU09 fue denegada; no se reintentó ni se
buscó otra copia. Build debe cotejar esta propuesta con su reserva CU09 ya aceptada.

Nuevo compartir de SOLO LECTURA para revisión fija de plan torre schema2; no reducir
a seis categorías ni usar/modificar plan_shares, proyección o URLs legacy. CU07 y sus
historiales/bytes permanecen intactos. No modificar/recalcular PC, plan, motor,
catálogo, quotes, reglas ni beneficio para publicar. T10 desconocido sigue desconocido.

Arquitectura router→servicio→repositorio; proyector puro determinista separado de
HTTP/PG/LLM. El repositorio resuelve permisos, revisión y procedencia publicada;
el proyector recibe únicamente ese contexto servidor. Modelo/cliente no autorizan
owner_id/user_id, selección SQL, evidencia técnica, costes, estado o token.

## 2. API propuesta, capacidades y permisos

UUIDs privados canónicos lowercase. Query vacía en TODAS estas rutas.

| Ruta | Semántica |
| --- | --- |
| POST `/api/tower-plans/{plan_id}/shares` | Crear201 y revelar capacidad una vez |
| GET `/api/tower-plans/{plan_id}/shares` | Metadatos privados, sin token ni URL bearer |
| DELETE `/api/tower-plans/{plan_id}/shares/{share_id}` | Revocación204 idempotente |
| GET `/api/shared-tower-plans/{token}` | Documento público200 estrictamente readonly |

Crear, cuerpo cerrado:
`{expected_plan_revision:int>=1,title,public_projection_confirmed:true}`.
La confirmación es boolean true explícito, no1/texto/nota. title inicialmente será
UNO de dos títulos públicos controlados y acotados: «Plan de mejora de torre» o
«Plan de mejora por etapas». Nunca default al nombre privado de PC/plan/etapa.
No título libre en v1: sanitizar HTML o regex no demuestra ausencia de datos
personales. Títulos personalizados exigirán decisión/consentimiento específicos.

expected_plan_revision es CAS contra revisión ACTUAL del plan al crear; publicar
una vista histórica antigua no se selecciona implícitamente. Si cambió→409, sin
publicar otra revisión. El enlace ya emitido permanece fijado aunque luego se
recalcule el plan. Publicar revisiones antiguas por selector adicional queda fuera
de esta v1; no hay campo cliente de catálogo/snapshot ni recálculo al compartir.

Respuesta privada de crear:
`{id:UUID,plan_revision:int,title,created_at:ISO,token:string}`.
token es el único campo bearer, exclusivamente en esa respuesta tras commit.
Consumidor construye la ruta pública canónica; servidor no devuelve el token en
listas, historial, errores, trazas o consultas posteriores. Lista:
`{items:[{id,plan_revision,title,created_at,revoked_at,effective_state}]}`;
effective_state=active|revoked|disabled_plan_deleted. No snapshot privado en lista.
Lista acotada propuesta100 por plan; al alcanzar100 emisiones totales por plan,
crear409 sin reutilizar/revelar capacidades. Límite aceptado por Build para contrato;
no altera cardinalidades ni deadlines de CU07.

Revocar, cuerpo cerrado `{expected_plan_revision:int>=1}`: compara contra revisión
CAPTURADA del share, no contra latest del plan. Así un recálculo no impide revocar
un enlace antiguo. Comprobar propietario fresco del plan/share antes409. Repetición
con misma precondición devuelve204 conservando primer revoked_at; ajeno404.
Lista/revocación por propietario siguen disponibles tras baja lógica del plan;
crear sobre plan dado de baja404. No reutilizar owned() que excluye deleted_at para
esas operaciones de administración de enlaces, ni modificar ese helper CU07.

Privadas: sesión/identidad servidor fresca, propiedad PG y controles37 Origin/CSRF
en mutaciones; IP/HMAC de transporte existentes, nunca identidad de modelo.
Pública: sin login ni enumeración, solo capacidad. No endpoint público por UUID,
listado público, buscador ni ruta para recuperar token. Métodos distintos→no ruta.
Se mantienen límites ingress262144/5s, SQL3s/locks1s y generación cooperativa5s;
no proveedor/LLM ni incremento de cuotas/caps existentes.

## 3. Token y tratamiento fuera del cuerpo público

Generación servidor `token_urlsafe(32)`:256bits,43 caracteres `[A-Za-z0-9_-]`.
PG persiste únicamente SHA256 ASCII hex64 único; no bearer cifrado recuperable ni
token elegido por cliente/modelo. Sin expiración automática de capacidad en v1:
vigente hasta revocación o indisponibilidad del plan. Vencimiento de una quote NO
expira ni cambia el enlace ni presenta esa quote como precio actual.

No prometer replay idempotente de plaintext con almacenamiento hash-only. Crear
repetido es otra emisión dentro del límite; UI debe explicarlo y evitar doble envío.
Si respuesta se pierde después del commit, el token no es recuperable: listar
metadatos/revocar emisión y crear otra. No reactivar ni reciclar un token revocado.
Colisión de digest revierte operación; sin bucle ilimitado ni token determinista.

**Gate obligatorio de logging antes de activar:** API, Uvicorn, proxy/BFF, servidor
web, errores/APM y métricas no pueden registrar raw URL/path/query, respuesta de
crear, token o digest. Usar plantillas de ruta/estado y metadatos no sensibles;
desactivar o redactar access logs crudos también en desarrollo. No reescribir
raw_path antes de validar HMAC37 para intentar esconderlo del logger. La solución
de lanzamiento/logging requiere coordinación Build, NO configuración ejecutada
por este documento. No basta que el servicio evite print().

UI pública sin analítica de URL/token, sin almacenamiento persistente del bearer,
sin scripts terceros innecesarios. Referrer-Policy:no-referrer en documento público
y subrecursos/imágenes; X-Robots-Tag:noindex,nofollow y Cache-Control:no-store.
Enlace en navegador puede ser copiado por quien lo recibe; revocar no borra copias
ya vistas, capturas ni respuestas que ya comenzaron. No prometer revocación retroactiva.

## 4. Proyección pública: construir desde allowlists, nunca copiar snapshot

Documento v2:
`{kind:"shared_tower_plan",schema_version:2,title,plan_revision,published_at,
generated_at,objective,workload,budget_ars,currency:"ARS",price_condition,
versions,components,base_configuration,stages,cost,benefit,status,projection,warnings}`.
No id privado de share/plan/PC/owner/conversación, client_request_id, UUID de línea,
digest/token, emails, prompts ni input original. Versiones de catálogo/reglas/scope
son identificadores técnicos públicos clasificados, no IDs de entidades privadas.

components usa referencias LOCALES al documento y posiciones, no claves privadas.
Nueve categorías y todos los grupos/cantidades permanecen; acciones conservan
semántica completa mediante referencias locales. Si no se puede representar una
acción/configuración sin truncar, rechazar publicación422, no omitir piezas.
Nombres comerciales SOLO reconstruidos desde componente de publicación pública
fijada y su identidad/procedencia curada o retailer validada. Declarados, nombres
privados de PC/plan/etapa y texto usuario se sustituyen por categorías/etiquetas
neutras controladas («CPU no identificada», «Etapa1»). No nombres de declarados por
parecer hardware ni regex que pretenda detectar PII. Alt de imagen también deriva
de nombre comercial público o etiqueta neutra, jamás de texto privado.

Excluir íntegramente, entre otros, los TRES caminos notes:
- base_configuration.context.notes;
- stages[*].evaluated_configuration.context.notes;
- stages[*].evaluation.evaluated_configuration.context.notes.

No estrategia «copiar y quitar notes»: cada objeto/array se reconstruye por campos
permitidos, incluidos facts, conditions, warnings, reasons, source_refs, labels,
benefit, cost y dependencies. Claves futuras/desconocidas se omiten por defecto.
Ni nombres de campo aparentemente técnicos ni regex de rutas prueban deprivatización.
Etapas usan nombre por posición; labels/reasons/warnings/excludes se reconstruyen
desde registro CONTROLADO y versionado de familia/estado/scope/dependencia. Ningún
reason/label libre del snapshot pasa directamente aunque lo haya escrito el motor.

Facts: clave técnica registrada + tipo/unidad/enum cerrados. Strings de modelo/
BIOS/recursos solo si se reconstruyen de fuente pública fijada y vinculación exacta;
no copiar valores declarados ni UUID/identificador de recursos privados. BIOS libre
no vinculable se omite con aviso neutro, no se publica como versión curada. Material
available_confirmed expresa declaración explícita capturada, no identidad ni prueba
de fabricante; included conserva condición de paquete nuevo documentado y no prueba
sobrantes. Mantener texto condicional de stock-cooler desconocido sin inventar instalación.

Conservar veredicto estructurado del MOTOR, todas las familias T01–T12, estados,
coverage completo, scope/policy/inventory/rules, costes Decimal/null, beneficios y
faltantes. Redactar texto privado NO elimina fallo ni pendiente: campos sensibles
se representan con código técnico neutro/count de detalle reservado, sin su string.
Inventario/versiones no soportados o imposibilidad de representar cobertura→422,
no reducir inventario ni dejar compatible parcial.

projection informa versión/evidence_complete/contadores de detalles retenidos.
No redecidir compatibilidad técnica en el proyector: verdict conserva el original.
La presentación pública NO puede mostrar verde si la evidencia pública necesaria
se reservó: status público como máximo requires_verification; blocked/fallo conocido
siempre domina y conserva pendientes. Ready significa solo alcance declarado, no
permiso de aplicación ni certificación térmica/física. Unknown T10 nunca se convierte
en compatible por sanitizar o compartir. Frontend debe respetar ambos indicadores.

## 5. Autoridad de fuentes, fotos y cotización histórica

Al publicar, cargar UNA revisión privada autorizada y verificar su versions.catalog
contra publicación PG histórica. Todas las etapas deben ser coherentes con esa
publicación y versiones soportadas. Resolver catálogo completo por IDs servidor,
no primeras50, sin fuzzy MPN, precio heredado ni foto como evidencia técnica.
Fuente pública de autoridad es publicación CU04/retail curada, NO strings/URLs
que aparezcan en el snapshot privado ni cuerpo cliente. Registros seleccionados
deben tener vinculación exacta componente/variante/fuente y clasificación comercial.
Reconstituir citas/locators/fechas desde filas públicas verificadas; no copiar un
locator privado solo porque su URL coincida con una URL permitida.

Enlaces documentales/comerciales: HTTP(S) SOLO si su clase/entrada exacta del
apéndice lo admite; sin credenciales/fragmentos/IP privada/localhost; hosts,
rutas y parámetros comerciales permitidos por política versionada explícita.
No usuario/modelo elige URLs; no regex universal «https es seguro», fetch, DNS,
proxy descargador ni scraper en publicar/GET. Query con tokens/datos personales
no se permite por coincidir host. Nombre/URL sin procedencia pública clasificable
se omite/neutro y se informa cobertura pública incompleta, nunca se adivina.

Fotos EXCLUSIVAMENTE HTTPS, nunca HTTP aunque un enlace comercial/documental
admita HTTP. Sin desactivar TLS de navegador/servidor ni seguir redirects nuevos.
Solo image_evidence verified/variante exacta/URL allowlisted y derechos/
procedencia de la MISMA publicación histórica. Congelar metadatos permitidos en el
share, sin consultar variante actual al GET. No afirmar inmutabilidad de bytes del
servidor externo ni derechos de redistribución por licencia dataset. Si no acredita
uso o fuente, fallback neutro sin imagen; tampoco inferir atributos por foto.

Quotes y líneas de coste se validan contra registros históricos RAW de ofertas
de publicación/variante/condición/importe/observed_at/expires_at seleccionados en
el plan, no contra la frescura que un agregador calcule HOY. Imposible vincular una
quote usada→409 antes de crear; no inventar importe, borrar precio conocido ni
cambiar subtotal a0 para ocultarlo. Coste null/unknown permanece null; presupuesto
insuficiente conocido y faltantes se conservan. No envío/financiación/mano de obra.
Beneficio solo referencia curada apropiada a workload/objetivo, no VRAM/núcleos/FPS.

Public payload no expone status:"fresh" como disponibilidad actual: usa campos
históricos explícitos quoted_at/expires_at/availability_at_quote y texto CONTROLADO
«Cotización histórica, sin garantía de precio/stock actual». GET devuelve exactamente
el documento congelado, sin catálogo/reprice, reloj de expiry ni reconstrucción.
UI puede indicar vencimiento desde la fecha capturada sin alterar quote/JSON ni
convertir desconocido en precio vigente. Recalcular plan no reescribe shares previos.

## 6. Persistencia, operación atómica y bajas

Propuesta migración ADITIVA `38_e_001`, parent38_d_001 según archivos actuales;
reconfirmar head real al aceptar/implementar, no crear rama ni editar historia.
Nueva `tower_plan_shares` independiente de legacy:
id UUID PK; plan_id UUID + plan_revision INTEGER FK compuesta a historial CU07;
token_digest CHAR64 UNIQUE/check hex; title enum cerrado; projection_version;
snapshot JSONB público v2; created_at/revoked_at timestamptz. Propietario se resuelve
por join a tower_plans.owner_id, no owner duplicado del cliente. Índice privado por
plan_id/created_at; sin índice de búsqueda pública ni almacenamiento de token.

Crear: transacción, lock de plan, propietario/activo antes409, CAS current_revision,
historial/fuentes fijadas y proyección; documento público serializado UTF8 COMPLETO
(incluidos published_at/title/versions) <=1MiB antes de INSERT. Supera límite→422 y
rollback SIN row/token entregado. No truncar etapas, coverage, fails ni faltantes.
PG UTC/tiempo de publicación capturado; deadline cooperativo5s/SQL3s/locks1s iguales.
Pérdida de respuesta después del commit no revierte emisión ya persistida.

Revoke: owner join y precondición de revisión capturada, update revoked_at solo si
NULL, sin cambiar snapshot. Concurrente publicación/baja/revocación requiere locks
compatibles plan→share. GET público consulta PG en cada petición: digest coincide,
revoked_at NULL y header.deleted_at NULL. No depende de PC viva ni revisión latest.
PC eliminada deja snapshot/enlace intactos. Plan soft-deleted deshabilita todos sus
enlaces por join inmediatamente para lecturas nuevas, sin afirmar borrado privado
ni modificar historial; revoked_at puede seguir null y metadata distingue el caso.
Hard-delete autorizado de plan/historial elimina dependientes por FK; no API nueva
de purga. Undelete no existe; futura restauración no debe reactivar tokens sin política.

Downgrade online solo sin shares/counters; con filas rehúsa pérdida de datos,
incluidos shares revocados. No downgrade ciego offline ni cambios/backfill a legacy,
catálogo691/NV3 o snapshots CU07. Prueba de esquema anterior sintético TEST, nunca
DEV/SQLite/memoria como acreditación de PG. Ninguna migración creada/aplicada ahora.

## 7. Errores, cache y presupuesto público propuesto

Con ingress válido, token malformado, desconocido, revocado o plan dado de baja:
MISMO404 `{detail:"Shared tower plan not found"}`, sin IDs, auth redirect ni causa.
No prometer tiempo constante: diferencias de red/PG requieren medición independiente.
Privadas ajeno404 antes de precondiciones409;422 selección pública inválida;
fallos PG503 sanitizados. Publicación fuente no verificable409, sin snapshot parcial.

Todas las respuestas de rutas nuevas, también401/403/404/409/413/422/429/503, llevan
Cache-Control:no-store. Públicas añaden Referrer-Policy:no-referrer y X-Robots-Tag:
noindex,nofollow; sin ETag/304/CDN/service-worker cache ni caché de capacidades.
Mantener cuerpo37/timeout y firma literal método/raw_path. Main/proxy/BFF precisan
allowlist de ESTAS rutas, no wildcard general; tokens no se incluyen como ejemplos
o valores reales en OpenAPI/trazas. No UI antes del gate montado y de logging.

Para probar429 sin fingir control existente, proponer presupuesto NUEVO exclusivo
de lectura pública:60 intentos/min por IP normalizada de client_ip37, tanto token
válido como inválido ANTES del lookup. Contador PG atómico en nueva tabla separada
`tower_share_read_budgets(key_digest PK,started_at,count)`, solo hash de IP con
namespace fijo, nunca token/IP textual. No auth/proveedor/LLM budgets alterados.
GET sigue readonly para negocio; único efecto operacional permitido es ese contador.
429+Retry-After no-store sin revelar existencia; PG indisponible503 fail closed.
Propuesta de limpieza guardada dev/test explícita para ventanas viejas, sin startup
DEV ni job automático por este contrato. Parámetros60/min y límite100 emisiones
ya aceptados para contrato; NO capacidades implementadas ni rate timing probado.

## 8. Aceptación y reservas antes de activar

Build único runner futuro, checks focales separados, sin repetir CU07 por rutina:
- Puro: marker privado en TRES notes paths, declared_model/nombres/BIOS/reasons/
  labels/conditions/locators/URLs y claves futuras a cualquier nivel; no aparece en
  proyección o publicación rechazada, nunca regex «detecta PII». Título no enum422.
  Procedencia independiente pública, fotos/quotes de otra versión/variante no pasan.
- Full9 categorías/múltiples discos/fans; fail+pending y stock-cooler condicional
  conservados, null no0, ningún verde parcial/T10 inventado; oversize rechaza entero.
- Token alta entropía/hash-only, plaintext solo crear; redacción sintética de logs/
  errores/APM/BFF/referrers, sin tokens reales ni credenciales como fixtures.
- PG real A/B, sesiones revocadas, CSRF/Origin/HMAC; owner antes409; CAS y atomicidad
  ante fallo de proyección/insert/oversize/concurrencia; conservar plan/PC/historial.
- Publicar, recalc/PC delete conservan share fijo; softdelete plan/revoke→404 igual
  a token inválido. Revocar versión antigua incluso después de recálculo/baja.
  Quote expirada GET idéntico e históricamente rotulado; sin catálogo/clock vivo.
- Counter real PG429 para válidos/inválidos, Retry-After/no-store; todos los errores
  y éxito con cache/referrer policy. No claim de constant-time por comparar códigos.
- Migración TEST de esquema previo conserva legacy bytes; gate montado main real y
  UI pública/privada con evidencia real antes de declarar implementación CU09.

Reservas: source PLAN_CONTRACT §CU09 no releído por denegación, cotejo por Build;
Títulos y budgets aceptados; precondición de revoke y apéndice sujetos a cierre
documental explícito antes de código y del delta CU09 por Build.
Logging/capacidad en URL es gate de composición, no garantía por un método Python.
Proveniencia pública no es detector universal de PII mal publicada en catálogo:
depende del límite de confianza de CU04/retail y cuarentena de datos no clasificados.
T10 desconocido y login Google humano pendiente no se inventan ni bloquean redactar
este contrato. Sin tocar evidencia visual central frontend actual ni iniciar CU09 UI.
Siete tools MCP permanecen readonly, sin save/share ni herramienta octava.

## Apéndice A — registros cerrados propuestos, antes de proyectores

Apéndice contractual, NO implementación ni permiso de activación. Build debe leer/
aceptar estos registros y actualizar CU09 antes de código. Se preserva el gate de
logging ANTES de cualquier ruta pública. No se verificó logging/runtime por leer
fuentes ni se cambia raw_path para métricas: registrar plantilla, nunca bearer.

### A1. Identidades/versiones admitidas

Paquete de publicación propuesto, versiones independientes y literales:
- proyección `tower-share-projection-1`;
- clasificación `tower-share-classification-1`;
- facts/tipos `tower-share-facts-1`;
- etiquetas `tower-share-labels-es-1`;
- URLs `tower-share-url-policy-1`.

Tuple de origen v1 admitido: schema2/kind tower_plan;
scope `cu05-tower-stock-1`, policy `tower-stock-policy-1`, inventory
`tower-stock-inventory-1`, rules `cu05-tower-stock-engine-1`, calculation
`tower-plan-calculation-1`, references `tower-benefit-references-1`, identity
`tower-reference-identity-2`. Catálogo: versión publicada EXACTA referenciada por
ese snapshot, sin sustituir por active. Versión de envelope técnico1, de
retail/technical_models.py y technical_parser.py actuales, no import dinámico que
acepte claves futuras automáticamente. Otro tuple/inventario→422, no interpretación
aproximada. Cambiar registros exige nueva versión/revisión documental y gate focal.

Mapas de categorías EXACTOS: cpu→CPU, motherboard→Placa base, ram→RAM, gpu→GPU,
psu→Fuente, case→Gabinete, storage→Almacenamiento, cooler→Refrigeración,
fan→Ventiladores. presence present|unknown|absent se conserva, sin inferir ausencia
de unknown. Acciones replace_category|replace_line|add_line|remove_line, con
referencias locales a líneas y cantidades preservadas, no UUID privados.

### A2. Estados, razones y scope controlados

Familias/etiquetas fijas:
T01→CPU/placa/BIOS; T02→RAM; T03→Interfaz GPU; T04→Largo GPU;
T05→Fuente stock; T06→Conexiones de alimentación; T07→Formatos y montaje;
T08→Almacenamiento; T09→Refrigeración; T10→Ventiladores;
T11→Identificación y presencia; T12→Recursos compartidos y cargas.

Razón de cada familia = etiqueta anterior + sufijo EXACTO según estado:
pass→«: comprobación aprobada dentro del alcance nominal»;
fail→«: incompatibilidad conocida; no ejecutar sin resolver»;
unknown→«: requiere verificación; faltan datos necesarios».
No interpolar modelo declarado, nombre de recurso, reason o ruta de faltante privada.
Reglas desconocidas o ausencia de una de T01–T12→422. Coverage conserva required,
implemented,evaluated,passed,failed,unknown,not_applicable,not_implemented,complete;
vectores solo contienen IDs del inventario admitido y se cotejan con estados.

Verdict motor: compatible|incompatible|requiere_verificacion, nunca recalculado por
clasificador. Plan/presentación: ready|blocked|requires_verification; etiquetas
«Listo solo dentro del alcance declarado», «Bloqueado: no ejecutar»,
«Requiere verificación». Si evidencia pública queda reservada, presentación no
puede ser ready; fail/blocked domina. Scope label fijo «Torre stock: asignación
nominal, no certificación física»; excludes públicos SOLO:
«Geometría avanzada e interferencias milimétricas y curvas de cables»;
«Transitorios medidos y certificación térmica/eléctrica exhaustiva»;
«Conservación de funciones frontales y periféricos».

Missing privado→entrada pública `{code,rule_id,category?,local_ref?,count}`.
Códigos cerrados: required_fact_missing, identification_unresolved,
public_evidence_withheld, source_unclassified, value_unclassified,
source_conflict, material_unresolved, quote_unresolved. Si no hay mapeo exacto,
public_evidence_withheld conserva número de pendientes sin emitir el texto original.
No usar prefijo/regex del string como prueba de privacidad. Condiciones, advertencias
y adicionales no registrados reciben aviso neutro «Detalle técnico reservado; el
estado original se conserva», contador y evidence_complete=false; nunca string raw.

Material kind solo thermal_compound; required bool estricto; state
included|available_confirmed|priced|missing. Razones públicas registradas:
included→«Incluido en paquete nuevo documentado»;
available_confirmed→«Disponibilidad declarada explícitamente para esta etapa»;
priced→«Dependencia cotizada en la revisión histórica»;
missing→«Disponibilidad o cotización necesaria no acreditada».
Caso stock-cooler condicional añade SOLO «Si se reutiliza el cooler stock; la
instalación real no está identificada». No decidir que está instalado ni convertir
included de una etapa en sobrantes en otra. Hardware dependencies usa etiqueta de
categoría + «Acción adicional del plan; coste completo obligatorio». No razón raw.

### A3. Facts: tabla finita de claves existentes, no passthrough

Tipos públicos: BOOL=bool exacto (false válido); COUNT=int exacto>=0,<=1000000;
NUM=int/float finito>=0,<=1000000000, excluye bool; ENUM=token de tabla cerrada;
DOC_LIST=lista tipada reconstruida de campo publicado vinculado; MODEL=nombre de
producto público reconstruido + referencia local; RESERVED=sin valor raw y contador.
Null permanece null/desconocido. No filtrar mediante truthiness:0 yfalse son conocidos.
Tipo/enum desconocido→RESERVED, evidence_complete=false, NO nuevo veredicto.
Para dinero solo strings Decimal ARS canónicos, nunca NUM/float ni0 por unknown.

Claves de Fact existentes consultadas en compatibility/cpu_rule.py,
basic_evaluation.py y basic_policy.py, admitidas únicamente en su familia:
- T01 MODEL: cpu_model,motherboard_model (resolver componentes públicos, no valor
  raw). BOOL: bios_requirement_met,cpu.socket_source_conflict,
  motherboard.socket_source_conflict. ENUM socket: cpu_socket,motherboard_socket,
  cpu.socket_published_value,motherboard.socket_published_value. minimum_bios y
  applicable_revision SOLO átomo reconstruido de fila CPU-support publicada exacta;
  installed_bios_declared SIEMPRE RESERVED, nunca cadena declarada libre.
- T02 COUNT: motherboard.ram_slots. NUM: motherboard.max_total_gb,
  motherboard.max_module_gb. ENUM: cpu.memory_type,motherboard.memory_type,
  motherboard.module_type. BOOL: motherboard.admitted_ecc,
  motherboard.admitted_buffered. DOC_LIST de enteros positivos publicados:
  cpu.native_jedec_mts,motherboard.native_jedec_mts. Expansión FINITA i=1..4:
  ram.module_i.memory_type/module_type (ENUM), capacity_gb (NUM),
  native_jedec_mts (DOC_LIST), ecc/buffered (BOOL).
  ram.module_i.module_type_description→RESERVED (texto mecánico no se presume enum).
- T03 ENUM: motherboard.pcie_slot,gpu.pcie_interface.
  BOOL: gpu.pcie_backward_compatible.
- T04 NUM mm: gpu.length_mm,case.gpu_limit_mm.
- T05 NUM W: psu.continuous_power_w,gpu.manufacturer_system_recommendation_w,
  gpu.nvidia_system_recommendation_w,cpu.documented_tdp_class_w,
  gpu.psu_reference_cpu_tdp_class_w. ENUM: cpu.platform,
  cpu.documented_stock_family,gpu.psu_reference_platform,
  gpu.psu_recommendation_basis. gpu.psu_reference_system→RESERVED (no texto libre).
- T06 COUNT: psu.atx24_count,psu.eps8_count,motherboard.atx24_count,
  motherboard.eps8_count,gpu.power_count,psu.pcie8_count,psu.native16_count,
  gpu.adapter_pcie8_inputs,psu.pcie8_independent_branches. ENUM: gpu.power_kind.
- T07 ENUM: motherboard.form_factor,psu.form_factor. DOC_LIST de enums:
  case.board_formats,case.psu_formats. NUM mm: psu.length_mm,case.psu_limit_mm.
- T08–T12 actualmente Check.result() no genera Fact scalars en tower_engine.py:
  facts vacío si así lo capturó el motor. NO inventar facts a partir de missing.
  Inputs documentados opcionales de A4 se llaman evidence_summary, no decisión nueva.

Enums v1 cerrados (cada token además debe estar vinculado a dato publicado exacto):
socket={AM4,AM5,LGA1700,LGA1851}; memory_type={DDR4,DDR5}; module_type={UDIMM,RDIMM,
SODIMM}; pcie={PCIe x16,PCIe x8}; board_form={ATX,mATX,ITX};
psu_form={ATX,SFX,SFX-L}; power_kind={PCIe8,16pin}; platform={AM4,AM5};
stock_family={Ryzen5000}; psu_basis={manufacturer_whole_system_minimum}.
No supone que todos esos tokens estén curados o sean compatibles. Otros valores,
aunque técnicamente plausibles, quedan reservados hasta ampliar registro versionado.
Strings de listas que el motor serializó con comas NO se parsean como nueva evidencia:
reconstruir de arrays publicados tipados y verificar coherencia o reservar detalle.

### A4. Recursos: forma cerrada, identidad siempre local

Origen permitido: TechnicalEnvelope v1 vinculado con
`backend/upgradejusto/retail/technical_validation.py::validate_technical_binding`.
Requiere identidad componente/categoría/nombre exactos y cada SourceRef unido a
source_rows y component.sources. No basta TechnicalIdentity.name ni host URL.
`technical_models.SourceRef.provenance_only` solo valida HTTP(S)/credenciales:
NO constituye por sí mismo política pública ni autorización de fuente.

Campos de evidence_summary por categoría, congelados de technical_parser.SCHEMA
leído en esta revisión (NO extender automáticamente si cambia ese módulo):
motherboard={tower_ports,fan_headers,shared_limits,fan_total_current_ma};
case={storage_bays,cooler_height_limit_mm,fan_positions,fan_supported_sizes_mm};
storage={storage_interface,storage_form,sata_power_count};
cooler={cooler_sockets,cooler_type,cooler_height_mm,fan_count,fan_voltage_mv,
fan_current_ma,fan_connector,thermal_compound_required_on_remount,thermal_compound_included};
fan={fan_size_mm,fan_voltage_mv,fan_current_ma,fan_connector};
gpu={tower_port_kind,tower_port_form}; psu={sata_power_count};
cpu={stock_cooler_included} más campos cooler anteriores. RAM no tiene entrada
tower_stock_v1 en ese SCHEMA: solo hechos básicos de A3 si proceden.

Enums de recurso EXACTOS del parser actual:
FORMS={2.5-inch,3.5-inch,2242,2260,2280,22110};
INTERFACES={SATA,M2-NVMe,M2-SATA}; PCIE_FORMS={x1,x4,x8,x16};
CONNECTORS={3pin,4pin}; cooler_type={air,liquid,passive}.
tower_ports kind=INTERFACES oPCIe; accepts=FORMS oPCIE_FORMS según kind.
storage_bays kind=storage-bay/accepts=FORMS; fan_headers kind=fan/accepts=CONNECTORS.
resource_id/group/excludes NO se publican como strings: mapas locales R1…/G1…,
referencias coherentes y completas; si no se pueden mapear, reservar resumen.
voltage_mv/current_ma/cost/capacity/cantidades mantienen tipos/cotas del esquema
publicado; capacity0 yconteos0 no significan desconocido. Null eléctrico continúa
unknown; no inferir splitters, conectores, consumo ni geometría. Detalle no publicable
no elimina el estado fail/unknown de T08–T12 ni sus contadores de pendientes.

### A5. Clases de fuente y unión exacta de metadatos

Clases CERRADAS: manufacturer_spec,manufacturer_manual,manufacturer_support,
manufacturer_policy,retail_product,retail_offer,retail_image,benchmark_blender_cpu,
benchmark_tpu_raster,editorial_toms,reserved. Ningún source_class viene del cliente.
Entrada de clasificación vinculada por
`(catalog_version,source_id,url,consulted_on,locator)` EXACTOS y categoría/variante;
una coincidencia solo de URL o source_id NO basta. SourceRef privado con fecha o
locator cambiado no pasa, aunque sea host permitido. Fecha ISO de source_rows,
no texto del snapshot. Referencias públicas usan ref local rN; no filtran IDs libres.

Locator público reconstruido por clase: «Ficha técnica del fabricante», «Manual del
fabricante», «Soporte CPU/BIOS publicado», «Política nominal del fabricante»,
«Producto comercial histórico», «Oferta comercial histórica», «Fotografía comercial
referenciada», «Referencia Blender CPU4.5.0», «Referencia raster1440» o
«Referencia editorial». NUNCA locator raw, benefit.source raw ni reason del plan.

Benchmark Blender/TPU: reconstruir de referencias/identidad versionadas en
`backend/upgradejusto/recommendations/tower_references.py` (CPU/GPU, REFERENCE_VERSION,
IDENTITY_VERSION, scores/N/hashes/fechas/workload exactos), más binding a fuente
pública del contexto. Esos módulos no autorizan usar arbitrary benefit.source.
Si faltan registro o unión publicada, reservar fuente/beneficio y degradar
presentación; no convertir precio/VRAM/núcleos en rendimiento. No FPS.

### A6. URL policy v1: unión de clase + URI completa + procedencia

Reglas globales: URI<=2000, sin controles/espacios/backslash, credenciales, fragmento,
puerto explícito, IP literal/private/local/localhost ni host fuera de clase. Host y
scheme deben ser los literales registrados; no normalizar dominios aproximados.
Comparar URI canónica byte-a-byte con entrada fija o manifiesto histórico definido
abajo, antes de emitir; no decodificar/re-encodear para admitir aliases. Path/query
conservan case; no %2f/%5c/%2e, doble encoding, escapes de userinfo o dot segments.
La excepción %20 es SOLO posición literal de las URI ASRock registradas, no permiso
general de percent-encoding. Request raw_path para HMAC NO se toca.

**Fotos — clase retail_image exclusivamente HTTPS:** reutilización PINNED de
`backend/upgradejusto/retail/models.py::retail_url(value,store,image=True)` con store
de identity histórica, NUNCA store=None. Requisitos actuales adicionales explicitados:
- CG: netloc exacto imagenes.compragamer.com; path comienza
  `/productos/compragamer_Imganen_general_` y termina .jpg/.jpeg/.png/.webp;
- Venex: netloc venex.com.ar owww.venex.com.ar; path empieza `/products_images/`
  y misma extensión raster; no SVG/data/file, query, fragmento, %, doble slash o../;
- URL exacta de image_evidence de la publicación, status verified, exact_variant
  true, source_url enlazada al MISMO producto/store/variante y rights clasificados.
  photo_bytes_verified no se presupone true: si no lo es, no afirmar inspección de
  bytes. Alt/aviso de derechos son controlados, sin texto privado. No redistribución
  ni licencia de foto deducida de dataset. HTTP siempre rechazado, aunque una clase
  documental permita HTTP. Sin TLS desactivado, descarga o redirects nuevos.

retail_product/retail_offer: `retail_url(value,store,image=False)` como piso, NO
autorización de todos los paths de ese host. Manifiesto finito por publicación =
tuplas comerciales exactas de resources.identity
`(store,product_id,variant_key,category,source_url)` que ya estén vinculadas a
component.sources/registro público y a quote seleccionada cuando corresponda.
Solo ESA URI completa sin query entra; nada de elegir un path por hostname.
Compragamer netloc compragamer.com/www.compragamer.com; Venex como arriba;
actual policy exige HTTPS también a esos productos. No precios legacy libres.

manufacturer_*: conjunto v1 fijo a partir de URLs leídas en
`backend/upgradejusto/catalog/dataset.py::COMPONENTS.sources` y
`compatibility/basic_manufacturer.py::SUPPLEMENTAL_SOURCES`, limitado a los
siguientes host+paths EXACTOS, HTTPS yquery vacía (no auto-expandir al importar):
- www.amd.com: `/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html`;
  mismo prefijo hasta `/amd-ryzen-7-5700x.html`;
  `/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-9-5900x.html`.
- ir.amd.com: `/news-events/press-releases/detail/1053/amd-launches-the-ultimate-gaming-processor-brings-enthusiast-performance-to-an-expanded-lineup-of-ryzen-desktop-processors`;
  `/news-events/press-releases/detail/1202/amd-unveils-next-gen-zen-5-ryzen-processors-to-power-advanced-ai-experiences`.
- www.asrock.com: `/mb/AMD/B550M%20Pro4/index.us.asp`,
  `/mb/AMD/B550%20Pro4/index.asp`, `/mb/AMD/B550M%20Steel%20Legend/index.us.asp`;
  download.asrock.com: `/Manual/B550M%20Pro4.pdf`, `/Manual/B550%20Pro4.pdf`,
  `/Manual/B550M%20Steel%20Legend.pdf`.
- www.kingston.com: `/en/memory/client/ddr4-3200mts-non_ecc-unbuffered-dimm`,
  `/datasheets/KVR32N22S8_8.pdf`, `/datasheets/KVR32N22D8_16.pdf`.
- www.asus.com: `/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g-evo/techspec/`,
  `/us/motherboards-components/graphics-cards/prime/prime-rtx5070-o12g/techspec/`,
  `/us/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx5070-o12g-gaming/techspec/`.
- www.nvidia.com: `/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/`,
  `/en-us/geforce/graphics-cards/50-series/rtx-5070-family/`.
- www.corsair.com: `/us/en/p/psu/cp-9020277-na/cx-series-cx550-550-watt-80-plus-bronze-atx-power-supply-cp-9020277-na`,
  `/us/en/explorer/diy-builder/power-supply-units/corsair-rme-series-2025/`,
  `/us/en/p/psu/cp-9020295-na/rme-series-rm750e-fully-modular-low-noise-atx-power-supply-cp-9020295-na`,
  `/us/en/explorer/gamer/gaming-pcs/does-a-pcie-50-gpu-work-in-a-pcie-40-motherboard/`.
- www.fractal-design.com: `/products/cases/pop-series/pop-2-air/pop-2-air-black-solid/`,
  `/products/cases/meshify-series/meshify-c/meshify-c/`;
  support.fractal-design.com: `/support/solutions/articles/4000119088-will-my-graphics-card-fit-in-the-meshify-c-or-meshify-c-mini-with-a-radiator-installed-in-the-front-`.

manufacturer_manual corresponde a esos PDFs; manufacturer_support a páginas ASRock;
manufacturer_policy a supplemental de AMD/NVIDIA/Corsair; resto manufacturer_spec.
La clasificación no acredita contenido nuevo ni prevalencia automática sobre conflicto.
Un URL conocido con #CPU uotro fragmento NO se limpia para hacerlo pasar: se reserva
salvo futura entrada canónica explícita aprobada. La publicación no consulta red.

benchmark_blender_cpu: host opendata.blender.org, path `/benchmarks/query/`, HTTPS;
query EXACTA reconstruida con orden/key/value fijos de tower_references.reference:
`device_name=D&device_type=CPU&blender_version=4.5.0&group_by=device_name&response_type=datatables`.
D solo `AMD+Ryzen+5+5600+6-Core+Processor` o
`AMD+Ryzen+7+5700X+8-Core+Processor`. Sin duplicados, extras, distinto orden o aliases
%20/%2b. Query no se usa como buscador. Fechas/N/score/hash de CPU registrados,
no copiados de snapshot. Otros paths/about con fragmento quedan reservados v1.

benchmark_tpu_raster: www.techpowerup.com,
`/review/nvidia-geforce-rtx-5070-founders-edition/35.html` y`/7.html` en el MISMO
prefijo review completo; HTTPS/query vacía. Artefacto fuente SOLO enlace de cita:
tpucdn.com `/review/nvidia-geforce-rtx-5070-founders-edition/images/relative-performance-2560-1440.png`,
hash cc86969af873d864355e5715c2a1860fb1f95726e4c35f8adeff6ef2bb0ff74e.
NO se convierte en photo/imagen embebida ni licencia de redistribución.

editorial_toms: conjunto de URI admitidas v1 VACÍO, fail closed. No se identificó
un permalink literal de Tom's en las fuentes backend puntuales consultadas de este
apéndice; no inventarlo ni admitir www.tomshardware.com/reviews/* por hostname.
Si una fuente curada histórica es Tom's, se conserva regla/estado/faltante y count
de referencia reservada, evidence_complete=false/presentación no ready. Build
puede transmitir su tupla exacta publicada URL/source_id/date/locator y aceptar
nueva entrada versionada ANTES de código; no se amplía por detección de host.

HTTP documental/comercial en producción v1: conjunto EXACTO admitido VACÍO porque
las URI identificadas arriba son HTTPS. La clase abstracta HTTP(S) no es un grant.
Una futura URI HTTP documental precisa entrada expresa, nunca habilita HTTP para
fotos. Test de separación usa manifest fixture HTTP SINTÉTICO solo para enlace;
ese mismo esquema debe rechazarse como imagen. No añadir fixture a allowlist real.

### A7. Falla cerrada y gates de este apéndice

Fuente/valor privado no clasificado: reservar con count/código neutral y degradar
presentación, conservando verdict/fail/missing/coverage del motor. Referencia sin
unión de quote obligatoria o inventario no soportado: rechazar422/409 según causa
anterior, transacción sin token/row parcial. No fallback a cualquier URL HTTPS,
catálogo active, texto de benefit.source ni nombre de usuario. Claves futuras jamás
se incorporan por reflexión del parser/clase. Procedencia pública no es detector
PII universal: el límite de confianza CU04/retail permanece explícito.

Gates documentados antes de implementación: fotos HTTP rechazadas aun con enlace
HTTP permitido en fixture; CG/Venex wrong host/path/query/fragment/encoding/variante
rechazados; ASRock solo%20 literal aprobado; Blender query exacta ysin claveextra;
Tom's no registrado reservado; tuple date/locator distinto no pasa; private markers
en reasons/facts/recursos/source_refs/benefit/unknownkeys no aparecen. Numeric0 ybool
false sobreviven con tipo correcto; valores de enum/tipo desconocido se reservan.
Logging usa plantilla/status, sin rawpath/token ysin alterar HMAC. Ninguno de esos
checks ha sido ejecutado por este escritor. NO código, migración ni activación.


</details>


<a id="origen-backend-integral38-share-dto-md"></a>

## Contrato de referencia consolidado: INTEGRAL38_SHARE_DTO.md

Los detalles técnicos siguientes se conservan desde el contrato de esa etapa. Sus frases de preparación, autorización, implementación pendiente y órdenes de trabajo son HISTÓRICAS, no el estado vigente ni autorización de ejecución. Prevalecen los deltas posteriores de esta spec para su alcance y CONTINUAR/matriz para los resultados comprobados. No se certificó de nuevo el código al consolidar.

<details>
<summary>Detalle contractual y contexto original</summary>

# CU09 torre — DTO JSON realmente emitido (consumer, v1)

Documento descriptivo del código actual, NO propuesta de campos ni interfaz TS.
Fuentes inspeccionadas: `upgradejusto/shares/tower_projection.py` (configuration,
actions, facts, evaluation, offers, cost, gain, dependencies, stages, finish),
`tower_sources.py`, `tower_registry.py`, `tower_models.py`, `tower_repository.py`,
`tower_service.py`; `api/tower_shares.py`, `api/proxy_ip.py`, handlers de `main.py`.
Para tipos de summaries/beneficio: `retail/technical_parser.py`,
`retail/technical_models.py`, `recommendations/tower_references.py`.
Sin ejecutar generadores, PG, SDK ni tests para escribir este documento.

## Notación y reglas comunes

Objetos descritos por `campo: tipo`; `campo?` significa que puede OMITIRSE, no null.
Todos los campos sin `?` se emiten. `X|null` permite null explícito. `X[]` es array,
posiblemente vacío salvo límites indicados. No son muestras de datos ni código frontend.

- `int`: entero JSON, no boolean. `Count`: int>=0. `Positive`: int>=1.
- `Money`: string decimal no negativo, regex `(?:0|[1-9][0-9]{0,23})\.[0-9]{2}`.
  Nunca número JSON. ARS en este incremento; unknown no se convierte en cero.
- `DecimalText`: string decimal de referencia curada, NO Money ni FPS.
- `DateTime`: string ISO8601 con zona horaria. `Date`: string `YYYY-MM-DD`.
- `HttpsUrl`: string HTTPS autorizado por política/versionado servidor, no URL libre.
- `Title`: `"Plan de mejora de torre" | "Plan de mejora por etapas"`.
- `Category`: `cpu|motherboard|ram|gpu|psu|case|storage|cooler|fan`.
- `Presence`: `present|absent|unknown`.
- `Status`: `ready|blocked|requires_verification`.
- `Verdict`: `compatible|incompatible|requiere_verificacion` (español, distinto de Status).
- `RuleId`: exactamente `T01` hasta `T12`.
- `RuleState`: `pass|fail|unknown`.
- `Condition`: `cash|list`.
- `PRef`, `LRef`, `QRef`, `RRef`: strings locales `pN`, `lN`, `qN`, `rN`, N>=1.
  No UUID, ID privado, ID de catálogo ni ID comercial. Son opacos para el consumidor.
  `PRef` resuelve en root.components; `RRef` en root.references; `LRef` identifica
  líneas dentro de la proyección. `QRef` se encuentra en stages[].offers; NO hay
  root.offers ni endpoint de lookup por QRef. Pueden repetirse quotes entre etapas.
- `ResourceRef`: `RN`; `GroupRef`: `GN`, N>=1. Solo dentro del evidence_summary de
  UN componente; no confundir `RN` de recursos con `rN` de referencias de fuentes.

Leer y mostrar status/verdict/coverage/faltantes del servidor, NUNCA recalcularlos.
Un blocked de etapa sigue blocked aunque falte evidencia; el fallo conocido domina.
Status público puede ser requires_verification con verdict histórico compatible.
Coverage completa del motor NO acredita evidence_complete pública ni certificación.

## Rutas y contratos privados (sesión/propiedad servidor + CSRF en mutaciones)

Sin query; UUID de path canónico en minúsculas. Nada de owner_id del cliente.

### POST `/api/tower-plans/{plan_id}/shares`

Request cerrado:
```text
{
  expected_plan_revision: int[1..9999999999],
  title: Title,
  public_projection_confirmed: true (boolean exacto)
}
```
Respuesta201 DIRECTA, no envelope ni snapshot:
```text
CreatedShare = {
  id: UUID-string,
  plan_revision: Positive,
  title: Title,
  projection_version: "tower-share-projection-1",
  created_at: DateTime,
  revoked_at: DateTime|null,
  token: string[43, ASCII A-Za-z0-9_-]
}
```
En creación exitosa revoked_at es null. `projection_version` y `revoked_at` SÍ
pertenecen al helper real, aunque una enumeración contractual anterior los omitiera.
No effective_state en POST. Token solo tras commit exitoso,256bits generado servidor;
no URL retornada, Location ni Idempotency-Replayed implementados por este router.
No idempotency key en request; cada POST exitoso es emisión nueva (máximo100 por plan,
incluidas revocadas). No guardar token en logs/analytics ni reconstruirlo desde GET.

### GET `/api/tower-plans/{plan_id}/shares`

Respuesta200:
```text
{ items: ListedShare[] }
ListedShare = {
  id: UUID-string,
  plan_revision: Positive,
  title: Title,
  projection_version: "tower-share-projection-1",
  created_at: DateTime,
  revoked_at: DateTime|null,
  effective_state: active|disabled_plan_deleted|revoked
}
```
Solo items, SIN total/page/page_size. Orden creado/id. Estado efectivo se calcula
con header fresco: revoked_at no null → revoked; de otro modo plan soft-deleted →
disabled_plan_deleted; de otro modo active. Propietario puede listar/revocar después
de soft-delete. No token, digest, snapshot, plan_id ni owner_id retornados.

### DELETE `/api/tower-plans/{plan_id}/shares/{share_id}`

Request cerrado `{ expected_plan_revision: int[1..9999999999] }`.
Es la revisión CAPTURADA en el share, no current_revision del plan. Respuesta204
SIN BODY; revocación repetida con precondición correcta sigue204. Recalcular/borrar
plan no impide revocar como propietario. No hay request token para esta operación.

## GET público `/api/shared-tower-plans/{token}`

200 devuelve **PublicPlan directamente**, NO `{snapshot: ...}` ni share metadata.
Sin sesión/CSRF para GET; ingress de transporte/HMAC verificado sigue requerido.
Token válido tiene43 ASCII URL-safe. Ingress admite un segmento raw de1..128 de
`A-Za-z0-9_-`, solo GET sin query: incluso longitud inválida consume presupuesto PG
antes del404. Aliases percent, segmentos extra/query no son tokens canónicos.
60 intentos/IP/minuto, válidos e inválidos;429 con Retry-After en segundos.
La generación comprueba entrada privada y salida pública integral contra1048576
bytes JSON (ensure_ascii), rechaza exceso sin truncar y usa deadline cooperativo5s.
Eso no amplía el cap de body HTTP existente262144 bytes para estas rutas.

```text
PublicPlan = {
  kind: "shared_tower_plan",
  schema_version: 2,
  title: Title,
  plan_revision: Positive,
  published_at: DateTime,
  generated_at: DateTime,
  objective: general|gaming|productivity,
  workload: "blender-cpu"|null,
  budget_ars: Money,
  currency: "ARS",
  price_condition: Condition,
  versions: Versions,
  components: PublicComponent[],
  references: PublicRef[],
  base_configuration: PublicConfig,
  stages: PublicStage[1..12],
  cost: Cost,
  benefit: Benefit,
  status: Status,
  projection: {
    version: "tower-share-projection-1",
    evidence_complete: boolean,
    withheld_details: Count
  },
  missing_fields: {code: "public_evidence_withheld", count: Positive}[],
  warnings: string[] (tres avisos controlados; ver abajo)
}
Versions = {
  scope: "cu05-tower-stock-1",
  policy: "tower-stock-policy-1",
  inventory: "tower-stock-inventory-1",
  rules: "cu05-tower-stock-engine-1",
  calculation: "tower-plan-calculation-1",
  references: "tower-benefit-references-1",
  identity: "tower-reference-identity-2",
  catalog: string (publicación histórica capturada, no active actual),
  classification: "tower-share-classification-1",
  facts: "tower-share-facts-1",
  labels: "tower-share-labels-es-1",
  urls: "tower-share-url-policy-1",
  projection: "tower-share-projection-1"
}
```
No id, share_id, plan_id, pc_id, owner_id, token/digest, nombre privado, contexto,
label raíz ni limitations raíz. Los missing_fields raíz son [] o un agregado, no
las rutas de campos privados. `withheld_details` cuenta reservas, no porcentaje.
La implementación actual reserva siempre la revisión compuesta privada al evaluar;
por tanto no prometer evidence_complete=true/verde con esta proyección conservadora.

Warnings raíz, orden actual:
- `Cotización histórica; sin garantía de precio o stock actual`
- `Proyección de revisión fija; no certifica instalación ni compatibilidad física`
- `Revocar no elimina copias ya vistas ni respuestas iniciadas`

## Componentes, imágenes y evidencia técnica resumida

```text
PublicComponent = {
  ref: PRef,
  category: Category,
  name: string (etiqueta controlada de categoría, nunca nombre comercial copiado),
  image: SourcePhoto|null,
  references: RRef[],
  evidence_summary: EvidenceSummary
}
SourcePhoto = {
  url: HttpsUrl,
  retrieved_at: DateTime,
  rights_notice: "Imagen referenciada del proveedor; no se transfieren derechos",
  bytes_verified: boolean,
  alt: string (etiqueta controlada de Category)
}
```
Name: etiqueta CPU/Placa base/RAM/GPU/Fuente/Gabinete/Almacenamiento/Refrigeración/
Ventiladores, seguida de ` no identificada` o ` con evidencia publicada`.
Photo nace de recurso histórico CG/Venex, variante exacta y estado verified;
bytes_verified=false NO implica imagen auditada byte a byte. Sin photo o evidencia
admisible: image=null, no placeholder convertido en fuente. No source_url/rights_note
arbitrarios del catálogo, image alt libre ni datos comerciales internos.

EvidenceSummary es objeto posiblemente `{}`. TODAS sus claves siguientes son
opcionales; se omiten si no pasan clasificación/binding. No campos null implícitos:

```text
CoolerSummary = {
  cooler_sockets?: (AM4|AM5|LGA1700|LGA1851)[],
  cooler_type?: air|liquid|passive,
  cooler_height_mm?: int[1..1000000000],
  fan_count?: int[0..1000000],
  fan_voltage_mv?: int[1..1000000000],
  fan_current_ma?: int[1..1000000000],
  fan_connector?: "3pin"|"4pin",
  thermal_compound_required_on_remount?: boolean,
  thermal_compound_included?: boolean
}
```
Claves admitidas POR categoría (no diccionario libre):
- cpu: CoolerSummary más `stock_cooler_included?: boolean`.
- cooler: CoolerSummary.
- motherboard: `tower_ports?: NominalResource[]`, `fan_headers?: NominalResource[]`,
  `shared_limits?: SharedLimit[]`, `fan_total_current_ma?: int[0..1000000]`.
- case: `storage_bays?: NominalResource[]`, `cooler_height_limit_mm?: int[1..1000000000]`,
  `fan_positions?: int[0..1000000]`, `fan_supported_sizes_mm?: int[1..1000000000][]`.
- storage: `storage_interface?: SATA|M2-NVMe|M2-SATA`,
  `storage_form?: "2.5-inch"|"3.5-inch"|"2242"|"2260"|"2280"|"22110"`,
  `sata_power_count?: int[0..1000000]`.
- gpu: `tower_port_kind?: "PCIe"`, `tower_port_form?: "x1"|"x4"|"x8"|"x16"`.
- psu: `sata_power_count?: int[0..1000000]`.
- fan: `fan_size_mm?`, `fan_voltage_mv?`, `fan_current_ma?`: int[1..1000000000];
  `fan_connector?: "3pin"|"4pin"`.

```text
NominalResource = {
  ref: ResourceRef,
  kind: fan|storage-bay|SATA|M2-NVMe|M2-SATA|PCIe,
  accepts: string[] (tokens cerrados según kind),
  group: GroupRef|null,
  excludes: ResourceRef[],
  voltage_mv: int[1..1000000000]|null,
  max_current_ma: int[1..1000000000]|null,
  cost: int[1..1000000000]
}
SharedLimit = {group: GroupRef, capacity: int[0..1000000]}
```
kind fan solo en fan_headers; accepts de fan:3pin/4pin. storage-bay solo storage_bays;
accepts de bahía/storage ports: formatos storage_form anteriores. PCIe accepts:
x1/x4/x8/x16. Solo fan_headers admite valores eléctricos no null. `cost` aquí es
carga de recurso nominal, NO ARS. Ningún UUID/resource_id/group privado se copia.

## Configuración y acciones públicas

```text
PublicConfig = {
  schema_version: 2,
  category_status: {
    cpu: Presence, motherboard: Presence, ram: Presence,
    gpu: Presence, psu: Presence, case: Presence,
    storage: Presence, cooler: Presence, fan: Presence
  },
  lines: PublicLine[0..36]
}
PublicLine = {
  line_ref: LRef, category: Category, component_ref: PRef, quantity: int[1..32]
}
PublicAction = {
  action: replace_category|replace_line|add_line|remove_line,
  category: Category,
  candidates: {component_ref: PRef, quantity: int[1..32]}[0..36],
  line_ref?: LRef,
  bios_context?: "BIOS declarada no publicada"
}
```
Sin id/revision/name/origin_schema/context de PC, declared_model, BIOS instalada,
line_id original o component_id comercial. Config conserva cantidades/presencia;
no ofrece campos total_modules/capacity calculados. Sustitución RAM reemplaza conjunto,
no debe reinterpretarse en cliente como ampliación automática.

## Etapas

```text
PublicStage = {
  position: int[1..12],
  name: string ("Etapa" concatenado con position, SIN espacio),
  budget_ars: Money,
  actions: PublicAction[1..36],
  materials: {
    kind: "thermal_compound", state: "available_confirmed", confirmed: true
  }[],
  evaluated_configuration: PublicConfig,
  evaluation: Evaluation,
  benefit: Benefit,
  offers: Quote[],
  dependencies: Dependency[],
  cost: Cost,
  cumulative_cost: Cost,
  status: Status,
  missing_fields: {code: "required_fact_missing", count: Positive}[],
  warnings: ["Alcance nominal; verificar detalles técnicos reservados"]
}
```
Máximo96 acciones sumadas en la publicación. Nombre privado de etapa no se copia.
Missing de etapa: [] o un agregado. No resource_ref/line_ref añadido a dependencias.

## Evaluación, cobertura, reglas y facts

```text
Evaluation = {
  verdict: Verdict,
  rules_version: "cu05-tower-stock-engine-1",
  coverage: {
    required: RuleId[], implemented: RuleId[], evaluated: RuleId[],
    passed: RuleId[], failed: RuleId[], unknown: RuleId[],
    not_applicable: RuleId[], not_implemented: RuleId[], complete: boolean
  },
  rule_results: RuleResult[12],
  scope: {
    id: "cu05-tower-stock-1",
    policy_version: "tower-stock-policy-1",
    inventory_version: "tower-stock-inventory-1",
    operating_regime: "stock_no_oc",
    label: "Torre stock: asignación nominal, no certificación física",
    excludes: string[] (tres exclusiones fijas)
  },
  missing_fields: {code: "required_fact_missing", count: Positive}[],
  evaluated_configuration: PublicConfig
}
RuleResult = {
  rule_id: RuleId, family: RuleId (igual a rule_id), state: RuleState,
  reason: string (familia/estado controlados, no prose privada),
  facts: Fact[], references: RRef[],
  missing_fields: {code: "required_fact_missing", rule_id: RuleId, count: Positive}[]
}
Fact = {name: RegisteredFactName, component_ref: PRef}
    OR {name: RegisteredFactName, value: FactValue, unit?: "mm"|"W"}
FactValue = null | boolean | finite-nonnegative-number | ControlledToken
          | positive-int[] | BoardForm[] | PsuForm[]
```
required/rule_results orden T01..T12; estados/coverage y verdict del motor se
conservan. No evaluation.data_revision/pc_revision, conditions/evidence cruda,
additional_checks ni warnings de evaluación. Los faltantes se agregan sin rutas privadas.
No `evidence_complete` en Evaluation: vive únicamente en root.projection.
Modelo fact usa component_ref SIN value/unit. Fact numérico con nombre terminado
en `_mm` lleva mm, terminado `_w` lleva W; otros no inventan unit. No facts con
razones/valores libres; T08..T12 conservan regla/estado, pero sus facts no registrados
se reservan, no se pasan como texto. No asumir que facts=[] significa verificación pasada.

Exclusiones scope:
- `Geometría avanzada e interferencias milimétricas y curvas de cables`
- `Transitorios medidos y certificación térmica/eléctrica exhaustiva`
- `Conservación de funciones frontales y periféricos`

RegisteredFactName y tipo (todo value puede ser null; registro literal, no patrones libres):
- T01: cpu_model/motherboard_model → forma component_ref; bios_requirement_met,
  cpu.socket_source_conflict, motherboard.socket_source_conflict → boolean;
  cpu_socket/motherboard_socket/cpu.socket_published_value/
  motherboard.socket_published_value → Socket.
- T02: cpu.memory_type/motherboard.memory_type → DDR4|DDR5;
  motherboard.module_type → UDIMM|RDIMM|SODIMM; motherboard.ram_slots → count;
  motherboard.max_total_gb/max_module_gb → number;
  motherboard.admitted_ecc/admitted_buffered → boolean;
  cpu.native_jedec_mts/motherboard.native_jedec_mts → positive-int[].
  `ram.module_{i}.{suffix}` SOLO i=1..4: suffix memory_type → DDR4|DDR5,
  module_type → UDIMM|RDIMM|SODIMM, capacity_gb → number,
  native_jedec_mts → positive-int[], ecc/buffered → boolean.
- T03: motherboard.pcie_slot/gpu.pcie_interface → `PCIe x16|PCIe x8`;
  gpu.pcie_backward_compatible → boolean.
- T04: gpu.length_mm/case.gpu_limit_mm → number.
- T05: psu.continuous_power_w/gpu.manufacturer_system_recommendation_w/
  gpu.nvidia_system_recommendation_w/cpu.documented_tdp_class_w/
  gpu.psu_reference_cpu_tdp_class_w → number;
  cpu.platform/gpu.psu_reference_platform → AM4|AM5;
  cpu.documented_stock_family → Ryzen5000;
  gpu.psu_recommendation_basis → manufacturer_whole_system_minimum.
- T06: psu.atx24_count/eps8_count/pcie8_count/native16_count/pcie8_independent_branches,
  motherboard.atx24_count/eps8_count, gpu.power_count/adapter_pcie8_inputs → count;
  gpu.power_kind → PCIe8|16pin. En esas abreviaciones cada suffix lleva el prefijo
  de categoría mostrado, no es un nombre sin prefijo.
- T07: motherboard.form_factor → BoardForm; psu.form_factor → PsuForm;
  case.board_formats → BoardForm[]; case.psu_formats → PsuForm[];
  psu.length_mm/case.psu_limit_mm → number.

Socket=AM4|AM5|LGA1700|LGA1851; BoardForm=ATX|mATX|ITX; PsuForm=ATX|SFX|SFX-L.
Count facts:0..1000000; number facts: finito0..1000000000; rates: enteros1..1000000000.
ControlledToken es la unión cerrada de los tokens de esta tabla, no string libre.

## Costes, quotes y beneficio

```text
Cost = {
  total_ars: Money|null,
  known_subtotal_ars: Money,
  within_budget: boolean|null,
  lines: {
    component_ref: PRef, quote_ref: QRef, quantity: int[1..1000000],
    unit_amount_ars: Money, amount_ars: Money
  }[],
  missing_fields: {code: "quote_unresolved", count: Positive}[],
  excluded: ["shipping", "financing", "labor"]
}
Quote = {
  amount: Money (positivo), currency: "ARS", condition: Condition,
  availability_at_quote: in_stock|out_of_stock|unknown,
  quoted_at: DateTime, expires_at: DateTime,
  references: RRef[],
  notice: "Cotización histórica, sin garantía de precio/stock actual",
  quote_ref: QRef, component_ref: PRef
}
Benefit = {
  status: supported|unknown|not_an_improvement,
  before: DecimalText|null, after: DecimalText|null,
  source: RRef[],
  label: "Referencia técnica; no FPS ni rendimiento garantizado"
}
```
Money de línea/quote exacto del servidor, no coste recomputado en cliente. `total_ars`
puede ser null mientras known_subtotal_ars es conocido y within_budget false/null.
Cost no tiene currency/condition propios: ARS del root, condition en quotes/root.
Quote no lleva quantity, store, stock_quantity, offer_id, product_id, variant_key,
source_url ni current_offer; URL de procedencia se resuelve por referencias.
Benefit.source es array de strings rN, NO objetos de benchmark ni URLs. Los scores
reconstruidos son strings decimales sin requisito de dos decimales. Sin soporte
publicable: null/null y source=[], incluso al reservar un supported histórico como
unknown. No workload/unit/version/model/sample_count/percentage/FPS en Benefit.

## Dependencias y fuentes públicas

```text
Dependency = {
  kind: Category|"thermal_compound",
  required: boolean,
  state: included|available_confirmed|priced|missing,
  amount_ars: Money|null,
  reason: string (controlada),
  references: RRef[]
}
PublicRef = {
  ref: RRef,
  class: manufacturer_spec|manufacturer_manual|manufacturer_support|
         manufacturer_policy|retail_product|benchmark_blender_cpu|benchmark_tpu_raster,
  url: HttpsUrl,
  consulted_on: Date,
  locator: string (etiqueta controlada según class)
}
```
Dependency SIN component_ref/quote_ref/line_ref/resource_ref ni IDs/source_refs privados.
No deducir coste adicional sumando dependencias al Cost: evitar doble conteo; Cost es
la salida económica autorizada. reason para Category: etiqueta +
`: acción adicional; coste completo obligatorio`. Thermal_compound: texto controlado
según state, más advertencia de reutilizar cooler/instalación no identificada.
Estados thermal: Incluido en paquete nuevo documentado / Disponibilidad declarada
explícitamente para esta etapa / Dependencia cotizada en la revisión histórica /
Disponibilidad o cotización necesaria no acreditada, respectivamente.

Locator por class: Ficha técnica del fabricante / Manual del fabricante / Soporte
CPU/BIOS publicado / Política nominal del fabricante / Producto comercial histórico /
Referencia Blender CPU4.5.0 / Referencia raster1440. No locator privado original,
source_id, consulted_by, hash, notas de catálogo o metadata arbitraria. Photo no
forma parte de PublicRef.class (no retail_image allí); es SourcePhoto separada.

## Errores y headers actuales

Share APIRoute captura validación y PCError/AuthError; body `{detail: string}`:
-401: `Share request unavailable` (mapping fallback actual del router).
-403: `Forbidden`;404: `Shared plan not found`;409: `Share conflict`.
-422: `Invalid share request` si RequestValidationError; `Share request unavailable`
  para fallo PCError422 de proyección/servicio.
-429: `Too many requests`, Retry-After decimal en segundos para presupuesto público.
-503: `Share service unavailable` para error PCError503 sanitizado del servicio.

Invalid/revoked/deleted público mismo404, sin discriminador de causa. Plan eliminado
deshabilita lectura por join fresco; eliminar PC no revoca share. Consulta/simulación
no escribe PC. Fallos de capas anteriores pueden usar body genérico distinto:
BodyLimits400/408/413 → `{detail: string}`; ruta inexistente404/método405 → detail
string estándar; handler main de Unavailable/SQLAlchemyError503 →
`{detail: "Service unavailable"}`. Main tiene validación general422
`{detail: {type: string, loc: (string|int)[], msg: string}[]}`, pero la validación
normal dentro del APIRoute shares se reemplaza por el422 fijo anterior.
No convertir toda respuesta no200 en PublicPlan ni exponer cuerpos en logs.

Boundary en paths shares: Cache-Control=no-store, Referrer-Policy=no-referrer,
X-Content-Type-Options=nosniff, X-Robots-Tag=noindex,nofollow (valor real con espacio
tras coma: `noindex, nofollow`). Error inesperado ANTES de start →500
`{detail: "Internal server error"}` fijo. DESPUÉS de start no hay nuevo status/body:
propaga error interno seguro; no prometer JSON de error agregado al stream.

## Inmutabilidad, seguridad y estado de entrega

Public GET solo lee snapshot capturada + frescura de revocación/plan y escribe el
contador operativo separado; no catálogo actual, repricing, refresh de TTL ni fetch
de fuentes/fotos/LLM. Fechas expiradas son históricas, no disponibilidad vigente.
No pedir precios actuales para completar esta proyección. Validar enlaces/fotos
como consumidor no amplía registros ni habilita HTTP/Tom's fuera de política.
Omitidos campos desconocidos por reconstrucción/allowlists; no se hace detector
universal de PII. La procedencia/binding es parte de la frontera, no equivalencia
automática entre catálogo y cualquier texto publicable. No rederivar motor/estado.
La decisión de tolerancia de futuras claves en frontend corresponde a su contrato;
este documento solo fija las claves emitidas hoy, sin ordenar un parser TS estricto.

Build comunicó cierre LOCAL TEST:5 boundary PASS/exit0, lint/formato2 archivos exit0,
mismo proceso cooperativo antes fallido ahora PASS2.82s; relectura de seguridad cerró
P2 post-start para ese pipeline TEST. No se cambiaron probe/worker/needles/loggers
para lograr ese resultado. No prueba universal de APM/producción/BFF.
**Este DTO NO autoriza montar routers en main ni activar publicación pública.**
Frontend prepara contra fábrica TEST y gates Next/BFF posteriores coordinados.
Reservas: cotización vencida por HTTP, Next end-to-end,503 real de proceso.


</details>
