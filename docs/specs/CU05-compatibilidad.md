# CU05 — contrato documental mínimo de compatibilidad

Base documental de 2026-10-20: propuesta `cu05-doc-25.1`, datos `hardware-demo-25.1`, política `power-policy-25.1-draft`, conservada para los pendientes. **Etapa 28: dominio parcial ejecutable `cu05-28.1`, dos subreglas y agregación conservadora con pruebas; sin API CU05 ni motor completo.** El inventario ejecutable reemplaza el nombre de reglas borrador solo para este incremento interno; no implementa ni acepta la política de potencia. Fuentes F01–F25, piezas P01–P18 y ofertas O01–O05: [HARDWARE_DEMO.md](../HARDWARE_DEMO.md). No se reduce V1 ni se acepta stack adicional. Alcance ejecutado en sección 8.

## 1. Decisiones y alcance

Aceptadas tras etapa 23: **veredictos/cobertura explícita**, **RAM como conjunto completo**, **evaluaciones versionadas**. Son coherentes con [AGENTS.md](../../AGENTS.md). Los nombres de campos, catálogo, selección de piezas, predicados, políticas y escenarios nuevos de este documento son **propuestas revisables**, no aceptación del usuario.

Aceptación adicional acotada de etapa 28: contrato interno de datos ya resueltos,
inventario no reducible por el consumidor, agregación conservadora y subreglas
R04.largo/R06.ramales_adaptador, con ejemplos y pruebas. No acepta todo lo propuesto
en etapa 25, ni altera R10/potencia, ni declara PCs compatibles completas.

Objetivo de cierre futuro: dos bases y al menos una sustitución compatible por CPU, motherboard, RAM, GPU, fuente y gabinete, con todas las dependencias aplicables y recorrido fuente→GPU. Tres familias internas no equivalen a cobertura final. En esta etapa se registra expresamente qué falta; `requiere_verificacion` no es una estrategia para declarar terminada la demo.

## 2. Datos mínimos separados

| Concepto | Campos/semántica propuestos |
|---|---|
| Catálogo | `part_id`, categoría, fabricante, modelo, P/N, generación/variante, revisión comercial o “no diferenciada por el fabricante”; atributos sin precio embebido |
| Atributo/evidencia | Valor tipado, unidad y eje si corresponde; estado documentado/declarado/estimado/conflictivo/pendiente; fuente URL/sección/página, fecha, condiciones de validez y revisión de datos. Conservar ambas observaciones de un conflicto y resolución editorial propuesta |
| Instalado | Referencia a pieza, cantidad, posición/ranura/header, cables/ramales utilizados y contexto propio; no modificar ficha global para declarar BIOS instalada o retirar una jaula |
| Contexto | BIOS, población RAM y régimen, slots, discos/puertos, fans/cooler, radiador, jaulas, trayectorias de cable, temperatura/rating; ausencias explícitas distintas de campos desconocidos |
| Precios | Oferta independiente: pieza/cantidad, importe decimal y moneda, fecha, vendedor/URL, stock/condición/pago, envío/impuestos/extras conocidos o desconocidos. Nuevas consultas no sobrescriben observaciones históricas |
| Visuales | Origen, variante representada, tipo de imagen, representatividad y permiso/estado de uso; no acreditan atributos técnicos por estar enlazados |

Normalizar mm, GB, V, A, W y MT/s sin comparar magnitudes de distinto significado. Conservar etiqueta original. No equiparar MHz comercial con MT/s ni fuente wattage con energía/consumo AC. Un `null`/desconocido no vale cero, falso o ausente. La revisión no publicada no bloquea por sí misma todos los atributos.

## 3. Consulta y evaluación

**Entrada pública de sustitución propuesta:** `pc_id`, `expected_pc_revision`, `category`, `candidate` (referencia de catálogo; para RAM lista completa de referencias y cantidades). El servidor autentica y verifica propiedad; identidad no se toma de un `user_id` del modelo ni del cuerpo. Mismos controles en API y MCP. No SQL arbitrario.

**Entrada interna al motor:** snapshot resuelto de PC y contexto; sustitución resuelta; evidencia, revisiones de datos/reglas/política y restricciones relevantes. Dominio independiente de HTTP, BD y LLM; servicios comparten resolución y autorización. No diseñar ahora toda la base ni endpoints.

Semántica:

1. Copiar configuración de revisión solicitada; retirar componente anterior de la categoría. RAM retira **todos** los módulos anteriores, instala cantidades del nuevo conjunto; no suma capacidad vieja.
2. Resolver candidato sin añadir otras piezas implícitas. P15 sola con P07 sigue usando P07. Una propuesta **de paquete** declara explícitamente cambios P08+P15, dependencias y costo propio; no es una consulta de GPU sola.
3. Cambio de fuente retira cableado anterior e instala juego compatible de la nueva. No heredar cables modulares, aunque encajen. Documentar conexiones retiradas, libres y asignadas.
4. Evaluar todas las reglas necesarias aplicables sobre resultado; no cortocircuitar al primer fallo. Las dependencias desconocidas generan faltantes, no se dan por incluidas.
5. Plan: cada etapa parte del resultado acumulado, nunca de la base original. Si la primera falla, no ejecutarla ni omitirla para justificar la siguiente; se puede informar simulación de la configuración final separadamente. Ninguna simulación guarda la PC ni cambia su revisión.

Errores operativos separados: no autenticado, no autorizado/no propietario (sin filtrar datos privados), PC/candidato inexistente según política de exposición, revisión obsoleta, categoría/cantidad/unidad inválida, fallo de resolución. No son veredictos técnicos. Un campo técnico crítico desconocido sí pertenece a evaluación, no se “arregla” con un error genérico.

## 4. Salida y agregación

Campos mínimos: `verdict`, `rule_results`, `missing_fields`, `rules_version`. Agregados propuestos: `pc_revision`, `data_revision`, `policy_version`, identificador/revisión de evaluación y `coverage`.

Cada `rule_result`: ID/versión, aplicabilidad con razón, estado `pass/fail/unknown/not_applicable/not_implemented`, atributos observados, requisito, evidencia y condiciones, faltantes y explicación. Esos estados internos no agregan un cuarto veredicto público. `not_applicable` exige prueba (por ejemplo radiador explícitamente ausente); no significa desconocido.

Cobertura por ID de regla/instancia: necesarias, implementadas, evaluadas, aprobadas, fallidas, con faltantes y pendientes de implementación. No basta un porcentaje ni contar categorías: una regla por disco, rail o conector puede tener varias instancias. Mantener inventario de reglas necesarias aunque no estén implementadas.

- Cualquier fallo demostrado → **incompatible**, conservando otros faltantes y pendientes.
- Sin fallos pero sin evidencia necesaria o con una regla necesaria pendiente → **requiere_verificacion**, explicando si falta dato o implementación; no declarar cierre de demo con reglas faltantes.
- **compatible** requiere todas las reglas necesarias aplicables implementadas, evaluadas y aprobadas; no_aplica solo justificado. No hay nombres de PCs preaprobadas ni flag “resto comprobado”.

Guardar revisiones para reproducibilidad: misma PC con otro catálogo/política puede cambiar evaluación; no reescribir silenciosamente el resultado histórico. Versiones documentales draft no implican que exista persistencia implementada.

## 5. Reglas necesarias propuestas

| ID | Predicado, evidencia y tratamiento de faltantes |
|---|---|
| R01 CPU/soporte/BIOS | Socket coincide **y** lista oficial cubre CPU exacto/placa/revisión aplicable **y** BIOS instalada satisface requisito. F01–F04/F22. Versiones por relación del fabricante, no comparación decimal o lexicográfica. BIOS anterior a mínimo documentado falla requisito de soporte, sin afirmar imposibilidad física de POST; BIOS desconocida → missing |
| R02 RAM/plataforma | Generación y formato UDIMM, tipo/búfer/ECC, población, cantidad, capacidad por módulo/total y régimen base admitidos por CPU/placa; F01–F05/F22. Evaluar conjunto nuevo completo; perfiles OC opcionales no se imponen como velocidad base. Falta QVL no significa automáticamente incompatible; no afirmar estabilidad física ensayada |
| R03 GPU/interfaz | Ranura física/enlace negociable utilizable con CPU/recursos instalados; F03/F06–F08/F22 y evidencia de negociación aplicable. Diferente generación PCIe no es fallo por sí sola. No convertir familia antigua del manual en soporte exacto Vermeer ni garantizar rendimiento del enlace |
| R04 GPU/espacio | L/H/T normalizados, límite efectivo por montaje, slots contiguos, shroud/otras tarjetas, cuerpo del conector, tramo recto/curvatura y panel sin presión. F06–F08/F12/F13/F18/F20. Largo suficiente o siete slots no cierran los otros ejes. Known fail domina unknown |
| R05 Potencia/salidas/térmica | Potencia continua a temperatura aplicable, cargas DC resultantes por salida y total, límites individuales/combinados, requisitos/recomendaciones bajo política explícita, reserva justificada/transitorios cuando correspondan. F09–F11/F15/F17/F23–F25. Datos parciales o margen sin respaldo no aprueban |
| R06 Conectores/cables | Asignación sin duplicaciones de ATX, EPS, GPU y periféricos, tipos eléctricos, ramales independientes si exigidos, corriente headers y alcance/encaje. F03/F07/F09–F11/F15/F19/F22. P15 permite adaptador incluido, pero sus dos entradas requieren dos cables independientes; ausencia nativa no basta para fail |
| R07 Montaje placa/fuente | Formato, posiciones/separadores, dimensiones y espacio efectivo de fuente con conectores/cables/jaulas; F03/F09–F13/F22. No basta dimensión externa del gabinete ni margen nominal de largo |
| R08 Refrigeración | Kit/anclaje, capacidad térmica para CPU/régimen, altura, RAM/VRM/slot y fans con corriente/posición; F03/F12–F16/F22. NSPR no es W, TDP no prueba capacidad real del cooler en cualquier ambiente |
| R09 Almacenamiento/recursos | Protocolo, tamaño/anclaje M.2, ranura, disipación, compartición de puertos y alimentación; F03/F17/F22. M2_2/SATA5-6 vacíos es contexto explícito que evita conflicto, no permiso para agregar discos sin reevaluar |
| R10 Frontal/funciones/dependencias | Headers y pines, conectividad/audio/botones y conservación funcional en sustituciones, velocidad host/adaptador, interferencias físicas; F03/F12/F13/F18/F21/F22. Un header no alimenta dos cables sin dependencia documentada. No desconectar silenciosamente USB/reset |

Precios/objetivos son restricciones de recomendación/plan (CU06/CU07), no convierten una pieza cara en técnicamente incompatible. Su resultado separado informa suma, ofertas/dependencias, exclusiones y faltantes. CPU 6→8 núcleos, RAM16→32 y VRAM8→12 GB son referencias verificables de capacidad, no porcentajes de rendimiento; F23/F24 pueden contextualizar cargas concretas sin inventar índices universales.

### Política de alimentación propuesta

`power-policy-25.1-draft`:

- Adoptar provisionalmente prioridad editorial de F10 técnico del modelo exacto frente a F11; conservar conflicto62,5 A/750 W versus54,2 A/750 W. No usar650,4 W como especificación nueva ni fingir confirmación del fabricante.
- Condiciones: fuentes con cableado propio, CPU stock/no PBO y GPU sin elevar power limit; P07 rating30 °C cumplido como condición a verificar. R05 compara límites totales e individuales/combinados sin duplicar CPU/GPU ni tratar consumo de paquete como entrada de fuente.
- Recomendaciones ASUS550 W/P06 y750 W/P15: umbrales conservadores propuestos de selección, con salvedad ASUS de sistema OC y versión visible. Cumplirlos no basta para aprobar R05; incumplir la política se informa como tal, no consumo medido ni certeza de no arranque.
- Mantener por bloque valor/cota DC, procedencia, régimen, salida utilizada, alcance y reserva motivada. Estimación aceptada como política requiere justificación; ninguna cota numérica completa de estos conjuntos está cerrada hoy. Faltan particularmente placa/RAM, pérdidas de conversión y límite aplicable de P06/transitorios/reserva. Fuente750 W por sí sola no cubre estos vacíos.
- 314,32/474,32 W y reparto de rails del 24 quedan fuera de veredictos; solo aritmética de un borrador retirado. Tampoco se usa TDP×multiplicador ni eficiencia para reducir rating DC. Fans4×1,08=4,32 W y SSD9 W son datos parciales, no total del equipo.

No se implementa todavía esta política. El negativo R06 P07+P15 tiene evidencia independiente de aceptar el umbral de750 W o resolver estimaciones.

## 6. Escenarios documentales esperados

**Tabla documental conservada de etapa 25.** Salvo las ejecuciones parciales de S08/S10 identificadas abajo y en sección 8, no son tests ejecutados. “Fundamentado” refiere a la conclusión documental indicada, no a implementación completa. Para positivos abiertos se distingue objetivo `compatible` de conclusión defendible: sin otro fallo y con esos faltantes sería `requiere_verificacion`; no se implementaron esos escenarios completos. Bloqueos comunes **E**=R05 demanda/reserva; **G**=R04/R06/R07 espacio/recorridos efectivos; **C**=R08 interferencias/capacidad no verificadas; **U**=R10 encaje P14. Los bloqueos nunca se sustituyen por una casilla de “resto validado”.

| ID / entrada o restricción | Objetivo/expectativa | Estado y fundamento exacto |
|---|---|---|
| S01 A original | compatible | **Abierto E/G/C/U**. R01 P2.30 y formatos/conectividad nominal sustentados; falta carga integral, cable lateral P06 y espacio efectivo, cooler/P03 y térmica P01, P14 con header/volumen GPU |
| S02 B original | compatible | **Abierto E/G/C**. Cooler/P02 tiene referencia compatible, pero no interferencia P03/RAM; falta H GPU/cable Meshify y fuente/cableado efectivos |
| S03 A CPU P01→P02 | compatible | **Abierto E/G/C/U** heredados de A; soporte P2.30 y referencia térmica P02 documentados, no interferencia P03; retirar P01, reutilizar P12 con pasta renovada |
| S04 A RAM 2×P04→2×P05 | compatible | **Abierto E/G/C/U** heredados; DDR4 UDIMM2 módulos/32 GB y población base sustentadas, revisar interferencia y régimen exacto; no conservar P04 ni sumar48 GB |
| S05 B placa P03→P18 | compatible | **Abierto E/G/C**; F04 P02/P2.30 documentado en índice histórico. Mapa USB/rear/fans/SSD/power preservado; EPS4 opcional y segundo cable disponible. Falta interferencia P12/P18 y recorrido efectivo; pasta y eventual provisión BIOS sin costo cerrado |
| S06 B gabinete P10→P09 + P14 explícito | incompatible bajo requisito de conservación; sustituto positivo pendiente | **Fallo R10 fundamentado**: pierde un USB-A y reset, cambia audio a jack combinado. P14 solo habilita USB-C, no restaura funciones; además persisten E/G/C/U. Queda abierta la elección del candidato positivo: otro gabinete documentado o dependencias reales, sin incluirlas automáticamente |
| S07 A fuente P07→P08 sola | compatible como etapa intermedia operativa | **Abierto E/G/C/U** de configuración resultante; ATX/EPS/PCIe8 documentados, nuevo juego sustituye viejo; falta potencia integral/recorrido y demás reglas base. No afirmar operatividad comprobada |
| S08 A GPU P06→P15 sola | incompatible | **Fundamentado R06; extracto ejecutado en etapa 28** ([fixture](../../backend/upgradejusto/compatibility/examples.py), [runner](../../backend/upgradejusto/compatibility/demo.py)): P07 solo un ramal PCIe para adaptador que exige dos independientes. Incluye adaptador; fallo no es “sin16-pin” ni watts. Datos ya resueltos, sin implementar sustitución. Resto de cobertura pendiente |
| S09 A tras S07: P06→P15 | compatible | **Abierto E/G/C/U**; P08 nativo y L304<416 sustentados. Falta envolvente enchufe/cable y regla R03 negociación aplicable; no usar49 mm nominales como certificación |
| S10 B GPU P06→P16 | incompatible | **Fundamentado R04; extracto ejecutado en etapa 28** ([fixture](../../backend/upgradejusto/compatibility/examples.py), [runner](../../backend/upgradejusto/compatibility/demo.py)): L329>315 con front fans, exceso14 mm. No oculta faltantes eléctricos/laterales/cooler ni implementa sustitución |
| S11 A con P03 BIOS P1.20 explícita, P01 | incompatible por soporte | **Fundamentado R01** requisito oficial desdeP2.30 incumplido; P1.20 es condición alternativa del fixture, no BIOS observada. No afirmar imposibilidad física de POST; demás faltantes se mantienen |
| S12 A con BIOS instalada omitida intencionalmente | requiere_verificacion | **Fundamentado como falta R01**, sin fallos conocidos en otros datos; además E/G/C/U aún no cerrados. Resolver BIOS con registro verificable de versión, no asumir última. Para aislar solo esta falta en aceptación, cerrar antes positivos base |
| S13 S10 con BIOS desconocida | incompatible y missing BIOS | **Fundamentado**: falla largo domina; se conserva missing R01 y todos los otros faltantes |
| S14 plan A GPU primero, luego fuente | orden bloqueado | **Fundamentado bloqueo primera etapa** como S08. Fuente posterior no vuelve válida retroactivamente instalación inicial; tampoco guarda PC |
| S15 plan A fuente→GPU (S07, S09) | dos etapas compatibles | **Abierto** por bloqueos S07/S09. Orden resuelve topología conocida y la recomendación de watts propuesta, no todas las reglas; validar acumulado P08+P06 y luego P08+P15 |
| S16 costo paquete/plan P08+P15 O02+O01 | dentro2.000.000 ARS componentes | **Fundamentada aritmética histórica**1.882.130, margen117.870; compatibilidad S15 abierta. Sin envío/mano de obra/financiación; dependencias nuevas obligan recalcular |
| S17 mismo hardware, O02+O03 | fuera de presupuesto | **Fundamentado**2.070.197>2.000.000 por70.197, antes de envío; no es una mejora distinta de S16 |
| S18 costo conjunto RAM 2×O04 | dentro componentes | **Fundamentada suma histórica**766.417,98; pago/extras no explicitados limitan total final; compatibilidad S04 abierta |

CPU/RAM negativo de referencia se cubre por soporte/BIOS S11, no se inventa una RAM DDR5 mal etiquetada como DDR4. Un negativo de socket/RAM adicional puede curarse en otro incremento, no necesario para sustituir este caso documentado. Los seis positivos exigidos están representados como objetivos, **ninguno se declara globalmente cerrado** con evidencia parcial.

## 7. Criterio de cierre y verificación futura

1. Cerrar bloqueos técnicos con cotas/listas/datos públicos aplicables o cambiar candidatos; sustitución de gabinete debe conservar funciones. Elegir y justificar una política numérica DC reproducible sin reservas arbitrarias. No contactar terceros en esta etapa.
2. Revisar propuestas y acordar especificación ejecutable/stack en incremento separado. Implementar todas las reglas necesarias, sin sobreentender autorizaciones por esta lista.
3. En ese incremento futuro: probar límites/unidades, desconocidos y dominancia sin cortocircuito; retirada real de componentes, RAM completa, asignación única de cables, stock/OC/BIOS, paquete versus pieza sola, planes acumulados, propiedad/revisión y simulación sin guardado. Fixtures sintéticos complementan, no reemplazan hardware real.

La etapa25 solo verifica documentación/aritmética. Pendientes visuales y nuevas cotizaciones pueden avanzar junto con la base técnica; faltantes de compatibilidad impiden etiquetar positivos y cerrar demo, no autorizan a implementar nada ahora.

## 8. Incremento interno ejecutado — etapa 28

Fecha 2026-10-20. [Código de dominio](../../backend/upgradejusto/compatibility/)
con Pydantic ya instalado y biblioteca estándar; sin FastAPI/BD/LLM/red dentro del
dominio. No crea endpoint, persistencia, UUID, resolución pc_id/propiedad/catálogo,
sustituciones ni planes. `evaluate(configuration)` acepta solo datos resueltos;
no hay parámetros públicos para aportar resultados, omitir reglas o preaprobar PCs.

### Contrato ejecutable

- `ResolvedConfiguration`: `pc_revision`, `data_revision`, instancias con ID/categoría/
  cantidad y condiciones declaradas, datos opcionales de largo y ruta adaptada.
  Las revisiones de ejemplos son etiquetas documentales, no revisiones persistidas
  inventadas. Modelos estrictos, congelados y sin campos extra; colecciones en tuplas,
  sin mutar entradas. El evaluador revalida instancias recibidas.
- Medición positiva finita, mm/eje longitudinal; bool, strings, cero/negativos,
  NaN/infinito y unidades/ejes inválidos producen errores de validación, no veredictos.
  Cantidades enteras positivas; cada ID referenciado designa una instancia física.
  Referencias de instancia/categoría incorrectas, IDs duplicados y asignar un conector
  o entrada más de una vez son errores de entrada separados.
- Evidencia: ID de fuente, URL, sección/localizador y fecha. Sin consultar red para
  evaluar. El productor de datos resueltos debe marcar conflictos como `conflict`;
  el motor no los resuelve ni elige una observación. Datos/procedencia/condiciones
  indispensables ausentes o conflictivos → `unknown` con ruta concreta de faltante.
  Pass/fail no admiten referencias vacías; no_aplica necesita evidencia y justificación.
- Resultado de subregla: `rule_id`, `family`, `state`, `facts`, `evidence`, `conditions`,
  `missing_fields`. Salida de evaluación: `verdict`, `rule_results`, `missing_fields`,
  `rules_version`, `data_revision`, `pc_revision`, `coverage`.

### Inventario y cobertura

Versión fija `cu05-28.1`: **12 comprobaciones**, mostrando las diez familias:

| Comprobación | Estado de implementación |
|---|---|
| R01, R02, R03 | Pendientes |
| R04.largo | Implementada; compara solo largo efectivo bajo montaje documentado |
| R04.altura_espesor_slots_cable_interferencias | Pendiente; largo aprobado no cierra geometría |
| R05 | Pendiente; fuente/potencia sigue en alcance, no aprobada por ramales |
| R06.ramales_adaptador | Implementada solo para la ruta descrita abajo |
| R06.otros_conectores | Pendiente; ATX/EPS/periféricos, alcance y resto de alimentación |
| R07, R08, R09, R10 | Pendientes; sin cambios de políticas |

Lo pendiente se emite como `not_implemented` y `implementation.<ID>`, no no_aplica.
Cobertura enumera necesarias, implementadas, evaluadas, pass/fail/unknown/no_aplica/
pendientes. `coverage.complete` significa todas necesarias resueltas con evidencia
(pass/fail/no_aplica); no significa compatible si alguna falla. Las dos subreglas se
evalúan siempre; fail domina y conserva desconocidos/pendientes. Sin fail pero con
faltantes → requiere_verificacion. Inventario vacío/incompleto no produce compatible.
La rama compatible se prueba únicamente en el agregador privado con inventario
sintético completo creado en tests; no hay modo de producción para retirar pendientes.

### Semántica precisa de las subreglas

- **R04.largo:** GPU mayor al límite efectivo aplicable → fail; menor o igual → pass
  de esta subregla únicamente. El límite identifica montaje y condiciones; montaje
  distinto/desconocido o evidencia faltante no habilita comparación concluyente.
- **R06.ramales_adaptador:** alcance actual: dos entradas PCIe8 con exigencia documentada
  de cables independientes, inventario PCIe8/6+2 completo y asignación explícita.
  Dos puntas del mismo ramal cuentan una vez; ocupados no están disponibles y
  topología/ocupación desconocidas no se toman por libres. Lista desconocida es
  distinta de inventario completo vacío. No se hace asignación automática.
- Un déficit documentado con inventario completo y exclusión documentada de otras
  rutas permite fail. Sin esa exclusión se informa unknown: una ruta fallida no
  demuestra que no exista otra. Si hay capacidad pero la asignación es incompleta o
  no usa ramales distintos, queda unknown; no se elige cableado alternativo en silencio.
  Ruta nativa, otro tipo/cantidad de entradas o requisito de independencia no soportado
  queda `not_implemented`, no rechazo por parecerse poco al fixture. La exigencia
  de independencia desconocida es unknown, distinta de False explícito.

### Evidencia de ejecución, no cierre de demo

`python -m upgradejusto.compatibility.demo`, desde backend, emite JSON con el mismo
evaluador probado. Extracto de datos `hardware-demo-25.1/extract-28.1`, fuentes y
condiciones transcritas del registro, sin nueva investigación:

| Ejemplo | Resultado ejecutado | Cobertura que permanece |
|---|---|---|
| S08 P15/P07, F07/F09/F19 | incompatible; 2 entradas, 2 conectores en 1 ramal | R04.largo unknown; 10 pendientes |
| S10 P16/P10, F08/F13 | incompatible; 329−315=14 mm | R06.ramales_adaptador unknown; 10 pendientes |
| D01-S10-omitted-length | requiere_verificacion; largo omitido intencionalmente, sin fallos conocidos | 2 unknown y 10 pendientes |

D01 es un derivado de S10, no tercera PC real ni medición alterada presentada como
real. Los extractos no duplican la configuración completa ni aseguran el resto de reglas.
Pruebas ejecutadas: **66 aprobadas incluyendo salud**, Ruff lint/formato y
sincronización desde lock aprobados; demo código0. Casos sintéticos separados de los
ejemplos documentales: límites, validación, evidencia, ocupación/ramales, dominancia,
inventarios vacíos/incompletos, determinismo y no mutación. Proceso rojo/verde y
resultados en [bitácora28](../ai-log/2026-10-20-etapa28-dominio-compatibilidad.md).
Positivos globales de las seis categorías siguen abiertos. No se implementó R10
ni la política de potencia; la demo final/CU05 completo no están terminados.
