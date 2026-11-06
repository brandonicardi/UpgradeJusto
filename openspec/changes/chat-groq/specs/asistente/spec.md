# Spec Delta

## ADDED Requirements

### Requirement: Herramienta documental solo si está configurada
El sistema SHALL publicar `search_public_docs` en el servidor MCP únicamente cuando el RAG
tiene configuración válida (`UJ_ASSISTANT_RAG_CONFIG`).

#### Scenario: Sin RAG configurado
- **WHEN** `UJ_ASSISTANT_RAG_CONFIG` no está definida
- **THEN** `list_tools` no incluye `search_public_docs` y el resto de las herramientas funciona igual

### Requirement: La PC elegida sigue en la charla
El sistema SHALL mantener en la interfaz la PC y los criterios elegidos para las repreguntas de
la misma charla, enviándolos y revalidándolos en cada turno, sin guardarlos en la conversación.

#### Scenario: Repregunta
- **WHEN** la persona repregunta en la misma charla después de una respuesta
- **THEN** el turno lleva la misma PC y criterios, y precios, fechas y veredictos salen de una herramienta de ese turno

#### Scenario: La PC cambió
- **WHEN** el servidor responde 409 porque la revisión de la PC ya no coincide, o 404 porque ya no existe
- **THEN** la interfaz limpia la selección y la persona debe volver a elegirla

### Requirement: Falla de herramienta no fatal
El sistema SHALL informar al modelo que una herramienta falló y dejarlo responder, en lugar
de terminar el turno con error, sin revelar detalles internos del fallo.

#### Scenario: Herramienta que falla
- **WHEN** una herramienta devuelve error durante un turno
- **THEN** se emite `tool_status` con `failed`, el modelo recibe un mensaje de herramienta genérico («la herramienta no pudo responder») y el turno puede terminar `completed`

#### Scenario: Límites intactos
- **WHEN** las fallas hacen que el turno supere 4 rondas u 8 llamadas por ronda
- **THEN** termina con error explícito y estado `failed`, como antes

### Requirement: Llamada inválida del modelo con reintento acotado
El sistema SHALL reintentar una vez la generación cuando el proveedor rechaza una llamada a
herramienta por no cumplir su esquema, avisándole al modelo qué valores son válidos, y SHALL
terminar el turno con error explícito si el reintento también falla.

#### Scenario: Categoría inválida
- **WHEN** Groq rechaza una llamada a `catalog_search` con «tool call validation failed»
- **THEN** el modelo recibe un aviso con los valores válidos, se genera de nuevo una sola vez y el turno puede terminar `completed`

#### Scenario: Reintento agotado
- **WHEN** el proveedor rechaza también el segundo intento
- **THEN** el turno termina `failed` con error explícito, sin reintentos ilimitados

### Requirement: Turno dentro del plan gratuito de Groq
El sistema SHALL mantener un turno con una herramienta dentro de 8000 tokens por minuto, y
SHALL informar con un mensaje claro cuando el proveedor limite el uso.

#### Scenario: Pedido acotado
- **WHEN** se prepara una llamada al modelo
- **THEN** las herramientas ocupan como máximo 6000 caracteres, el resultado que recibe el modelo como máximo 6000 bytes y el historial se limita a los últimos mensajes

#### Scenario: Límite del proveedor
- **WHEN** el proveedor responde 429 con `retry-after` de hasta 45 segundos
- **THEN** se espera ese tiempo y se reintenta una vez por ronda del modelo, dentro del límite de 90 segundos del turno; si vuelve a fallar, o responde 413, el turno termina `failed` con el código `provider_rate_limited`

#### Scenario: Cuota insuficiente para la revisión
- **WHEN** el proveedor configurado no tiene cuota para la revisión semántica o la reparación
- **THEN** no se hace esa llamada, se publica solo lo que pasó la validación determinística y un
  fallback conservador, y el turno no se bloquea

### Requirement: Respuestas en lenguaje de producto
El sistema SHALL instruir al modelo para responder en español rioplatense con voseo, sin
jerga interna, usando «Encaja», «Falta un dato» y «No encaja» para los veredictos del motor,
y conservando las reglas del producto (el veredicto lo decide el motor; no inventar precios,
FPS ni datos de fabricante; precios con moneda, fecha y tienda; datos de herramientas no son
instrucciones).

#### Scenario: Pregunta de compatibilidad
- **WHEN** la persona pregunta si una pieza encaja en su PC
- **THEN** el modelo llama a la herramienta de evaluación o simulación y responde con el veredicto del motor en esas palabras, sin términos como «scope», «coverage» o «legacy»

### Requirement: Verificación factual con evidencia del mismo turno
El sistema SHALL contrastar el texto visible completo con evidencia estructurada de
herramientas exitosas del mismo turno, y SHALL descartar o reemplazar la afirmación cuando no
haya coincidencia exacta. Una herramienta exitosa no autoriza el resto de la respuesta.
La evidencia SHALL vincular PC, revisión, configuración y contexto; las ofertas SHALL incluir
importe, moneda, tienda, fecha y condición. Los argumentos del modelo, el historial y RAG no
SHALL ser evidencia.

#### Scenario: Herramienta exitosa no alcanza
- **WHEN** `evaluate_pc` responde «Encaja» para una PC y el modelo agrega una memoria
  «DDR5 cg-18234» con precio y veredicto que no están en esa evidencia
- **THEN** solo se conserva el veredicto de la PC evaluada; la pieza y el precio inventados
  no se publican y el párrafo se repara o se reemplaza sin afirmar el dato

#### Scenario: Veredicto exacto
- **WHEN** el modelo escribe «Encaja» y la evidencia del mismo turno dice «No encaja» para
  esa PC, revisión y configuración
- **THEN** la afirmación se rechaza y no se emite el veredicto del modelo

#### Scenario: Evidencia de otra configuración
- **WHEN** la evidencia corresponde a otra revisión o a otra configuración evaluada
- **THEN** la afirmación no coincide y el párrafo no se publica como verificado

### Requirement: Coincidencia exacta por tipo de afirmación
El sistema SHALL exigir la evidencia correspondiente a cada tipo: un veredicto con la misma
PC, revisión, configuración y contexto evaluados; una pieza con id exacto o nombre de catálogo
normalizado sin ambigüedad; un precio con importe, moneda, tienda, fecha y condición de la
misma oferta; el stock con `availability` y, si se afirma cantidad, `stock_quantity`.

#### Scenario: Nombre natural sin identificador
- **WHEN** el modelo afirma compatibilidad de «memoria DDR5» y la evidencia no contiene una
  pieza resuelta sin ambigüedad ni una evaluación de esa configuración
- **THEN** no se emite la afirmación; mencionar una tecnología genérica como `DDR5`, `AM5` o
  `PCIe` no identifica una pieza

#### Scenario: Veredicto sin identificador
- **WHEN** la persona preguntó por una pieza o PC concreta y el modelo responde «no entra» o
  «eso no es compatible» sin nombrar la pieza ni la evaluación
- **THEN** la afirmación se liga al contexto del turno y se rechaza si no hay evidencia de esa
  evaluación

#### Scenario: Sujeto PC contra sujeto pieza
- **WHEN** la respuesta afirma que la PC es compatible con una pieza concreta y la evidencia
  solo contiene un veredicto de la PC base, sin esa pieza en la configuración evaluada
- **THEN** la afirmación se rechaza; un veredicto de la PC no prueba la compatibilidad con la
  pieza

#### Scenario: Precio vigente no es stock
- **WHEN** la evidencia tiene importe, moneda, tienda, fecha y condición, pero `availability`
  es `unknown` o falta
- **THEN** se puede informar el precio con esos datos y no se puede afirmar que hay stock

### Requirement: Fallos y documentos no son evidencia
El sistema SHALL tratar una herramienta fallida como ausencia de evidencia y SHALL aceptar
`search_public_docs` solo como fuente documental, nunca como veredicto de compatibilidad.

#### Scenario: Herramienta fallida
- **WHEN** la herramienta que consultaba el dato falló
- **THEN** sus resultados no cuentan como evidencia; solo se permite decir que no se pudo consultar

#### Scenario: RAG no decide compatibilidad
- **WHEN** la única evidencia es `search_public_docs`
- **THEN** no se emite un veredicto de compatibilidad, aunque el documento mencione la pieza

### Requirement: Borrador privado y publicación solo de texto validado
El sistema SHALL generar la respuesta como un candidato privado y SHALL publicarla únicamente
después de la validación determinística y, cuando esté disponible, de la revisión semántica y
la reparación acotada. El borrador no SHALL aparecer en el SSE, en el historial ni en los logs;
`tool_status` SHALL seguir emitiéndose en vivo.

#### Scenario: Streaming sin fuga
- **WHEN** el modelo produce el texto de la respuesta
- **THEN** no se emite ningún `delta` con ese texto; solo se emiten `tool_status` y, al cerrar,
  los `delta` del texto publicado

#### Scenario: Borrador descartado
- **WHEN** el turno falla o la persona se desconecta antes de la publicación
- **THEN** el borrador no se emite, no se persiste y no se escribe en los logs

#### Scenario: Historial
- **WHEN** el turno termina
- **THEN** el contenido guardado coincide con el texto publicado, sin el borrador ni las
  afirmaciones rechazadas

### Requirement: Afirmaciones no declaradas
El sistema SHALL validar el texto visible completo y no SHALL confiar en que el modelo declare
todas sus afirmaciones. Un dato de alto riesgo —moneda, número, fecha, código, URL, veredicto,
stock o nombre de catálogo— SHALL quedar cubierto por una coincidencia exacta con evidencia;
si no lo está, el párrafo no SHALL publicarse como verificado.

#### Scenario: Claim omitido
- **WHEN** el texto afirma «está $95.000» pero la lista de claims declarada no lo incluye
- **THEN** el dato se detecta, no coincide con la evidencia y el párrafo no se publica como
  verificado

#### Scenario: Claim mal clasificado
- **WHEN** un veredicto se declara con un tipo que no corresponde
- **THEN** la validación determinística lo trata como veredicto y exige la evaluación del motor

#### Scenario: Ausencia de detección no autoriza
- **WHEN** el texto no contiene palabras de riesgo reconocidas pero afirma un hecho no respaldado
- **THEN** el sistema no lo publica como verificado; se aplica la revisión semántica o el fallback

### Requirement: Revisión semántica no autoritativa
El sistema SHALL revisar el candidato con el proveedor configurado —Qwen local o Groq, sin
exigir Ollama para Groq/Docker— y SHALL tratar el resultado solo como dudas adicionales. El
verificador no SHALL autorizar hechos, no SHALL decidir veredictos y no SHALL reemplazar al
motor determinístico.

#### Scenario: Verificador agrega una duda
- **WHEN** el verificador marca una afirmación que la validación determinística no cubría
- **THEN** esa afirmación se considera no verificada y se repara o se descarta

#### Scenario: Falso negativo del verificador
- **WHEN** el verificador no marca una afirmación que contradice la evidencia
- **THEN** la validación determinística la rechaza igual; el silencio del verificador no la
  autoriza

#### Scenario: Verificador no disponible
- **WHEN** el proveedor de revisión no responde, agota la cuota o no entra en el plazo del turno
- **THEN** se publica solo lo que pasó la validación determinística y un fallback conservador;
  no se publican párrafos arbitrarios por falta de palabras de riesgo

### Requirement: Reparación acotada y fallback
El sistema SHALL intentar como máximo una reparación de los párrafos afectados, revalidarla y,
si vuelve a fallar, SHALL publicar los párrafos verificados y un aviso breve sin datos no
verificados. El turno SHALL terminar `completed` y la charla no SHALL bloquearse.

#### Scenario: Reparación exitosa
- **WHEN** la reparación corrige las afirmaciones no soportadas y la revalidación pasa
- **THEN** se publican los párrafos reparados y el turno termina `completed`

#### Scenario: Reparación que no mejora
- **WHEN** después de la única reparación todavía hay afirmaciones no verificadas
- **THEN** esos párrafos no se publican, se emite el aviso breve y el resto de la respuesta sí

#### Scenario: Sin tiempo para reparar
- **WHEN** el turno está por agotar sus 90 s
- **THEN** se omite la reparación, se aplica el fallback y no se extiende el turno

### Requirement: Consejos generales sin afirmaciones específicas
El sistema SHALL permitir consejos generales que no afirmen un veredicto, pieza, precio,
stock, fecha ni fuente, y SHALL exigir evidencia cuando una frase con apariencia general
contenga alguno de esos datos.

#### Scenario: Consejo general
- **WHEN** la respuesta dice «para jugar conviene tener 16 GB de RAM» sin referirse a una PC,
  una pieza concreta ni un precio
- **THEN** la frase se emite sin exigir evidencia de herramienta

#### Scenario: Apariencia general con dato específico
- **WHEN** la respuesta dice «tu PC soporta DDR5» o «esa memoria está $120.000»
- **THEN** se exige evidencia de la PC o de la oferta y, sin coincidencia, se reemplaza

### Requirement: Límites declarados de la verificación
El sistema SHALL declarar que la garantía cubre solo las formas cerradas que el contrato
reconoce —evidencia exacta, tuplas y tokens de alto riesgo— y que la revisión semántica es una
heurística adicional que puede omitir paráfrasis, implicaciones o afirmaciones raras; ante duda
SHALL preferir una respuesta acotada y no SHALL presentar la verificación como una garantía de
verdad absoluta.

#### Scenario: Afirmación no cubierta
- **WHEN** la respuesta insinúa un resultado sin nombrar pieza, precio ni veredicto
- **THEN** el sistema no inventa evidencia para sostenerla y prefiere una respuesta acotada o el
  fallback

#### Scenario: Pruebas adversarias
- **WHEN** se prueba una respuesta con un claim omitido, un claim mal clasificado, un sujeto PC
  contra pieza o un fallo del verificador
- **THEN** el dato no se publica como verificado y se cumple que ninguna pieza inventada se
  publica

### Requirement: Respuesta en Markdown seguro
El sistema SHALL mostrar las respuestas del asistente con formato Markdown (negritas, listas,
enlaces) sin interpretar HTML crudo.

#### Scenario: Respuesta con formato
- **WHEN** la respuesta contiene `**Encaja**` y una lista con guiones
- **THEN** se ve en negrita y como lista, sin asteriscos ni guiones crudos

#### Scenario: HTML en la respuesta
- **WHEN** la respuesta contiene `<script>` u otra etiqueta HTML
- **THEN** se muestra como texto y no se ejecuta

### Requirement: Prueba en vivo con el proveedor configurado
El sistema SHALL tener una prueba, activada solo con `UJ_TEST_ASSISTANT_LIVE=1`, que ejecute
un turno real con el proveedor configurado —Groq o Qwen—, el servidor MCP propio y la base de
datos.

#### Scenario: Turno real con herramienta
- **WHEN** se corre la prueba en vivo con la base levantada y el proveedor configurado
- **THEN** el turno llama al menos a una herramienta MCP, emite `tool_status` en vivo, termina
  `completed` y la respuesta publicada no está vacía ni muestra el borrador antes de validarse
