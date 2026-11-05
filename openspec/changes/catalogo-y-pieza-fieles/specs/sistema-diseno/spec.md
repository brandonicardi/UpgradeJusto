## ADDED Requirements

### Requirement: Catálogo y ficha iguales a sus maquetas

El sistema SHALL mostrar `/catalog` y `/catalog/[id]` con la estructura, los componentes y los textos fijos de `PantallaCatalogo` y `PantallaPieza`, con datos reales de la API.

#### Scenario: Comparación con la maqueta

- **WHEN** se compara la captura real con la maqueta a 1440 y 390
- **THEN** coinciden estructura, orden, componentes y espaciado, y solo difieren los datos

### Requirement: Estado de compatibilidad por pieza

El sistema SHALL mostrar «Encaja», «No encaja» o «Falta un dato» solo a partir de la respuesta de `/simulate` para la PC elegida.

#### Scenario: PC elegida

- **WHEN** la persona elige una de sus PCs
- **THEN** cada pieza visible muestra el estado que devolvió el servidor, sin modificar la PC guardada

#### Scenario: Sin sesión o sin PC

- **WHEN** no hay sesión o no hay una PC elegida
- **THEN** no se muestra ningún estado de compatibilidad y se ofrece entrar o agregar una PC
