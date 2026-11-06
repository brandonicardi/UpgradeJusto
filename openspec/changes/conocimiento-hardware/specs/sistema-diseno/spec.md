## ADDED Requirements

### Requirement: Inicio con dos caminos

La pantalla de inicio SHALL ofrecer dos caminos visibles: «Mejorar la PC que tengo» y «Armar mi primera PC».

#### Scenario: Elección del camino

- **WHEN** la persona entra a Inicio
- **THEN** ve los dos caminos y cada uno lleva a su flujo sin pasos intermedios innecesarios

### Requirement: Presupuesto con deslizador hasta cinco millones

El control de presupuesto SHALL ofrecer un deslizador hasta $5.000.000 y SHALL aceptar al escribir cualquier monto positivo, sin tope, mostrando el valor escrito tal cual.

#### Scenario: Monto mayor al deslizador

- **WHEN** la persona escribe un monto mayor a $5.000.000
- **THEN** el campo acepta el monto y el deslizador queda en su máximo sin cambiar el valor escrito

### Requirement: Referencia rotulada en la interfaz

La interfaz MUST mostrar el rótulo «según datos de referencia» cuando un dato proviene de la tabla de conocimiento general y MUST NOT usar ese rótulo para datos del fabricante.

#### Scenario: Dato de referencia visible

- **WHEN** una ficha o veredicto usa un dato de referencia
- **THEN** el rótulo aparece junto al dato, con texto legible y contraste suficiente

### Requirement: Chat que nace con el primer mensaje

El chat SHALL crear la conversación con el primer mensaje enviado, sin conversación vacía previa, y el encabezado SHALL mantener la misma posición mientras se navega.

#### Scenario: Primer mensaje

- **WHEN** la persona abre el chat y todavía no escribió nada
- **THEN** no se crea conversación y el encabezado no cambia de posición al enviar el primer mensaje
