# extraccion-pc Specification

## Purpose
Convierte texto pegado con datos de hardware en una propuesta editable de PC,
sin persistir nada hasta que el dueño confirme explícitamente el guardado.

## Requirements

### Requirement: Previsualización sin guardar

El sistema SHALL devolver una propuesta revisable con evidencia, advertencias y versión de catálogo, sin crear ni modificar la PC.

#### Scenario: Texto válido

- **WHEN** un usuario autenticado envía texto de hardware
- **THEN** recibe 200 con `proposal`, `evidence`, `warnings` y `dataset_version`, y su lista de PCs queda igual

#### Scenario: Sin sesión

- **WHEN** la solicitud llega sin sesión válida
- **THEN** responde 401 y no se llama al proveedor

### Requirement: Texto pegado acotado y no confiable

El sistema SHALL aceptar solo texto de 1 a 12000 caracteres y tratarlo como datos, nunca como instrucciones.

#### Scenario: Entrada inválida

- **WHEN** el texto está vacío, excede el límite o contiene campos extra
- **THEN** responde 422 sin guardar ni llamar al proveedor

#### Scenario: Texto con instrucciones

- **WHEN** el texto pide ejecutar herramientas, cambiar identidad o guardar una PC
- **THEN** esas instrucciones se ignoran y no producen escrituras ni filtran datos

### Requirement: Evidencia por categoría con candidatos reales

El sistema SHALL respaldar cada categoría con `origin` (`catalog`, `text`, `unknown`, `ambiguous`), un extracto literal del texto y candidatos que existan en la revisión de catálogo consultada.

#### Scenario: Evidencia trazable

- **WHEN** se construye la propuesta
- **THEN** cada `candidate_ids` existe en el catálogo y cada `excerpt` aparece literalmente en la entrada; si no, responde 502

### Requirement: Desconocido y ambigüedad no son selección

El sistema SHALL omitir del componente las categorías sin identificación y advertirlo.

#### Scenario: Categoría sin resolver

- **WHEN** una categoría queda `unknown` o `ambiguous`
- **THEN** no se autocompleta, no se marca como cantidad cero ni como ausente, y aparece una advertencia con su origen

### Requirement: Cantidad de RAM explícita

El sistema SHALL aceptar la cantidad de RAM solo si el extracto la declara con su marcador.

#### Scenario: Cantidad dudosa

- **WHEN** el extracto no contiene el nombre del módulo junto a la cantidad explícita
- **THEN** la selección de RAM se omite y la categoría queda para revisión, sin inventar módulos

### Requirement: Confirmación explícita antes de guardar

El sistema SHALL crear la PC solo con `confirmed: true` y usando el dueño de la sesión.

#### Scenario: Confirmación válida

- **WHEN** el dueño confirma con `confirmed: true` y un DTO de PC completo
- **THEN** responde 201 con la PC creada, asociada a su cuenta, y otro usuario no puede leerla ni modificarla

#### Scenario: Confirmación faltante o falsa

- **WHEN** `confirmed` falta, es falso o no es booleano estricto
- **THEN** responde 422 sin crear nada

### Requirement: Revisión de catálogo revalidada

El sistema SHALL comparar la revisión confirmada con la vigente y rechazar diferencias sin remapear.

#### Scenario: Catálogo cambiado

- **WHEN** la `dataset_version` o alguna referencia de componente ya no coincide
- **THEN** responde 409 e indica revisar la selección, sin sustituir componentes en silencio

### Requirement: Errores de proveedor acotados

El sistema SHALL traducir fallas del proveedor a códigos HTTP seguros, sin fallback simulado ni guardado parcial.

#### Scenario: Falla del modelo

- **WHEN** el proveedor responde cuota excedida, JSON inválido, error de tamaño o timeout
- **THEN** responde 429, 502 o 504 según corresponda, sin persistir la propuesta ni exponer texto, prompts o secretos

### Requirement: Extracción de torre con nueve categorías

El sistema SHALL extraer torres con nueve categorías, líneas múltiples y estado de presencia por categoría.

#### Scenario: Varias unidades y desconocidos

- **WHEN** el texto menciona varias unidades, discos distintos o modelos no catalogados
- **THEN** devuelve todas las líneas con cantidad conservada, mantiene el modelo declarado y distingue `unknown` de `absent`

#### Scenario: Contexto demasiado grande

- **WHEN** el envío al proveedor supera los 24000 bytes UTF-8
- **THEN** responde 422 antes de llamar al modelo, sin recortar el texto

### Requirement: Revisión editable en la interfaz

La interfaz SHALL permitir editar la propuesta y exigir una acción explícita de guardado.

#### Scenario: Editar y confirmar

- **WHEN** el usuario modifica componentes, cantidades o BIOS y pulsa confirmar
- **THEN** se envía el DTO editado una sola vez, con doble clic bloqueado

#### Scenario: Resultado incierto

- **WHEN** la confirmación devuelve 409 de catálogo o un error de red o servidor
- **THEN** la propuesta se conserva, no se reenvía automáticamente y se pide revisar la lista de PCs antes de autorizar otro envío
