# Design

Cambio de presentación en `/catalog` y `/catalog/[id]`. Parsers, política de imágenes, enlaces y API
se mantienen.

## Decisiones
- **Filtros y orden:** solo lo que hoy soporta la consulta. Paginar conserva nombre, categoría y orden
  en la URL y el total sale del servidor. No hay «Encaja en mi PC» ni orden por precio.
- **`PartCard` en la grilla:** muestra la evidencia real de cada pieza. No se le pasa la prop `veredicto`
  (ni siquiera `null`, que dibujaría uno), porque una tarjeta pública no evalúa contra ninguna PC.
- **Panel de inspección:** nombre, imagen y ofertas salen de la misma variante seleccionada. Al cambiar
  de tarjeta se descarta lo cargado de la anterior, incluidas respuestas que lleguen tarde.
- **Imágenes:** foto verificada de esa variante o ícono de categoría. Nunca una foto parecida.
- **Atributos:** se muestran los documentados y los faltantes en su sección. No se deducen prestaciones
  del nombre comercial.
- **«Comprobar con mi PC»:** enlace a `/pcs`. No guarda, no crea plan y no anticipa un veredicto.
- **Ofertas:** moneda, condición, fecha y fuente siempre visibles. «Precio más bajo» de la maqueta no se
  copia para una oferta vencida; la etiqueta aparece solo si la API lo respalda.

## Composición
`catalog-retail-offers.tsx` conserva una sección por oferta y su reloj de vigencia; solo cambia la
composición, para que a 390 fecha y fuente sigan visibles sin desplazamiento lateral de la página.

## Estados
Vacío, carga, error y precio o foto faltantes muestran su estado con opciones de recuperación, nunca
tarjetas de muestra.
