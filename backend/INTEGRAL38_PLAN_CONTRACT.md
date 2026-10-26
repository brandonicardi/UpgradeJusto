# CU07 torre — propuesta de contrato v1, previa a código

## Aceptación posterior de Build

Build confirmó lectura completa y aceptación v1 antes de implementación; deltas
CU07/CU09 aplicados por su dueño. Autorizado implementar SOLO CU07 privado, sin
CU09/UI/MCP ni wiring main/proxy. Parent38_c_001 confirmado por coordinación;
verificación local de archivos pertinente antes de preparar38_d_001. Las reservas
de fuentes, gates TEST y alcance conservador continúan vigentes. Texto de propuesta
inferior conserva el diseño aprobado, no acredita ejecución ni aceptación runtime.

**CONTRACT READY para revisión de Build/coordinación. NO decisión aceptada, código,
migración aplicada, endpoint activo ni cierre38.** Implementar únicamente después
de aceptación explícita y deltas CU07/CU09 aplicados por Build. Única escritura de
este turno: este documento. Main está liberado y no se modifica.

## 1. Fuentes verificadas y elección mínima

Leídos: plans/models.py, service.py, repository.py; shares/models.py, projection.py,
repository.py; persistence/schema.py (plans/plan_shares); INTEGRAL38_CONTRACT §5/7.
Legacy plans guarda un snapshot JSONB mutable por revisión CAS; su DTO presupone
seis categorías. plan_shares tiene FK a plans y proyección allowlist legacy.
No introducir v2 en esas tablas ni proyectar torre a seis piezas: rompería lectores
y aislamiento de snapshots. Se proponen DOS tablas nuevas, sin backfill ni cambios
de bytes JSON, revisiones, ofertas o enlaces publicados existentes.

Router→servicio→repositorio. Cálculo puro reutiliza actions/compatibilidad/beneficio/
coste torre aceptados; sin HTTP/BD/LLM dentro del cálculo. El repositorio entrega
torre y catálogo completo fijados en una transacción. No duplicar el motor ni
modificar recomendaciones/compatibilidad/retail para implementar este contrato.

## 2. API privada nueva, independiente de /api/plans

Prefijo canónico `/api/tower-plans`, UUID canónico en segmentos. Discriminador
obligatorio en entrada y salida: `kind:"tower_plan",schema_version:2`.

- `POST /api/tower-plans` →201: calcula servidor y guarda revisión1.
- `GET /api/tower-plans?page=1&page_size=20` →200 `{items,total,page,page_size}`;
  page1..10000, page_size1..50. Orden determinista updated_at DESC,id ASC.
- `GET /api/tower-plans/{id}` →200: última revisión congelada, sin recálculo.
- `GET /api/tower-plans/{id}/revisions/{revision}` →200: revisión histórica inmutable.
- `POST /api/tower-plans/{id}/recalculate` →200: cálculo explícito y nueva revisión;
  NO PUT implícito ni GET que cambie quotes, PC o snapshots.
- `DELETE /api/tower-plans/{id}` con `{expected_plan_revision}` →204: baja lógica
  CAS; conserva historial/idempotencia y no modifica la PC. Repetición sobre baja404.

Lista acepta SOLO page/page_size canónicos no duplicados. Las demás rutas tienen
query vacía. Mutaciones requieren sesión servidor fresca, propiedad PG, Origin/CSRF
y client_ip/firma37 existentes. Nunca owner_id/user_id/rol del cliente/modelo.
Permiso básico: usuario autenticado propietario; no crear rol especial de planes.

404 para entidad ajena/inexistente/baja, antes de revelar revisión/catálogo;409 para
CAS de plan, revisión PC, catálogo esperado distinto del activo o clave idempotente
reutilizada con otro cuerpo.422 DTO cerrado/acciones inválidas; límites HTTP37
413/408/400; fallos BD503 sanitizados. Veredictos de hardware no son errores HTTP:
un plan bloqueado puede guardarse como borrador explícitamente rotulado.

## 3. Request: selecciones, no resultados autorizantes

Crear recibe `TowerPlanDraft`:

```json
{
  "kind": "tower_plan",
  "schema_version": 2,
  "client_request_id": "UUID",
  "name": "Plan elegido",
  "pc_id": "UUID",
  "expected_pc_revision": 1,
  "expected_catalog_version": "publicacion-esperada",
  "objective": "productivity",
  "workload": "blender-cpu",
  "budget_ars": "500000.00",
  "price_condition": "cash",
  "stages": [
    {
      "name": "Primera etapa",
      "budget_ars": "500000.00",
      "materials": [],
      "actions": [
        {
          "action": "replace_category",
          "category": "cpu",
          "candidates": [{"component_id": "seleccion-servidor", "quantity": 1}]
        }
      ]
    }
  ]
}
```

Ejemplo de selección, NO hardware/precio/beneficio acreditado. Recalculate recibe
el MISMO draft completo más `expected_plan_revision:int>=1`; permite editar etapas
explícitamente. Para minimizar ambigüedad, pc_id no puede cambiar respecto del plan;
otra PC requiere crear otro plan. La revisión PC/catálogo sí se actualizan mediante
recálculo explícito. El catálogo esperado es una precondición, NO permiso para
consultar otra revisión ni elegir precios históricos.

objective general|gaming|productivity; workload blender-cpu|null y aplicabilidad
igual a CU06; price_condition cash|list. ARS strings Decimal positivos, máximo12
dígitos enteros y2 decimales; floats/NaN/exponentes rechazados. No precio/evaluación/
evidencia/flags de reglas/estado aceptados en request. No key de recomendación
autorizante: frontend envía sus actions elegidas y el servidor vuelve a calcular.
Declarados se permiten como selección desconocida, nunca atributos deducidos.

Actions exactamente TowerAction/TowerCandidate aceptados: candidatos sin UUID de
línea; line_id propio solo cuando la operación lo exige; XOR component_id/declarado.
Contexto omitido cuando no aplica. Motherboard con contexto explícito conserva
`{"bios_version":null}`; al reemplazarla sin contexto BIOS queda desconocida, no
heredada. No cambiar shared DTO para aceptar JSON no canónico.

Límites propuestos para aprobación:1..12 etapas;1..36 acciones/etapa y<=96 acciones
totales; nombres1..100; candidato/declarado<=200;1 material/etapa; configuración
resultante conserva límites tower2 (36 líneas, RAM16 módulos/4 grupos, storage16,
fans32/8 grupos y categorías únicas donde corresponde). Cada prefijo se valida,
no solo la última etapa. Snapshot serializado<=1MiB; si excede422 antes de escribir,
sin truncar evidencia. Ingress general37 conserva262144 bytes y deadline5s.

## 4. Snapshot v2 y lectura estable

Respuesta privada de revisión:

```text
{kind:"tower_plan",schema_version:2,id,name,revision,pc_id:UUID|null,
 created_at,updated_at,snapshot:{
   generated_at,pc_revision,base_configuration,
   objective,workload,budget_ars,currency:"ARS",price_condition,
   versions:{catalog,rules,policy,inventory,scope,references,identity,calculation},
   stages:[{position,name,budget_ars,actions,materials,
     evaluated_configuration,evaluation,benefit,dependencies,offers,
     cost,cumulative_cost,status,missing_fields,warnings}],
   cost,benefit,status,label,missing_fields,limitations
 }}
```

`status=ready|requires_verification|blocked` es calculado servidor; no workflow de
aprobación humana nuevo ni sinónimo de certificación física. Resumen de lista:
id/name/revision/status/label/objective/budget_ars/total_ars/updated_at, con el mismo
discriminador. No incluir toda la PC en páginas de lista. Snapshot privado puede
contener la torre base necesaria para reproducibilidad; jamás reutilizarlo entero
para publicación pública. Historial conserva nombres/base/contexto propios de cada
revisión, aunque el header actual cambie o su pc_id quede null al borrar la PC.

Evaluation/cost/benefit/dependencies/offers mantienen las formas torre/CU06 aceptadas.
scope/cobertura y versiones son campos explícitos, no extraídos de IDs ni strings
de apariencia. Versionar el cálculo nuevo como `tower-plan-calculation-1` solo al
implementar y probar. Guardar actions canónicas reutilizables con BIOS null requerido.

GET devuelve snapshot y quotes originales, incluido status/observed_at/expires_at
capturado al generar: NO reevalúa, recotiza ni cambia JSON porque pasó el tiempo.
Frontend muestra «cotizado el… / venció el…», y calcula indicación visual vencida
desde expires_at sin reescribir la quote ni aparentar stock actual. Sin llamadas
retail externas, proveedor, cuotas LLM ni consultas arbitrarias al leer/recalcular.

## 5. Etapas acumuladas, costes, material y veredicto

Partir de torre guardada con revisión verificada. Aplicar etapa1 sobre base; etapa2
sobre resultado1, etc. Validar todas las acciones y evaluar todas las familias
requeridas en CADA resultado. RAM reemplaza conjunto completo; storage/fans suman
líneas/cantidades reales; no conservar pieza sustituida ni BIOS de placa anterior.
Guardar plan jamás aplica sus acciones a la PC ni incrementa su revisión.

Toda generación usa UNA publicación activa fijada y UN instante de cotización.
Resolver TODOS los IDs de catálogo, no primeras50. Quotes fresh/in_stock/condición/
identidad exacta a ese instante; expiración24h, sin precios legacy fallback. Demandas
por misma pieza/quote agregadas dentro de etapa y acumuladas en prefijos para no
reutilizar stock conocido insuficiente en etapas distintas. Stock None no es0;
in_stock sigue política CU06 vigente. No prometer reservas ni disponibilidad futura.

Coste etapa = todas sus adquisiciones incrementales con cantidades; acumulado = suma
de adquisiciones de prefijos. Piezas instaladas conservadas no se compran otra vez;
retiradas no dan crédito. No banco implícito de piezas revendidas/reutilizadas.
Cada stage.budget_ars es techo de gasto incremental, NO transferencia automática
de sobrantes. El total del plan es techo acumulado independiente; sumar techos de
etapas no equivale a gasto. Presupuesto insuficiente conocido bloquea aunque queden
precios desconocidos; conservar subtotal conocido, total null cuando incompleto y
todos los faltantes. Envío/financiación/mano de obra expresamente excluidos.

Beneficio antes/después de cada etapa y final contra base original; solo referencias
curadas aplicables al objetivo/workload, con fuentes/límites. No núcleos/VRAM/precio
como rendimiento ni FPS inventados. Etapa preparatoria de dependencia puede no
mejorar rendimiento: etiquetar «dependencia/preparación», no fingir beneficio ni
venderla como recomendación de rendimiento independiente. Plan ready exige beneficio
final apropiado respaldado, todos los prefijos completamente compatibles y costes/
techos completos. Preparación nunca oculta un fallo o unknown de compatibilidad.

Materiales por etapa: solo confirmación explícita
`{kind:"thermal_compound",state:"available_confirmed",confirmed:true}`. Necesidad
requiere evidencia de operación; no pasta universal. Inclusión corresponde solo a
paquete nuevo documentado; cooler/CPU conservado o mismo SKU reseleccionado no prueba
sobrantes. Stock-cooler no identificado conserva la condición e incertidumbre de
instalación de CU06. Confirmación de una etapa no acredita disponibilidad ilimitada
en etapas posteriores; cada una confirma sus materiales. Inclusión usada en etapa1
no se convierte en nueva pasta incluida al remontar esa pieza en etapa2. Sin
representación/cotización respaldada de material no inventar priced ni coste cero.

Fallo aplicable o presupuesto insuficiente conocido domina→blocked, reteniendo
faltantes. Sin fallo, unknown necesario/coste incompleto/beneficio no respaldado
→requires_verification. Guardado permitido con label «Plan borrador — requiere
verificación» o «Plan bloqueado — no ejecutar», nunca recommended ni positivo.
ready solo con todos los gates anteriores; scope/excludes/warnings siempre visibles.
T10 global pendiente actualmente impide afirmar un positivo torre por este contrato.

## 6. Persistencia propuesta y atomicidad

Migración futura `38_d_001`, parent `38_c_001`, solo después de aceptar este diseño
y comprobar head real antes de crear archivo; si otro head lo cambió, coordinar
parent, no editar historia ni crear rama silenciosa. Sin cambios en tablas legacy.

- `tower_plans`: id UUID PK, owner_id FK auth_users NOT NULL/index, pc_id FK pcs
  nullable ON DELETE SET NULL, current_revision INT>=1, create_request_id UUID,
  create_request_hash CHAR64, created_at/updated_at/deleted_at timestamptz;
  UNIQUE(owner_id,create_request_id). Sin snapshots mutables en header.
- `tower_plan_revisions`: PK(plan_id,revision), FK tower_plans ON DELETE CASCADE,
  operation_id UUID, request_hash CHAR64, snapshot JSONB NOT NULL, created_at;
  UNIQUE(plan_id,operation_id). Checks objeto JSONB, kind tower_plan/schema_version2,
  revisión positiva y hash hex64. Snapshot incluye input normalizado necesario para
  reproducción; nunca tokens/sesiones/credenciales. La aplicación no UPDATE/DELETE
  filas de revisión durante recálculo. Baja lógica conserva historial.

Crear/recalcular/baja: una transacción; comprobar propiedad de plan y PC antes de
409; orden fijo plan→PC→active/publicación (crear no tiene plan previo). Locks/CAS
mantienen revisión PC, catálogo y plan estables durante cálculo; mismas revisiones
en las doce etapas. Reloj/quotes revalidados antes de commit: vencida en generación
no puede dejar plan ready; rollback/reintento explícito409, sin fallback ni fetch.
Header de revisión y snapshot se insertan/avanzan atómicamente. Fallo BD no deja
plan parcial ni muta PC. No escritura de sesión, permisos, publicación o proveedor.

Deadline propuesto de generación/recalculo:5s monotónicos en el servicio, comprobado
antes/después de cada etapa y antes del commit; timeout408 sanitizado y rollback,
sin continuar cálculo en background. Motor puro sin reloj ni proveedor. Esto no
promete interrupción física dentro de una llamada síncrona del motor: cardinalidades
acotadas y gate de duración deben demostrar viabilidad antes de activación. PG con
statement_timeout3s/lock_timeout1s SET LOCAL por operación; expiración/fallo no deja
revisión parcial ni retry automático. No consume cuotas LLM ni inventa latencia real.

Idempotencia propuesta para doble confirmación UI: client_request_id por operación,
UUID opaco NO autorización. Crear: clave única propietario; recálculo: única plan.
Hash de request canónico INCLUYE precondiciones, acciones, materiales y presupuestos.
Misma clave/cuerpo, después de sesión/propiedad fresca, devuelve revisión ya guardada
sin recotizar/añadir revisión (crear repetido200 + Idempotency-Replayed:true);
clave con distinto cuerpo409. Repetición de operación antigua devuelve SU revisión,
no latest. Baja lógica da404 y no permite resucitar plan con reintento. Sin clave
válida422; no confiar solo en deshabilitar botón o confirmación doble del frontend.

Rollback de transacción preserva header/historial. Downgrade de migración rehúsa si
hay planes/revisiones torre, NO los borra para aparentar reversibilidad; sin filas,
elimina exclusivamente tablas nuevas en orden FK. Gate sobre esquema anterior
sintético TEST, nunca DEV ni SQLite/memoria como prueba PostgreSQL.

## 7. CU09 torre reservado para incremento separado

Este bloque implementaría CU07 privado, NO shares torre ni stubs activos que parezcan
funcionales. Contrato CU09 a aceptar antes de activación:
POST `/api/tower-plans/{id}/shares` fija expected_plan_revision/title; lista/revoca
por propietario servidor y CSRF. Nueva ruta pública canónica
`/api/shared-tower-plans/{token}`, solo lectura. Nunca reutilizar FK/proyección
plan_shares legacy para estos IDs ni cambiar enlaces/bytes históricos.

Publicación congela allowlist por nivel de una revisión concreta; proyección solo
nombres técnicos curados o declaración rotulada no identificada, fotos HTTPS ya
verificadas/allowlisted, acciones sin IDs de líneas privadas, evaluaciones/cobertura,
quotes/fechas, scope/versiones/materiales con texto condicional aprobado. Recortar
facts/missing_fields/texto libre que pueda filtrar identificadores o notas; no usar
serialización directa del snapshot como proyección. Título público explícito; no
nombre privado de PC/plan por default. Excluir notas, emails, owner/PC/conversación
IDs, UUID de líneas, tokens, input original y otros textos privados. No fetch de URLs.

Token aleatorio de alta entropía revelado una sola vez; persistir solo SHA256, nunca
bearer completo ni logs/analytics de URLs. Revocación verifica propietario PG y es
efectiva en siguiente GET público, sin caché; no index/referrer. Cada GET consulta
revocación/plan no eliminado; no recotiza. Token de revisión antigua no cambia con
recálculo del plan. Tabla nueva/proyección/migración CU09 se decidirán en ese bloque,
NO dentro de38_d_001 ni con permisos otorgados por este documento.

## 8. Integración futura y aceptación del incremento

Proxy/gateway requerirán allowlist explícita de rutas nuevas/métodos/query acotada;
NO heredan /api/towers ni habilitar wildcard genérico. Mantener firma37 de método y
raw_path exactos. Wiring main y gateway por sus dueños después de gates; sin editar
ahora main/auth/proxy/body_limits. Frontend solo tras contrato aceptado y gate API.
Adaptar posteriormente las herramientas existentes de plan entre siete MCP según
schema; no nuevos nombres/tools, user_id autorizante ni SQL arbitrario. No declarar
asistente/planes/share torre integrados porque exista este diseño.

Criterios focales propuestos, Build único runner TEST:
1. Puro: acumulación de etapas, sustitución RAM/BIOS desconocida, múltiples discos/
   fans, evidencia/versiones constantes, preparación sin rendimiento ficticio.
2. Fallo+pendientes y presupuesto insuficiente conocido dominan; desconocidos no
   generan ready; cuotas materiales/stock agregadas por prefijo, no pasta reutilizada.
3. PG real A/B en todas las operaciones, ownership antes CAS/catalog409, rollback
   atómico, doble envío idempotente/concurrente y clave con cuerpo distinto409.
4. Quote actual al generar, histórico GET idéntico tras expiry/publicación posterior,
   recálculo inserta nueva revisión y preserva JSON anterior. PC no cambia.
5. Upgrade/downgrade conservador sobre esquema previo TEST; planes/shares legacy
   conservan bytes/lectores sin nueva suite rutinaria de diez CU.
6. Gate HTTP montado posterior: CSRF/Origin/query/payload cerrado/caps37; no evidencia
   ni resultados cliente, >50 por ID, snapshot completo sin truncar nueve categorías.
7. CU09 posteriormente: proyección con notas/IDs sintéticos adversarios, hashes,
   revisión congelada, revocación PG y lectura pública sin reprice. No afirmar ahora.

Reservas explícitas: fuentes técnicas positivas torre/T10 siguen pendientes fuera
de este contrato; fallo ProviderConnectionError de extracción real bloquea su gate,
no esta propuesta. No reconfigurar proveedor/servicios, correr suites, instalar,
migrar, commitear ni activar nada para preparar el documento.
