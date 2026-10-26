# Backend local de UpgradeJusto

## Resultado vigente — CU05/CU06 básico stock, cierre local25/10

`evaluate_current` activa `cu05-basic-stock-engine-1`, scope `cu05-basic-stock-1`,
política `basic-stock-policy-1` e inventario fijo `basic-stock-inventory-1` (B01–B07).
Dataset importado realmente publicado por CU10 en DEV/TEST:11 componentes,
16 registros BuildCores/docyx +6 fuentes fabricante; repetir devuelve `unchanged`.
IDs/precios/soporte existentes y snapshots previos preservados. No certificar montaje
físico, térmica/electricidad exhaustiva o storage/frontales desde las seis categorías.
Unknown necesario bloquea; fallo conocido domina conservando faltantes. Los snapshots
legacy conservan interpretación y serialización, sin recálculo silencioso.

Pruebas y comandos ejecutados en la [bitácora básica](../docs/ai-log/2026-10-25-alcance-basico-datasets.md).
Contrato técnico en [BASIC_HANDOFF](BASIC_HANDOFF.md); importador en
[IMPORT_HANDOFF](IMPORT_HANDOFF.md). La publicación explícita se realiza con
`scripts/publish-hardware-sample.py --publish-project-catalog`, helper local existente
y cuenta de prueba admin autenticada por servidor; nunca imprimir sus credenciales.
No repetir bootstrap, seed ni restaurar el catálogo anterior sobre el importado.

## Resultado histórico anterior — incrementos25/10, alcance exhaustivo parcial

Motor `cu05-25-resources.1`: nueve de doce comprobaciones tienen predicados; faltan
R04-resto/R05/R08. Datos instalados/DC/geométricos insuficientes permanecen desconocidos.
Beneficio GENERAL2×8→2×16GB y costo766.417,98 ARS respaldados, **sin recommended**.
Build: recursos86 unit/40 PG-API-MCP0; corrección de dos hallazgos66 focales0;
proyección del asistente20 tests0. Mismo revisor aprobó ambos deltas incrementalmente.
Ruff recursos42 archivos0/helper4 archivos0. No sumar suites solapadas.
Web normal9/9 y curación REAL1/1; asistente REAL final1/1 con evaluación MCP, streaming
e historial. Helper elimina duplicación MCP y deduplica evidencias antes del LLM,
manteniendo cobertura/faltantes/versiones;24k bytes por resultado, falla cerrado si
no cabe. No garantiza evitar413 con historial arbitrario. Sin cambio de proveedor.
PG posterior: snapshots antiguos íntegros, catálogo14/precios/fuentes consistentes.
Los handoffs de preparación siguientes son historia; [estado](../docs/CONTINUAR.md).

## HANDOFF CU05 recursos — segundo delta25/10, READY para Build/revisión

**Código preparado, no ejecutado en esta sesión.** El delta R02/R07 anterior fue
informado favorable por revisor y Build (78 unit exit0;3PG exit0). Esa evidencia NO
verifica los cambios siguientes ni aprueba diez CU. Sin shell, dependencias nuevas,
instalación, migraciones, seeds, frontend ni escrituras fuera de backend.

### Contrato EXACTO previo a frontend/Build final

- HTTP no cambia: mismas entradas cerradas, sin topología, resultados preaprobados,
  owner cliente ni nuevos campos de contexto. Notas/BIOS NO representan ocupaciones,
  discos, slots, cableado, funciones previas o medidas. Salida mantiene DTO existente
  con nuevos `rule_results/facts/missing_fields`; no expone ResourceInputs resueltos.
- `evaluate_d`: **`rules_version="cu05-25-resources.1"`**. Sustituir la expectativa
  frontend `cu05-25-platform.1` UNA vez para este delta. Inventario fijo de12 IDs;
  nueve comprobaciones tienen predicados, tres siguen `not_implemented`:
  `R04.altura_espesor_slots_cable_interferencias`, `R05`, `R08`.
  Implementado NO significa aprobado: datos actuales dejan las familias parciales.
- Revisión de datos añade sufijo **`|resource-evidence-25.1`** tras los extractos
  R01/plataforma existentes, conservando revisión PG como primer segmento.
  `evaluate()` histórico28 sigue intacto. No migrar ni recalcular snapshots antiguos.
- Única ampliación interna: `ResolvedConfiguration.resources: ResourceInputs|null`,
  con `pcie`, `power`, `storage`, `front`. Modelos estrictos/congelados en
  `resource_models.py`; primitives comunes movidos a `observations.py` y reexportados
  desde `models.py` para conservar imports anteriores. Sin HTTP/BD/LLM en predicados.
- Identidades referidas validadas contra piezas/categorías resueltas. IDs de recursos,
  asignaciones, dispositivos, canales y conectores no se duplican. Una conexión
  tampoco puede reutilizarse en la ruta adaptada anterior y el mapa eléctrico nuevo.
  `null` inventario != inventario documentado vacío; ninguna ausencia es inferida.

### Predicados y evidencia nominal

- **R03 PCIe:** ancho físico, asignación/ocupación, recursos que deshabilitan slot,
  tabla de enlaces explícita CPU/placa y GPU; exige intersección documentada de
  generación/lanes. Máximas generaciones distintas NO causan fallo por sí mismas.
  Tablas parciales disjuntas son unknown; solo dos tablas documentadas exhaustivas
  permiten concluir ausencia de enlace negociable, nunca máximas generaciones solas.
  Solo PCIE1 físico x16 nominal y generación P06=4/P15=5 están transcritos. No se
  inventaron lanes GPU, negociación Vermeer ni ubicación instalada: quedan missing.
- **R06.otros_conectores:** ATX24/EPS8/EPS4/PCIe8/GPU16/SATA-power/fan4 eléctricos
  cerrados y no intercambiables; asignación única, ocupación, juego de cables de la
  PSU, alcance, independencia cuando exigida, corriente por conector y subtotal por
  rail. ATX24 requiere canales DC separados, nunca una tensión única ficticia.
  Corriente/límite ausente no vale cero. No se aprueba rail con carga desconocida;
  subtotal ya excedido falla conservando faltantes. Esto NO sustituye R05.
  Curación nominal F03/F22 headers1A/2A, ATX/EPS; F06/F07 GPU; F09–F11 PSU solo
  conectores inequívocos. No se usan límites Corsair contradictorios ni repuestos
  PCIe conflictivos. No se eligen/splitean cables ni añaden cargas auxiliares.
- **R09 almacenamiento:** protocolo, tamaño/anclaje, retención, alimentación,
  temperatura documentada y recursos compartidos. Un subconjunto documentado de
  protocolos/tamaños solo prueba miembros conocidos: no pertenecer exige unknown
  salvo enumeración explícitamente exhaustiva. M2_2 comparte SATA3_5/6; M2_1 nominal
  separado. Sin mapa instalado no se asume P11, M2_1 ocupado ni SATA vacío. No se
  añadieron SSD/cooler a catálogo o PC DTO. No_aplica requiere inventario completo
  con ausencia explícita acreditada, no una lista omitida.
- **R10 frontal:** tipos USB19/USB-Key-A/HD_AUDIO/power/reset, canales/pines exclusivos,
  longitud, adaptador/holgura, tasa mínima host-adaptador-cable y conservación de
  funciones/cantidades previas documentadas. No se elimina USB/reset silenciosamente.
  F03 aporta DOS headers USB19 distintos y recursos separados de audio/botones.
  Se transcriben frontales nominales F12/F13; no se aliasan nombres P18 a P03 ni se
  incorpora F26/CP14-E al catálogo. Funciones previas/rutas/adaptadores instalados
  siguen desconocidos porque no existe entrada estructurada HTTP para declararlos.

Toda curación nueva reutiliza igualdad exacta de identidad, atributos, fuentes y
metadata de la revisión PG publicada. Null/cambio/conflicto textual/fuente quitada
invalida el extracto afectado; no se parsean strings aproximados ni se repueblan
fuentes faltantes. No nuevas consultas de fabricantes ni política de potencia.
Predicados locales pueden pass/fail en pruebas SINTÉTICAS identificadas, nunca una
PC DEMO global. Fail conserva otros unknown y pendientes; no cortocircuito global.

### Shares y beneficio

Beneficio público sigue **unknown conservador por contrato**, aun cuando el privado
acredite capacidad RAM general. No decisión adicional mientras evaluación global
permanece unknown. Nuevos facts públicos admiten SOLO bool/int tipados y unidades
generadas por allowlist; no texto/URLs/unidades privadas del snapshot. Fuentes siguen
dependiendo de la revisión fijada del plan. No mutación de shares/planes existentes.
CU05/CU06 NO cerrados; ningún compatible/recommended global nuevo.

### Archivos y checks focales READY (sin códigos nuevos de salida)

Producto: `upgradejusto/compatibility/{observations,resource_models,resource_rules,
resource_curation,models,application,evaluation}.py`,
`upgradejusto/shares/projection.py`. Sin cambios funcionales R02/R07/beneficio/coste.

Ejecutar mediante wrapper local TEST existente, no leer credenciales ni usar memoria
o SQLite como prueba PG; códigos individuales, sin pipes:

1. **Nuevos predicados:** `tests/test_resource_rules.py` (pass LOCAL no global,
   generación distinta, unknown/conflict, fail+missing, rail/corriente/header, ATX
   multicanal, cable previo, rama/recurso duplicado, storage compartido, ausencia
   explícita, USB/adaptador/tasa/clearance, notas ignoradas y curación invalidada).
2. **Regresiones realmente afectadas:** `tests/test_compatibility.py` (primitivas
   movidas/imports), `tests/test_compatibility_d.py`, `tests/test_platform_rules.py`,
   `tests/test_recommendations.py`, `tests/test_plans.py`, `tests/test_shares.py`.
   Versiones/cobertura actualizadas en d/API/PG; privacidad nueva en shares.
3. **PG focal:** `tests/test_platform_postgres.py` incluye dos casos parametrizados:
   `test_published_attributes_invalidate_capacity_without_rewriting_snapshots`
   (ahora crea share NUEVO tras invalidación y conserva bytes antiguos, beneficio
   público unknown/fact GPU curado) y
   `test_resource_resolver_uses_published_board_envelope_and_keeps_pc_immutable`
   (atributos/metadata F03 publicada invalidan mapas nominales; notas no autorizan).
   Más `tests/test_compatibility_api.py::test_evaluate_and_simulate_are_ephemeral_and_replace_all_ram`
   por nueva versión/inventario. Sin repetir suites32/33 por rutina.
4. Ruff lint y format-check SOLO archivos delta; formato/imports aún no comprobados.
   Build devuelve diagnósticos al escritor backend; sin instalaciones ni fullsuite.

Próximo gate: Build focal + revisión independiente del delta, frontend ajusta versión
una vez según contrato anterior. Persisten **implementación Y evidencia** pendientes
R04resto/R05/R08, además de mapas instalados no soportados aún por HTTP. No atribuir
todo a falta de hardware, pedir mediciones sobre A/B inexistentes ni declarar diez
casos completos con fixtures. No commits/push.

## HANDOFF CU05/06 — delta25/10, código preparado, NO verificado

Autorización posterior al cierre33: este checkpoint supera la detención histórica
inferior únicamente para este delta. Sin shell, instalación, cambios de dependencias,
migraciones, seed, frontend ni ejecución de tests en esta sesión. **CU05/06 globales
siguen incompletos**. A/B son escenarios DEMO, no equipos físicos medidos.

### Contrato congelado de este incremento

No cambia ninguna entrada HTTP ni los campos de salida. `candidate_context` sigue
admitiendo SOLO BIOS de motherboard; notas NO se interpretan como montaje, población
RAM, medidas o evidencia. La salida añade resultados/facts/faltantes para R02/R07
dentro del DTO existente. Inventario fijo de12 comprobaciones, no configurable.
`evaluate_d` publica `rules_version=cu05-25-platform.1`; `evaluate` histórico28 queda
intacto. `data_revision` ahora concatena revisión PG, extracto R01 y
`platform-evidence-25.1`, separados por `|`. Snapshots existentes no se recalculan.

Dominio interno (NO DTO HTTP): `ResolvedConfiguration.ram: RamInput|null` y
`.mounting: MountingInput|null`. `RamSpec` vincula instancia/categoría y observaciones
tipadas: generación DDR4/DDR5, UDIMM/SODIMM, ECC/búfer, GB enteros positivos, slots,
límites, MT/s, mV y ranks1Rx8/2Rx8; cada bloque tiene estado y referencias.
`RamInput` separa módulos completos de slots/régimen instalados y poblaciones
soportadas. `MountingSpec` contiene formatos cerrados y mm; `MountingInput` separa
límites nominales de límite efectivo condicionado al montaje/cables y separadores.
No recibe resultados aprobados, checkbox de resto validado ni identificadores de PC.

`platform_curation.py` normaliza SOLO referencias exactas previamente documentadas
en HARDWARE_DEMO §3: CPU P01/P02, RAM P04/P05, placas P03/P18, fuentes P07/P08 y
gabinetes P09/P10. Exige igualdad exacta de ID/categoría/modelo, TODOS los atributos
técnicos y multiconjunto fuente-ID/URL contra el extracto conocido. Cambio, conflicto
textual, null, fuente eliminada/agregada o variante distinta invalida TODO el bloque
hasta recuración; no interpreta strings aproximados ni ignora cambios admin. Un
cambio exclusivamente de precio conserva evidencia técnica. El catálogo PG fijado
por request sigue siendo autoridad; no se añade fallback de catálogo ni se repueblan
colecciones publicadas vacías. Esta guarda es deliberadamente conservadora: nuevos
atributos válidos también requieren recuración. No reemplaza los parámetros PG R01.
La resolución PG transporta además las filas de fuentes de ESA revisión. Para este
extracto exige fecha/localizador exactos del seed33 por cada fuente utilizada;
colección vacía, fuente eliminada o metadata modificada invalida el bloque. No se
consulta la revisión activa al proyectar un plan antiguo. En tests puros sin catálogo
PG, el diccionario explícito es autoridad sintética, nunca evidencia de integración.

### Implementación y límites

- R01 y subreglas R04.largo/R06.ramales_adaptador conservadas.
- R02: predicados de generación CPU/placa/módulos, tipo/ECC/búfer, cantidad DIMM,
  capacidad por módulo/total, ranks, régimen JEDEC/voltaje y población. Evalúa todos;
  fail probado domina y conserva faltantes. **Parcial con datos actuales**: no se
  inventan límites CPU/por módulo/ranks ni población/régimen instalado. Esos campos
  permanecen unknown; las condiciones de DEMO no se trasplantan automáticamente.
- R07: formatos board/PSU admitidos, largo nominal, largo efectivo bajo montaje y
  correspondencia de separadores. Nominal aprobado NO acredita cableado/cages.
  **Parcial**: sin montaje/mediciones efectivas, requiere_verificacion.
- R03, resto R04, R05, otros conectores R06, R08, R09 y R10: not_implemented.
  No se agregaron funciones vacías que solo emitan unknown para inflar cobertura.
  R05 sigue bloqueada por demanda DC/rails/transitorios y conflicto Corsair62,5/54,2A.
  TDP/package/recomendación ASUS no prueban potencia. Noctua429 no confirma cooler.
- Beneficio CU06: SOLO objetivo `general`, cambio exacto2×P04→2×P05 y resto de piezas
  idéntico, con ambas envolventes curadas vigentes: `supported` con evidencia F05 y
  alcance capacidad16→32GB, NO FPS/estabilidad/rendimiento. Otros objetivos/cambios
  permanecen unknown. Servicio y planes pasan catálogo/objetivo servidor. Beneficio
  no vuelve compatible ni recommended una configuración parcial. Costes Decimal
  intactos: RAM766417.98ARS históricos; fuente175898ARS no se incluye implícitamente.
- Shares conserva proyección pública por allowlist: nuevos facts SOLO técnicos y
  rutas `ram`/`mounting`; citas nuevas SOLO de envolventes públicas exactas. Beneficio
  público sigue unknown conservador hasta contrato público específico, sin publicar
  texto/URLs recibidos en snapshots. Planes/shares guardados no se mutan ni migran.

### Pruebas READY para Build (no ejecutadas; ningún código de salida disponible)

Usar wrapper existente con entorno local/guardas TEST, sin leer credenciales:

1. Unitarias: `tests/test_platform_rules.py`, `tests/test_compatibility_d.py`,
   `tests/test_recommendations.py`, `tests/test_plans.py`, `tests/test_shares.py`.
   Nuevos casos: límites DIMM/capacidad, unknown/conflict, fail+missing, tipos estrictos,
   invalidación por atributos/modelo/fuentes, beneficio general/no-FPS, precio faltante,
   sustitución RAM completa, BIOS nueva y montaje nunca heredado, privacidad de rutas.
2. PG real focal: `tests/test_platform_postgres.py` y
   `tests/test_compatibility_api.py::test_evaluate_and_simulate_are_ephemeral_and_replace_all_ram`.
   Nuevo gate prueba beneficio/coste, owner404, edición/publicación de atributos,
   cambio de revisión, invalidación del extracto y snapshots PC/plan/share inmutables.
   Reutiliza fixtures PG existentes; no SQLite ni memoria como evidencia PG.
3. Ruff lint y format-check SOLO archivos de este delta; códigos individuales, sin
   pipes ni fullsuite32 por rutina. Formato/import ordering aún no comprobados.
   Build informa diagnósticos al único escritor backend; NO reescribir producto.

Archivos producto: compatibility/{models,application,evaluation,platform_curation,
platform_rules}.py, recommendations/{domain,service}.py, plans/calculation.py,
shares/projection.py. Tests nuevos platform_rules/platform_postgres; expectativas de
versión/cobertura actualizadas en compatibility_d/compatibility_api y beneficio en
plans. Sin cambios en manifests ni dependencias.
Infraestructura aditiva afectada: catalog/{postgres,service}.py y
shares/repository.py transportan fuentes publicadas fijadas por revisión; no nuevas
tablas ni escrituras. El gate PG y unitarias también cubren invalidación por metadata
de fuente, sin reconstruir fuentes eliminadas desde constantes.

Siguiente: ejecutar focales y revisión independiente del delta; corregir una vez ante
diagnóstico, después escalar. No cerrar CU05/CU06 con fixtures ni fabricar positivo
global. Geometría GPU-panel/PSU-cables/CP14-E, cooler y R05 requieren evidencia real
aplicable o declarar bloqueo DEMO; no pedir al usuario medir hardware inexistente.

## Vigente25/10 — bloque33 funcional local aprobado

Revisión independiente cierra CU02+CU10 con gate navegador Groq+PG real aprobado
(extracción, edición, confirmación, aislamiento y publicación). Cancelación UI
probada aparte con respuesta controlada. Delta extracción26 tests0; validaciones
conservadoras intactas. PG posterior:14 componentes, precios/fuentes restaurados
por revisión nueva e iguales al seed. Sin nuevas verificaciones de CU05/06.
Los checkpoints bloqueados24/10 siguientes son historia, superada por SPRINT33.
Detener para medir cuota, sin continuación automática.

Checkpoint Build33: backend focal aprobado (26 nuevos/113 regresiones afectadas;
delta posterior39 focales, sin sumar como tests distintos), Ruff lint/formato0.
Revisión independiente resuelve bootstrap y shares versionados. CU02/CU10 integrado
NO APROBADO: gate web405 en consulta de precios. Detenido para medir cuota;
Groq/publicación/confirmación por navegador pendientes. Detalle en SPRINT33.

## Checkpoint Sprint33 CU02/CU10 — preparado, pendiente de Build

Contrato HTTP exacto y DTOs: [CU02_CU10_HANDOFF.md](CU02_CU10_HANDOFF.md).
Incluye extracción Groq stateless con confirmación explícita/PCService, administración
con rol PG, borradores y publicación transaccional, catálogo/parámetros fijados por
request y migración `33_001` sobre `32_i_001`. Bootstrap exclusivamente local para
cuenta NUEVA explícitamente designada del proyecto `@example.test`.

**No verificado en esta sesión:** ejecución, formato/Ruff, PG/migración/bootstrap,
Groq real, frontend y revisión independiente. Sin shell ni instalaciones; Build debe
ejecutar los checks focales del handoff, cada código separado. La evidencia Sprint32
siguiente es histórica y no demuestra este delta. Al completar gates o bloqueo,
**detener continuación automática para medir cuota compartida**.

## Estado vigente — cierre local Sprint32 I

Resumen actualizado por el especialista **solo documental**. Todos los checks y
códigos siguientes son evidencia informada por **Build**, no ejecutada por este
especialista. Los checkpoints anteriores se conservan abajo como cronología;
sus pendientes históricos no sustituyen este resumen vigente.

- Backend final: **323 passed, cero skips, 37.99s, exit0**, con LIVE opt-in,
  helper de clave y TLS `system`. Ruff y formato (103 archivos): exit0.
- Cancelación: reproducción previa **3 failed/1 passed, exit1**; después del fix,
  **18 targeted passed, exit0**. WEB LIVE final **1/1, 11.3s, exit0, PGpost0**;
  recorrido normal **9/9, 20.4s, exit0, PGpost0**.
- Pruebas raíz G/H e I con reinicios reales: exit0. Recuperación/citas/sesión e
  interrupción de pendientes verificadas por Build, sin regeneración facturable.
  RAG público DEV/TEST: 3 chunks; consultas SQL vectoriales calibradas **9/9**,
  umbral final `0.43721892096570775`. Es evidencia del conjunto probado, no garantía
  universal de relevancia ni veredicto de compatibilidad.
- Frontend: 68 unitarias y tipos/lint/build, exit0, informado por Build. Revisión
  independiente final cerró sin bloqueantes y con condiciones satisfechas,
  según evidencia comunicada por Build.

API/MCP/RAG/historial del asistente funcionales **localmente**. Identidad y propiedad
se resuelven en servidor; no hay SQL arbitrario del LLM ni autorización mediante
`user_id` cliente/modelo. Herramientas solo de lectura/simulación. CU05/CU06 globales
siguen incompletos: no inferir cobertura total a partir de este recorrido.

**Límites:** un solo worker API por BD local; recuperación global de pendientes
solo en arranque exclusivo. Tras cancelar, la limpieza tiene espera acotada y
timeouts PG locales; abandonar la espera no mata un thread PG ya iniciado. Un
fallo de persistencia no confirma historial guardado. Fallos del proveedor dejan
estado fallido/interrumpido según corresponda, sin éxito ficticio; estos checks no
prometen disponibilidad ni cuota futura. Sin nuevos probes/suites por esta edición.

## Checkpoint Sprint32 H — compartir implementado, checks pendientes de Build

Contrato `docs/specs/CU09-compartir.md`, sin tocar paths ni integración del especialista I.
Migración creada `32_h_001` sobre `32_g_001`; I puede declarar dependencia en H.

### API estable para frontend H

- POST `/api/plans/{plan_id}/shares` `{expected_plan_revision,title}` →201
  `{id,plan_revision,title,created_at,path}`; path relativo `/shared/{token}`. Token
  criptográfico32bytes/base64url43 caracteres aparece SOLO en esta respuesta.
- GET `/api/plans/{plan_id}/shares` →`{items}` con metadatos
  `{id,plan_revision,title,created_at,revoked_at}`, orden UUID; nunca token/digest/path.
- DELETE `/api/plans/{plan_id}/shares/{share_id}` →204 revocación permanente,
  idempotente para dueño; no query en rutas H. Privados conservan sesión/CSRF/Origin.
- GET `/api/shared-plans/{token}` anónimo → snapshot público inmutable y campos
  `published_at,plan_revision`. Token inválido/desconocido/revocado o plan eliminado
  produce404 uniforme `Shared plan not found`; PG indisponible503, sin caché.
  Otros métodos405. Bearer nunca autoriza rutas privadas.

Snapshot público: `title,objective,budget_ars,currency,status,cost,benefit,missing_fields,
stages,warnings,published_at,plan_revision`. Cada etapa contiene `position,name,
replacements,evaluated_configuration,evaluation,cost,cumulative_cost,benefit`.
Nombre público de etapa generado `Etapa N`: NO nombre privado del plan/etapas.
Configuraciones de ambos niveles publican SOLO componentes y contexto `{bios_version}`;
no base_snapshot, notas/propietario/IDs privados/conversaciones. Confirmación UI debe
advertir publicación de BIOS declarada, costes históricos y acceso bearer; revocar
no borra copias ya vistas ni cancela respuestas iniciadas antes del commit.

Proyección por allowlist en cada nivel, no modelo privado serializado completo.
Citas/precios solo del extracto público curado conocido; URL/locator de snapshot
no amplían confianza. Datos de texto libre de condiciones/no técnicos se excluyen;
beneficios sin referencias comparativas siguen unknown. La proyección es conservadora
y no convierte unknown/blocked en ready. Cobertura/fallos/faltantes técnicos conservados.

Persistencia: tabla `plan_shares`, solo SHA256 del token, FK plan ON DELETE CASCADE.
Publicación bloquea lectura de revisión durante snapshot/insert; ediciones posteriores
no cambian snapshot público. Borrar plan elimina publicaciones en MISMA transacción.
Cada lectura pública consulta PG; ninguna caché. Headers no-store, no-referrer y
noindex/nofollow también en errores/métodos inválidos de la ruta pública.

Archivos H: `shares/{__init__,models,projection,repository,service}.py`, `api/shares.py`,
`alembic/versions/32_h_001_shares.py`, `tests/test_shares{,_postgres}.py`; ajustes en
`persistence/schema.py`, `api/proxy_ip.py`, `main.py` y README. Sin manifests/assistant.

**Checks H no ejecutados (sin shell).** Build único ejecutor, sin browser concurrente:

1. `.venv/Scripts/ruff.exe check .`
2. `.venv/Scripts/ruff.exe format --check .`
3. `powershell -NoProfile -File ../scripts/test-backend.ps1`

Autorizado Build a formatear SOLO archivos H enumerados (y test_plans ya diagnosticado).
Códigos H pendientes. Tests escritos: PG A/B, digest/no bearer en tabla, proyección
maliciosa anidada, snapshot tras update, revocación/reconexión/cascade-delete, 404 uniforme,
405, 503, CSRF/validación y capacidad sin autorización privada. No se atribuyen aprobados.
Build debe verificar reinicio físico y lanzadores con `--no-access-log`: este módulo
no registra token/URL, pero no puede desactivar logs de gateways/proxies/lanzadores raíz.
Frontend público sin analítica/recursos terceros/precarga, no-store/noindex/no-referrer;
gateway debe añadir únicamente rutas H cerradas. No cierre H sin checks/revisión/browser.

## Checkpoint Sprint32 G — planes implementados, verificaciones pendientes de Build

Corrección diagnosticada tras ejecución Build: focal G/CU03/F **8 failed/54 passed,
exit1**; Ruff lint1 por import sin uso; formato0 sobre71 archivos. Se conservó el
contrato de entrada: `candidate_context:null` explícito sigue rechazado. La salida
omite solo contexto candidato ausente mediante serializer; no excluye BIOS null,
total null ni otros desconocidos. StageResult reutiliza replacements tipados y la
lectura JSONB valida el documento completo en modo JSON (arrays→tuplas estrictas),
sin flexibilizar motor ni modelos de entrada. Import sin uso eliminado. Test nuevo
de roundtrip comprueba snapshot, lectura pública privada del repositorio, nulls y
rechazo explícito de contexto null. Es prueba de serialización, NO sustituto de PG.
Corrección no ejecutada por este perfil: Build debe verificar focal G con `-x`,
luego regresiones/lint/formato. H no comienza hasta este checkpoint de corrección.

Contrato: `docs/specs/CU07-planes.md`. API estable para frontend:

- POST `/api/plans`: `{name,pc_id,expected_pc_revision,objective,budget_ars,stages}`
  →201 plan; stages1..12 `{name,replacements}` reutiliza contrato F estricto.
- GET `/api/plans?page=1&page_size=20`: resumen paginado solo del dueño, orden UUID;
  mismos límites CU03. No incluye snapshots en resumen.
- GET `/api/plans/{plan_id}`: snapshot persistido, nunca recálculo automático.
- PUT `/api/plans/{plan_id}`: entrada POST más `revision` →200 revisión+1; reemplazo
  y recálculo explícito completo, verificando propiedad de plan y PC antes de409.
- DELETE `/api/plans/{plan_id}` →204, sin tocar la PC.

Plan completo según §48 CU07; cada etapa incluye además `benefit` conforme requisito
de persistir beneficio por etapa (§22). `pc_revision` string fuente; `revision` entero
del plan. `base_snapshot` es configuración D privada, no PC renombrada. PC eliminada
produce `pc_id:null`, conservando todo snapshot/revisión/fechas; frontend puede comparar
GET PC actual con `pc_revision` para avisar cambios, sin heredar su contenido.

Migración aditiva `32_g_001` sobre `32_c_001`: tabla `plans` con FK propietario,
referencia PC nullable/ON DELETE SET NULL y snapshot JSONB. Etapas/entrada normalizada,
configuraciones, evaluaciones, costes, fuentes y versiones se guardan como un único
documento atómico, sin filas de etapas parcialmente persistidas. Servicio y repositorio
G propios; CU03 expone lectura con lock dentro de transacción para snapshot coherente.
UPDATE serializa revisión mediante lock de plan; lectura no usa catálogo ni motor.

Cada etapa parte del resultado anterior, incluso si contiene fallos/faltantes.
Costes acumulan todas las adquisiciones sin reventa; cualquier faltante mantiene total
null. Beneficio final compara base y resultado; sin evidencia sigue unknown. Borradores
blocked/requires_verification se guardan, pero no se presentan como ready o compatibles.
No cambio de motor global, fuentes, precios, dependencias instaladas ni manifests.

Seguridad: identidad servidor, Origin/CSRF, consultas limitadas a lista, no-store
también en errores, gateway firmado método/ruta. Frontend agrega únicamente rutas G
cerradas de la especificación. H todavía no implementado: siguiente bloque automático
es publicación/revocación; debe invalidar enlaces al borrar plan en la misma transacción.

Archivos G: `plans/{__init__,models,calculation,repository,service}.py`, `api/plans.py`,
`alembic/versions/32_g_001_plans.py`, `tests/test_plans{,_postgres}.py`; cambios en
`persistence/schema.py`, `pcs/repository.py`, `api/proxy_ip.py`, `main.py`, README.

**Checks G no ejecutados: perfil sin shell.** Build es único ejecutor; desde backend,
por separado y sin browser simultáneo:

1. `.venv/Scripts/ruff.exe check .`
2. `.venv/Scripts/ruff.exe format --check .`
3. `powershell -NoProfile -File ../scripts/test-backend.ps1`

Wrapper aplica Alembic head mediante fixture PG real existente. Códigos pendientes.
Autorizado Build a ejecutar Ruff format solo sobre archivos G enumerados y los cinco
F diagnosticados: `tests/test_recommendations.py`, `tests/test_recommendations_api.py`,
`compatibility/application.py`, `recommendations/domain.py`, `recommendations/service.py`.
No reformatear cambios ajenos. F reportado por Build: lint0, PG256passed/cero skips0,
formatcheck1 únicamente formato de esos cinco archivos; no es evidencia G.
Tests nuevos cubren acumulación/coste doble/RAM/BIOS/determinismo, PG propiedad/revisión/
rollback/concurrencia y PC editada/eliminada/snapshot tras nueva conexión. Nueva conexión
no es reinicio físico: Build debe verificar reinicio real y registrar evidencia aparte.

## Checkpoint Sprint32 F — API implementada, checks pendientes de Build

Contrato: `docs/specs/CU06-recomendaciones.md`. POST privado sin query
`/api/pcs/{pc_id}/recommendations/preview`, entrada y DTO conforme sección API F.
Router → RecommendationService → servicios/repositorios existentes de PC/catálogo
PG; no persistencia de recomendaciones ni migración F. Propiedad servidor, revisión
tras propiedad, CSRF/Origin/gateway y no-store de D. Frontend debe agregar solo esta
ruta UUID/POST exacta a su gateway, no rutas genéricas.

`Replacement` extraído del DTO D sin cambiar sus validaciones; normalización común
`apply_replacements` retira todos los grupos afectados y resetea BIOS de motherboard.
Todas las sustituciones se aplican antes de una evaluación conjunta fija D, sin
ampliar el motor ni trasplantar fixtures. Presupuesto decimal string positivo sin
exponente, hasta 999999999999.99; costes Decimal, precio más reciente/menor/source.
Precio faltante implica total/within_budget null con subtotal conocido separado.
CPU/placa conservan faltante de pasta térmica sin cotización de catálogo conforme
HARDWARE_DEMO: no se agrega una compra ni precio implícito. RAM reemplaza conjunto.

Beneficio permanece unknown sin referencia comparativa curada; piezas idénticas no
constituyen mejora. No se emite recommended con cobertura incompleta. Rechazo por
fallo, subtotal ya excedido o ausencia de mejora conserva todos los faltantes.
Precios históricos y exclusiones presupuestarias visibles. CU06 EN CURSO; positivo
real bloqueado por E y evidencia de beneficio. G/H aún no implementados aquí.

Archivos F: `recommendations/{__init__,models,domain,service}.py`,
`api/recommendations.py`, `tests/test_recommendations{,_api}.py`; cambios compartidos
en `compatibility/{application,http_models}.py`, `main.py` y este README.

**No se ejecutaron comandos, suites ni migraciones en este turno (perfil sin shell).**
Build debe ejecutar por separado desde backend, sin browser concurrente:

1. `.venv/Scripts/ruff.exe check .`
2. `.venv/Scripts/ruff.exe format --check .`
3. `powershell -NoProfile -File ../scripts/test-backend.ps1`

Resultados/códigos de los tres: pendientes, no verificados. Los tests F API reutilizan
fixture A/B PG real del wrapper; los tests puros se identifican como sintéticos,
nunca sustituyen PG ni certifican hardware. Si se necesita formatear, limitar Ruff
a los archivos F enumerados; no reformatear cambios ajenos. No manifests/deps/scripts.
Siguiente continuación automática: G persistencia/snapshots y luego H, un bloque por
turno tras este checkpoint de contrato API. No declarar F cerrado por código sin checks.

## Checkpoint Sprint32 D — R01/API parcial, backend probado, CU05 no cerrado

Contrato previo: `docs/specs/CU05-compatibilidad.md`, sección9. D solo R01 y
evaluación/sustitución efímera; no motor global E, precios, potencia draft ni nuevas
dependencias/migraciones. PCs siguen siendo propiedad de CU03, sin escrituras D.

### API estable para frontend D

- POST `/api/pcs/{pc_id}/compatibility/evaluate`: `{expected_pc_revision}` entero
  estricto positivo, sobre snapshot guardado y propiedad resuelta en servidor.
- POST `/api/pcs/{pc_id}/compatibility/simulate`:
  `{expected_pc_revision,category,candidates,candidate_context?}`; candidates no vacío
  de `{component_id,quantity}` únicos y resueltos por catálogo/categoría. NoRAM:
  una referencia quantity1. RAM:1..8 referencias, cantidades estrictas1..8, total≤8;
  retira TODO conjunto previo, no agrega módulos antiguos ni otras dependencias.
- candidate_context solo para motherboard, objeto exacto `{bios_version}` string
  strip1..100 sinNUL o null. Ausente resetea BIOS a desconocida, incluso reemplazar
  por la misma referencia; no hereda la placa retirada. Otras categorías conservan
  BIOS actual y rechazan candidate_context. No acepta notas/resultados/coverage/
  owner_id/user_id ni flags preaprobados en ningún nivel.
- Respuesta200: `{verdict,rule_results,missing_fields,rules_version,data_revision,
  pc_revision,coverage,evaluated_configuration}`; último campo `{components,context}`.
  `pc_revision` conserva el tipo string del DTO28 (por ejemplo `"1"`), mientras el
  campo esperado de entrada es entero. RAM simulada permite referencias distintas.
- Reutiliza sesión/propiedad B/C:401, ajena/inexistente404, revisión409 solo tras
  propiedad, UUID/entrada/candidato422, PG503 genéricos; POST con CSRF/Origin3000 y
  no-store. Las únicas rutas nuevas son esas dos acciones UUID POST, sin query,
  firmadas con el mismo método/ruta exacta HMAC B; cliente directo sigue admitido.
  Gateway frontend debe extender su allowlist únicamente a esas dos acciones.
- Evaluar/simular no modifica PC, revisión, contexto ni catálogo y no persiste
  resultados. GETPC antes/después debe permanecer idéntico, también tras errores.

### Dominio, evidencia y límite conservador

DTO28 ampliado aditivamente con categorías CPU/motherboard/RAM y entrada tipada R01
de sockets, identidades, revisión aplicable, filas de soporte y BIOS declarada.
Se conserva `evaluate`/demo28; nueva entrada fija `evaluate_d` reutiliza inventario
de12 comprobaciones y agregador28 con versión `cu05-32d.1`. No se recibe inventario
elegible ni resultados cliente. R04.largo/R06.ramales_adaptador permanecen intactas.
API D deja montaje/cableado unknown porque CU03 no los describe: jamás trasplanta
condiciones de instalación de los ejemplos documentales para aprobarlos.

`compatibility/curation.py` materializa el extracto histórico
`hardware-demo-25.1/r01-extract-32d.1`, basado en HARDWARE_DEMO F01–F04 y sección9.
Respuesta data_revision concatena dataset PG `sprint31b-a-v1` y ese extracto realmente
usado. No es una reconsulta del fabricante ni evidencia reciente de instalación.
P01/P02 exactos en P03 original (no Pro SE), revisión no diferenciada por fabricante:
P2.30 satisface solo el mínimo; P1.20 falla requisito sin afirmar POST imposible;
null/P2.31/etiqueta sin relación explícita son unknown. No usa float, orden decimal,
lexicográfico ni supuestas versiones futuras. Otras parejas o variantes/revisiones
sin fila exacta quedan unknown. Fallo de socket/BIOS domina sin borrar faltantes.
Hay9 comprobaciones aún no implementadas y cobertura pendiente: **nunca compatible
global por R01pass; CU05 no completo**.

Archivos nuevos: `upgradejusto/api/compatibility.py`,
`upgradejusto/compatibility/{cpu_rule,curation,http_models,application}.py`,
`tests/test_compatibility_d.py`, `tests/test_compatibility_api.py`.
Modificados: `compatibility/{models,evaluation}.py`, `catalog/service.py`, `main.py`
y este README. Motor puro no depende de HTTP/BD/LLM; adaptadores/resolución están
separados en application/http_models/API. Sin cambios a scripts, frontend o manifests.

### Checks propios D — 2026-10-24

Desde `backend/`, cada comando por separado, antes de cualquier E2E frontend:

| Comando | Resultado real |
| --- | --- |
| `powershell -NoProfile -File ../scripts/test-backend.ps1` | inicial/final **exit0,234 passed**, cero skips |
| `.venv/Scripts/ruff.exe check .` | exit1 inicial:4 bloques de imports; una corrección diagnosticada y rerun **exit0** |
| `.venv/Scripts/ruff.exe format --check .` | exit1 inicial:6 archivos; tras corrección **exit0**,55 archivos |

PG real con guardas test existentes55433/rol/base/URLs iguales, fixtures A/B y cleanup
solo propio. Suite incluye determinismo/no mutación, BIOS positivo/negativo/null/
incomparable, socketfail conservando unknowns, exactitud variante/revisión, inventario12,
regresión motor28, RAM reemplazo completo, BIOS placa no heredada, API A/B404/409,
rechazo de preaprobados/validaciones, CSRF/Origin/firma y fallo SQL real→503 seguro.
GETPC antes/después conserva datos en casos exitosos y fallidos. Warning conocido
de caché pytest por permisos, sin cambios de permisos ni tests fallidos. uvcheck no
repetido; Build es dueño de setup. No se iniciaron suites browser ni otros servidores.

Siguiente paso: frontend consume API estable y amplía gateway únicamente a acciones
previstas; verificar browser real eval/simulación/faltantes/PC intacta sin concurrencia
PGsuite, luego Astra revisa delta D con código y checks. B/C aceptados según
coordinación/Build; su evidencia histórica conservada abajo no cierra D ni CU05.
**D pendiente de recorrido web/revisión; E global requiere decisión y evidencia propia.**

## Checkpoint Sprint32 C — CU03 backend preparado y PG probado, no cerrado

Contrato previo e inalterado: `docs/specs/CU03-pcs.md`. Solo CRUD manual privado,
sin CU02/CU10, simulación, evaluación de compatibilidad ni cambios de hardware.
Router `api/pcs.py` → `pcs/service.py` → `pcs/repository.py`; catálogo mediante su
servicio existente y propietario exclusivamente mediante sesión auth B.

### API estable para frontend C

- GET `/api/pcs?page=1&page_size=20`: `{items,total,page,page_size}`, solo propias,
  orden UUID ascendente; page1..10000/page_size1..50; fuera de resultados vacío.
- POST `/api/pcs`: `{name,components,context}` →201 PC; UUID servidor, revision1.
- GET `/api/pcs/{pc_id}` →200 PC, sin modificarla.
- PUT `/api/pcs/{pc_id}`: los mismos campos más revisión esperada →200 PC con
  revisión incrementada atómicamente. Reemplaza TODOS los grupos, RAM incluida.
- DELETE `/api/pcs/{pc_id}` →204; frontend debe confirmar antes de enviar.
- PC pública: `{id,name,revision,components,context}`, sin propietario ni veredicto.
  Grupo `{category,component_id,quantity}`; quantity entero estricto explícito,
  RAM1..8 y resto1; máximo6 categorías únicas. RAM heterogénea fuera de C.
- Contexto obligatorio con ambos campos `{bios_version,notes}`, strings declarados
  o null explícito. BIOS strip1..100, notes strip1..1000; no interpreta versiones
  ni acredita soporte CPU. Vacío de componentes permite PC incompleta, no compatible.
- Nombre strip1..100, sin NUL; campos adicionales rechazados en todos los niveles,
  incluidos owner_id/user_id/role. Catálogo debe existir y categoría coincidir.
- Sesión ausente401; ajena/inexistente404 genérico; revisión409 solo tras propiedad;
  UUID/payload inválido422 seguro; PG503 genérico sin fallback. Respuestas privadas
  y errores no-store. Mutaciones POST/PUT/DELETE exigen Origin3000 y CSRF B.
- Gateway HMAC B ligado a método/ruta sin query; solo lista GET `/api/pcs` admite
  page/page_size únicos, validados por API. Detalle/mutaciones no admiten query;
  auth B no amplía su política de query. Cliente directo legítimo sigue admitido,
  sin confianza en XFF y con lanzamiento `--no-proxy-headers` obligatorio.

Migración aditiva `32_c_001` sobre `32_b_001`: `pcs` con FK propietario e índice,
`pc_component_groups` con FK de catálogo versionado, categoría única por PC y
cantidad restringida. Cascade elimina solo grupos de la PC borrada. No overwrites
ni downgrade destructivo. Cada escritura/contexto/grupos usa transacción completa;
el UPDATE compara propietario/revisión y resuelve concurrencia en PG. Lecturas de
grupos se realizan tras resolver propietario, con share-lock de su cabecera.

Archivos nuevos: `upgradejusto/pcs/{__init__,models,repository,service}.py`,
`upgradejusto/api/pcs.py`, `alembic/versions/32_c_001_pcs.py`,
`tests/test_pcs_postgres.py`. Modificados: `upgradejusto/persistence/schema.py`,
`upgradejusto/api/proxy_ip.py`, `upgradejusto/main.py` y este README.
Sin scripts/root/frontend, dependencias ni credenciales modificadas.

### Evidencia propia C — 2026-10-24

Comandos separados, desde `backend/`:

| Comando | Resultado real |
| --- | --- |
| `powershell -NoProfile -File ../scripts/test-backend.ps1` | inicial y final **exit0,194 passed**, cero skips |
| `.venv/Scripts/ruff.exe check .` | exit1 inicial: tres imports; corrección diagnosticada y rerun **exit0** |
| `.venv/Scripts/ruff.exe format --check .` | exit1 inicial: nueve archivos; tras corrección **exit0**,48 archivos |

PG real con guardas exactas existentes:127.0.0.1:55433/base test/rol test y URLs
iguales. El fixture migró TEST a head y volvió a comprobar seed dos veces. La suite
incluye23 casos C: A/B no listan/leen/editan/eliminan PCs ajenas; inyección de dueño
rechazada, CRUD, reemplazo de RAM, nulos/declaraciones, cantidades0/bool/float/IDs y
categorías inválidas, duplicados, contexto parcial, revisión concurrente200/409,
rollback real tras FK inválida,401/403/422, fallo SQL PG→503 genérico y gateway
GET/PUT/DELETE con query acotada. Cleanup solo cuentas/PCs/grupos/sesiones/contadores
de fixtures propios. Regresión B/CU04 incluida; no es evidencia de browser C.
Warning conocido: pytest no pudo escribir caché por permisos; no se cambió permisos.
No se ejecutó uvcheck por rutina: pertenece a Build. No hubo suites browser concurrentes.

### Gates pendientes y proof mínimo para Build

Frontend puede implementar contra el contrato estable anterior; antes de verificar
contra API dev, Build debe aplicar la migración aditiva a DEV mediante su tooling
autorizado (aquí solo se migró TEST). Extender su gateway a PCs conforme spec, sin
alterar Origin/CSRF ni omitir propiedad; browser real A/B y revisión Astra incremental
de C/aislamiento todavía pendientes. Evidencia histórica B abajo no cierra C.

Reinicio REAL PC a cargo de Build, no sustituible por reabrir conexiones:
autenticar A por B, obtener CSRF de su sesión autenticada y POST `/api/pcs` con
`{"name":"<fixture único>","components":[],"context":{"bios_version":"Declarada-0123","notes":null}}`.
Exigir201, revision1 y contexto idéntico; guardar id/cookie solo localmente. Detener
y arrancar MISMO clúster; GET `/api/pcs/{id}` con esa cookie debe conservar objeto
completo/revisión y usuario B debe obtener404. DELETE por A debe devolver204;
limpiar únicamente cuentas/sesiones de ese fixture con tooling Build, sin endpoint
admin ni borrado global. No publicar cookies/IDs de fixtures ni secretos.
**C no cerrado; no avanzar D hasta gates y aceptación de coordinación.**

### Corrección C Astra — query con valores vacíos, 2026-10-24

Hallazgo: `parse_qsl` descartaba valores vacíos, de modo que una clave desconocida
como `owner_id=` podía desaparecer antes de la allowlist. Corregido en
`upgradejusto/api/proxy_ip.py` con `keep_blank_values=True`. Claves desconocidas,
incluso vacías, y duplicadas se rechazan403; page/page_size vacíos o fuera de rango
llegan a su validación422. No cambia sesión, HMAC, XFF ni propiedad. La misma
validación se ejecuta antes del retorno de cliente directo y de adoptar IP firmada.

Nuevo caso en `tests/test_pcs_postgres.py`:18 queries repetidas en ambos recorridos
(directo legítimo y proxy firmado controlado), incluyendo clave vacía/desconocida,
encoded owner_id, duplicados con vacío, rangos y límites válidos; respuestas privadas
no-store y PC final idéntica. Usa PG real y cleanup de los fixtures propios existentes.

Comandos propios desde `backend/`, en este orden:

| Operación | Resultado real |
| --- | --- |
| `powershell -NoProfile -File ../scripts/test-backend.ps1` | **exit0,195 passed**, cero skips; wrapper completo conocido, sin flags inventados |
| `.venv/Scripts/ruff.exe check upgradejusto/api/proxy_ip.py tests/test_pcs_postgres.py` | herramienta rechazó permiso (`Permission denied: shell`), sin código de proceso |
| `.venv/Scripts/ruff.exe format --check upgradejusto/api/proxy_ip.py tests/test_pcs_postgres.py` | herramienta rechazó permiso (`Permission denied: shell`), sin código de proceso |

No hubo tests fallidos; persiste warning de caché pytest por permisos. Lint/formato
del delta actual quedan pendientes de ejecución por Build; los resultados previos
exit0 no se presentan como verificación nueva. No se reintentaron rutas alternativas
ni se cambiaron permisos. Archivos de este delta: los dos anteriores y este README.

Build informó corrección separada de rechazo de query/opciones en su tooling root,
con configuración válida y seis inseguras rechazadas, test-setup-guards exit0 y
Ruff scripts exit0. No se inspeccionó ni reejecutó setup B desde este hijo.
Pendientes de Build: migraciones dev/test no destructivas y proof `--pc` que conserve
contenido/revisión/RAM/null tras reinicio REAL, misma sesión, usuario B404, borrado
y cleanup propio. No se atribuye ese gate como realizado. Frontend puede retomar
su E2E después de este retorno, sin suites concurrentes. Astra revisará solo las
correcciones C y evidencia nueva. **C sigue abierto; no avanzar D.**

## Checkpoint Sprint32 B — PG pytest verificado; gate B pendiente

Esta sección sustituye el estado histórico31b descrito abajo, no su evidencia.
Se agregó CU01 y se cambió la entrada HTTP CU04 a PostgreSQL **sin fallback**.
La suite backend actual pasó con PG real. Build y frontend informaron evidencia
adicional de HTTPS/reinicio/gateway indicada abajo; no constituye cierre unilateral
de B y queda pendiente revisión independiente del delta y su evidencia.

Contrato vigente: `docs/specs/CU01-cuentas.md`, sección vigente32, y CU04.
Router auth → servicio → repositorio PG; identidad pública solo `{id,email}`.
Argon2id usa el perfil explícito RFC9106_LOW_MEMORY; dos slots por proceso.
Sesiones opacas, digest SHA256 en PG, anónimas30min/autenticadas12h absolutas;
CSRF sincronizador y Origin exacto en cada POST. Login rota y logout revoca.
No hay recuperación de contraseña ni verificación de titularidad de email.

Migración aditiva `32_b_001` sobre `31b_a_001`: `auth_users`, `auth_sessions`,
`auth_attempts`; no modifica ni elimina catálogo existente. Downgrade bloqueado.
El seed anterior conserva su semántica append-only/idempotente. No `create_all`.
El catálogo HTTP usa `catalog/postgres.py`; errores PG/configuración dan503 genérico.
El repositorio curado anterior permanece para referencia/unitarias, nunca como
fallback HTTP. El motor CU05 no se modifica.

### Configuración administrada por Build (sin revelar valores privados)

- `DATABASE_URL`: URL PG psycopg existente, administrada por el wrapper.
- `UJ_ORIGIN`: origen público exacto, sin slash final, ruta, query ni credenciales.
- `UJ_ORIGIN=http://127.0.0.1:3000`: origen local acordado para frontend/proxy.
- `UJ_ENV`: `production` por defecto; solo `dev` o `test` para HTTP loopback.
- `UJ_ALLOW_INSECURE_LOOPBACK=1`: solo HTTP localhost/127.0.0.1/::1 en dev/test;
  cualquier uso en producción impide el arranque. HTTPS usa cookie Secure.
- `UJ_TEST_POSTGRES=1` junto a `UJ_ENV=test`: exige integración real; sin flag
  la suite PG falla. Solo `UJ_TEST_POSTGRES=0` omite PG como modo offline explícito,
  sin equivaler a aceptación de B. No se sustituye por memoria.
- Tests requieren `DATABASE_URL` idéntica a `TEST_DATABASE_URL`, driver
  `postgresql+psycopg`, host exacto `127.0.0.1`, puerto `55433`, base
  `upgradejusto_test` y rol `upgradejusto_test_app`, sin query de conexión.
  Las guardas se evalúan antes de Alembic/seed/conexiones; no aceptan alias.
- `UJ_PROXY_SECRET`: secreto server-only de mínimo32bytes UTF-8, generado/cargado
  por Build, igual en backend y gateway; nunca enviarlo al navegador ni imprimirlo.
- `UJ_TRUSTED_PROXY_PEERS`: IPs literales loopback separadas por comas, explícitas
  para el transporte del gateway. No nombres DNS, redes ni direcciones no-loopback.
  Headers firmados sin configuración válida se rechazan403; no hay fallback a la
  IP declarada. Build confirmó su carga; este hijo no leyó el secreto real.

No se leen archivos `.env`. No se confía en X-Forwarded-For. Proxy frontend
same-origin; sin CORS abierto. Auth responde Cache-Control:no-store, incluida
validación; el handler422 omite input/context para no reflejar passwords.

### Ejecución histórica del checkpoint inicial (superada abajo)

Ejecución histórica del checkpoint anterior, desde `backend/`:

```powershell
powershell -NoProfile -File ../scripts/test-backend.ps1
```

**Resultado real: exit1**, antes de pytest: falta configuración del clúster
exclusivo del proyecto (`scripts/local-env.ps1`, línea5). No se reintentó ni se
configuró el entorno desde este hijo. No hay resultado unitario/offline ni PG.
Lint, formato y regresión siguen sin ejecutar; no se infiere éxito de inspección.

La suite preparada separa políticas offline de integración PG. El fixture PG
requiere configuración exacta de test, migra a head y ejecuta seed dos veces; los tests
limpian solo sus UUID/tokens/contadores propios, nunca tablas completas ni datos
ajenos. Los tests HTTP de catálogo existentes ahora dependen de ese fixture PG.

Próximo punto de ese checkpoint: Build configura runtime y flags sin exponer secretos; reanudar este
mismo hijo con el wrapper exacto. Antes de aceptar B quedan: ejecución y revisión
de tests, lint/formato, ampliar evidencia de rehash/errores PG/rate-limit por IP,
persistencia tras reinicio, HTTP/browser reales y revisión independiente de auth.
No hay cierre CU01 ni autorización implícita de C/D.

### Primera reanudación focalizada 2026-10-24 — solo inspección (histórica)

Archivos corregidos: `tests/conftest.py` (guardas exactas anteriores y fallo si
falta configuración), `tests/test_auth_postgres.py` (origen3000 y cleanup propio
en finally), `upgradejusto/persistence/runtime.py` (acepta `development` además de
`dev`/`test`), `tests/test_auth_security.py` (casos preparados para los tres modos,
origen3000 y rechazo de producción) y este README. No se tocaron scripts/provisioning
ni dependencias.
Build informó recuperación de PG18 loopback55432; este hijo no comprobó conexión.
No se ejecutaron shell, wrapper, suites, migraciones, seed ni lint/formato en esta
reanudación. No se encontraron identificadores privados en la sección publicada
inspeccionada; no se consultaron memoria, archivos locales privados ni secretos.

Solo tras confirmación del runtime dev/test por Build: desde `backend/`, ejecutar
`powershell -NoProfile -File ../scripts/test-backend.ps1` y registrar su código real.
Después verificar regresión ACTUAL CU04 en PG (la evidencia31b no la sustituye),
migraciones/seed, auth/aislamiento, persistencia tras reinicio, HTTP/browser y revisión
independiente. Todo ello continúa pendiente; B bloquea C/D.

### Reanudación con runtime 2026-10-24 — evidencia propia actual

Guardas actualizadas a puerto **55433**, manteniendo host/base/rol exactos y
equivalencia de URLs antes de conexión/migración. Se retiró el alias `development`:
solo `dev`/`test` autorizan HTTP loopback; producción sigue rechazada.

Comandos ejecutados individualmente desde `backend/`:

| Comando | Resultado real |
| --- | --- |
| `powershell -NoProfile -File ../scripts/test-backend.ps1` | exit0, 142 passed inicialmente |
| `.venv/Scripts/ruff.exe check .` | exit1 inicial: dos imports sin ordenar |
| `.venv/Scripts/ruff.exe format --check .` | exit1 inicial: nueve archivos pendientes de formato |
| `uv sync --check --locked --group dev --python 3.12.13 --no-python-downloads` | herramienta rechazó permiso; sin código de proceso, no verificado |
| `.venv/Scripts/ruff.exe check .` tras corrección | exit0, All checks passed |
| `.venv/Scripts/ruff.exe format --check .` tras corrección | exit0, 39 files already formatted |
| `powershell -NoProfile -File ../scripts/test-backend.ps1` tras ampliación focalizada | exit0, **144 passed**, cero skips |

Ambas ejecuciones pytest informaron un warning de permisos al guardar la caché
de pytest. No se cambiaron permisos ni se ocultó el warning. No hubo fallo de tests.
La corrección diagnosticada fue de imports/formato, sin cambios de dependencias.

Evidencia propia: fixture PG exigió configuración exacta, migró a head y ejecutó
seed dos veces con14piezas; regresión HTTP TestClient CU04 sobre PG actual; registro,
login/rotación, revocación/logout, vencimiento anónimo, CSRF/Origin, cookie local,
422 sin input/password, unicidad concurrente, límites concurrentes email5/IP20,
reset de ventana, rehash persistido y logout sin afectar otra sesión autenticada.
El nuevo test reabre conexiones y comprueba sesión/expiración persistidas: **no es
un reinicio del servidor PostgreSQL ni del proceso HTTP**. Cleanup limitado a
usuarios/sesiones/tokens/contadores de fixtures propios; no drop/truncate global.

Archivos de este delta: `tests/conftest.py`, `tests/test_auth_security.py`,
`tests/test_auth_postgres.py`, `upgradejusto/persistence/runtime.py`, este README;
correcciones exclusivamente de imports/formato también en `upgradejusto/api/auth.py`,
`upgradejusto/auth/repository.py`, `upgradejusto/auth/service.py`,
`upgradejusto/catalog/postgres.py`, `upgradejusto/main.py` y
`upgradejusto/persistence/schema.py`. Sin scripts, manifests ni configuración privada.

Evidencia informada por Build, no ejecutada aquí: PG18 puerto55433 con SCRAM,
roles/bases dev/test separados y cruce rechazado; migraciones en ambas bases,
seed doble, divergencia abortada y catálogo conservado tras stop/start (exit0).
Ese snapshot no demuestra persistencia de sesiones auth tras reinicio.

Pendientes concretos: Build debe resolver el permiso de ejecución del check uv
anterior sin instalar nada y verificar una sesión auth antes/después de reinicio
real autorizado; ampliar pruebas negativas de fallo PG sin secretos y cookie
HTTPS Secure, expiración autenticada y respuestas401/409/429 HTTP. Coordinación
puede iniciar HTTP/browser reales y después revisión Astra focalizada B/aislamiento.
No hay browser concurrente iniciado por este hijo. **B sigue abierto y bloquea C/D.**

### Delta Astra IP proxy — 2026-10-24, backend listo para recorrido gateway

Contrato previo: addendum IP proxy de `docs/specs/CU01-cuentas.md`.
Nuevo `upgradejusto/api/proxy_ip.py`: valida todas las rutas auth antes de adoptar
IP firmada. Normaliza IPv4-mapped del peer, requiere headers canónicos completos y
no duplicados, HMAC-SHA256 constante sobre timestamp/METHOD/ruta exacta/IP sin
newline final, timestamp±30segundos y peer loopback explícitamente confiable.
Rechaza query inesperada, firma/IP/método/ruta/peer/tiempo alterados y configuración
ausente con403 genérico. Sin headers propios usa solo el peer de transporte;
XFF/Forwarded se ignoran en la aplicación. Conserva Origin, CSRF y límites20IP/5email.

Archivos: `upgradejusto/api/proxy_ip.py`, `upgradejusto/api/auth.py`,
`tests/test_proxy_ip.py`, `tests/test_auth_postgres.py` y este README.
No se modificaron scripts, dependencias, motor ni configuración privada.

Comandos propios, separados desde `backend/` (wrapper conocido de suite completa;
no se inventaron argumentos de selección):

| Comando | Resultado real del delta |
| --- | --- |
| `powershell -NoProfile -File ../scripts/test-backend.ps1` | exit0 inicial,169 passed; final **exit0,171 passed**, cero skips |
| `.venv/Scripts/ruff.exe check .` | exit1 inicial: un bloque de imports; tras corrección, **exit0** |
| `.venv/Scripts/ruff.exe format --check .` | exit1 inicial: cuatro archivos; tras corrección, **exit0**,41 archivos formateados |

La corrección diagnosticada fue de imports/formato. Pytest conservó el warning
de permisos de caché; no se cambiaron permisos ni se ocultaron fallos.
El check uv queda a cargo de Build; no se reintentó aquí.

Evidencia nueva: expiración autenticada y rechazo HTTP de cookie anterior revocada;
fallo SQL real de PG por esquema inexistente devuelve503 sin exponer SQL en auth ni
catálogo; cookie Secure para configuración HTTPS y rechazo de excepción insegura en
producción. Firmas sintéticas prueban canonicalización, límites±30segundos,
falsificaciones y ausencia de configuración. En PG/TestClient dos IP firmadas
controladas tienen contadores separados; cambiar IP sin refirmar produce403 y no
consume/adopta el contador de la IP falsificada. Cleanup solo de fixtures propios.
Estos son tests controlados: no prueban socket del custom server ni TLS real.

**Requisito operacional para Build:** Uvicorn debe arrancar con
`--no-proxy-headers` (o `proxy_headers=False` equivalente). La app necesita el peer
de transporte real: si una capa ASGI/servidor lo sustituye previamente usando XFF,
la función no puede recuperar el socket original. Se actualizó el comando README;
Build debe comprobar los lanzadores que posee, sin cambios de scripts por este hijo.

Siguientes gates: Build carga secreto/peers y verifica lanzamiento sin proxy headers;
frontend implementa custom server y firma conforme al addendum; luego recorrido
gateway real con dos sockets/IP y headers entrantes descartados, HTTP/browser,
HTTPS/TLS local real y sesión autenticada tras reinicio real del clúster a cargo
de Build; revisión Astra del delta. No hay suites concurrentes iniciadas por este
hijo ni cierre unilateral: **B continúa bloqueando C/D.**

### Actualización documental 2026-10-24 — evidencia atribuida, review pendiente

Esta actualización supera los pendientes operacionales anteriores sin borrar sus
fallos/resultados históricos. No hubo nuevos checks ejecutados por este hijo.
Se inspeccionó el comando de arranque de este README: ya incluye
`--no-proxy-headers`; no fue necesaria otra corrección del launcher documental.

**Evidencia informada por Build, no ejecutada ni reinspeccionada por este hijo:**

- `scripts/verify-auth-runtime.py`: **exit0**, PG test y HTTPS real con certificado
  local validado, sin desactivar TLS ni modificar Windows certificate store.
- Cookies Secure + HttpOnly, Path=/api; cookie Secure no enviada por HTTP.
- Caída real de PG: catálogo503 con JSON exacto, sin SQL ni secretos.
- Sesión autenticada conservada tras `pg_ctl stop/start` real; logout revoca y
  luego devuelve401; expiración comprobada sobre HTTPS.
- Fixture propio limpiado por digest/usuario, con base dev intacta.
- Check uv: **exit0**,37 paquetes resueltos/35 comprobados; Ruff de scripts: **exit0**.
- Lanzadores usan `--no-proxy-headers`. Build carga
  `UJ_TRUSTED_PROXY_PEERS=127.0.0.1` y secreto compartido/protegido de64+ caracteres;
  no se publica su valor ni se consultaron runtime, proofs o archivos privados.

**Evidencia informada por frontend:** Playwright con gateway real **4/4, exit0**,
tras corregir su configuración; tipos y lint **exit0**. No fue ejecutada aquí ni
se confunde con las firmas sintéticas/TestClient de backend.

**Evidencia propia previa, conservada:** backend **171 tests, exit0**, Ruff lint y
formato **exit0**; warning de caché y fallos iniciales documentados arriba.
Clientes directos legítimos sin headers de gateway siguen admitidos usando su
peer real; esta actualización no cambia código, contrato ni autorización.

Siguiente paso: Astra existente verifica únicamente delta B/aislamiento y evidencia
nueva, con decisión de aceptación a cargo de coordinación. No se repitieron suites,
no hubo concurrencia PG/browser ni cambios de auth/migraciones/manifests/scripts.
**B no se autocierra; C/D siguen sujetos al gate de coordinación.**

Base mínima verificada el 2026-10-20. `GET /health` devuelve HTTP 200 y exactamente
`{"status":"ok"}` con Content-Type `application/json`. Solo indica que el proceso
responde: no comprueba motor de compatibilidad, base de datos ni proveedor IA.

## Requisitos y alcance

- Windows/PowerShell, Python administrado por uv **3.12.13**, uv **0.11.16**.
- Entorno existente en `backend/.venv`; pin en `.python-version`.
- No activar el entorno ni instalar globalmente. El proyecto no se distribuye como
  paquete (`tool.uv.package=false`); ejecutar siempre desde `backend/`.
- No requiere variables, `.env`, credenciales, servicios externos ni `.env.example`.
- FastAPI 0.156.3, Pydantic 2.14.1 y Uvicorn 0.54.0; grupo dev: pytest 9.1.1,
  Ruff 0.17.1 y httpx2 2.15.1. Starlette 1.9.0 quedó fijada como transitiva en
  `uv.lock`; su TestClient utiliza httpx2. No se instalaron extras `standard`.

Las dependencias directas se fijan en `pyproject.toml` y las transitivas, artefactos
y hashes en `uv.lock`, generado por uv. No editar el lockfile a mano. El directorio
`upgradejusto/api` es entrada HTTP y `main.py` compone la app. Etapa 28 incorpora
`upgradejusto/compatibility` como dominio parcial independiente de HTTP/BD/LLM/red;
en28 no había persistencia.31b agregó catálogo readonly y preparación PG separada,
descritos más abajo. No se crearon seis módulos vacíos.

## Instalación desde el lockfile

Desde la raíz del proyecto, abrir PowerShell y ejecutar. uv debe estar en PATH;
si no lo está, asignar a `$uvTask` la ubicación del uv ya instalado, sin reinstalarlo.
Comprobar inmediatamente el código de salida de cada ejecutable: PowerShell no
convierte automáticamente todos sus fallos en excepciones.

```powershell
Set-Location .\backend
$uvTask = (Get-Command uv -ErrorAction Stop).Source
& $uvTask sync --locked --group dev --python 3.12.13 --no-python-downloads
if ($LASTEXITCODE -ne 0) { throw 'Falló uv sync' }
& $uvTask sync --check --locked --group dev --python 3.12.13 --no-python-downloads
if ($LASTEXITCODE -ne 0) { throw 'El entorno no está sincronizado' }
```

Esto utiliza `.venv` y no descarga otro Python. Revisar primero su estado si se
han agregado paquetes manualmente: `sync` realiza sincronización exacta y puede
retirar paquetes ajenos a lo declarado. En esta etapa no se recreó el entorno.
uv avisó que no podía usar hardlinks entre caché y destino y copió archivos;
la instalación terminó correctamente, sin cambiar configuración.

Solo al modificar intencionalmente dependencias, regenerar y revisar el lockfile
antes de sincronizar (no es parte de cada arranque):

```powershell
& $uvTask lock --python 3.12.13 --no-python-downloads
if ($LASTEXITCODE -ne 0) { throw 'Falló uv lock' }
```

## Verificaciones (desde backend/)

```powershell
& .\.venv\Scripts\python.exe -c "from upgradejusto.main import app; print(type(app).__name__)"
if ($LASTEXITCODE -ne 0) { throw 'Falló la importación' }
& .\.venv\Scripts\python.exe -m pytest -q
if ($LASTEXITCODE -ne 0) { throw 'Falló pytest' }
& .\.venv\Scripts\ruff.exe check .
if ($LASTEXITCODE -ne 0) { throw 'Falló Ruff lint' }
& .\.venv\Scripts\ruff.exe format --check .
if ($LASTEXITCODE -ne 0) { throw 'Falló Ruff formato' }
```

Resultado de etapa 27: importación `FastAPI`, un test de salud, lint y formato
aprobados. El test de salud usa TestClient como context manager y comprueba HTTP,
JSON exacto y Content-Type; no fabrica eventos de arranque. En etapa 28 la suite
completa aprobó **66 pruebas**, incluyendo salud y el dominio parcial descrito abajo.

## Arranque local

Desde `backend/`, en una terminal dedicada:

```powershell
& .\.venv\Scripts\python.exe -m uvicorn upgradejusto.main:app --host 127.0.0.1 --port 8000 --loop asyncio --http h11 --no-proxy-headers
if ($LASTEXITCODE -ne 0) { throw 'Uvicorn terminó con error o fue interrumpido' }
```

Consultar desde otra terminal PowerShell:

```powershell
$r = Invoke-WebRequest 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 5
if ($r.StatusCode -ne 200) { throw 'HTTP inesperado' }
$body = $r.Content | ConvertFrom-Json
$keys = @($body.PSObject.Properties.Name)
if ($keys.Count -ne 1 -or $keys[0] -ne 'status' -or $body.status -cne 'ok') {
    throw 'JSON inesperado'
}
if (($r.Headers['Content-Type'] -split ';')[0] -ne 'application/json') {
    throw 'Content-Type inesperado'
}
```

Detener con Ctrl+C al terminar. Si 8000 está ocupado, usar otro puerto libre en
ambos comandos; nunca terminar procesos ajenos. La verificación automatizada de
esta etapa usó un proceso oculto propio, timeout y limpieza en `finally`, siguiendo
también al hijo Python del lanzador de Windows. Confirmó HTTP real en 127.0.0.1:8000
y terminó ambos procesos; logs solo en `../tmp/`, ignorado por Git.

## Dominio CU05 parcial y demo local (etapa 28)

Desde `backend/`, sin iniciar un servidor:

```powershell
& .\.venv\Scripts\python.exe -m upgradejusto.compatibility.demo
if ($LASTEXITCODE -ne 0) { throw 'Falló la demo de dominio' }
```

Emite un array JSON de tres casos con veredicto, resultados de subregla, evidencia,
condiciones, faltantes, revisiones y cobertura. No guarda ni cambia configuraciones.

- **S08**: PRIME-RTX5070-O12G y CX550 CP-9020277; incompatible por un solo ramal para
  dos entradas independientes del adaptador incluido (F07/F09/F19). No falla por
  ausencia de cable nativo ni por comparar 550/750 W.
- **S10**: TUF-RTX5070-O12G-GAMING 329 mm y Meshify C 315 mm con fans delanteros;
  incompatible por R04.largo, exceso 14 mm (F08/F13).
- **D01-S10-omitted-length**: derivado explícito con largo omitido intencionalmente;
  requiere_verificacion, sin fallos conocidos. No es otra PC real.

Los fixtures son extractos locales versionados de HARDWARE_DEMO, sin consultas web
en runtime. Cada caso conserva diez comprobaciones sin implementar; la otra
subregla queda unknown en S08/S10 y ambas quedan unknown en D01. Ningún ejemplo
declara una PC compatible completa. Las subreglas no aprueban toda R04 o R06.

Entrada pública Python: `evaluate(ResolvedConfiguration(...))` en
`upgradejusto.compatibility.evaluation`, con modelos en `models.py`. Datos ya
resueltos, referencias de evidencia y revisiones obligatorias; mediciones/tipos
estrictos, modelos congelados con tuplas. Errores de entrada son ValidationError/
ValueError separados del veredicto. Unknown/conflict no se convierten en cero o
compatibilidad; evidencia vacía no fundamenta pass/fail.

Inventario interno fijo `cu05-28.1`, 12 comprobaciones R01–R10. El consumidor no
puede elegir reglas ni enviar resultados preaprobados. Solo se implementaron largo
GPU y ruta de adaptador de dos PCIe8 independientes; rutas nativas/otros requisitos
no soportados quedan pendientes. Potencia, EPS/ATX, espacio lateral y demás reglas
siguen pendientes. No hay endpoint CU05, resolución de usuario/pc_id/catálogo,
sustitución ni plan. Rama compatible del agregador probada solo con inventario
sintético interno, nunca habilitada en los ejemplos parciales.

Las verificaciones de etapa 28 usaron pytest completo, Ruff y demo sin servidor
HTTP adicional, y `uv sync --check --locked --group dev --python 3.12.13 --no-python-downloads`.
Detalle del contrato en [CU05](../docs/specs/CU05-compatibilidad.md) y resultados en
la [bitácora28](../docs/ai-log/2026-10-20-etapa28-dominio-compatibilidad.md).

## CU04 — Sprint31b A readonly

Contrato implementado: `GET /api/catalog/components` y
`GET /api/catalog/components/{component_id}`. Router `api/catalog.py` → servicio
`catalog/service.py` → repositorio `catalog/repository.py` → extracto curado
`catalog/dataset.py`, versión **sprint31b-a-v1**. No es una BD en memoria ni una
prueba de PostgreSQL: es el dataset readonly autorizado para A, sin escrituras.

Incluye 14 piezas P01–P10 y P15–P18 de HARDWARE_DEMO (líneas 9–31, 52–82,
84–114 para atributos y 178–194 para precios). Solo categorías `cpu`,
`motherboard`, `ram`, `gpu`, `psu`, `case`; excluye SSD, cooler, fans y adaptador.
Los atributos son strings o null; BIOS instalada no se deduce del catálogo.
Se conserva el conflicto F10/F11 de cables P08 como nota y cantidad desconocida.
No calcula compatibilidad, presupuestos ni rendimiento.

Lista: `{dataset_version,items,total,page,page_size}`. Filtros opcionales
`category` y `q` (substring sobre nombre, strip, case-insensitive, máximo 100)
combinados con AND antes de paginar. Orden lexicográfico por ID. `page` 1–10000
(default 1); `page_size` 1–50 (default 12). Fuera de rango de resultados devuelve
lista vacía y total conservado. Parámetros inválidos: 422 FastAPI.

Detalle: el mismo componente de lista, sin envoltorio:
`{id,category,name,attributes,sources,prices,image}`. No encontrado: 404
`{"detail":"Component not found"}`. Referencias Fxx con URL; imágenes siempre null
(frontend debe mostrar «Imagen no disponible»). Precios no documentados: `[]`.
Importes decimales string positivos en ARS, fecha documentada `2026-10-20` y
procedencia que conserva URL, observaciones y condiciones faltantes. Son históricos,
no ofertas actuales ni garantía de stock. O05 conserva especial y tarjeta separados;
O04 es precio por módulo, no kit. No se suponen envío ni cargos gratuitos.

Las pruebas `tests/test_catalog.py` usan HTTP TestClient con el repositorio real
curado, sin mocks. Cubren filtros AND, límites/422, recorrido sin duplicados,
vacíos, detalle/404, readonly, desconocidos, procedencia y precios históricos.
Ejecutar pytest, Ruff check, Ruff format --check y uv sync --check indicados arriba
y en etapa 28, por separado. No requiere servidor PostgreSQL; su persistencia no
está implementada ni verificada en A. No se implementaron CU01, CU03 o nuevas
reglas CU05. Health y motor28 conservan su alcance.

## Preparación Sprint31b B — bloqueado, no operativo

Se prepararon `upgradejusto/persistence/`, `alembic.ini` y `alembic/` únicamente
para el catálogo. No hay autenticación, usuarios, sesiones, endpoints CU01,
propiedad CU03 ni ampliaciones CU05/R01. La API A continúa con su repositorio
readonly y no importa ni conecta esta infraestructura. A quedó verificado en31b
con códigos corroborados; B solo tiene comprobaciones unitarias/offline, no PG real.

`database.build_engine` valida exclusivamente `postgresql+psycopg`, host y base
explícitos. Importar no consulta variables ni crea engines/conexiones; construir
el engine tampoco conecta. No hay fallback ni sustituto SQLite/memoria.
Solo ejecutar Alembic o el CLI de seed lee `DATABASE_URL` del entorno del proceso;
no se cargan archivos `.env`. No guardar ni imprimir la URL o credenciales.

Migración inicial `31b_a_001`: tablas `catalog_datasets` y `catalog_components`,
clave compuesta versión/ID, FK, categorías restringidas, atributos/procedencia/
precios JSONB e imagen null. Conserva importes como strings y desconocidos null.
No ejecuta `create_all` en arranque. El downgrade destructivo está bloqueado:
requiere una decisión explícita y una migración revisada, no borrar datos.

Seed `python -m upgradejusto.persistence.seed`: toma exactamente el dataset A;
una transacción inserta faltantes con `ON CONFLICT DO NOTHING`, sin UPDATE,
DELETE ni TRUNCATE. Verifica que claves ya existentes tengan el mismo contenido;
una divergencia aborta y revierte las inserciones de ese intento. Conserva otras
versiones/piezas; no corrige datos existentes silenciosamente. Códigos previstos
del CLI: 0 snapshot comprobado, 1 fallo, 2 URL no configurada; no son resultados
ejecutados en este entorno.

**No ejecutar contra un servidor sin autorización.** Cuando Build disponga de
PostgreSQL utilizable autorizado y configure el entorno sin revelar secretos,
los comandos preparados desde `backend/` son, por separado:

```powershell
& .\.venv\Scripts\python.exe -m alembic -c alembic.ini upgrade head
if ($LASTEXITCODE -ne 0) { throw 'Falló la migración PostgreSQL' }
& .\.venv\Scripts\python.exe -m upgradejusto.persistence.seed
if ($LASTEXITCODE -ne 0) { throw 'Falló el seed PostgreSQL' }
```

Después deberán comprobar migración y seed reales dos veces, preservación de
datos ajenos y divergentes, transacción/rollback y persistencia tras reinicio.
No se han ejecutado ni verificado aquí. `tests/test_persistence_preparation.py`
solo valida configuración, engine lazy sin conexión, snapshot, colisiones en
función pura y compilación SQL PostgreSQL/Alembic offline. Usa un bloqueo de
conexión para detectar accesos accidentales; no simula integración PostgreSQL.
Incluso si esos tests pasan, B sigue bloqueado y CU01 no queda satisfecho.

## Límites y mantenimiento

Pruebas ejecutadas en este entorno Windows, no reproducción en otra máquina.
El resto del stack y los diez CU siguen fuera de este incremento, no descartados.
Hardware/CU05 continúan con faltantes; este endpoint no cambia sus veredictos.
Python 3.12.15 está publicado con correcciones de seguridad, pero su disponibilidad
con este uv quedó pendiente. Se conserva 3.12.13 por autorización para desarrollo
local; revisar mantenimiento antes de exposición o despliegue. No usar `0.0.0.0`.
# Seguridad37 — gate local pendiente

Contrato, límites HTTP, presupuesto PG compartido, migración aditiva y selección de
checks: [SECURITY37_HANDOFF.md](SECURITY37_HANDOFF.md). Cuerpos se limitan por bytes
reales y deadline de recepción5s; SSE no hereda ese temporizador. Aplicar migración
`37_001` por Build antes de probar asistente/extracción. Retención nunca arranca
automáticamente: CLI TEST `python -m upgradejusto.auth.maintenance --dry-run`, sin
leer credenciales ni aplicar limpieza DEV. Código preparado no equivale a gate PG
aprobado; resultados pendientes de Build/revisión.
