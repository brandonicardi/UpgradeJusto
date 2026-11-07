# PartCard

Tarjeta de un componente que dice primero para qué sirve y después cómo se llama técnicamente.

**Qué aporta quien lo usa:** categoría, una frase de beneficio, el modelo técnico, la foto (o el ícono de su categoría si no hay foto real), el precio y el veredicto para la PC actual.

- Orden fijo: categoría en `etiqueta` → beneficio en `cuerpo-fuerte` → modelo en `chico`.
- La foto va sobre `papel-hundido` en `radius-sm`. Si no hay foto real, el ícono de categoría; nunca una foto genérica que parezca el componente.
- Toda la tarjeta es tocable y lleva `sombra-1`.
- En móvil, precio y veredicto bajan debajo del nombre.
