# Proposal

## Why

«Cambiar tu plan» no se entiende para quien no sabe de hardware: la tarjeta «Compra 2» muestra un
formulario de selects («Cómo lo cambiás», «Cambiar uno solo», «Sacar uno solo»), un bloque gris con
«se cambia» y tres avisos repetidos de que no se guardó nada.

## What Changes

- Encabezado con una sola línea: «Sumá, sacá o reordená compras. Nada cambia hasta que guardes, y tu PC guardada no se toca.»
- Cada compra es una tarjeta «Compra N» con la lista de lo que se compra y un botón «Sacar» por componente.
- Orden con «Comprar antes» y «Comprar después»; «Sacar compra». Con una sola compra no se muestran.
- «+ Sumar un componente» abre un flujo de una decisión por vez: qué comprar, cuál (catálogo o escribir el
  modelo), cantidad (solo memoria, almacenamiento y ventiladores) y, si ya tiene almacenamiento o
  ventiladores, si reemplaza o suma uno más.
- Una compra vacía no traba: dice «Todavía está vacía» y al guardar se descarta.
- Nombre y tope de la compra, y datos del plan, quedan plegados.
- El API y el backend no cambian.

## Capabilities

### Modified Capabilities
- `planes`: el editor de compras guía el armado paso a paso y descarta las compras vacías al guardar.
