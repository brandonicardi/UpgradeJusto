## ADDED Requirements

### Requirement: Documento de referencia generado desde las tablas

El sistema SHALL generar `docs/conocimiento-hardware.md` desde las mismas tablas que lee el motor, con el comando `python -m upgradejusto.assistant.reference_doc --config <manifiesto> --write-doc <ruta>`, e ingerirlo en pgvector como fuente documental. El texto es explicación y MUST NOT convertirse en veredicto.

#### Scenario: Documento regenerado

- **WHEN** cambia una tabla de conocimiento y se vuelve a correr el comando
- **THEN** el documento y su ingesta reflejan la misma tabla, sin edición manual

#### Scenario: Documento sin veredicto

- **WHEN** el chat cita el documento de referencia
- **THEN** la respuesta lo presenta como explicación general y no como resultado de compatibilidad de una PC

### Requirement: Búsqueda documental con términos exactos

La búsqueda documental SHALL priorizar los fragmentos que contienen el término exacto de la consulta (por ejemplo B550 o RTX 3060) antes que los que solo son semánticamente parecidos.

#### Scenario: Placa nombrada en la consulta

- **WHEN** la consulta menciona «B550»
- **THEN** los fragmentos que contienen «B550» aparecen antes que los de otros chipsets con texto parecido

#### Scenario: Consulta sin término exacto

- **WHEN** la consulta no menciona ningún modelo
- **THEN** la búsqueda devuelve los fragmentos más cercanos por significado

### Requirement: RAG apagado en Docker

El sistema MUST informar que el RAG no está activo en el despliegue Docker, porque requiere el modelo de embeddings local, y MUST NOT citar documentos que no pudo consultar.

#### Scenario: Chat en Docker

- **WHEN** el asistente corre en Docker y la persona pregunta por conocimiento de hardware
- **THEN** la respuesta no cita documentos de referencia y lo indica sin inventar citas

### Requirement: Proveedor local llama.cpp sin fallback silencioso

El sistema SHALL aceptar `UJ_CHAT_PROVIDER=llamacpp` para usar el modelo local en 127.0.0.1:8081, manteniendo `groq` como valor por defecto. Un proveedor no reconocido o no disponible MUST NOT cambiar silenciosamente a otro proveedor.

#### Scenario: Proveedor llamacpp

- **WHEN** `UJ_CHAT_PROVIDER=llamacpp` y el servidor local responde
- **THEN** el chat usa el modelo local con herramientas MCP y las mismas reglas de identidad y lectura

#### Scenario: Proveedor inválido

- **WHEN** `UJ_CHAT_PROVIDER` tiene un valor distinto de `groq`, `ollama` o `llamacpp`
- **THEN** el asistente informa el error y no usa otro proveedor
