# Spec Delta

## ADDED Requirements

### Requirement: Plata gastada y restante desde el servidor
El sistema SHALL devolver con cada lectura de un plan de torre la plata ya gastada y la que falta, en pesos argentinos, calculadas con `Decimal` a partir de los precios congelados de las compras marcadas y de las no marcadas. Un lado cuyo precio no se conozca SHALL devolverse como nulo, nunca como cero. La lectura no SHALL modificar el plan guardado.

#### Scenario: Una compra marcada
- **WHEN** el plan tiene tres compras y una está marcada
- **THEN** lo gastado es el total de esa compra y lo que falta es la suma de las otras dos

#### Scenario: Falta un precio
- **WHEN** una compra sin marcar no tiene precio conocido
- **THEN** lo que falta es nulo y lo gastado se calcula igual

### Requirement: Próxima compra y actualización de precios
La pantalla Mi plan SHALL mostrar primero la próxima compra con el componente, el cambio, el veredicto del servidor y el precio con fecha y tienda. «Actualizar precios» SHALL recalcular el plan con la revisión esperada del plan, de la PC y del catálogo, y SHALL mostrar si el total subió o bajó y si algo dejó de encajar antes de guardar. Ante un conflicto SHALL explicarlo sin reintentar sola.

#### Scenario: Precios que suben
- **WHEN** la persona pide actualizar precios y el total nuevo es mayor
- **THEN** ve cuánto subió y decide si guarda los precios nuevos

#### Scenario: La PC cambió
- **WHEN** el servidor responde conflicto por la revisión de la PC
- **THEN** la pantalla lo dice en palabras simples, recarga el plan y no guarda nada

### Requirement: Actualizar Mi PC solo con confirmación
Al marcar una compra y al terminar el plan, la pantalla SHALL ofrecer actualizar Mi PC. La PC guardada SHALL cambiar solo después de una confirmación explícita y con su revisión esperada; sin confirmación no SHALL cambiar nada.

#### Scenario: Se rechaza
- **WHEN** la persona elige «Ahora no»
- **THEN** la PC guardada queda igual y el plan sigue legible

#### Scenario: Se confirma
- **WHEN** la persona confirma y la revisión de la PC no cambió
- **THEN** la PC guardada refleja el componente comprado y «Actualizar precios» sigue funcionando
