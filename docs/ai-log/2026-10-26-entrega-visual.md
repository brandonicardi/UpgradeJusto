# Entrega visual local — plan aprobado por Brandon

## Autorización y criterio de salida

Rediseño completo de presentación, sin reabrir CU05/CU06 ni modificar motor,
datasets, proveedor o backend salvo defecto concreto de integración. Se conserva
el cierre funcional local de diez CU. Tests verdes no prueban calidad visual.
Sin frameworks nuevos, instalaciones globales, staging, commits, push o despliegue.

Diseño: grafito101419, superficies181F28/202A36, textoF4F7FB/A9B5C5, azul5B94FF;
contraste AA, tipografía local16px, ritmo8px, radios12px, sin decoración ornamental.
Sidebar escritorio y navegación móvil accesible; títulos/pie acordes con producto.

## Coordinación y propietarios

- Coordinadora existente: contrato/criterios y orden, consultiva. Su perfil denegó
  escritura documental; no se ampliaron permisos ni se repitió el parche denegado.
  Build registra aquí su propio trabajo y el handoff recibido.
- Frontend existente: único escritor `frontend/**`, primero shell/componentes y
  `/pcs`; pausa de extensión hasta capturas1440/390 e inspección visual independiente.
- Build: comandos/runners exclusivos, capturas y registro; no edita componentes
  mientras los posee frontend. No elusión de denegaciones del especialista.
- Revisor independiente: lectura de código y observación efectiva de imágenes por
  mecanismo nativo disponible. No atribuir inspección a quien no pueda verlas.

Cinco criterios de coordinación: PC→presupuesto→resultado; bloqueantes visibles;
contraste/foco AA; sidebar/navegación móvil sin overflow; fuentes y detalle completo
consultables sin ocupar la tarjeta principal. Extender luego catálogo/cuenta,
importación, planes/enlaces, asistente y administración. Todos pendientes visuales
al inicio; funcionalidad anterior preservada, no redefinida como pendiente.

## Datos, imágenes y evidencia

Entorno existente, PostgreSQL/dev-test/proveedor intactos. Baselines hashes de
PCs/grupos/planes/enlaces guardados en carpeta nueva ignorada
`.local/evidence/visual-delivery-v1/baseline-before-upgradejusto_{dev,test}.json`.
Sin imprimir cuentas, claves o contenido privado. Capturas solo de datos sintéticos
propios; usuario autoriza conversación sintética para evidencia final del asistente.

API `image:null` permanece intacta. No hay permiso de reutilización demostrado
para fotografías exactas en las fuentes de catálogo; no se deduce de una URL o de
la licencia del dataset una licencia de las fotografías. Primera referencia usará
SVG propios de categoría, identificados como ilustración, manifiesto local cerrado
por ID/modelo y sin peticiones remotas arbitrarias. No fotos de otra variante ni
renders presentados como productos reales. Autoría/condiciones en `frontend/ASSETS.md`.

## Checkpoint inicial

Primera pantalla real/capturas/revisión visual aún pendientes. No declarar diseño
aprobado por código, ejecución o tests. Guía Next local de accesibilidad consultada
antes de cambios: h1/título, navegación/route announcer, alt, ARIA y foco.

Revisora visual independiente (`general`; identificador interno en respaldo local)
confirmó capacidad nativa de observar píxeles mediante `read` en dos capturas
anteriores de recomendaciones desktop/móvil. Detectó jerarquía débil, texto técnico
dominante y rellenos móviles anidados. Esto prepara el criterio, **no aprueba el
diseño nuevo**. La revisión de referencia nueva se hará en esa misma sesión.

## Matriz de aceptación visual (al iniciar, toda pendiente)

| CU | Presentación y verificación requeridas |
|---|---|
|01|Cuenta compacta, sesión/errores/foco y navegación coherentes|
|02|Texto→progreso→propuesta editable→confirmación; nada guardado antes|
|03|PC visual por seis categorías, edición/propiedad y móvil|
|04|Tarjetas contenidas, ilustración/imagen correcta, filtros/paginación/detalle|
|05|Resumen compatible/incompatible/falta información, bloqueantes visibles|
|06|Antes→después, beneficio documentado, ARS/presupuesto/dependencias, negativo|
|07|Etapas/costos, borrador explícito, recálculo confirmado y datos históricos|
|08|Conversación sintética, streaming/cancelación, herramientas/fuentes comprensibles|
|09|Solo lectura y revocación, datos/versiones conservados|
|10|Rol servidor, tablas/formularios, borrador/publicación y confirmaciones|

Contraste calculado sRGB de paleta base: F4F7FB/101419=17,20:1;
A9B5C5/181F28=7,98:1;5B94FF/181F28=5,63:1. Texto101419 sobre botón5B94FF=6,27:1;
blancoF4F7FB sobre azul=2,74:1, rechazado. Son pares base, no auditoría completa de
la interfaz aún no generada; estados semánticos/foco se comprobarán con UI real.

Consulta acotada de derechos visuales, sin investigación de hardware: búsqueda de
ASUS Pressroom/Corsair terms devolvió fotografías y copyright, no un permiso general
comprobado para redistribuir fotos exactas en esta app. ASUS Pressroom muestra
«All rights reserved» (`https://press.asus.com/media/photos`). La respuesta directa
de términos Corsair no ofreció contenido verificable mediante esta herramienta.
No se descargaron/reutilizaron fotografías ni se asumió licencia por disponibilidad.
Se mantiene fallback vectorial propio permitido por el usuario.

Baseline adicional de157 archivos backend/datos/dependencias en `backend-before.json`
local. Primer comando PowerShell falló: este runtime no tiene `Path.GetRelativePath`
y produjo un mapa vacío (no evidencia válida pese al exit0). Se comprobó que era
vacío y se corrigió con Python existente, assertions y exit code explícito;157 hashes
guardados/exit0. Ningún archivo producto/backend modificado por ese intento.

## Primera referencia conectada — gate visual rechazado, corrección focal

Frontend entregó shell, componentes reutilizables y `/pcs`, dejando el resto sin
extender. Build ejecutó desde frontend: typecheck0, lint0,12 unitarios focales
`visual-central/basic-scope/compatibility` aprobados y build0. Runner exclusivo con
helper TEST: `playwright.cmd test --config=playwright.design.config.ts
design-reference.spec.ts`:1 passed/1,4s,7,6s total/exit0. Cuenta/PC propias, motor y
recomendación reales, no mutación, sin overflow y navegación móvil comprobados.

Capturas nuevas, preservadas:
`D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/reference/2026-10-26T02-04-52-315Z-437d8031/`
contiene `01-desktop-1440-{viewport,fullpage}.png` y
`02-mobile-390-{viewport,fullpage}.png`. Rutas entregadas al usuario en checkpoint.

Build observó imágenes y la revisora visual independiente abrió las cuatro PNG y
confirmó inspección de píxeles. **No aprobó extender todavía**:

- P1 móvil resultado→formulario→PC contradice orden autorizado PC→formulario→resultado;
  en desktop formulario quedaba debajo del resultado.
- P1 faltaba beneficio16→32GB: mostraba cantidad2→2 y modelos, insuficiente claridad.
- P2 resultado largo/repetido, comprobaciones/desplegables necesitaban síntesis.

Logros observados: composición nueva de dos columnas, superficies/iconos consistentes,
precio legible y estados con texto. Correcciones asignadas al mismo propietario;
ningún escritor concurrente ni ampliación al resto antes de nueva inspección.
Build confirmó claves existentes para display, sin investigación nueva: RAM
`capacity_per_module="8 GB"/"16 GB"`, GPU `vram="8 GB"/"12 GB"`. No modificar datos,
contrato ni inferir capacidad del nombre/ID. Beneficio solo según respuesta real.

El perfil `revisor-codigo` no pudo leer `frontend/components` y detuvo esa revisión:
cero archivos leídos, ninguna aprobación. No se abrieron permisos ni se atribuirá
dictamen frontend a ese perfil. La revisora independiente `general`, ya autorizada
y con inspección visual efectiva, realizará el dictamen final permitido de este delta;
Build mantendrá separada la evidencia propia de cualquier revisión recibida.

## Referencia corregida — aprobación visual previa a extensión

El mismo frontend corrigió orden DOM/CSS, lectura estricta de capacidad publicada,
jerarquía16→32GB y síntesis de comprobaciones. Build: typecheck0/lint0,5 unitarios
`visual-central` aprobados y build0. Nuevo runner real `design-reference.spec.ts`:
1 passed/1,2s,5,3s total/exit0; asserts de capacidad, orden DOM/geometría, no overflow,
navegación y PC intacta. No repetición sin cambio: segunda captura justificada por
los P1 del gate, carpeta nueva y originales preservados.

Referencia:
`D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/reference/2026-10-26T02-11-36-331Z-055bde79/`.
La revisora independiente abrió y observó las cuatro imágenes nuevas: **aprobó
visualmente esta referencia para extender**, no otras pantallas ni funcionalidad
no observada. Confirmó PC/formulario/resultado en móvil y16→32GB destacado; cooler
pendiente sigue visible. Pulido no bloqueante: checks móviles en una columna y SKU
largo secundario, conservando identificación exacta en detalle. Build también leyó
desktop/móvil; entregó rutas absolutas en checkpoint al usuario y liberó extensión.

Frontend continúa como único escritor de todas las pantallas y tests selectores;
Build conserva documentos/comandos/evidencia. Se incluye corrección UI del rol
obsoleto al mutar sesión en la misma ruta; servidor permanece autoridad. No cambios
backend ni nuevos permisos/dependencias. Resto de la entrega/revisión aún pendientes.

Preservación del catálogo: se guardaron también hashes canónicos de componentes,
soporte CPU y fuentes del catálogo activo DEV/TEST (`catalog-before-*.json` local),
para comparar tras los recorridos de administración sin confundir una revisión
nueva de prueba/restauración con cambio de los datos. Son hashes, no credenciales.

## Bloque2A — catálogo/cuenta/editor/importación/planes privados

Frontend implementó composición de tarjetas/detalle, cuenta compacta, propuesta
editable y planes por etapas; shell invalida/reconsulta rol al mutar sesión y
descarta respuestas anteriores. Manifiesto incluye P17/P18. Backend intacto.

Build ejecutó typecheck0/lint0,5 unitarios en session-role/presentation0, build0.
Playwright real con helper TEST, `--trace off`, cuatro archivos
`auth.spec.ts catalog.spec.ts pcs.spec.ts plans.spec.ts`: **4 passed/1 failed,
16,0s total**. Fallo demostrado: selector de precio desconocido resuelve hero y
detalle (dos textos), no un precio falsamente conocido. Se asigna selector semántico
de resumen al mismo escritor, manteniendo el assert de desconocido real del API.
Los otros cuatro casos no requieren repetición si no cambia su implementación.

Gate opt-in curation con credenciales existentes cargadas solo en proceso de runner,
servidores sin esas variables: `--grep @session-navigation`, sin extracción/LLM:
**1 passed/0,906s,5,1s total/exit0**. Admin real visible tras200, logout/login en la
misma ruta invalida estado y cuenta normal no recibe enlace. Se limpian variables
de credenciales en finally; no contenido sensible en salida/capturas.

Extensión2B autorizada al mismo propietario: compartidos públicos/CSP, etiquetas
restantes, chat, admin/home/errores y tests de evidencia final. Revisión independiente
de integración2A en paralelo de solo lectura; no es aprobación visual de pantallas
todavía no fotografiadas. Entrega completa sigue pendiente.

Revisora independiente general leyó integración2A (shell/auth/session-role,
presentation/product-visuals, catálogo, propuesta y tests). Sin bloqueantes confirmados
en esa selección; no aprobación completa. P2 real: aviso de catálogo buscaba solo
claves superiores conflict/warning, omitiendo conflictos/flags en JSON estructurado
`basic_stock_v1`. Corrección y unitario asignados al único escritor, sin cambiar
datos/motor. La ruta de cuenta solicitada no existía; esa pantalla no fue revisada
por código todavía, límite registrado sin simular lectura.

Checkpoint de preservación2A tras sus recorridos: helper local de solo lectura
`check-preservation.py checkpoint2A`, DEV y TEST, exit0. Originales de PCs/grupos/
planes/enlaces conservados; catálogo componentes/soporte/fuentes idéntico;157 archivos
backend/datos/dependencias sin cambios. Informes `preservation-checkpoint2A-*.json`
locales. No restauración automática ni nuevas referencias para ocultar diferencias.
La misma comparación final se realizará después de los recorridos2B que aún faltan.

## Bloque2B — implementación y recorridos reales

Build: `npm run typecheck`, `npm run lint`, `npm run build` exit0;
Vitest directo `run tests/unit`:94 passed/18 archivos/exit0. Incluye todas las
pantallas afectadas, no se atribuye al especialista ejecución que no realizó.

Normal focal2B: catálogo principal/gateway/planes/recomendaciones/shares aprobados,
compatibilidad falló buscando enlaces dentro de reglas plegadas sin abrirlas.
Corrección de selector abre B07 humana y exige fuente visible coincidente con API;
`compatibility.spec.ts`:1 passed/2,6s,6,8s total/exit0. El catálogo anterior duplicado
queda corregido con región «Resumen del componente». En conjunto, nueve escenarios
normales únicos cubiertos por bloques, no una nueva suite única9/9; planes se repitió
porque cambió su presentación en2B. Los asserts de negocio no se eliminaron.

Curation real: cancelación UI controlada y CU02/CU10 Groq+PG con revisión/edición/
confirmación/publicación/aislamiento:2 passed/8,5s total/exit0. El primer caso no
acredita LLM; el segundo sí. Credenciales admin solo runner y limpiadas en finally.

Asistente real: `@basic` aprobado6,0s; test histórico de cita/UUID/cancelación falló
esperando texto incremental efímero que desaparece al persistir. Se sustituyó esa
espera por observación numérica del mismo stream nativo, conservando chunks previos
a done, citas/historial/digests/propiedad/UUID409 y cancelación del segundo turno.
Reejecución solo de ese test:1 passed/11,3s,15,5s total/exit0. Sin cambio al proveedor
ni al producto; no relectura CDP ni texto privado en diagnóstico.

### Capturas finales iniciales y fallos del harness

`playwright.design.config.ts` combinaba `defineConfig(base, overrides)` y otra lista
webServer: Playwright concatena esas listas y trataba de iniciar dos backend iguales.
El primer intento no ejecutó tests, sin procesos residuales. Documentación Context7
y código instalado confirmaron la causa; se corrigió a un único objeto con spread,
dos servidores exclusivos y credenciales admin retiradas de sus entornos. No se
habilitó reuseExistingServer ni se mataron procesos ajenos. Guard unitario inicial
contaba también el ternario `base.webServer : []`; se ancló a propiedades y pasó1/1.

Core visual real:1 passed/6,0s,10,2s total/exit0, carpeta
`final/2026-10-26T03-18-55-483Z-ecd5b5f2/`: cuenta/PC vacías, catálogo/ficha,
PC compatible/editor, incompatible/unknown, recomendaciones/coste/déficit/dependencia,
plan/editor y compartido,1440/390. API confirma no mutación de PCs; recursos propios
limpiados. Todos los directorios anteriores preservados.

Conversación sintética natural real, un turno sin prompt técnico forzado:
1 passed/6,3s,10,5s total/exit0, carpeta
`final/2026-10-26T03-21-46-072Z-f3c4df48/`. No conversación personal ni credenciales.

Captura de importación falló primero en fase genérica; instrumentación limitada a
fase/HTTP mostró502, no causa proveedor/cuota demostrada. La fixture decía «dos
módulos» y el validador vigente exige cantidad numérica en el fragmento RAM. Se
alineó al formato `2x` del gate funcional aprobado, sin ampliar backend ni eliminar
validaciones. Una ejecución focal:1 passed/2,9s,7,0s total/exit0; carpeta
`final/2026-10-26T03-24-44-608Z-b1fefb28/`, importación/propuesta real editable/admin
solo lectura. Cantidades escritas en palabras no se prometen como soportadas.

## Revisión final — hallazgos todavía pendientes de pulido

La revisora independiente observó22 PNG del núcleo/chat y luego8 de importación/
admin (selecciones concretas declaradas, no «todas las PNG»). Núcleo sobrio aceptable,
estados/capacidad/precio/dependencia legibles, sin overflow general observado. No
aprueba diseño por tests ni certifica AA con imágenes. Encontró:

- P1 chat: Markdown crudo con barras de tabla/asteriscos, especialmente malo en móvil.
- P2 chat: crear/listar conversaciones ocupa primer viewport con una seleccionada.
- P2 catálogo móvil: texto de categoría recortado; requiere selector a ancho completo.
- P2 publicación: brief básico se mostraba también en evaluación histórica; seleccionar
  por scope guardado. Fallo/unknown por regla necesitan etiquetas diferentes visibles.
- P2 propuesta: advertencias repetían códigos de categoría/unknown; resumen castellano,
  originales completos accesibles en detalle.

Build detectó además que RM750e12V («F10 declara…F11 declara…») terminaba en aviso
genérico porque no contenía la palabra conflicto. Usar identificador estructurado
`psu_12v_documentation_conflict` para avisar contradicción explícita, sin elegir valor
favorable ni modificar veredicto. Todos asignados al mismo propietario; renderer
React seguro sin HTML arbitrario/dependencia nueva y nuevos tests/capturas focales.

Revisión de código2B estable realizada por general: cuenta/admin/shared-html/route,
planes/replacements/shares/evaluation-presentation. Sin bloqueante de seguridad en
selección leída; escapado y CSP con CSS estático SHA256 comprobados por lectura.
No certifica backend no leído. Cierre visual global **aún pendiente** de estos deltas,
sus comprobaciones y reinspección, no se declara entrega final aquí.

Contraste focal calculado sobre12 pares de colores realmente presentes en CSS:
texto/fondo/superficie, secundario, enlace, botón, badges de tres estados, alerta,
foco y borde de campo.12/12 superan umbral respectivo4,5:1 texto/3:1 no textual;
mínimo de texto muestreado6,27:1. Informe local `contrast-tokens.json`, exit0.
No se presenta como certificación WCAG integral ni como resultado de ver píxeles.

## CIERRE26/10 — entrega local aprobada funcional y visualmente

Revisora independiente general: **«Apruebo el cierre visual y el delta funcional
frontend dentro del alcance inspeccionado. Todos los P1/P2 señalados quedan
cerrados»**. Leyó el renderer/parser React seguro y su integración, helper/resumen
de evaluaciones, HTML público, presentación/propuesta de extracción y el último
unitario de advertencias. No HTML ejecutable, autolinks, imágenes remotas ni nuevas
dependencias. La orquestación SSE, API y bytes persistidos permanecen intactos.

La revisora observó efectivamente los PNG registrados en las rondas anteriores y
los siguientes deltas: chat1440 viewport/390 viewport+resultado+fullpage; propuesta
1440 viewport/390 fullpage; riesgoPSU390 fullpage; compartidos390 viewport y ambas
fullpage; catálogo1440/390 viewport. Confirmó cierres de orden, capacidad, Markdown,
gestión móvil, selector sin recorte/foco, fallo vs pendiente y fuente contradictoria
visible. No afirma haber abierto cada PNG duplicada ni cada detalle oculto.

Último P2 de código: advertencias no reconocidas se volvían genéricas. Helper final
solo resume formatos cerrados conocidos; cualquier otro mensaje queda literalmente
visible, ordinario o peligroso, además de conservar originales completos. Casos
«Conflicto de socket entre procesador y placa» y «mensaje no catalogado»/sufijos
arbitrarios:4 unitarios/exit0 y relectura independiente. Sin nueva llamada LLM ni
captura por ese ajuste, como pidió la revisora; no se presenta captura nueva ficticia.

### Verificaciones finales efectivamente ejecutadas

- Tras renderer/legacy/warnings: `npm run typecheck`, `npm run lint`, build:exit0;
 22 unitarios en message-render/extraction-presentation/visual-central/visual-rest/
 shares:exit0. Tras último helper:4 unitarios, typecheck/lint y **build fresco final
 exit0**, compilación468ms, TypeScript1032ms. No sumar esos conjuntos con94 anteriores.
- `@visual-data`:1 passed/1,7s, dentro de selección2 con fallo ajeno de teclado;
 GPU+PSU, advertencia estructurada visible, publicación con fallo/unknown y PCs intactas.
- `@visual-import`:1 passed/2,0s,6,1s total/exit0, propuesta real con avisos humanos.
- `@visual-live`:1 passed/6,4s,10,6s total/exit0, nueva respuesta natural real con
 renderer/tablas y gestión móvil; el prompt técnico de herramientas no se fotografió.
- `@visual-polish`:1 passed/0,460s,4,7s total/exit0. Teclado real categoría→Tab→
 tamaño de página→Shift+Tab, foco correcto, ancho390 completo y no overflow.

Fallo de instrumentación de teclado: `getByLabel` exacto sobre label implícito con
select/opciones no localizaba el control pese a `activeName=page_size`; se corrigió
con rol combobox/nombre accesible y assert name=page_size, no asignando foco al destino
ni retirando el assert. No fue fallo de navegación demostrado. También se retiró
Escape innecesario de select cerrado. Primer comando regex OR vía `.cmd` fue interpretado
por CMD como pipe y produjo EPIPE, sin aprobación; puertos quedaron libres. Se usó
CLI Node existente, que preserva el argumento regex. No instalación/reconfiguración.

### Selección final de imágenes reales (rutas absolutas)

La carpeta CORE conserva cuenta/PC vacías, ficha/editor, negativos/unknown y plan.
Las carpetas de pulido reemplazan **solo la selección de entrega**, nunca borran o
sobrescriben las imágenes anteriores. Se conservan BEFORE y referencias aprobadas.

- [Catálogo1440](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-50-15-843Z-e23a3016/18-catalogo-pulido-1440-viewport.png)
- [Catálogo390 y foco](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-50-15-843Z-e23a3016/18-catalogo-pulido-390-viewport.png)
- [PC compatible1440 completa](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/04-pc-compatible-1440-fullpage.png)
- [PC compatible390 completa](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/04-pc-compatible-390-fullpage.png)
- [Incompatible1440](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/06-incompatible-1440-resultado.png)
- [Incompatible390](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/06-incompatible-390-resultado.png)
- [Falta información1440](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/07-falta-informacion-1440-resultado.png)
- [Falta información390](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/07-falta-informacion-390-resultado.png)
- [Recomendación RAM1440](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/08-mejora-memoria-1440-resultado.png)
- [Recomendación RAM390](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/08-mejora-memoria-390-resultado.png)
- [Presupuesto insuficiente1440](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/09-presupuesto-insuficiente-1440-resultado.png)
- [Presupuesto insuficiente390](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-18-55-483Z-ecd5b5f2/09-presupuesto-insuficiente-390-resultado.png)
- [GPU+fuente y conflicto completo1440](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-44-56-424Z-260e6857/19-conflicto-documentacion-fuente-1440-fullpage.png)
- [GPU+fuente390 completo](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-44-56-424Z-260e6857/19-conflicto-documentacion-fuente-390-fullpage.png)
- [Propuesta editable390](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-46-41-056Z-61c01fe4/22-propuesta-advertencias-humanas-390-fullpage.png)
- [Administración1440](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-24-44-608Z-b1fefb28/16-administracion-publicada-1440-viewport.png)
- [Asistente natural1440](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-46-51-947Z-b1bea3b9/17-asistente-natural-1440-viewport.png)
- [Asistente natural390](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/visual-delivery-v1/final/2026-10-26T03-46-51-947Z-b1bea3b9/17-asistente-natural-390-resultado.png)

### Preservación, alcance y detención

Comparación final DEV/TEST `check-preservation.py final`:exit0; originales de
PCs/grupos/planes/enlaces como subconjuntos preservados, datos/soporte/fuentes de
catálogo canónicos idénticos y157 archivos backend/datos/dependencias sin cambios.
No se «restauró» una PC ni un catálogo para esconder fallos. Todo cambio de datos
de prueba fue mediante sus servicios y sobre recursos sintéticos propios.

Scan focal85 archivos candidatos sin patrones de claves; rutas privadas/runtime no
seguidas, PNG/informes ignorados, índice vacío, HEAD `c1ced9e`, puertos3000/8000 libres.
No equivale a auditoría integral de secretos. `git diff --check` de seguidos del delta
exit0, únicamente avisos de normalización LF/CRLF; no normalización automática.

Coordinadora consultiva recibió evidencia y recomendó registrar cierre y detener.
No atribuye inspección propia ni fuerza permisos denegados. README, DEMO, continuidad,
matriz e inventario actualizados; cronología conservada en bitácoras. No commits,
push, exposición pública ni instalaciones globales. Arranque existente documentado:
`./scripts/dev.ps1 -SystemTrust`, web `http://127.0.0.1:3000/pcs`, sin otro runner.

Sin pendientes funcionales/visuales de este bloque. Reservas: SVG propios no fotos,
precios históricos, compatibilidad básica no certificación física y cantidades RAM
numéricas en extracción. Mantenimiento Python predeploy sigue fuera del bloque;
no se promete despliegue ni uso comercial de datos. **DETENER al cierre.**

Comprobación documental final Build:20 enlaces absolutos locales de evidencia
existentes, `git diff --check` de seguidos pertinentes exit0; índice y puertos3000/8000
vacíos otra vez. Sin otro runner, commit ni publicación después del cierre.
