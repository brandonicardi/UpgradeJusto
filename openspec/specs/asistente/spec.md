# asistente Specification

## Purpose
Chat que responde sobre la PC y el catálogo mediante herramientas de solo lectura
expuestas por un servidor MCP propio, coordinado con LangGraph. Las respuestas se
transmiten por streaming y el historial queda persistido por conversación y dueño.

## Requirements

### Requirement: Conversaciones privadas por dueño

El sistema SHALL resolver el dueño desde la sesión del servidor al crear, listar, leer o borrar conversaciones.

#### Scenario: Crear y listar

- **WHEN** un usuario autenticado crea una conversación con título de 1 a 100 caracteres
- **THEN** recibe 201 con `id`, `title` y fechas, y al listar solo ve las propias

#### Scenario: Conversación ajena o borrado

- **WHEN** se pide o borra una conversación de otro dueño, o el dueño borra una sin generación activa
- **THEN** lo ajeno responde 404 y el borrado propio responde 204 eliminando solo conversación y mensajes

### Requirement: Mensaje con streaming tipado

El sistema SHALL transmitir cada turno como SSE con eventos `start`, `delta`, `tool_status`, `citation`, `done` y `error`.

#### Scenario: Turno correcto

- **WHEN** el dueño envía un mensaje de 1 a 8000 caracteres con `client_request_id`
- **THEN** recibe `start`, texto incremental por `delta`, estados de herramienta y un `done` final

#### Scenario: Fallo tras las cabeceras

- **WHEN** la generación falla después de iniciado el stream
- **THEN** llega `error` con `code` y `retryable`, nunca un `done` exitoso, y sin prompts, razonamiento, tokens ni SQL

### Requirement: Historial persistente con estados

El sistema SHALL guardar cada turno en PostgreSQL con rol `user`/`assistant` y estado `pending`, `completed`, `failed` o `interrupted`.

#### Scenario: Recarga de la conversación

- **WHEN** el dueño vuelve a abrir la conversación
- **THEN** los mensajes se leen paginados por secuencia ascendente con texto, estado y citas

#### Scenario: Turno abandonado o cancelado

- **WHEN** el proceso arranca con un `pending` sin generación activa o el cliente corta el stream
- **THEN** el turno queda `interrupted` con el texto parcial, sin regenerarse ni cobrarse

### Requirement: Idempotencia y turno único

El sistema SHALL rechazar turnos duplicados o concurrentes sin volver a llamar al proveedor.

#### Scenario: Reintento o generación en curso

- **WHEN** llega un `client_request_id` ya usado o la conversación tiene un turno `pending`
- **THEN** responde 409, con el `message_id` existente si es duplicado, y no inicia otra llamada facturable

### Requirement: Herramientas de solo lectura por servidor MCP propio

El sistema SHALL exponer exactamente siete herramientas —`catalog_search`, `get_pc`, `evaluate_pc`, `simulate_pc`, `preview_recommendations`, `get_plan`, `search_public_docs`— sin ninguna de escritura, y devolver errores sanitizados.

#### Scenario: Inventario del turno

- **WHEN** el grafo lista las herramientas del servidor MCP
- **THEN** obtiene esos siete nombres y el modelo no puede guardar, confirmar ni compartir desde el chat

### Requirement: Identidad resuelta en el servidor

El sistema SHALL revalidar sesión, conversación y propiedad dentro de cada llamada MCP, ignorando identidad enviada por el modelo o el cliente.

#### Scenario: Argumento o recurso ajeno

- **WHEN** la llamada incluye `user_id`/`owner_id`/rol o pide una PC o plan de otro usuario
- **THEN** el argumento se rechaza por esquema cerrado y el recurso ajeno devuelve error de acceso sin datos

### Requirement: Compatibilidad decidida por el motor determinístico

El sistema SHALL obtener el veredicto solo de los servicios de compatibilidad invocados por las herramientas; el modelo explica.

#### Scenario: Evaluación

- **WHEN** el asistente evalúa o simula una PC
- **THEN** el resultado trae veredicto, faltantes, cobertura y alcance calculados por el motor

#### Scenario: Evidencia insuficiente

- **WHEN** el motor no tiene datos suficientes
- **THEN** el resultado conserva `requiere_verificacion` y ninguna capa lo convierte en `compatible`

### Requirement: Límites de turno con error final seguro

El sistema SHALL acotar rondas, llamadas por ronda, tiempo y tamaño de salida.

#### Scenario: Límite alcanzado

- **WHEN** el turno supera 4 rondas, 8 llamadas en una ronda, 90 segundos o el máximo de texto visible
- **THEN** termina con error de código explícito, estado `failed`, sin reintentos ilimitados ni respuesta truncada como completa

### Requirement: Citas documentales verificables

El sistema SHALL citar solo fragmentos devueltos por `search_public_docs`.

#### Scenario: Recuperación con o sin coincidencia

- **WHEN** la consulta se resuelve contra el corpus público
- **THEN** devuelve hasta 5 fragmentos con `source_id`, `url`, `title`, `locator` y `excerpt`, o ninguna cita y sin afirmar fuentes si nada supera el umbral

### Requirement: Proveedor configurable sin fallback silencioso

El sistema SHALL elegir Groq u Ollama por variable de entorno y fallar explícitamente ante configuración inválida.

#### Scenario: Configuración del proveedor

- **WHEN** `UJ_CHAT_PROVIDER` no es `groq` ni `ollama`, o el modelo local o la URL no son válidos
- **THEN** la construcción del modelo falla con error de configuración, sin cambiar de proveedor; con `ollama` solo se usa el endpoint loopback fijo sin nube ni descargas, y la extracción sigue con Groq

### Requirement: Contexto de PC por turno sin autoridad

El sistema SHALL aceptar un contexto opcional por turno, validado en servidor y tratado como datos, no como permisos.

#### Scenario: Contexto válido, inválido o recarga

- **WHEN** el cliente envía una PC propia vigente, una PC ajena o una revisión que no coincide, o recarga la conversación
- **THEN** solo el primer caso entrega al grafo una instantánea saneada sin notas privadas; los demás responden 404 o 409 antes de reservar el turno y el contexto no reaparece como guardado
