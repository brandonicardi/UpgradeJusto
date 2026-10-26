# CU03 — PCs por propietario, Sprint32 C

## Delta autorizado38 — antes de implementar

Torre schema_version2: nueve categorías, líneas UUID, selección catálogo XOR modelo
declarado1..200, estados por categoría present/unknown/absent. CPU/placa/GPU/fuente/
gabinete/cooler únicos; RAM hasta4 grupos/16 módulos, discos16, fans8 grupos/32 unidades,
máximo36 líneas. Son límites de entrada, no compatibilidad. Varias líneas de discos
no comparten PK por categoría. `/api/towers` CRUD con ownership/revisión y adaptación
legacy sin escritura; legacy no puede truncar edición v2. Migración aditiva38_a_001,
tabla PCs reutilizada, datos anteriores conservados. DTO exacto en
[contrato38 §1–2](../../backend/INTEGRAL38_CONTRACT.md). Aceptación sobre copia sintética
anterior y A/B, no usar DEV como prueba. Unknown conserva faltantes/declaraciones.
Todavía no implementado/verificado por este delta; historia inferior conservada.

Estado24/10: C/CU03 VERIFICADO funcionalmente por coordinación: PG195/cero skips,
browser5, proof HTTPS/reinicioREAL PC y Astra sin bloqueantes. Migraciones DEV/TEST
y proof atribuidos a Build. Pendiente operativo: comprobar liveness PG posterior
al E2E antes de D; wrapper no informó ese postestado. Detalle en bitácora32.

Contrato previo a código24/10. Alcance CRUD manual persistente, no extracción
CU02, administración CU10, simulación ni evaluación CU05. PC incompleta nunca se
presenta como compatible. B verificado; reutilizar sesión/CSRF/Origin/gateway B.

## Datos y reglas

PC pública `{id,name,revision,components,context}`; id UUID generado servidor,
revision entero positivo,1 al crear e incrementado en cada PUT correcto.
Propietario determinado SOLO por sesión; no owner_id/user_id/role en entradas.
Nombre: string strip,1..100 caracteres, sin NUL. Hasta6 grupos de componentes,
uno por categoría cpu/motherboard/ram/gpu/psu/case. Cada grupo:
`{category,component_id,quantity}`; component_id debe existir en catálogo y su
categoría coincidir. quantity entero estricto1..8; cpu/motherboard/gpu/psu/case
requieren1, RAM1..8 explícito, sin default ni inferencia. Un grupo RAM describe
módulos idénticos; configuraciones RAM heterogéneas quedan fuera de este C, UI
lo advierte sin inventar compatibilidad. Sin grupos duplicados ni piezas obsoletas
retenidas al PUT: reemplazo COMPLETO de grupos, incluido todo conjunto RAM.
components vacío permitido como PC incompleta. Sin cambios al catálogo.

context objeto con exactamente `bios_version`, `notes`, ambos string o null:
bios_version strip1..100 si conocido; notes strip1..1000 si conocido; NUL inválido.
null indica desconocido explícito, jamás cero/falso/ausente como compatible.
Contexto es declaración del usuario, no evidencia curada de fabricante; BIOS
declarada no prueba soporte CPU. Escribir ambos campos de context y components
explícitamente; no aceptar propiedades adicionales en ningún nivel.

## HTTP congelado para frontend C

- GET `/api/pcs?page=1&page_size=20`:200 `{items,total,page,page_size}`;
  page entero1..10000, page_size1..50. Solo PCs del dueño, orden ascendente estable
  por id. Página fuera del conjunto vacía conservando total. Sin escrituras.
- POST `/api/pcs` JSON `{name,components,context}`:201 objeto PC.
- GET `/api/pcs/{pc_id}`:200 objeto PC; sin guardar cambios/sesión simulada.
- PUT `/api/pcs/{pc_id}` JSON `{name,components,context,revision}`:200 PC nueva
  revisión. Actualización atómica con revisión esperada,409 si conflicto; no PATCH.
- DELETE `/api/pcs/{pc_id}`:204; confirmación explícita en UI antes del request.
  Sin cascadas que borren datos de otro propietario. Referencias futuras de planes
  fuera de C, no inventarlas.
- Todos requieren sesión autenticada:401 `{detail:"Not authenticated"}`.
  GET/PUT/DELETE ajeno o inexistente:404 `{detail:"PC not found"}`, nunca revelar
  existencia/propietario. UUID mal formado:422.409 `{detail:"PC revision conflict"}`
  solo después de resolver propiedad.422 para payload inválido, catálogo inexistente
  o categoría distinta (errores seguros sin SQL/secretos ni valores sensibles).
  503 `{detail:"Service unavailable"}` en fallo PG, sin fallback ni éxito parcial.
- POST/PUT/DELETE exigen Origin exacto3000 y CSRF asociado a sesión,403 genérico;
  conservar Cache-Control:no-store para respuestas privadas. Errores y validación
  no exponen password/cookies/tokens. GET nunca modifica PC.
- Gateway extiende rutas permitidas a `/api/pcs` y UUID de detalle. Firma mismo
  método/ruta/IP/timestamp B, sin XFF confiado, sin owner cliente. Lista conserva
  query page/page_size validados; firma ruta sin query conforme B; no permitir
  rutas arbitrarias ni query en mutaciones/detalle. No alterar auth B al extender
  allowlist PCS; todas las operaciones privadas verifican sesión en servidor.

## Persistencia, pruebas y aceptación

Módulo PCs dueño de sus escrituras; router→servicio→repositorio, catálogo por sus
operaciones existentes y sesión por módulo auth. FK propietario/catálogo y
transacción completa para PC/grupos/contexto. No migración destructiva ni overwrites
de datos existentes; concurrencia revision resuelta en PG. Cantidades explícitas y
null conservados tras leer y reiniciar. No SQL del LLM ni mocks finales.

PGtest obligatorio:55433/upgradejusto_test/upgradejusto_test_app/URLs iguales y
guardas existentes, cleanup SOLO fixtures propios. Usuarios A/B: A no lista PCsB,
GET/PUT/DELETE IDajeno devuelve404 sin mutarB, tampoco con owner_id inyectado.
A crea/lee/actualiza/elimina, unicidad de grupos, UUID/cantidades/IDs inválidos,
pieza inexistente/categoría incorrecta y rollback, revisión concurrente409,
contexto parcial/null, protección CSRF/Origin/gateway,401/503 sin secretos.
UI accesible lista/detalle/editor, cantidades y desconocidos explícitos, confirma
borrado y no presenta compatibilidad. Browser real dos contextos A/B con HTTP
manipulado y persistencia; no suites PG/E2E concurrentes. Checks existentes y
revisión Astra incremental de aislamiento/deltaC, sin reauditar B/motor.

Reinicio REAL a cargo de Build si no puede especialista: autenticar A por flujo B,
POST `/api/pcs` nombre de fixture único, components vacío, context con BIOS declarada
y notes null; conservar cookie y id/revision. Detener/arrancar MISMO clúster, GET
id con misma cookie y exigir contenido/revision idénticos; usuarioB obtiene404.
DELETE por A y limpiar solo cuenta/sesiones fixtures propias mediante Build, sin
endpoint admin inventado. No publicar valores de fixtures/cookies. Reabrir conexión
no satisface gate reinicio. Sin D hasta C verificado; sin cierre por endpoints.
