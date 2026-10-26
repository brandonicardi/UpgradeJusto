# Checkpoint frontend CU02/CU10 — 24/10

Contrato leído antes de implementar: specs CU02/CU10 y
`backend/CU02_CU10_HANDOFF.md`. Guías locales Next route handlers y formularios
consultadas. Únicamente archivos frontend; sin shell, instalaciones ni ejecución.

## Preparado, no verificado

- `/pcs/import`: POST real de extracción; seis evidencias, advertencias, unknown y
  ambigüedad visibles; PCCreate completo editable, catálogo real (primeras 50
  referencias, límite visible), BIOS/notas; checkbox explícito. Ref lock y botón
  bloquean doble envío. Cancelar elimina propuesta local sin POST. Errores 409 o
  >=500 bloquean confirmación; revisar Mis PCs antes de reenviar, sin retry.
- `/admin`: GET de rol servidor, 403 normal; revisiones paginadas, borrador desde
  activa, cuatro colecciones cerradas, POST/PATCH/DELETE, publicación explícita con
  expected_active_version. Publicadas solo lectura. JSON de datos con campos
  superiores cerrados; validación de tipos/referencias autoritativa del servidor.
  Ejemplos marcados como placeholders, nunca hechos de hardware/precios.
- Gateways exactos firmados y CSRF/cookie/origin existentes; extracción POST se
  resuelve en rutas estáticas antes del matcher UUID. Sin bootstrap web, tokens
  locales ni autoridad owner/user cliente. Errores solo estado y campos sanitizados.

## Build: ejecutar comandos separados desde frontend y registrar cada código

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:curation`
4. `npm run build`
5. `npm run test:e2e:curation`

Prerrequisitos del último: PG migrado 33_001, bootstrap local revisado, configuración
real PG/Groq/proxy; `UJ_TEST_EXTRACTION_LIVE=1` y credenciales de cuenta de prueba
admin existente en `UJ_ADMIN_EMAIL/UJ_ADMIN_PASSWORD` inyectadas por Build al runner.
No logs de valores. Config falla sin opt-in/credenciales, sin skip/fallback. Dos
webServer locales heredados, cache navegador de proyecto; admin env vacías en ambos
procesos hijos; trace/screenshot/video off. No fullsuite32 ni CU08 LIVE.

## Evidencia que las pruebas intentan obtener (aún sin ejecutar)

Vitest: firma/rutas cerradas, sanitizado 422, CSRF reenviado, JSON cerrado, no retry,
guardas de confirmación y cancelación (esta última comprobación estática, no navegador).
Playwright: normal403; admin edita precio/fuente y publica; revisión anterior conserva
filas idénticas, publicado rechaza PATCH409; catálogo adopta revisión; una llamada
Groq sin guardado antes de confirmar, corrección/confirmación UI, recarga, aislamiento
A/B GET/PUT/DELETE. Limpia su PC y restaura datos mediante NUEVA revisión publicada,
no actualizando snapshots. Conserva revisiones de prueba append-only.

Límites: cancelación de preview no está ejercitada en navegador con segunda llamada
Groq (se conserva máximo una); no prueba de plan/share snapshot histórico en este
gate ni carrera concurrente de publicación. No cierre de aceptación hasta códigos
Build, revisión independiente de seguridad y gates reales. Selector limitado a 50
referencias, no buscador integral nuevo. No pruebas ejecutadas ni códigos afirmados.

Checkpoint: devolver al coordinador y DETENER para medir cuota. No continuar CU05/06
ni otros bloques. Ante primer fallo diagnosticado: una corrección y escalada.

## Seguimiento Build: instrumentación segura del primer fallo

Build comunicó typecheck/lint/build código0 y Vitest6/6. Primer gate real falló en
818ms; no hay fase verificable en el error anterior. No se leyó error-context.md ni
se ejecutó shell/rerun en esta intervención. No atribuir la causa a login o CSRF
sin nuevo diagnóstico numérico.

`tests/curation/curation.spec.ts` ahora devuelve únicamente etiqueta estática de
fase y arrays numéricos expected/actual en el error final. Fases: loginA/loginB/
loginAdmin, normal403, normalAdminPage, revisions, activeRevision, oldPrices/
oldSources, requiredRows, adminpage, draft, saveprice/savesource, publish,
inmutabilidad, catálogo, abandono antes de preview, preview/evidencias/noPC,
edición/confirmación, recarga, aislamiento y cleanup. Sin mensaje original,
payloads, URLs, IDs privados ni credenciales. Capturas/trace/video siguen off.

Discrepancia corregida en helper: alinear con authRequest, CSRF nuevo antes de cada
mutación y refresh posterior a login; comprobar sesión200. No se demostró que el
token reutilizado causara el fallo. Arrays normales: csrf200/register201/csrf200/
login200/refresh200/session200; admin: csrf200/login200/refresh200/session200.
Si falla fetch/parse, devuelve solo progreso HTTP numérico acumulado.

Se agregó recorrido real de abandono ANTES de extracción: escribir, volver a Mis
PCs, verificar cero POST extract/confirm y cero PCs. Luego solo una llamada Groq
y una confirmación. Esto NO demuestra cancelación de una propuesta ya extraída:
ese límite permanece explícito, sin reutilizar respuestas mediante mocks.

Pendiente: Build ejecuta un rerun focal autorizado. No declarar gate aprobado.

## Segundo fallo comunicado por Build: normalAdminPage, 832ms, antes de Groq

Login A/B/admin y normal403 pasaron en ese run. Por tanto, no atribuir este segundo
fallo a CSRF ni a las credenciales. No se ejecutó rerun ni shell y no se leyó
error-context.md. `expect` viene del mismo paquete que la fixture base; no hay una
configuración distinta de expect en la fixture revisada.

Discrepancia concreta: `getByRole("alert")` global, mientras auth.spec.ts ya limita
alertas a `main` por los anuncios de framework fuera del contenido. Se aplica ese
mismo alcance sin relajar el texto requerido. Duplicación/strictmode es hipótesis
fuerte por fallo inmediato, no una observación de DOM comprobada.

Diagnóstico adicional seguro: clasificación local en typeerror/assertion/navigation/
strictmode/unknown, nunca mensaje original; HTTP de navegación y respuestas de la
ruta cerrada revisions; número de pageerror sin texto; count alert global y dentro
de main; booleano local de contenido esperado y de sonda exitosa. Ningún HTML,
texto, IDs, URLs ni credenciales salen de la sonda. 0 en navegación = no disponible;
-1 en conteos = no disponible. Capturas/trace/video siguen desactivados.

Prueba unitaria de clasificación añadida al script focal, sin ejecución local.
La próxima comprobación debe ser única, coordinada y con estos diagnósticos. Si no
resuelve o requiere investigación extensa: bloqueo material y detener por cuota;
no encadenar nuevos reruns ni declarar aceptación.
## Resultado final de Build — detenido

Tipos/lint0;7 unitarios focales0 tras instrumentación; build0 previo. Gate navegador
NO APROBADO: login A/B/admin, rechazo403 y aviso admin normal verificados; siguiente
consulta de precios de revisión devuelve405 en vez de200. Sin Groq, publicación ni
confirmación de PC por navegador. No seguir reintentando hasta medir cuota.

## Reapertura autorizada 25/10 — bloqueo de contrato de IDs

Nueva autorización comunicada por coordinador: incremento acotado para corregir
405, sin asumir que la cuota sea medible desde tokens. Leídos handoff backend,
guía local Next de Route Handlers, gateway, proxy y unitarios focales existentes.
El matcher actual exige UUID para revisión y fila; no admite la semilla
`sprint31b-a-v1` ni revisiones `revision-[hex32]` comunicadas por Build.

El handoff no especifica los formatos de IDs de filas por colección. La lectura
del directorio `backend/upgradejusto/administration` fue denegada; no se intentó
eludir el permiso ni explorar otros directorios backend. Falta recibir las rutas
exactas autorizadas de generadores/validadores de IDs y proxy backend para cerrar
el contrato antes de modificar el matcher. No se amplió a segmentos arbitrarios
ni se alteraron firma, query, identidad, CSRF o instrumentación privada.

Sin cambios funcionales, shell, instalaciones ni pruebas en esta intervención.
Build conserva el gate focal `npm run test:curation` y la ejecución navegador
contra servicios reales; no repetir suites completas. Al desbloquear, añadir
casos seed/draft, filas de las cuatro colecciones y negativos de traversal,
encoding, método/colección desconocidos y query duplicada, antes de verificación.

Cancelación posterior a extracción sigue sin demostración real: con el recorrido
actual, cancelar la única propuesta Groq impide confirmar esa misma propuesta.
Probar ambos recorridos independientes requeriría otra extracción; no se añade
segunda llamada ni replay/mock. El abandono prepreview no prueba cancelación de
propuesta. Sin aprobación hasta Build/revisión. Checkpoint: devolver bloqueo al
coordinador y DETENER, sin investigación CU05/CU06 ni reruns.

## Delta 25/10 — contrato exacto recibido de Build; corrección preparada

El coordinador aportó evidencia verificada de repository.py87/129, initial.py16
y api/proxy_ip.py27–30; sustituye el bloqueo documental anterior sin nuevas
lecturas backend. Revisión cerrada `sprint31b-a-v1|revision-[0-9a-f]{32}`;
filas `row-[0-9a-f]{32}` en las cuatro colecciones, más `P01..P14` únicamente
en components (también copiables al borrador). UUID no admitidos en rutas admin.

Cambios funcionales solo en `lib/gateway.ts`. No cambios de query/firma, proxy,
UI, autorización o instrumentación. `tests/unit/curation.test.ts` cubre seed y
borrador, cuatro colecciones, catorce IDs components, publicación, IDs inválidos,
traversal/encoded slash/doble encoding/backslash, métodos/colecciones desconocidos,
query duplicada y regresión oldPrices con paginación y firma sobre pathname.
Los dobles son exclusivos de pruebas unitarias, no evidencia de API real.

Sin shell ni ejecución local: códigos nuevos no disponibles. Build ejecuta
`npm run test:curation` y un gate `npm run test:e2e:curation` contra servicios
reales, sin repetir fullsuite/browser en esta sesión especialista. Sin aprobación
hasta Build y revisión. Límite de cancelación posterior a Groq permanece igual.
Checkpoint: delta devuelto; DETENER continuación automática para medir cuota.

## Seguimiento saveprice — 25/10, un único rerun focal pendiente

Build comunicó unit9/type/lint/build código0. Browser pasó oldPrices/oldSources y
creó borrador201, luego timeout180s en saveprice sin PATCH observado. No se leyó
error-context ni se ejecutó shell. La fase anterior agrupaba selección, fila,
edición, envío, respuesta y aviso: esos datos no prueban cuál se bloqueó.

Inspección: readonly depende de status draft, loadRows actualiza colección/filas
y borra selección/editor solo al terminar GET; operation mantiene busy/lock hasta
resolver. Los botones se deshabilitan durante carga. No evidencia suficiente para
atribuir fallo a readonly o IDs (Build confirmó copia idéntica de IDs al borrador).
Defecto verificable del gate: no sincroniza explícitamente el commit de loadRows
y deja acciones/waitForResponse sin timeout focal. No se declara raíz demostrada
del timeout ni se modifica lógica de persistencia para acomodar la prueba.

Delta mínimo: detalle expone aria-busy y editor data-row-selected booleano. Test
espera colección confirmada y busy=false antes de fila, comprueba selección y JSON
de fila en memoria sin imprimirlo, luego edición y PATCH real. Subfases estáticas
saveprice/savesource + Select/Row/Fill/Send/Response; acciones5s, carga/respuesta10s,
aviso5s acotado a main. Diagnóstico solo conteos/booleanos adicionales. Promise.all
observa espera y click sin rechazo de promesa huérfano; checks HTTP no relajados.

No cambios gateway, cuenta, roles o API de recorrido; sin mocks nuevos. Códigos
del delta no disponibles. Build/revisor evalúan y como máximo un rerun focal
autorizado; si vuelve a fallar, escalar fase exacta y detener, sin ciclos. Límite
de cancelación tras extracción y falta de cierre CU02/CU10 permanecen vigentes.

## Último delta mínimo de etiquetas — 25/10

Build comunicó fallo en6s savepriceSelect, editorCount0/saveButtonCount1,
busy=false y collectionMatches=false. Diagnóstico consistente con mismatch de
nombres de etiquetas envolventes; sin assert DOM no se declara causa confirmada.
Labels de colección/editor ahora separados del control y asociados por htmlFor/id.
Test exige combobox/textbox con los mismos nombres exactos y count1; sin relajar
checks ni añadir instrumentos/timeouts largos. Checkbox publicación conserva
asociación envolvente con input checkbox, sin opciones ni contenido editable en
su label; sin cambios de permisos o reglas. Sin lecturas adicionales, shell ni
ejecución. Build decide un último recorrido o checkpoint; no más correcciones
automáticas ni reruns del especialista. Pendiente Build/revisión; DETENER.

## Gate separado de cancelación preparado — 25/10

Build comunicó PASS del recorrido real CU10 + LIVE Groq CU02: PATCH/publicación,
inmutabilidad, preview/edit RAM3/BIOS/confirmación201/recarga/aislamiento404,
cleanup204 y restauración mediante revisión nueva. Revisión UI condicional sin
blockers; faltaba cancelación posterior a propuesta. No se atribuye ese PASS a
ejecución del especialista ni se declara aceptación global de los diez CU.

Solo se añadió test separado `cancelación UI con respuesta controlada — no
acredita LLM` en el mismo spec/config. El test LIVE existente no cambia. Navegador
y autenticación/PCs PG reales; única ruta interceptada POST /api/pcs/extract con
fixture explícita de seis unknown, propuesta vacía editable y dataset obtenido
del catálogo real. No intercepta confirmación: la cuenta y exige cero POST.
Preview visible -> cancelar -> formulario inicial -> listado PG idéntico antes/
después. Sin segunda llamada Groq. Diagnóstico solo fase estática y contadores;
trace/screenshot/video off, acciones5s y navegación/catálogo10s, total45s.

Sin cambios productivos ni shell/lecturas nuevas/ejecución. Build ejecuta únicamente
`npm run test:e2e:curation -- --grep "cancelación UI"`, no repite LIVE. Código del
nuevo gate pendiente; mantener distinción entre fixture UI y evidencia LLM real.
Checkpoint: devolver a Build/revisión y DETENER para medir cuota.
## Vigente25/10 — aprobado funcional local

Revisor independiente aprueba bloque CU02+CU10: gate Groq+PG real1/1 (3.5s,
7.6s total), con publicación admin, confirmación y aislamiento. Cancelación después
de propuesta1/1 (551ms,4.7s total), respuesta de extracción controlada explícita;
no acredita otro LIVE. Tipos/lint0,9 unitarios focales0 y build0. PG posterior:
activa publicada consistente14 componentes y precios/fuentes iguales al seed.
Los fallos405/etiquetas/502 anteriores son historia. Ocho CU funcionales locales;
CU05/06 incompletos. Detener para medir cuota; sin nuevos bloques.
## Continuación final CU05/06 — resultado25/10

CU02/CU10 revalidados: gate real1/1 (4,0s/8,2s total), sin repetir cancelación
histórica. Normal9/9 y asistente final REAL1/1 (6,8s/11s total) con evaluación MCP,
streaming e historial. Frontend tipos/lint0; unitarios77/77 del alias, no nuevo filtro
focal logrado. CU05/06 siguen parciales; ver [CONTINUAR](../docs/CONTINUAR.md).
