# Proposal

## Why

Brandon pidió que las pantallas sean iguales a las maquetas de `docs/sistema-diseno/`. El cambio
`pantallas-catalogo-y-pieza` las adaptó sobre las pantallas viejas: el catálogo es una lista con panel
lateral y la ficha no tiene «¿Encaja en tu PC?», precios en tabla ni acciones. Las propuestas anteriores
omitieron lo que la maqueta mostraba sin contrato real; esa decisión no fue de Brandon y se revierte.

## What Changes

- `/catalog` se rearma desde `PantallaCatalogo`: buscador, píldoras, barra con «¿Encaja en…?» y ordenar,
  y grilla de tres columnas con foto, precio y estado.
- `/catalog/[id]` se rearma desde `PantallaPieza`: encabezado, «Lo que conviene saber», tabla de precios
  y tarjeta «¿Encaja en tu PC?» con acciones reales.
- El estado sale de `/simulate`, del motor determinístico. Esto reemplaza la grilla sin veredicto.
- **Planificado, NO implementar todavía (decisión de Brandon, 6/11):** un modo estricto «Encaja en mi
  PC + solo mejoras». Con una PC elegida, el catálogo debe mostrar únicamente piezas que encajen al
  reemplazar su categoría y que sean una mejora con evidencia publicada para el objetivo relevante.
  La misma pieza o una alternativa equivalente no es mejora; sin evidencia no se etiqueta ni se cuela
  en el filtro. Se revisa con Brandon antes de programar.

## Impact

- `frontend/` y sus pruebas. `/simulate` y los planes ya existen. El backend suma solo la marca de la
  oferta más baja y el orden por precio, que la maqueta muestra y la API no tenía.
- Los datos de ejemplo de la maqueta se reemplazan por datos reales; no se inventan frases de uso,
  medidas ni precios. Lo técnico de hoy no se pierde: queda accesible en un desplegable.
