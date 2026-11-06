## ADDED Requirements

### Requirement: Catálogo y ficha iguales a sus maquetas

El sistema SHALL mostrar `/catalog` y `/catalog/[id]` con la estructura, los componentes y los textos fijos de `PantallaCatalogo` y `PantallaPieza`, con datos reales de la API.

#### Scenario: Comparación con la maqueta

- **WHEN** se compara la captura real con la maqueta a 1440 y 390
- **THEN** coinciden estructura, orden, componentes y espaciado, y solo difieren los datos

### Requirement: Precio más bajo y orden por precio

El sistema SHALL marcar en el servidor la oferta más baja de cada pieza, entre las de contado, vigentes, en stock, con importe y vistas hace 7 días o menos, y SHALL ordenar el catálogo por esa oferta cuando se pida.

#### Scenario: Oferta más baja

- **WHEN** una pieza tiene ofertas que califican
- **THEN** la ficha muestra «El más bajo» en la oferta que indicó el servidor, sin comparar importes en el cliente

#### Scenario: Sin oferta que califique

- **WHEN** ninguna oferta de la pieza califica
- **THEN** no se marca ninguna y la pieza queda al final del orden por precio

### Requirement: Estado de compatibilidad por pieza

El sistema SHALL mostrar «Encaja», «No encaja» o «Falta un dato» solo a partir de la respuesta de `/simulate` para la PC elegida.

#### Scenario: PC elegida

- **WHEN** la persona elige una de sus PCs
- **THEN** cada pieza visible muestra el estado que devolvió el servidor, sin modificar la PC guardada

#### Scenario: Sin sesión o sin PC

- **WHEN** no hay sesión o no hay una PC elegida
- **THEN** no se muestra ningún estado de compatibilidad y se ofrece entrar o agregar una PC
