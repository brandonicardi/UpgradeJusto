# compatibilidad Specification

## Purpose

Determinar, con un motor determinístico y evidencia publicada, si una torre de nueve categorías admite las piezas seleccionadas, informando veredicto, cobertura y faltantes. La simulación evalúa sustituciones sobre una copia sin modificar la PC guardada.

## Requirements

### Requirement: Motor determinístico aislado

El sistema SHALL evaluar la torre con un motor puro que recibe la configuración y la evidencia técnica ya resueltas por el servidor, sin acceder a HTTP, base de datos, catálogo ni LLM durante la evaluación.

#### Scenario: Evaluación de una torre resuelta
- **WHEN** se evalúa una torre de esquema 2 con evidencia de una revisión de datos fijada
- **THEN** se devuelve el veredicto, los resultados por comprobación, los faltantes y la cobertura, sin escribir datos

#### Scenario: Entrada fuera del contrato
- **WHEN** la torre no es de esquema 2 o la evidencia no declara revisión de datos
- **THEN** la evaluación se rechaza con un error, sin producir veredicto

### Requirement: Estado explícito de las nueve categorías

El sistema SHALL exigir estado de presencia para las categorías `cpu`, `motherboard`, `ram`, `gpu`, `psu`, `case`, `storage`, `cooler` y `fan`.

#### Scenario: Categorías incompletas
- **WHEN** falta el estado de una categoría o una categoría marcada como presente no tiene líneas
- **THEN** la torre se rechaza como inválida

#### Scenario: Ausencia o desconocimiento
- **WHEN** una categoría crítica está ausente o su presencia es desconocida, o no hay línea de GPU
- **THEN** la comprobación de identificación falla o queda desconocida y el veredicto nunca es `compatible`

### Requirement: Inventario fijo de comprobaciones y cobertura

El sistema SHALL evaluar el inventario fijo T01–T12 y publicar una cobertura que enumere las comprobaciones necesarias, implementadas, evaluadas, aprobadas, fallidas, desconocidas, no aplicables y pendientes de implementación.

#### Scenario: Cobertura completa del inventario
- **WHEN** se evalúa cualquier torre
- **THEN** la cobertura enumera las doce comprobaciones necesarias y cada resultado tiene estado, evidencia, condiciones y faltantes

#### Scenario: Cobertura sin comprobaciones omitidas
- **WHEN** una comprobación falla o queda desconocida
- **THEN** sigue enumerada en la cobertura y no se reemplaza por no aplicable

### Requirement: La incompatibilidad domina

El sistema SHALL devolver `incompatible` cuando cualquier comprobación necesaria falla, conservando los faltantes y comprobaciones desconocidas del resto.

#### Scenario: Fallo con faltantes
- **WHEN** una comprobación falla y otras no tienen evidencia suficiente
- **THEN** el veredicto es `incompatible` y se informan tanto el fallo como los faltantes

#### Scenario: Fallo no se diluye
- **WHEN** hay al menos un fallo conocido
- **THEN** el veredicto no puede ser `compatible` ni `requiere_verificacion`

### Requirement: Cobertura incompleta exige verificación

El sistema SHALL devolver `requiere_verificacion` cuando no hay fallos pero falta evidencia necesaria o alguna comprobación queda desconocida.

#### Scenario: Datos faltantes sin fallos
- **WHEN** no hay fallos y al menos una comprobación necesaria está desconocida
- **THEN** el veredicto es `requiere_verificacion` y se listan las rutas de los datos faltantes

#### Scenario: Desconocido no es ausencia
- **WHEN** un dato técnico no está publicado o su evidencia es conflictiva
- **THEN** se trata como desconocido, nunca como cero, falso ni aprobado

### Requirement: Compatible solo con cobertura resuelta

El sistema SHALL devolver `compatible` únicamente cuando todas las comprobaciones necesarias están resueltas y aprobadas, sin faltantes ni desconocidos.

#### Scenario: Todas las comprobaciones resueltas
- **WHEN** no hay faltantes, ninguna comprobación desconoce datos y ninguna falla
- **THEN** el veredicto es `compatible` y la cobertura se marca completa

#### Scenario: Cobertura completa no es aprobación
- **WHEN** la cobertura está completa pero alguna comprobación falla
- **THEN** el veredicto sigue siendo `incompatible`

### Requirement: Sustitución de piezas por categoría

El sistema SHALL reemplazar el conjunto completo de la categoría indicada, retirando todas sus líneas anteriores antes de instalar los candidatos.

#### Scenario: Reemplazo de categoría
- **WHEN** una acción reemplaza una categoría
- **THEN** se eliminan todas las líneas previas de esa categoría y se instalan únicamente los candidatos indicados

#### Scenario: Placa nueva y BIOS
- **WHEN** se reemplaza la placa sin declarar BIOS
- **THEN** la BIOS queda desconocida y no se hereda la de la placa retirada; si se declara, se usa ese valor

#### Scenario: Acciones sobre una línea
- **WHEN** se reemplaza o elimina una línea sin su identificador, o se agrega una línea fuera de almacenamiento o ventiladores
- **THEN** la acción se rechaza como inválida

### Requirement: La RAM se sustituye como conjunto completo

El sistema SHALL tratar la memoria como un conjunto completo: retirar todos los módulos anteriores e instalar la población nueva, sin sumar la capacidad retirada.

#### Scenario: Cambio de módulos
- **WHEN** se simula un cambio de RAM
- **THEN** el resultado contiene solo los módulos nuevos, con sus cantidades, y ninguna línea anterior de RAM

#### Scenario: Población fuera de límites
- **WHEN** la población nueva excede la cantidad de módulos admitida o no usa el reemplazo de conjunto
- **THEN** la solicitud se rechaza como inválida

### Requirement: Simulación efímera y acumulativa

El sistema SHALL aplicar las acciones de simulación en orden, cada una sobre el resultado anterior, y devolver la configuración evaluada sin persistirla.

#### Scenario: Acciones encadenadas
- **WHEN** se envían varias acciones
- **THEN** cada una parte del resultado acumulado, las líneas nuevas reciben identificadores propios y el estado de presencia se actualiza

#### Scenario: La PC guardada no cambia
- **WHEN** termina una simulación, incluso con error
- **THEN** la torre guardada conserva líneas, contexto y revisión, y una lectura posterior devuelve exactamente lo mismo

### Requirement: Evaluación versionada

El sistema SHALL acompañar cada evaluación con la versión de reglas, la revisión de datos efectivamente usada, la revisión de la PC y el alcance declarado con política, inventario y régimen de operación.

#### Scenario: Versiones en la respuesta
- **WHEN** se evalúa o simula
- **THEN** la respuesta incluye `rules_version`, `data_revision`, `pc_revision` y el alcance aplicado

#### Scenario: Evidencia de otra revisión
- **WHEN** una pieza no coincide con la revisión de datos fijada
- **THEN** se trata como no identificada y genera faltante, sin usar datos de otra revisión

### Requirement: API privada con propiedad y errores operativos

El sistema SHALL exponer `POST /api/towers/{pc_id}/evaluate` y `POST /api/towers/{pc_id}/simulate`, resolviendo identidad y propiedad en el servidor.

#### Scenario: Operación autorizada
- **WHEN** el dueño autenticado evalúa o simula su PC con la revisión esperada
- **THEN** recibe la evaluación con la configuración evaluada y la respuesta no se almacena en caché

#### Scenario: Acceso o revisión inválidos
- **WHEN** la PC es ajena o inexistente, la revisión no coincide o la selección guardada ya no está disponible en el catálogo
- **THEN** se responde 404, 409 o 409 respectivamente, sin veredicto técnico

#### Scenario: Entradas no confiables
- **WHEN** la solicitud incluye evidencia, resultados, cobertura, aprobaciones o identidad de usuario
- **THEN** se rechaza con 422 y el servidor no usa esos datos
