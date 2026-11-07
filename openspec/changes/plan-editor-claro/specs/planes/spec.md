# Spec Delta

## ADDED Requirements

### Requirement: Editor de compras guiado y sin jerga
El editor de «Cambiar tu plan» SHALL mostrar cada compra como una tarjeta «Compra N» con la lista de lo que se compra y un botón «Sacar» por componente. SHALL ofrecer «Comprar antes», «Comprar después» y «Sacar compra» solo si el plan tiene más de una compra. SHALL decir una sola vez que nada cambia hasta guardar y que la PC guardada no se toca.

#### Scenario: Una sola compra
- **WHEN** el plan tiene una compra
- **THEN** no se muestran los botones de orden ni «Sacar compra»

#### Scenario: Planes viejos
- **WHEN** el plan trae acciones de cambiar o sacar una sola línea
- **THEN** se muestran y se pueden sacar, pero el editor no ofrece crearlas

### Requirement: Sumar un componente en pasos
«+ Sumar un componente» SHALL abrir un flujo con una decisión por vez: la categoría, el componente del catálogo (o el modelo escrito), la cantidad y, si corresponde, reemplazar o sumar. La cantidad SHALL pedirse solo en memoria, almacenamiento y ventiladores, con valor inicial 1. Reemplazar o sumar uno más SHALL preguntarse solo si la PC ya tiene almacenamiento o ventiladores; en el resto SHALL reemplazar la categoría. El botón «Sumar a esta compra» SHALL estar deshabilitado hasta tener componente o modelo, y al sumar el flujo se cierra.

#### Scenario: Memoria
- **WHEN** la persona elige Memoria y un modelo
- **THEN** aparece «Cantidad» con 1 y la acción enviada lleva esa cantidad

#### Scenario: Procesador
- **WHEN** la persona elige Procesador
- **THEN** no aparece «Cantidad» y la cantidad es 1

#### Scenario: Ya tiene almacenamiento
- **WHEN** la PC tiene un disco y la persona elige Almacenamiento
- **THEN** elige entre «Reemplazar los que tengo» y «Sumar uno más»

### Requirement: Compras vacías no traban el guardado
Una compra nueva SHALL nacer vacía con el flujo abierto y decir «Todavía está vacía». Al guardar SHALL descartarse toda compra sin componentes. El guardado SHALL estar habilitado si al menos una compra tiene componentes; si no, SHALL mostrarse «Sumá un componente para guardar.». Los estados de guardado, el reintento y la idempotencia SHALL quedar como están.

#### Scenario: Una compra vacía entre otras
- **WHEN** la persona agrega una compra, no suma nada y guarda
- **THEN** se envía el plan solo con las compras que tienen componentes

#### Scenario: Ninguna con componentes
- **WHEN** ninguna compra tiene componentes
- **THEN** el botón de guardar está deshabilitado y se lee «Sumá un componente para guardar.»
