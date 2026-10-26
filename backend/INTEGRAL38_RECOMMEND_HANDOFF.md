# 38C — contrato previo a activación frontend

## Resultado posterior atribuido a Build/revisiones

Material reutilizado/stock conocido insuficiente y remonte stock conservando CPU
fueron corregidos y releídos: aceptación funcional y seguridad LOCAL. Última
selección pura31 PASS/1 FAIL solo por assert de dependencia de placa legítima;
corregido únicamente ese assert, nodo focal1 PASS/31deselected. No nueva corrida
completa32PASS declarada. Lint/formato0 finales. Tres PG previos usaban app aislada;
un nuevo test sobre main real aprobó junto a2 nodos extracción (3 PASS0), cubriendo
propiedad/CSRF/CAS/query403/flags422/cap413 y ausencia de escrituras dePC.
Router montado realmente; ni las referencias ni las ofertas acreditan compatibilidad
del catálogo sin atributos. No positivo físico completo, frontend/planes/MCP ni
entrega integral aprobados por este gate. El error de conexión Groq corresponde a
extracción viva; preview determinístico no llama al proveedor.

## P1 residual: CPU conservada y remount por motherboard

Relectura independiente: P2 stock y P1 cooler explícito cerrados respecto del delta;
P1 residual aún bloqueaba aceptación. Build informó PURE31 PASS/exit0 previo y lint0;
PG3 anterior, sin cambio de repositorio. No equivale a aprobación de esta corrección.

Corregido SOLO tower_service, test pure y este handoff. Se conserva wrapping de Build
y canonical_actions, sin editar archivos compartidos, repositorio, main ni motor.
El guard stock_package ya NO descarta CPUs no adquiridas antes de leer necesidad:
adquisición determina exclusivamente si se puede acreditar pasta incluida, nunca
elimina la dependencia de una operación de remount con respaldo publicado.

Con CPU conservada, motherboard distinta y sin cooler explícito: stock_cooler_included
true + thermal_compound_required_on_remount true activan dependencia conservadora
CONDICIONAL a reutilizar ese cooler stock. La razón aclara que la instalación real
es desconocida; inclusión en caja no demuestra cooler instalado ni sobrantes.
Sin confirmación explícita: missing, coste incompleto, nunca recommended. Confirmación
usuario true: available_confirmed. Paquete CPU nuevo documentado conserva included.
No se crean facts técnicos, no se llena cooler unknown ni se cambia motor/cobertura.
Sin fuente positiva de necesidad no se aplica pasta universal ni se convierte unknown
en false; el motor conserva sus faltantes. Esta precisión sustituye la descripción
anterior que limitaba el ramal stock exclusivamente a CPU recién adquirida.

Regresión focal nueva: CPU/línea conservada y placa distinta; exige missing/subtotal
conservado/coste incompleto/no recommended; confirmación habilita material, no verde;
necesidad unknown no infiere requerimiento universal. Comprueba cooler unknown y PC
original intacta. Test previo de paquete CPU nuevo→included permanece sin debilitar.

READY para Build PURE focal y lint/formato afectados, luego relectura del delta P1.
`.venv/Scripts/python.exe -m pytest -q tests/test_tower38_recommend_pure.py`
Sin runners/shell/commits propios; resultado posterior no verificado. No repetir
PG3 por rutina: no cambia lógica de repositorio. API38C sigue sin montar en main.

## Delta de revisión independiente P1/P2 — no aceptado todavía

Evidencia anterior atribuida a Build: PURE27 PASS/exit0, PG TEST3 PASS/exit0,
Ruff check ocho archivos/exit0; Ruff format siete residuales/exit1. Revisión
independiente confirmó P1/P2 funcionales, por tanto esos gates NO cierran38C.

P1 corregido en tower_service.material_dependencies:
- Inclusión de pasta es evidencia de paquete, NO de sobrantes de cooler instalado.
- CPU/placa cambiada conservando cooler, o reselección del MISMO component_id con
  nueva línea: con necesidad documentada, missing salvo confirmación explícita de
  material. Sin cotización de material soportada no se inventa estado priced.
- Definición conservadora determinista de paquete nuevo: component_id de cooler
  distinto de los instalados Y línea nueva. Esa adquisición cuesta como acción.
  Incluso si se cobra reemplazo del mismo SKU, no se presupone paquete/pasta nuevo;
  confirmar disponibilidad o elegir pieza distinta documentada es la alternativa.
- Solo paquete nuevo con inclusión sourced true permite included. Inclusión unknown
  no acredita disponibilidad; si requerida=true queda missing/coste incompleto.
- CPU nueva sin cooler previo/explícito puede aportar paquete stock SOLO con facts
  stock_cooler_included y pasta/necesidad con fuentes. No llena categoría unknown ni
  cambia veredicto del motor. Unknown de necesidad NO se transforma en false o en
  necesidad universal; se conserva incertidumbre del motor y limitaciones.
- Reason y source_refs distinguen paquete recién adquirido de reutilización.

P2 corregido en tower_cost:
- select_offer recibe cantidad y excluye stock_quantity conocido insuficiente;
  busca otra oferta vigente suficiente. None sigue unknown, NO cero; in_stock con
  cantidad no declarada conserva política pública vigente. Nunca reserva stock.
- incremental_cost agrega TODA demanda nueva por component_id antes de seleccionar
  UNA quote/variante que cubra el conjunto; no puede repartir líneas/acciones para
  sortear stock. Unidades instaladas inalteradas no suman compra. RAM sustituida se
  cobra completa. No se suman stocks de ofertas alternativas ni variantes distintas.
- Si falta oferta suficiente: coste incompleto. Subtotal conocido y presupuesto
  insuficiente conocido se preservan; no se reinician a cero.

Tests focales actualizados/añadidos: reutilizado+included=true→missing; confirmación
explícita→available_confirmed; cooler distinto nuevo→included; mismo SKU reseleccionado
no paquete acreditado; inclusión unknown con necesidad documentada→missing; paquete
stock CPU sourced sin asumir instalación; preview real conserva subtotal y coste
incompleto. RAM4 con stock1/alternativa stock4, RAM en dos grupos, stock0/None, dos
acciones storage mismas piezas agregadas sin contar instalación y subtotal/budget.
Mocks de evidencia son sintéticos; motor/gates reales NO se debilitan.

Archivos funcionales: tower_service.py, tower_cost.py, test_tower38_recommend_pure.py.
Solo formato además en API, references, repository y test PG; sin lógica repositorio
modificada. Hand-off actualizado. Sin main/auth/motor/deps/escrituras ajenas.
READY para Build PURE focal, Ruff check/format separados y revisión delta tras gates.
PG anterior3 PASS sigue evidencia anterior, NO nuevo resultado; según criterio del
coordinador no repetir PG por rutina: repositorio solo cambió wrapping.
Ningún runner/shell propio ni aprobación posterior declarada. Formato manual pendiente
de verificación; si queda residual se necesita diff mecánico del coordinador.

## Corrección de BIOS requerida y estilo — gate aún pendiente

Build informó PURE27:26 PASS/1 FAIL; Ruff check1 y format1, PG38C NO ejecutado.
El fallo restante era propio: exclude_none recursivo eliminaba bios_version:null,
que es un campo REQUERIDO del contexto aunque su valor sea nullable. Corregido
canonical_actions: omite contexto opcional None, pero si existe serializa ese objeto
con model_dump(mode=json) SIN exclude_none y conserva {bios_version:null}.
No se cambian DTO/validaciones compartidas. CPU sigue sin candidate_context y el
test motherboard espera el null explícito, valida roundtrip y simula borrado de BIOS
anterior sin herencia ni mutación del original.

Corrección de imports multilínea en API/servicio/dos tests y E741: variables line
en lugar de l. Formato manual por PATCH sobre los siete archivos propios señalados:
API, cost, references, repository, service, tests pure/PG. Sin más funciones ni
cambios de precios, fuentes, gates de motor o identidad. tower_models.py no tocado.
READY para rerun PURE, Ruff check y format separados; PG TEST después de resolver
cadena optional/required y gates. No runners/shell propios ni resultados posteriores.
Si Ruff conserva envolturas residuales, escalar diff mecánico al coordinador, no
declarar formato aprobado ni entrar en un bucle de corrección manual a ciegas.

## Corrección focal posterior al gate PURE de Build

Build informó25 tests:23 PASS y2 FAIL; gate NO aprobado. PG y Ruff aún no ejecutados.
No se atribuye código de salida no comunicado ni aprobación a ese resultado.

Diagnóstico/corrección limitada a archivos propios:

1. Mock de materiales usaba SimpleNamespace no hashable donde BasicSpecs.evidence
   deduplica referencias. Sustituido por EvidenceRef real, sintético y frozen, con
   URL/fecha/locator. BasicSpecs y assertions de estados de material intactos.
2. Serialización de propuestas incluía candidate_context:null para CPU y otras
   categorías; el contrato compartido exige OMITIR ese campo no aplicable. Era
   también un defecto de producción de roundtrip, no solo una fixture incorrecta.
   Nuevo canonical_actions usa model_dump(mode=json, exclude_none=True) al emitir
   item.actions y en la fixture manual. No se cambia TowerAction ni su validación.
   Contexto motherboard desconocido conserva {bios_version:null}, campo requerido;
   IDs requeridos de acción se conservan, candidatos no reciben UUID.

Tests añadidos: acciones de respuesta real preview.model_dump(mode=json) se pasan
SIN reparación a TowerPreviewRequest manual y TowerSimulationDTO (solo agregando
expected_pc_revision donde corresponde). Se verifica reemisión canónica, misma
evaluación/estado y conservación de XOR declarado/seleccionado, line_id y BIOS
desconocida de motherboard. No se debilitan cobertura ni gates de recomendación.

READY para Build: repetir PURE focal; después PG TEST y Ruff check/format pendientes.
Comando PURE desde backend:
`.venv/Scripts/python.exe -m pytest -q tests/test_tower38_recommend_pure.py`.
Cambios de esta corrección: tower_service.py, test_tower38_recommend_pure.py y este
handoff. No runners/shell propios, cambios compartidos, instalaciones ni main wiring.
Resultado posterior todavía NO verificado. Frontend no debe activar38C antes gates.

Estado: código preparado para gate Build; NO montado en main, sin gates ejecutados.
Ownership exclusivo nuevos recommendations/tower_*.py, API y tests propios.

POST `/api/towers/{pc_id}/recommendations/preview`, UUID, query vacía.
Sesión/propiedad servidor y Origin/CSRF existentes; no evidencia técnica cliente.
Request cerrado: expected_pc_revision, objective general|gaming|productivity,
budget_ars string decimal positivo ARS, price_condition cash|list,
mode automatic|manual_comparison, workload blender-cpu|null, materials y alternatives.
Materials solo thermal_compound/available_confirmed/confirmed:true.
Alternatives manuales key/actions idénticas a TowerSimulationDTO; automático no
acepta alternativas. Nunca guarda PC, plan, cuota, sesión ni consulta proveedor.

Respuesta: pc_id, pc_revision, objective, budget_ars, mode, items, missing_fields,
limitations. Item: key/actions/evaluation/benefit/cost/dependencies/offers/versions/
status/missing_fields. Status recommended solo verde completo, beneficio sustentado,
coste completo y presupuesto; fallo conocido domina sin eliminar faltantes.
Manual se etiqueta comparación, nunca una promesa de mejora sin fuente.
Coste incremental sin crédito por piezas retiradas; RAM reemplaza conjunto.
Sin precios históricos fallback; ofertas fresh/in_stock/identidad exacta/condición,
Decimal ARS, vencimiento <=24h. Envío/financiación/mano de obra excluidos.

Referencias: docs/REFERENCIAS_RENDIMIENTO38.md leído completo; Blender4.5.0 CPU
solo workload explícito; TPU raster1440 nativo sin RT/upscaling, índices NO FPS.
Identidad por MPN exacto documentado o modelo curado exacto y evidencia técnica;
no ID whitelist, parecido, núcleos, VRAM ni precio como rendimiento.

Wiring posterior por dueño de main: importar router de api.tower_recommendations e
include_router una vez. No se modifica main durante revisión actual.
Gateway existente rechaza query POST torre y firma método/raw_path exactos.

Interfaz retail B2 transmitida explícitamente por coordinación tras denegación del
handoff (sin reintento de lectura): `upgradejusto.retail.tables.resources`.
El repositorio consulta identity SOLO dataset_version del snapshot fijado AND todos
sus component_id servidor. Nunca SQL del modelo, user_id ni IDs cliente autorizantes.
MPN publicado exacto y categoría permiten referencia aunque attributes esté vacío;
esto NO añade evidencia técnica ni convierte unknown del motor en compatible.
GTIN NO es MPN. Nombres retail/VRAM/precio no reemplazan crosswalk de fabricante.

## Archivos y verificaciones solicitadas a Build

- recommendations/tower_models.py: request cerrado, alternativas key/actions sin
  revisión duplicada ni datos técnicos; boolean true explícito para materiales.
- tower_repository.py: lectura PG real con locks propietario/revisión/publicación;
  published_catalog_snapshot completo, sin paginación ni fallback de catálogo.
- tower_references.py: Decimal scores/hashes/URLs de las fuentes leídas; matching
  exacto de modelos curados con envolvente técnica y fuentes; ningún ID demo.
- tower_cost.py: ofertas servidor fresh/in_stock/condición/24h, multiplicación de
  cantidades, sin crédito por retirados ni precio histórico. Gates independientes.
- tower_service.py: evalúa motor existente, IDs de simulación estables, conjuntos RAM,
  máximo128 evaluaciones explícito; TODOS los primarios se consideran antes de
  aplicar cota. Bundles motherboard/RAM/PSU/cooler: dos ofertas más baratas por
  categoría tras escanear todo el snapshot, no óptimo exhaustivo ni todos los kits.
  Dependencias adicionales cuestan completo; incompatibilidad conocida domina.
- api/tower_recommendations.py: router preparado, Depends(owner/client_ip) existentes.
- tests/test_tower38_recommend_pure.py: identidad arbitraria, workload, más de90 IDs,
  beneficios RAM/CPU, frescura/stock/condición/expiración, cantidades/budget, todos los
  gates, fallo+faltantes, materiales documentados/unknown/manual y request cerrado.
- tests/test_tower38_recommend_pg.py: propietario404 antes de revisión409, snapshot
  coincide con TODOS los IDs PG publicados, revisión/PC preservadas; app HTTP aislada
  prueba CSRF/Origin/query/ownership sin editar main ni montar rutas globales.

Desde backend, Build único runner TEST, checks separados y exit individual:

1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_recommend_pure.py`
2. Wrapper TEST PG existente: seleccionar `tests/test_tower38_recommend_pg.py`.
3. Ruff check y format de estos nueve archivos nuevos (sin reabrir suites aprobadas).

Ninguno ejecutado por este escritor; no PASS/exit inventados. Sin deps, migraciones,
auth, main, motor, datos o publicación modificados. Formatting manual pendiente de
Ruff Build, sin runners propios. Tests sintéticos NO prueban rendimiento físico.

## Límites para revisión, no ocultar como aceptación integral

Interfaz retail resuelta por transmisión del coordinador: published_identities lee
resources en la MISMA transacción/locks de PC/publicación. No inspección adicional
de módulos retail activos ni lectura privada. TowerRecommendationCatalog conserva
identity internamente, no DTO técnico cliente. Resolver versionado identity-2
permite5700X por MPN100-100000926WOF sin depender de CG13355/P02 u otros IDs.
El beneficio devuelve MPN/método/fuente/versión y el motor sigue unknown si no hay
atributos. Ofertas también deben coincidir store/product_id/variant_key/source_url
con esa identidad publicada; sin coincidencia, ningún importe utilizable.
Tampoco se inventó crosswalk de una variante5070Ti sin MPN validado; el índice123
está versionado en GPU_BENCHMARKS y documentado en la fuente, pero no se aplica a
una variante aún no identificada.
No hay cotización de pasta externa: necesidad documentada sin incluida/confirmada
queda missing, coste incompleto. Campos nuevos no publicados permanecen unknown.
El gate verde real torre depende de evidencia técnica publicada del otro bloque;
los691 registros/ofertas/fotos no la reemplazan. El test de clasificador verde usa
resultados sintéticos como prueba de gates, NO acredita una PC real compatible.
PG prueba conjunto completo de publicación disponible y además70 relaciones
sintéticas propias en dos versiones: identidad posterior a50, exclusión de IDs fuera
del snapshot y ausencia de mezcla entre versiones. No muta active ni publicaciones
existentes. La fixture relacional no pretende acreditar publisher/retail reales.
READY para Build/revisión de este delta, NO cierre38 ni recomendación retail real
acreditada. Wiring/API frontend solo después de gates.

## Delta posterior: identidad retail estable

Lógica cambiada DESPUÉS del READY anterior: tower_repository, tower_references,
tower_cost, tower_service y dos tests propios; ejecutar selección PURE y PG de este
bloque y Ruff nuevamente. No repetir suites Google/motor/retail aprobadas por rutina.
Tests añadidos: beneficio positivo por MPN sin atributos, IDs arbitrarios, fuente/
versions, coste oferta completo pero estado requires_verification; GTIN no usado,
MPN parecido/categoría/variante/fuente inválidos no caen a nombre curado;5070Ti sin
crosswalk permanece unknown; oferta y identidad deben coincidir exactamente.
Sin ejecuciones propias, PASS o códigos nuevos. Build único runner TEST.
