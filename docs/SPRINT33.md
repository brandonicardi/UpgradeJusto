# Sprint33 — CU02+CU10, FUNCIONAL LOCAL APROBADO25/10

## POSTSCOPE vigente25/10 — CIERRE LOCAL básico stock aprobado

Autorización más reciente sustituye la detención y el alcance exhaustivo anteriores;
el cierre funcional32/33 y sus evidencias se preservan. CU05/06 cerrados respecto al
alcance actual tras revisión independiente final, incluida corrección B01 socket.
Contrato corto anterior a frontend en specs05/06: `cu05-basic-stock-1`, política
`basic-stock-policy-1`, inventario `basic-stock-inventory-1`, motor
`cu05-basic-stock-engine-1` y scope/advertencias visibles, sin
reinterpretar12 checks legacy ni snapshots/planes/shares/chat históricos. No flags
cliente para omitir checks. Unknown dentro de alcance no aprueba; fail conocido domina.

0/B/C/D/E/F/G/H/I verificados en alcance local actual. Diez CU funcionales locales:
01/02/03/04 aprobados32/33 y recorrido histórico preservados sin repetir;05/06 dos
demos positivas, negativo P16 y BIOS unknown;07/09 delta consumidores real;08 LIVE
Groq/PG;10 publicación autenticada DEV/TEST. No certificación exhaustiva. PSU stock
con evidencia/recomendación y aplicabilidad explícita, RAM nativa JEDEC sin OC sin
rechazo por MHz nominales solos; no ceros ficticios ni márgenes arbitrarios.
Geometría avanzada/certificación exhaustiva fuera, con advertencias, no n/a falso.

Revisión explícita POST SCOPE: `basic-stock-inventory-1` fija B01–B07 como
obligatorias servidor; B08 storage/B09 frontales son adicionales visibles, por alcance
autorizado y ausencia de mapa instalado en DTO seis categorías. No se infieren vacíos
ni funciones conservadas; fallos conocidos se mantienen, sin aprobación global total.
RAM admite población documentada posible sin exigir A2/B2 observado innecesariamente;
refrigeración solo notas sustentadas, no cooler instalado inventado. Contrato CU05
es la referencia; resultados atribuidos a Build/especialistas, no ejecución documental.

RAM recommended766.417,98 ARS/budget1.000.000, rejected/budget766.417,97; paquete
P15+P08 1.882.130 ARS/budget2.000.000; P15 sola/PSU550 rejected. Beneficio capacidad
general RAM16→32/VRAM8→12, no FPS. Publicación CU10 DEV/TEST:11 componentes,
16 registros dataset+6 fuentes fabricante;14 IDs/precios/soporte retenidos, repeat
UNCHANGED y revisión previa intacta.49 candidatos34BC/15DY; cuarentena P08 regional/
P15/P16 sin alias forzados, USD legacy excluido. Pins/licencias en CU05.

Build:13 import/PG0,69s,40 dominio0,19s,6 API/PG1,90s exit0; regresión107PASS/2 fallos
fixture corregidos solo ResolvedCPU explícita,2 focales0,10s exit0. Fix B01 aprobado:
9 focales/PG2,12s exit0. Conteos solapados no sumados. Front tipos/lint0,15 focales0,
build0; web consumidores4PASS11,5s, LIVE Groq/PG1PASS10,3s exit0, historial/owner/PC
intactos. Revisión independiente final sin bloqueantes. Ruff lint0 tras9 I001;
format-check y privacidad/hashes finales pendientes de confirmación Build.
BEFORE1PASS9,8s total preservado; primera AFTER preservada; finales1PASS10,1s con
paneles/móvil/scope/advertencias leídos por Build. Enlaces y detalle en CONTINUAR y
[bitácora vigente](ai-log/2026-10-25-alcance-basico-datasets.md), a cargo de Build.

Límites adicionales visibles: cooler5700X no registrado, sin certificación térmica,
RM750e12V54,2/62,5 A conflictivos, precios no oferta vigente. Python3.12.15 predeploy
pendiente sin actualizar automáticamente. Solo cierre LOCAL, no deploy/permiso
comercial. Archivos documentales: specs05/06, CONTINUAR y esta sección; sin ejecución
propia. Siguiente: registrar confirmaciones Build, no nuevos bloques/commits/push,
instalaciones globales ni cambios permisos/proveedor. Sin corte por cuota.

## Checkpoint histórico — DETENER

Mismo revisor aprobó funcional local tras releer delta UI y test separado de
cancelación. Los bloqueos405/502 y NO APROBADO24/10 son historia preservada en
[bitácora33](ai-log/2026-10-24-cu02-cu10.md), no estado vigente. Nueva autorización
usuario25/10 «un10% más» permitió este delta: no es medición local de consumo ni
cuota actual.30/70 histórico; detener para volver a medir, sin prometer reserva50%.

Archivos de coordinación: este documento, CONTINUAR, bitácora33 y specs CU02/CU10.
Solo cambios documentales, sin shell/producto/delegación ni nuevos checks propios.

## Gates y matriz

| Gate | Estado | Alcance |
|---|---|---|
| 0 | verificado | Setup32 conservado; migraciones DEV/TEST+seed33 exit0 |
| B | verificado | Auth32 y bootstrap33: guarda exacta antes de conectar; hallazgo resuelto |
| C | verificado | PCService/propiedad; confirmación y aislamiento browser33 real |
| D | verificado | Catálogo/revisión/publicación33 real; sin mutación histórica |
| E | bloqueado | CU05 global incompleto; no ampliar ahora |
| F | pendiente | CU06 parcial, sin positivo global; no ampliar ahora |
| G | verificado | Planes32 conservados |
| H | verificado | Shares32 y delta nuevas revisiones33; snapshots conservados |
| I | verificado | CU08 local32 conservado |
| CU02 | verificado | FUNCIONAL LOCAL APROBADO25/10 |
| CU10 | verificado | FUNCIONAL LOCAL APROBADO25/10, límites UI explícitos |

OCHO CU funcionales01/02/03/04/07/08/09/10; DOS parciales05/06, no diez completos.
Evidencia32 preservada323 backend/68 unit frontend/9 normal+1 LIVE/cinco commits;
no repetición de fullsuites.39 focales backend/113 regresiones afectadas33 conservados.

## Evidencia Build25/10 y límites

- `gateway.ts`: UUIDs erróneos corregidos a `seed|revision-hex32`, `row-hex32` y
  P01..P14 solo para components; allowlist cerrada.9 unit198ms exit0, tipos/lint0.
- Labels colección/editor admin con `htmlFor/id` separados corrigieron locator hang,
  sin relajar auth. Build frontend exit0 después del fix de labels.
- Backend clarificó JSON en prompt y RAM excerpt/name/quantity, validadores intactos:
  26tests/0.20s exit0. Probe real seguro200/6 evidencias. El vínculo causal entre
  prompt y502 anterior es hipótesis por error genérico; PASS posterior sí verificado.
- Gate REAL final1passed3.5s/7.6total exit0: normal admin403; draft precio/fuente
  PATCH200, publish200, revisión vieja inmutable y publicado409; Groq preview200 con
  6 evidencias y PC0, edición manual RAM3/BIOS, confirm201/reload persistido,
  B GET/PUT/DELETE404. Cleanup PC204 y restauración mediante revisión nueva.
- Cancelación postpropuesta NUEVO test separado1passed551ms/4.7total exit0: fixture
  explícita CONTROLADA solo POST extract, no acredita LLM. Auth PG real, confirm
  nunca mock, counter0 y PCs antes/después iguales; sin otra llamada Groq.
- PG post TEST exit0: activa publicada,14 componentes iguales al repositorio,
  precios/fuentes actuales iguales a seed por comparación ID/data; históricos intactos.
- Mismo revisor leyó solo delta y canceltest y aprobó FUNCIONAL LOCAL. UI acredita
  edición/publicación precio/fuente; cuatro colecciones CRUD probadas backend, NO
  recorrido manual UI completo. Sin archivos/detección/reglas arbitrarias; un worker
  local, sin deploy. No garantías universales de proveedor/precisión/disponibilidad.

Build final: Ruff delta extracción lint0/formato5 archivos0; frontend tipos/lint0
y9 unitarios0. Privacidad240 candidatos sin literales de credenciales locales/
proveedor; sin artefactos privados seguidos. HEAD `c1ced9e`, cinco commits e índice
vacío comprobados. Condición final de formato satisfecha. Sin fullsuite32 ni Git writes.

Siguiente: persistir solo resultados finales Build cuando se reciban; **DETENER**
continuación automática para medición del usuario. No implementar ni recorrer otros CU.
Comandos literales no suministrados: códigos/resultados atribuidos a Build, no inventados.

## CU05/06 — faltantes preexistentes, sin investigación nueva

| Evidencia | Fuente/medición necesaria | Dueño | Decisión usuario |
|---|---|---|---|
| R05: DC máximo CPU/VRM, placa, RAM y GPU exactas; transitorios/distribución12V pendientes; Corsair62,5/54,2A conflictivos | HARDWARE_DEMO §2 F10 «manual RMe 2025», F11 «ficha RM750e CP-9020295» y §5 «Fuente: conflicto y borrador excluido»; contrastar oficiales, no márgenes arbitrarios | Agente contrasta/modela después, fuera33 | Elegir régimen/política fundamentada después |
| R04: GPU-conector-panel y cables PSU sin envolvente instalada | HARDWARE_DEMO §3 «Ejes y geometría: comprobado y pendiente»; F06/F07/F12/F13/F19/F20; dibujo acotado/medición montaje elegido | Agente analiza documentos, fuera33 | Contexto y medir hardware si falta dibujo |
| R08: Noctua/VRM/RAM abierto | HARDWARE_DEMO §2 F14 «NH-U12S redux»/infosheet, F16 «Noctua compatibilidad CPU»/motherboard; matriz/dibujo;429 no demuestra soporte ni incompatibilidad | Agente consulta única posterior, fuera33 | Contexto/montaje/medición, no soporte falso |
| R10: F26 Define7 Compact, PSU165/200 y USB-C10/20 conflictivos; headers/P14 pendientes | HARDWARE_DEMO §9 «Investigación pública del candidato F26 — 2026-10-24»: «Manual oficial» PDF4/18, «Ficha oficial» PDF4/5, «Define 7 Compact Black Solid»; §4 y F18 «CP14-E» | Agente contrasta/modela, fuera33 | Aceptar sustitución/funciones explícitamente tras comparación, no autocambio |
| CU06: ARS/dependencias/pasta, beneficio trazable y positivo global pendientes | HARDWARE_DEMO §6 «Precios históricos y presupuesto» O01–O05; §2 F23 «KitGuru 5600/5700X»/F24 «HWCooling PRIME 5070 OC»; specs/CU06-recomendaciones.md | Agente valida oferta/benchmark público posterior, fuera33 | Objetivo/presupuesto componentes y dependencias, no envío/financiación/mano de obra |

Fuentes existentes en docs/HARDWARE_DEMO.md; sin consulta de red ni verificación nueva.

## Checkpoint documental postcierre25/10 — histórico, sustituido por POSTCIERRE vigente

Leídos una vez este estado, CONTINUAR, specs CU05/CU06 y HARDWARE_DEMO. Se recibió
pedido de continuación CU05/06; este turno documental conserva la detención del
bloque CU02+CU10 por instrucción operativa superior. No autoriza producto ni cambia
la aceptación global. Cierre33 e historia32 preservados; sin shell, delegación,
consultas externas ni nuevos checks. Cinco commits/índice vacío son evidencia previa
atribuida a Build, no comprobación Git nueva de este turno.

Propuesta breve para elevar a coordinación autorizante, antes de código:

- Evidencia → motor → UI → revisión independiente → recorrido diez CU. Reutilizar
  checks32/33; ejecutar después solo focales del delta y recorrido integrado útil.
- CU05: R01–R10 necesarias, evidencia aplicable o no_aplica justificado; dos bases
  y seis sustituciones positivas siguen exigidas. Web con compatible global,
  incompatible y requiere_verificacion; fail conserva faltantes. Mantener API D,
  identidad servidor, revisión y simulación sin guardar. Cualquier ampliación de
  contexto/DTO exige contrato corto previo al frontend, hoy no definido.
- CU06: conservar API F y objetivos cerrados general/gaming/productivity; recomendar
  solo con beneficio curado aplicable, compatibilidad global y total completo ARS
  ≤ presupuesto, cantidades y dependencias incluidas. Precio fechado/procedencia
  histórica, sin promesa de oferta vigente/FPS; envío/financiación/mano de obra excluidos.
- Agente puede contrastar primero manuales identificados y modelar faltantes;
  no puede elegir silenciosamente F10 sobre F11 ni aceptar F26/cambiar conservación
  funcional. Medida física: distancia GPU/conector-panel, envolvente PSU/cables y
  holgura cooler-RAM/VRM, en mm y montaje exacto; alternativa mínima: dibujo acotado
  aplicable o candidato documentado sometido a aceptación. R05 requiere cotas DC
  total/por salida y régimen/reserva fundamentados: consumo AC/TDP no sustituyen esto.

Estados sin nueva implementación: 0/B/C/D/G/H/I verificados dentro de su alcance
previo; E bloqueado y F parcial con cierre pendiente. Bloqueos reales conservados:
R05, geometría/cooler, R10/F26 y beneficio/precios de dependencias. No se recibieron
hechos nuevos de investigación/backend ni resultados de comandos/códigos nuevos.
Siguiente paso: elevar conflicto de alcance a la sesión coordinadora; detener este
turno, sin investigar CU05/06 extensamente ni declarar diez CU completos.

## POSTCIERRE vigente25/10 — continuación autorizada CU05/06 y recorrido diez CU

### Último checkpoint — incrementos aprobados, recorrido ejecutado; CU05/06 incompletos

Sustituye estados de preparación inferiores, conservados como historia. OCHO CU
funcionales previos con recorrido final reejecutado;05/06 parciales, **no diez completos**.
Revisor aprobó recursos y helper incrementalmente, sin bloqueantes restantes del delta.
Autorización vigente sin corte cuota/50%; checkpoint por criterios reales bloqueados.

| Bloque | Estado actual | Límite |
|---|---|---|
| 0/B/C/D | verificado | Aprobados32/33 preservados, recorrido integrado informado abajo |
| E | verificado delta / bloqueado cierre | Recursos aprobados incrementalmente; implementación y evidencia global incompletas |
| F | verificado flujo / bloqueado cierre | Beneficio/coste reales, no compatible global ni recommended |
| G/H | verificado | Recorrido normal y hashes históricos intactos |
| I | verificado delta local | LIVE final PASS; helper aprobado incrementalmente y checks finales0 |

#### Matriz de recorrido final diez CU — PASS de flujo no equivale a cierre global

Resultados atribuidos a Build/especialistas, no ejecutados por este escritor.

| CU | Recorrido | Estado de aceptación |
|---|---|---|
| 01 registro/login | PASS flujo normal | Funcional previo conservado |
| 02 extracción/revisión/confirmación | PASS REAL CU02+10 | Funcional previo; cancelación histórica no reejecutada |
| 03 PCs por propietario | PASS flujo normal/aislamiento | Funcional previo conservado |
| 04 catálogo | PASS flujo normal | Funcional previo conservado |
| 05 compatibilidad | PASS flujo unknown e incompatible+missing | PARCIAL; compatible global BLOQUEADO por implementación+evidencia |
| 06 recomendaciones | PASS coste/beneficio/insuficiente/unknown | PARCIAL; recommended BLOQUEADO por implementación+evidencia |
| 07 planes | PASS flujo normal | Funcional previo conservado |
| 08 asistente | PASS LIVE final stream/MCP/historial | Funcional local; nuevo helper aprobado incrementalmente |
| 09 compartir/revocar | PASS flujo normal | Funcional previo; beneficio público unknown conservador |
| 10 administración | PASS REAL CU02+10 | Funcional previo, rol servidor y revisiones conservados |

Motor `cu05-25-resources.1`, sufijo datos
`|platform-evidence-25.1|resource-evidence-25.1`:12 checks/9 con predicados incluyendo
R02 RAM/R07 montaje/R03 PCIe/R06.otros/R09 storage/R10 frontales. Nominal público
exacto curado con SOURCES/fingerprints e invalidación, sin población desde notas ni
flag «resto comprobado». Datos actuales dejan familias partial/unknown; R04 resto,
R05 y R08 NOT_IMPLEMENTED. No atribuir bloqueo global solo a datos. Web RAM5>4 slots
incompatible+missing; base unknown. General16→32 GB supported,766.417,98 ARS/within
al presupuesto exacto, NO recommended; insuficiente rejected; gaming/productivity
unknown. Share público conserva beneficio unknown: límite explícito, contrato intacto.

#### Evidencia de ejecución y correcciones — no sumar conjuntos solapados

- Primer78 unit/3 PG exit0 preservados, NO añadir como disjuntos. Recursos86 unit
  0.26s exit0;40 PG/API/MCP16.96s exit0. Revisor halló dos medios: SATA power duplicado
  y contradicción cross-inventory; corregidos,66 focales0.21s exit0 y aprobados por
  mismo revisor. Aprobación incremental recursos, no compatible global.
- E2E normal9passed19.6s exit0, PGpost0; wrapper ignoró intención de7 filtros: son9,
  no7, no repetir. Build exit0 por wrapper. CU02+10 REAL1passed4.0s/8.2total exit0;
  cancelación histórica separada, no nueva ejecución.
- Asistente LIVE inicial esperó DOM efímero100s; observer numérico seguro corregido.
  Segundo LIVE2.9s falló generation_failed aun con MCP evaluate COMPLETED. Diagnóstico
  real confirmó HTTP413 rate_limit_exceeded por request size, NO cuota semanal.
  Cleanup FK sessions falló y fue revertido; cleanup sintético propio seguro exit0.
- Nuevo helper cerrado: proyección structured data sin duplicado texto MCP, conserva
  todos veredictos/missing/coverage/versiones, deduplica refs, elimina notes; JSON
  estricto24k bytes fail-closed. Sin cambio modelo/proveedor/cuentas.20tests5.45s exit0,
  Ruff lint0/formato final4 archivos0, tras corrección mecánica de un archivo.
- Asistente FINAL REAL1passed6.8s/11total exit0: stream delta antes de done, MCP
  evaluate completed, historial2 mensajes/reload/owner/PC intacta. Citas opcionales:
  NO acredita nuevas citas RAG reales; evidencia RAG32 preservada. Revisor aprobó
  helper y nuevo test incrementalmente; no garantiza413 ausente con historial arbitrario.
- Front77 unit/13 archivos exit0: alias npmtest ignoró filtro intentado, no repetir.
  Tipos/lint finales0. PGpost0, hashes de
  snapshots antiguos intactos;14 componentes activos Published, precios/fuentes como
  seed restaurados por NUEVA revisión, no mutación de la historia.
- Final Build: Ruff plataforma/recursos42 archivos0 y helper4 archivos0; privacidad252
  candidatos sin credenciales literales. Índice vacío, HEADc1ced9e y cinco commits
  preservados; sin artefactos privados seguidos. No se repitieron pruebas después.

Comandos literales/hashes efectivos a cargo de Build en
[bitácora nueva](ai-log/2026-10-25-cu05-cu06-evidencia.md), fuera del ownership de este
escritor. Sin migraciones/seed/envsetup/proveedor/cuentas/commits/push. Contratos HTTP
D/F conservados; sin nuevas entradas de medidas ni parser de notas. No checks propios.

**Siguiente concreto:** para cerrar05/06 faltan implementación R04
restante/R05/R08, contrato determinístico y tests focales; evidencia fabricante para
DC EPS/ATX/GPU por salida/total/máximo simultáneo/transitorios y conflicto Corsair,
confirmación cooler/placa/RAM y envolventes GPU-panel/PSU/cables/CP14-E mediante datos
aplicables o integración calificada de demo. Después revisión/web compatible global
y CU06 recommended con beneficio/coste. Usuario: «Son escenarios de demo», no pedir
mediciones inexistentes ni investigar indefinidamente. Research oficial acotado cerrado;
no hardware alternativo mágico ni F26 aceptado. Cierre bloqueado por implementación
y evidencia, no por cuota/50%; autorización sigue vigente.

### Historia de preparación postcierre — estados sustituidos por checkpoint superior

Autorización posterior al cierre33 sustituye DETENER por cuota/50% y exclusiones
CU05/06 de secciones anteriores. Completar05/06 y revisar/recorrer diez CU incluido
asistente, sin prometer resultado. Preservar aprobados32/33 y su historia; sin suites
repetidas por rutina, estimaciones desde tokens/cost ni promesas de reserva. Avisar
límites reales; sin reconfiguración, permisos nuevos, commits/push ni mocks finales.

### Checkpoint previo al siguiente bloque grande

| Bloque | Estado vigente | Alcance / siguiente gate |
|---|---|---|
| 0/B/C/D | verificado | Alcance32/33 conservado; no reejecutado en este turno |
| E | en curso | Investigación oficial acotada terminada; delta backend sustentado autorizado; cierre global bloqueado POR EVIDENCIA |
| F | en curso | Flujo conservador previo conservado; cierre bloqueado por positivo global |
| G/H/I | verificado | Planes/shares/asistente local32/33 preservados; recorrido final pendiente |
| Revisión y recorrido diez CU | pendiente | Delta sustentado, checks focales, revisión independiente por riesgo e integración real; sin declarar diez completos |

**Archivos/ownership:** este escritor solo specs CU05/CU06, CONTINUAR y esta sección
POSTCIERRE. Sin edición producto, shell ni delegación. Build raíz/setup; especialistas
sus carpetas. No otro escritor simultáneo sobre estos documentos.

**Contrato previo al frontend:** conservar API D de CU05 (§9) y F de CU06. Servidor
resuelve identidad/propiedad, catálogo y revisiones; simulación sobre copia, sin guardar.
Todas las reglas necesarias, fail domina conservando faltantes, desconocido no es pass.
`recommended` solo compatible global + beneficio aplicable + coste/dependencias completos
dentro de presupuesto. Cambios DTO/contexto requieren contrato corto nuevo antes de UI;
este checkpoint no los autoriza por inferencia ni acredita implementación nueva.

**Resultado informado25/10, no reconsulta de este escritor:** F10 manual Corsair
RPS0215 62,5 A/750 W frente F11 ficha54,2 A/750 W persiste. R05 faltan cotas DC de
placa/RAM/entrada EPS/GPU exacta, por salida/total, simultaneidad y transitorios.
TDP/paquete76 W/consumo de pared no sirven de sustituto. No aceptar power-policy draft
ni afirmar «resto comprobado». Fuentes: HARDWARE_DEMO §2/§5, F10/F11/F23–F25.
Usuario aclaró25/10 **«Son escenarios de demo»**, no A/B físicos. No pedir mediciones
inexistentes, abrir PSU/medir red ni seguir investigación indefinida. Con estas bases
y criterios vigentes no hay positivos globales posibles ahora: bloqueo POR EVIDENCIA.
No explicar conflicto Corsair con aritmética favorable ni sustituir DC por KitGuru.

Investigación oficial acotada25/10 terminada, informada por coordinación; referencias
URL/localizador existentes en HARDWARE_DEMO, no reconsulta propia de este escritor:

| Fuente | Hallazgo/límite25/10 |
|---|---|
| F10/F11 Corsair | Manual62,5 A y comercial54,2 A siguen inconsistentes; faltan DC máx EPS/ATX/GPU total/por salida, máximo simultáneo y transitorios |
| F16 Noctua | Matrices5600/5700X y Pro4/Steel Legend429, sin confirmación NH-U12S redux; no asumir soporte |
| F13 Fractal FAQ | 315 mm solo largo con fans delanteros; H/panel y envolventes GPU/PSU/cables/CP14-E siguen unknown |
| F26 Define7 Compact | No elimina adaptador ni envolvente GPU; conflictos USB10/20 y PSU165/200 persisten; no componente aceptado |

Ofertas25/10 informadas: RMS P05 ARS383.208,99×2=766.417,98, stock2; Exxit P08
175.898, transferencia/IVA incluido, stock alto. URLs y límites en CU06; observaciones
separadas del historial O02/O04. RAM+PSU=942.315,98 ARS, sin prueba de integración API.
Presupuesto2.000.000 es propuesta/input demo, no compra aceptada. Beneficio RAM16→32 GB
es capacidad, no FPS/productivity. Cierre CU06 exige positivo compatible global real.

**Comandos/códigos/checks:** ninguno nuevo de este escritor; lecturas documentales y
consistencia de contrato/aritmética, sin prueba técnica independiente. Evidencia de
Build previa sigue atribuida, no reejecutada. No declaración de cierre CU05/06.

**Plan/aceptación breve:** fuentes identificadas → delta motor sustentado/contrato →
frontend si corresponde → checks focales por bloque → revisión independiente →
recorrido real diez CU (incluido asistente), con estados y límites explícitos.
CU05 mantiene dos bases/seis sustituciones positivas y web tres veredictos; CU06
positivo global/beneficio/coste real ARS. Tras cada bloque: archivos, contrato,
comandos/códigos, resultado, límites y siguiente paso; no prometer cerrar datos físicos.

### Decisión vigente tras aclaración demo — delta acotado, no scopes nuevos

Backend único autorizado a implementar con evidencia R02 RAM/R03 PCIe/R07 formatos/
R09 storage/R10 headers dentro del alcance sustentado y posible R06 general solo con
handoff exacto. Donde faltan ocupación/geometría/power: unknown. Conservar HTTP D/F,
sin nuevas entradas de medidas, parseo de notas ni flag «resto comprobado». Frontend
plan pendiente del alcance/API exactos del backend antes de avanzar; sin código nuevo
acreditado por este escritor. No nuevos componentes aceptados ni power-policy aprobada.

Aceptación delta R02: generación/formato/capacidad/cantidades por evidencia, conjunto
RAM sustituido completo; faltantes/conflictos unknown y fail+missing. Versionar reglas
y datos usados, preservar snapshots/resultados anteriores sin reescritura silenciosa.
Tests focales RAM/pass parcial/fail/unknown/retiro/no mutación, versiones/snapshots,
determinismo y regresión inventario/R01/R04/R06; revisión independiente del delta.
No pruebas ejecutadas nuevas aquí; detalles de aceptación en CU05. No ampliar scope.

CU06 foco `general`: capacidad16→32 GB sustentada por F05 part numbers KVR; RAM sola
766.417,98 ARS, gaming/productivity sin fuente de rendimiento → unknown. Recommended
solo compatible GLOBAL; no reemplazarlo por coste dentro del presupuesto.

Próximo checkpoint: retorno backend con alcance exacto, archivos/contrato/checks/
códigos/resultados/límites; luego frontend si corresponde y recorrido diez CU autorizado.
Gates compatible positivo y recommended permanecen bloqueados por evidencia, nunca
presentados como aprobados. Matriz ocho funcionales/dos parciales conservada. Sin
corte por cuota/50% restante ni estimaciones; avisar límites reales.
