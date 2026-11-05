## ADDED Requirements

### Requirement: Observaciones dudosas quedan para revisar

El sistema SHALL conservar para revisión las observaciones inciertas del modelo, sin confirmarlas y sin fallar toda la propuesta.

#### Scenario: Categoría desconocida con datos

- **WHEN** el modelo marca una categoría como `unknown` y aporta observaciones
- **THEN** responde con la propuesta, conserva esas observaciones en la evidencia y no las agrega a las líneas confirmadas

#### Scenario: Ausencia no literal

- **WHEN** el modelo marca `absent` sin una frase negativa literal que nombre esa categoría
- **THEN** la categoría queda `unknown` y se descarta el extracto de ausencia

### Requirement: Rótulos en texto común

El sistema SHALL reconocer modelos declarados en texto común, separados por comas o « y » y precedidos por el nombre natural de la categoría, siempre que prefijo y rótulo cubran todo el segmento.

#### Scenario: Lista escrita por una persona

- **WHEN** el texto dice «Procesador Ryzen 5 5600X, placa de video RTX 3060»
- **THEN** propone esas dos líneas como modelos declarados, con cantidad 1, para confirmar

#### Scenario: Mención que no describe la PC

- **WHEN** el texto dice «quiero comprar una RTX 3060» o «sin RTX 3060»
- **THEN** no agrega esa pieza como línea confirmada
