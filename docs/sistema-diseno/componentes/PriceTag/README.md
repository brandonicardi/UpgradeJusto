# PriceTag

Precio de un componente con su moneda, la fecha en que lo vimos y la tienda de donde salió.

**Qué aporta quien lo usa:** monto, moneda, condición (contado o lista), fecha y fuente con enlace.

- Monto en `precio` con cifras tabulares; moneda delante en `tinta-suave`.
- La línea de procedencia en `chico` es obligatoria. Sin fecha y fuente no se muestra el monto.
- Si no hay precio, decilo: «Sin precio». Nunca `$ 0` ni un estimado inventado.
