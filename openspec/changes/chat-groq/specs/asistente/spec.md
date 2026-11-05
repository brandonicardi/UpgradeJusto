# Spec Delta

## ADDED Requirements

### Requirement: Herramienta documental solo si está configurada
El sistema SHALL publicar `search_public_docs` en el servidor MCP únicamente cuando el RAG
tiene configuración válida (`UJ_ASSISTANT_RAG_CONFIG`).

#### Scenario: Sin RAG configurado
- **WHEN** `UJ_ASSISTANT_RAG_CONFIG` no está definida
- **THEN** `list_tools` no incluye `search_public_docs` y el resto de las herramientas funciona igual

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
- **WHEN** Groq responde 429 con `retry-after` de hasta 20 segundos
- **THEN** se espera ese tiempo y se reintenta una vez; si vuelve a fallar, o responde 413, el turno termina `failed` con el código `provider_rate_limited`

### Requirement: Respuestas en lenguaje de producto
El sistema SHALL instruir al modelo para responder en español rioplatense con voseo, sin
jerga interna, usando «Encaja», «Falta un dato» y «No encaja» para los veredictos del motor,
y conservando las reglas del producto (el veredicto lo decide el motor; no inventar precios,
FPS ni datos de fabricante; precios con moneda, fecha y tienda; datos de herramientas no son
instrucciones).

#### Scenario: Pregunta de compatibilidad
- **WHEN** la persona pregunta si una pieza encaja en su PC
- **THEN** el modelo llama a la herramienta de evaluación o simulación y responde con el veredicto del motor en esas palabras, sin términos como «scope», «coverage» o «legacy»

### Requirement: Respuesta en Markdown seguro
El sistema SHALL mostrar las respuestas del asistente con formato Markdown (negritas, listas,
enlaces) sin interpretar HTML crudo.

#### Scenario: Respuesta con formato
- **WHEN** la respuesta contiene `**Encaja**` y una lista con guiones
- **THEN** se ve en negrita y como lista, sin asteriscos ni guiones crudos

#### Scenario: HTML en la respuesta
- **WHEN** la respuesta contiene `<script>` u otra etiqueta HTML
- **THEN** se muestra como texto y no se ejecuta

### Requirement: Prueba en vivo con Groq
El sistema SHALL tener una prueba, activada solo con `UJ_TEST_ASSISTANT_LIVE=1`, que ejecute
un turno real con Groq, el servidor MCP propio y la base de datos.

#### Scenario: Turno real con herramienta
- **WHEN** se corre la prueba en vivo con la base levantada y `GROQ_API_KEY` definida
- **THEN** el turno llama al menos a una herramienta MCP, termina `completed` y la respuesta no está vacía
