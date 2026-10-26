# CU07 torre privado — implementación privada aceptada localmente

## Resultado posterior atribuido a Build/revisiones

Build9 puros PASS0;3 PG de planes y1 migración PASS dentro de corrida combinada6
con2 nodos de extracción. Head38_d_001 único verificado/aplicado solo TEST, sin reset
del catálogo. Lint/formato10 archivos0 tras estilo mecánico, sin repetir gates por ello.
Revisiones funcional y seguridad aceptaron el privado. Después wiring main/proxy/
no-store y guard histórico int32 tras propiedad, test montado sobre main PASS dentro
del combinado5 (otros4 son PG/MCP). Relectura seguridad del delta favorable.
No reinterpretar estas corridas como suite nueva única ni como ejecuciones del autor.
Historial append-only por aplicación, no trigger. Tiempo cooperativo no preemptivo.
Frontend privado en implementación; CU09 separado, sin positivo físico ni cierre38.

## P2 lectura histórica: contrato10 dígitos frente a INTEGER PG

Build diagnosticó en TEST readonly DataError/SQLSTATE22003 al comparar INTEGER
revision con9999999999. Defecto real de binding, NO fallo de hardware ni motivo para
cambiar la capacidad de la tabla/contrato API. Bloquea aceptación de activación
hasta gate/relectura focal; no se declara cerrado por este PATCH.

Corregido exclusivamente tower_repository.historical/get: después de header con
propiedad verificada, entero fuera de1..2147483647 devuelve el404 normalizado de
historial, SIN SELECT/binding a tower_plan_revisions. Valores dentro del rango
siguen el lookup real: no se asume inexistencia por superar current_revision.
API/regex siguen admitiendo hasta9999999999, sin migración/cambio de políticas.
get distingue None de0/false: solo None elige revisión actual; tipos internos no
int/boolean/string no se usan como revisión autorizada ni llegan al bind INTEGER.
Firmas/constructor/interfaz MCP/forma de dict permanecen iguales. Ajeno404 ocurre
ANTES del guard, anónimo401 sigue siendo responsabilidad del transporte servidor.

Regresión en el nodo montado existente: revisión1→200;2147483647,2147483648 y
9999999999→404 de historial para propietario, nunca503; ajeno al máximo→404 de plan,
sin filtrar detalles; anónimo al máximo→401. checked verifica no-store en todos.
Archivos de este delta: plans/tower_repository.py,
tests/test_tower38_plan_mounted.py y este handoff. Main/proxy/DTO/migración intactos.

READY para Build, SOLO después de B2 composición READY, wrapper PG TEST:
`tests/test_tower38_plan_mounted.py::test_mounted_tower_plan_signed_owner_history_cache_and_caps`.
Lint/formato focal y relectura independiente P2 tras PASS. Sin shell/runners propios,
commits, datos privados ni lectura de fuentes activas del asistente. No repetir9/6
por rutina. Evidencia del diagnóstico atribuida a Build, no a ejecución propia.

## Activación coordinada: wiring preparado, gate montado pendiente

Coordinación confirmó aceptación funcional/seguridad LOCAL del bloque CU07 privado,
PURE9 PASS y PG3+migración1 dentro del combinado6 PASS. Ruff format diez archivos0
tras correcciones mecánicas de Build, sin lógica. Historial inmutable por aplicación,
NO trigger/inmutabilidad física garantizada ni positivo hardware real.

Delta actual autorizado exclusivamente en main.py, api/proxy_ip.py, NUEVO
tests/test_tower38_plan_mounted.py y este handoff. Main conserva wiring previo de
CU06 y extracción; añade import ordenado/include_router torre planes UNA vez.
no_auth_cache incorpora SOLO igualdad `/api/tower-plans` y prefijo
`/api/tower-plans/`; éxitos y errores del handler/auth/validación/BD quedan no-store.
BodyLimits sigue exterior,262144/5s sin aumento y sus rechazos413 ya no-store.

Central permitted_query comprueba la política CU07 ANTES de su shortcut query vacía.
Se aplica en client_ip para peer directo y firmado, sin cambiar firma37 de método/
raw_path/IP/timestamp, peers/secret/header whitelist. Sin wildcard genérico ni delta
de query a otros CU. Coincide con rutas del router y acota paginación también en el
centro: page1..10000/page_size1..50 positivos canónicos, únicos, sin alias codificados.
Query máxima canónica23bytes (dos parámetros válidos); no parseo de enteros enormes.

Definiciones exactas, U sustituido por UUID lowercase de8-4-4-4-12 hex:
- GET `/api/tower-plans`, query vacía o page/page_size válidos únicos.
- POST `/api/tower-plans`, query vacía.
- GET/DELETE `/api/tower-plans/U`, query vacía.
- GET `/api/tower-plans/U/revisions/[1-9][0-9]{0,9}`, query vacía.
- POST `/api/tower-plans/U/recalculate`, query vacía.
Encoded raw_path/UUID mayúscula/revisión0 o con leading zero no pasan política.
Métodos restantes no habilitados. Redirect/404 de ruta no constituyen operación
privada autorizada; no se crea endpoint de token/share CU09.

Tests NUEVOS, main.app real, sin app aislada ni overrides de auth/owner/service/IP:
1. `test_mounted_tower_plan_signed_owner_history_cache_and_caps`: CRUD/lista/history,
   replay viejo tras revisión3, A/B404, anónimo401, Origin/CSRF403, flags422, CAS409,
   query403 y413. Verifica no-store en cada éxito/error incluidos503 con fallo
   sintético de getter (NO afirmación de outage PG). Firma con clave sintética
   fixture TEST y peers loopback de actores; no lee secreto real ni cambia archivos
   de entorno. Método/raw_path incorrectos, headers parciales/extra y aliases fallan.
   No PC writes; cleanup SOLO filas de planes de actores sintéticos; active/version
   y número de componentes publicados se comparan sin reset ni hardcode691.
2. `test_tower_plan_central_policy_is_closed_before_empty_query_shortcut`: política
   central exacta, límites/query vacía y métodos/rutas no permitidos; controles de
   política previa /api/pcs sin modificar sus reglas. No simula auth ni PG.

Build único runner: esperar B2 READY por imports de main/assistant antes del gate;
NO leer ni cambiar fuentes activas de B2 para intentar destrabar este test.
Desde backend, dentro del wrapper autorizado TEST:

`.venv/Scripts/python.exe -m pytest -q tests/test_tower38_plan_mounted.py`

O nodo PG montado exacto:
`tests/test_tower38_plan_mounted.py::test_mounted_tower_plan_signed_owner_history_cache_and_caps`.
Ruff check/format focal de los tres archivos Python cambiados. Sin repetir9/6 por
rutina. Ningún runner/exit/PASS posterior propio. Gate API montado aún NO aprobado;
frontend/BFF esperan ese resultado. No CU09, MCP propio, UI ni cierre38.

## Checkpoint Build y corrección exclusivamente de formato

Build informó PURE9 PASS/exit0; head único38_d_001 comprobado por runner;
PG TEST plan3+migración1+extract-context2=6 PASS/exit0. Sin DEV/reset ni cambio
catálogo691/publicación NV3 según Build. Ruff check diez archivos/exit0; format
nueve archivos/exit1, tower_models ya limpio. Suite PURE0.19s incluye ejercicio
real de deadline aprobado; no es medición individual ni interrupción física.

Corrección posterior solo PATCH de formato en esos nueve archivos: migración,
API, calculation/repository/service/tables y tres tests. NO lógica/assertions ni
interfaces cambiadas; no repetir9/6 por rutina. Ruff posterior aún no ejecutado
por este escritor; si queda residual, coordinación puede aplicar diff mecánico.
Funcional/seguridad independientes y gate main/proxy/no-store siguen pendientes.
Contrato aceptado conservado; sin fuentes/escrituras ajenas ni MCP/CU09 implementados.

## Interfaz de lectura EXACTA para autor MCP (sin leer archivos activos)

Imports/constructores existentes:

```python
from upgradejusto.persistence.runtime import runtime_engine
from upgradejusto.plans.tower_repository import TowerPlanRepository
from upgradejusto.plans.tower_service import TowerPlanService
from upgradejusto.plans.tower_models import TowerPlanRead

repository = TowerPlanRepository(runtime_engine())
service = TowerPlanService(repository)
raw = service.get(owner, plan_id, revision)
wire_private = TowerPlanRead.model_validate(raw).model_dump(mode="json")
```

Firmas reales: `TowerPlanRepository(engine)`; `TowerPlanService(repository)`;
**ambos** exponen `get(self, owner, identity, revision=None)`. plan_id corresponde
al parámetro `identity`, no existe keyword plan_id en esos métodos. owner e identity
son UUID servidor; revision=None selecciona actual; si se solicita histórica,
validar entero positivo acotado antes de llamar, nunca0/false como valor implícito.
No añadir método nuevo ni llamar dispatcher desde este módulo.

owner DEBE provenir de identidad servidor autenticada/fresca del transporte MCP;
jamás de argumentos user_id/owner_id generados por modelo. El servicio NO valida
una sesión por sí mismo: repositorio comprueba propietario PG del plan no eliminado
ANTES de leer revisión. Ajeno/inexistente/baja→PCError(404,"Plan not found");
revisión inexistente→PCError(404,"Plan revision not found"). No fallback legacy ni
proyección a seis categorías. No cambia PC guardada, plan, cuotas o historial.

Retorno REAL es dict privado, NO instancia Pydantic:
`{kind:'tower_plan',schema_version:2,id:UUID,name:str,revision:int,pc_id:UUID|None,
created_at:datetime,updated_at:datetime,snapshot:dict}`. Snapshot ya JSON-compatible
con base_configuration/context, stages (evaluated_configuration/evaluation),
actions/materials/dependencies/offers/cost/benefit, scope/versiones/advertencias.
GET hace lectura PG y SET LOCAL timeouts, SIN catálogo vivo, proveedor, recálculo,
recotización, reloj de expiración ni reinterpretación de quotes viejas.

**Privacidad:** wire_private es solo conversión UUID/datetime a JSON, NO proyección
segura MCP/pública. Contiene notas PRIVADAS en
`snapshot.base_configuration.context.notes`,
`snapshot.stages[*].evaluated_configuration.context.notes` y
`snapshot.stages[*].evaluation.evaluated_configuration.context.notes`.
Adaptador MCP debe construir allowlist mínima necesaria y excluir notas/contextos
libres innecesarios y otros identificadores privados; no enviar snapshot entero al
LLM ni buscar/recolectar notas recursivamente para luego publicarlas. No devolver
owner/email/conversación/client_request_id/session/token como evidencia. No existe
en este módulo un método de proyección pública; CU09 sigue separado y sin activar.

Contrato v1 aceptado por Build antes del código y deltas CU07/CU09 aplicados según
coordinación. Estado propio: **READY para Build PURE primero**, NO verificado ni
CU07 productivo completo. Sin runners/shell, instalaciones, migración ejecutada,
lectura de credenciales, cambios de proveedor/servicios, commits ni delegación.

## Archivos nuevos / ownership

- `plans/tower_models.py`: DTO v2 cerrado, Decimal ARS normalizado, acciones/materiales
  de contratos aceptados;12 etapas/36 acciones etapa/96 total y límites torre.
- `plans/tower_calculation.py`: cálculo puro acumulado; configuración/BIOS/RAM reales,
  evaluaciones/versiones, etapa preparatoria sin beneficio ficticio, coste por etapa
  y total; stock por inventario retailer/variante acumulado, no por alias interno.
- `plans/tower_service.py`: hash canónico (preserva BIOS null requerido), deadline
  cooperativo5s, cota JSON UTF8 de1MiB, recheck de expiración antes de commit.
- `plans/tower_repository.py`: SOLO tablas nuevas; PG propietario/CAS/catálogo fijado,
  advisory lock crear por propietario+operación; snapshots de historial sin UPDATE,
  replay de revisión original, baja lógica, SQL3s/locks1s SET LOCAL. Nunca usa la
  petición como autorización de owner ni SQL del modelo. PC propiedad antes409,
  incluido cuerpo conflictivo de idempotencia que apunte a PC ajena.
- `plans/tower_tables.py`: declara header/history sobre metadata existente, registrado
  al importar API/migración. NO fue necesario editar persistence/schema.py/env.py.
- `api/tower_plans.py`: router privado preparado, NO importado/montado en main.
- `alembic/versions/38_d_001_tower_plans.py`: parent38_c_001. Directorio y archivo38_c
  leídos: revisión38_c_001/down38_b_001, no otro head visto. Build debe confirmar
  que no cambió concurrentemente antes de migrar TEST. Solo crea dos tablas nuevas.
- `tests/test_tower38_plan_{pure,pg,migration}.py`: selección focal independiente.

Documentos propios: INTEGRAL38_PLAN_CONTRACT.md con aceptación recibida y este
handoff. Sin escrituras a main/auth/catalog/retail/admin/compat/recommendations/
extraction/planes legacy/shares/schema ni specs. CU09/UI/MCP no implementados.

## Interfaz exacta preparada

Prefijo `/api/tower-plans`; request discriminator `{kind:"tower_plan",schema_version:2}`.
POST raíz201/GET lista/GET UUID/GET UUID/revisions/N/POST UUID/recalculate200/
DELETE UUID204. DTO y snapshot detallados en contrato aceptado. Recalculate recibe
draft completo + expected_plan_revision, misma PC. Crear/recalcular vuelven a
resolver actions/beneficio/compatibilidad/ofertas servidor, no resultados cliente.
GET/historia/replay no consultan catálogo vivo, no reevalúan ni recotizan.
Cada revisión conserva base, nueve categorías, notas PRIVADAS, contexto, actions,
quotes observadas/vencimiento, scope/policy/inventory/rules/identity/references,
missing_fields y cálculo `tower-plan-calculation-1`. No exposición pública preparada.

Crear repetido devuelve200 + `Idempotency-Replayed:true`; initial201. Recalcular
repetido devuelve200 + header y SU revisión antigua aunque exista una posterior.
Clave+cuerpo distinto409 luego de controles de propiedad. Baja lógica404 impide
resurrección. Snapshot antiguo no se vuelve a escribir ni cambia por expiry.
Plan bloqueado o requires_verification se guarda claramente rotulado borrador/no
ejecutar. Ready exige TODOS los prefijos verdes, coste completo/techos y beneficio
final respaldado; no certificación física. T10 desconocido sigue bloqueando ready.

RAM reemplaza conjunto, motherboard no hereda BIOS, storage/fans acumulan líneas.
IDs nuevos de simulación UUID5 incluyen etapa, evitando que una recompra del mismo
SKU en etapa posterior se vuelva gratis por identidad de línea repetida. Referencias
a líneas de etapas anteriores deben ser las del resultado acumulado; si una edición
cambia ese resultado, referencias inválidas422 requieren revisión, no remapeo fuzzy.
Pasta incluida en paquete etapa1 no prueba sobrantes al remontar etapa2. Confirmación
material explícita por etapa; ninguna cuota LLM ni fetch externo de precios/proveedor.

## Wiring futuro obligatorio — no activar parcialmente

No se editó main ni proxy. Rutas canónicas usando
`U=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`:

| Método | raw_path admitido | Query |
| --- | --- | --- |
| GET | `^/api/tower-plans$` | vacía o page/page_size positivos, únicos, límites DTO |
| POST | `^/api/tower-plans$` | vacía |
| GET/DELETE | `^/api/tower-plans/U$` | vacía |
| GET | `^/api/tower-plans/U/revisions/[1-9][0-9]{0,9}$` | vacía |
| POST | `^/api/tower-plans/U/recalculate$` | vacía |

U es sustitución del patrón UUID completo, NO literal ni wildcard. Regex querylista:
`(?:page|page_size)=[1-9][0-9]*(?:&(?:page|page_size)=[1-9][0-9]*)*` más rechazo de
duplicados; page1..10000/page_size1..50. Router aplica esa política para transporte
directo y llama client_ip37; firmado también debe pasar política central existente.
Actualmente proxy_ip NO autoriza query firmada del nuevo prefijo: **necesita delta
coordinado explícito**, no fallback ni wildcard genérico. Firma37 método/raw_path
exactos sin cambios a secretos/peer trust. Frontend/BFF no activados.

Main deberá importar/include_router una vez y ampliar no_auth_cache a igualdad
`/api/tower-plans` y prefijo `/api/tower-plans/`, para éxito Y errores. Ingress
general262144/5s vigente; no nuevo proveedor/framework/middleware de auth. Hasta
esa integración revisada no declarar API montada/caché/gateway verificados.

## Gates solicitados a Build, separados y con exit individual

Desde backend:

1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_plan_pure.py`
2. Ruff check y format de archivos nuevos anteriores, corrección mecánica focal;
   no reabrir suites aprobadas ni cambiar lógica ajena por formato.
3. SOLO después de PURE aprobado: wrapper autorizado PG TEST, upgrade head38_d_001
   y `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_plan_pg.py tests/test_tower38_plan_migration.py`.
4. Revisión funcional/seguridad del delta privado. Wiring main/proxy por coordinación
   y test montado posterior antes de frontend. No repetir diez CU por rutina.

Ningún check ejecutado por este escritor: sin PASS, conexión activa o exit inventados.
No usar SQLite/memoria como prueba PG. Si un check falla, diagnóstico/corrección focal
y escalar resultados concretos, no rotación de suites. Formato manual pendiente de
Ruff Build; no ocultar residual ni asumir que imports equivalen a ejecución.

PURE preparado: acumulación RAM/BIOS/storage; stock6+6 contra10; presupuesto etapa y
total con subtotal conocido+unknown; preparación sin mejora independiente; gates
green/fail+missing SINTÉTICOS; hash/BIOS null/DTO/caps; deadline/expiry/size; >50 por
ID y recompra no gratuita; pasta paquete nuevo vs remount siguiente/confirmación.
Incluye ejercicio de deadline REAL con12 etapas/96 acciones sobre torre sintética
densamente poblada (RAM16, storage16, fans32); Build debe medir/pasar, no se afirma
duración desde este escritor. No garantiza terminación preemptiva de motor síncrono.
Un green parcheado prueba agregación, NO hardware real, T10 ni benchmark ejecutado.

PG preparado: app aislada con middleware/handlers reales y auth/CSRF/owner existentes,
solo override construcción de servicio hacia repositorio PG real. A/B, PC antes409,
CAS PC/catálogo/plan, create200 replay, history1/2 tras revision3, softdelete y no
resurrección; dos hilos PG crean UNA revisión; fallo después de INSERT history
revierte header/history; PC intacta. Catálogo recibido coincide con TODOS los IDs de
publicación real disponible, sin asumir tamaño fijo. GET/replay prohíben lookup vivo;
quote histórica sintética expirada insertada en filas propias conserva JSON/status,
no se vende como precio actual. Revocación de sesión real→401 en GET.

Migración preparada: esquema anterior sintético aislado en TEST, credenciales/JSON
legacy propios conservados; downgrade rehúsa borrar history, luego drop solo tablas
nuevas si vacías. NO drop/reset global ni mutación de publicaciones/catalog691.
Downgrade offline prohibido, online requiere tablas nuevas vacías. Metadata/FKs se
registran por imports propios; confirmar head real antes de aplicar por concurrencia.

## Límites y siguiente paso

Deadline cooperativo5s comprobado entre etapas/antes de commit; NO garantía de
interrupción dentro del motor síncrono ni de commit físico. Gate de duración pendiente.
Generation observa expiración actual PG de quotes antes de commit, sin repricing.
Pruebas PG preparadas no acreditan main/gateway montado; no-store de errores requiere
wiring descrito. Stock desconocido no es0 y no se promete reserva futura.
CU09/MCP/UI quedan para sus incrementos, sin stubs públicos que parezcan funcionales.
Groq/extracción real conserva su bloqueo externo informado; no reconfiguración ni
excusa para proveedor falso. Primero Build PURE, luego PG TEST, revisión y wiring.
