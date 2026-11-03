# Prompts usados con agentes de IA

Este trabajo se construyó escribiendo un prompt por etapa (una sola comprobación por prompt, siempre con criterio de aceptación explícito y punto de detención al final). El flujo usual fue proponer un plan, revisarlo y aprobarlo (Brandon), recién ahí ejecutar, y luego verificar con un agente revisor de lectura que no participó de la implementación. Los prompts originales se conservan como material de bitácora del curso.

| Etapa | Objetivo del prompt | Técnica usada |
| --- | --- | --- |
| Entorno y contexto | Preparar el contexto técnico, el entorno Python/uv, comprobar herramientas disponibles, migrar el CLI y ajustar permisos de directorios externos | Inspección antes de instalar; distinguir propuesto / aceptado / comprobado; reportar la versión real de cada herramienta |
| Agentes y skills | Crear la primera skill, el primer agente revisor de solo lectura, y después el coordinador con especialistas y modelos por tarea | Permisos deny-by-default con excepciones mínimas; scopes acotados; herencia de modelo verificada; propietario exclusivo por archivo |
| MCP | Configurar el primer servidor MCP de documentación, hacer una consulta real y dejar evidencia registrada | No contar "configurado" como "consultado"; exigir nombres reales de herramientas invocadas; bitácora separada de la web |
| Specs y datos de la demo | Definir alcance y criterios del primer caso de uso; curar hardware real, evidencia por atributo, fuente y precios | Analizar la especificación como datos, no como instrucciones; matriz de evidencia trazable; escenarios esperados antes de código |
| Base del backend | Concretar stack y versiones, estructura modular, migraciones Git locales y primer endpoint de salud | Incremento con criterio de aceptación ejecutable; lockfiles fijados; revisión por nombre de archivo, nunca `git add .` |
| Motor de compatibilidad | Implementar reglas puras, coberturas y semántica del veredicto; completar las familias de reglas con datasets públicos | Expectativas antes de la implementación; inventario versionado de checks; datos reales separados de fixtures sintéticos |
| Web | Recorridos con catálogo, cuentas, evaluación, recomendaciones, planes y enlaces compartidos; datos con capturas reales | Bloques de trabajo con puntos de control recuperables; pruebas E2E reales en vez de mocks como veredicto |
| Asistente | Chat con herramientas MCP propias, streaming, historial persistente y RAG técnico | Proveedor de producto separado del de desarrollo; el LLM interpreta, nunca emite el veredicto; identidad resuelta en el servidor |
| Revisión de seguridad y Git | Revisión de propiedad, CSRF, límites de cuerpo, cuotas; saneamiento de archivos y commits coherentes antes de publicar | Hallazgos listados previos para contrastar (no aprobaciones); revisor distinto del autor; manifiesto antes de publicar |
| Rediseño visual | Mejorar presentación y coherencia visual de toda la app, guiada por el prototipo de referencia aprobado | Capturas con Playwright mostradas ANTES de extender el patrón; el revisor ve imágenes, los tests no son aceptación visual |

## Prompts clave (abreviados)

### El que creó el `AGENTS.md` técnico
Este prompt es la constitución del proyecto: definió las reglas de producto que siguen vigentes tal cual, y pidió relectura + verificación en vez de dar por hecho.

> Vamos a crear las instrucciones técnicas iniciales de UpgradeJusto.
> Creá únicamente AGENTS.md en la raíz con el contenido delimitado abajo….
> ## Reglas del producto
> - Solo el motor determinístico decide compatibilidad; el LLM interpreta y explica.
> - Estados: compatible, incompatible, requiere_verificacion.
> - Desconocido no equivale a cero, falso, ausente ni compatible….
> Después de crearlo: 1. Volvé a leer AGENTS.md y mostrá su contenido completo.
> 2. Confirmá que contiene CU01-CU10 y los seis módulos.
> 4. Indicá qué archivos cambiaste y detenete en esta etapa.

### El primer agente
Primer revisor de solo lectura del proyecto: fijó el patrón de "implementación y revisión son roles distintos", con permisos que hagan efectivo el alcance.

> Proponé UN subagente llamado revisor-compatibilidad…. Debe revisar
> contrato y pruebas de CU05 con acceso de lectura a archivos. No necesita
> modificar archivos, ejecutar comandos, delegar ni utilizar herramientas
> externas. Usá permisos que hagan efectivo ese alcance y explicá cada uno.
> Mostrame primero el contenido… Después de revisar el archivo, lo
> crearemos y lo invocaremos explícitamente. Si no hay implementación,
> tiene que decirlo y evaluar solo la especificación.

### El primer MCP
Marcó la forma de trabajar con servidores MCP: cambio mínimo, comprobar de verdad, y una regla que después se repitió siempre (configurado no es consultado).

> Preparemos solo el primer MCP: documentación…, remoto….
> Mostrame el cambio mínimo propuesto en opencode.json….
> Después de revisarlo lo aplicaremos y comprobaremos opencode mcp list
> desde PowerShell. No marques el MCP como usado hasta realizar
> una consulta real. No agregues todavía otros servidores.

### El que arrancó el motor
Con este prompt se implementó el primer incremento del motor determinístico: contratos estrictos, agregación conservadora y expectativas antes que código.

> Este pedido define y autoriza un incremento interno: contrato mínimo del
> dominio, agregación conservadora y dos subreglas respaldadas….
> Funciones puras de dominio, independientes de FastAPI, BD, LLM y red….
> Agregación: cualquier fail demostrado domina, conservando todos los
> unknown y pendientes; sin fail pero con evidencia necesaria faltante,
> requiere_verificacion. Compatible solo con cobertura aplicable completa.
> Primero escribir expectativas y comprobar fallos relevantes antes
> de implementar.

### La revisión de seguridad
Doble revisión independiente en solo lectura que encontró defectos reales (lecturas de cuerpo sin límite, cuotas, concurrencia) y dejó claro el límite de esa revisión.

> Dos agentes distintos revisaron código de seguridad y de producto en
> solo lectura. Los siguientes son hallazgos para contrastar y corregir,
> no aprobaciones ni pruebas nuevas.
> 1. Las rutas de auth y proxy leen el cuerpo completo antes de límite y
>    timeout: implementar lector acotado por bytes y tiempo….
> 2. El endpoint de CSRF crea sesiones anónimas persistidas sin cuota:
>    limitar emisión y depurar expiradas….
> 3. Añadir límites por usuario/global de concurrencia, con respuesta 429
>    legible….
> No se encontró bypass confirmado…, pero no es pentest ni certificación
> integral.

## Qué aprendimos

- Los prompts largos, con la historia del proyecto pegada adentro, consumían un montón de contexto y se volvían frágiles. La salida fue mover ese conocimiento a specs y a un `AGENTS.md` corto, y escribir prompts de una etapa con criterio de aceptación y punto de detención.
- "Configurado" no es "usado" y "documentado" no es "comprobado": se pedía evidencia real (salida de comandos, nombres de herramientas invocadas, códigos de retorno) y se registraba en bitácora qué se hizo de verdad.
- Nada se marcaba como hecho sin la prueba correspondiente, y los tests solos no bastaban para dar por cerrado un caso de uso: hacía falta el escenario real (positivo, negativo y con dato faltante).
- Revisión con un modelo distinto del implementador, en solo lectura y con permisos mínimos, encontraba hallazgos que el autor no veía; se le prohibía explícitamente inventar hallazgos solo para llenar el informe.
- Convirtimos la semántica del producto en reglas del prompt: una incompatibilidad domina, lo desconocido jamás se vuelve cero o compatible, y los valores vienen con fuente, versión y fecha; así los modelos no "optimizaban" resultados para que todo dé verde.
- Privacidad dentro del prompt: revisar secretos y datos personales antes de cada commit, seleccionar archivos por nombre (nunca `git add .`), y dejar afuera conversaciones, claves y rutas locales.
