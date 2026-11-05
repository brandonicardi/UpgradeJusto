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

## Impact

- `frontend/` y sus pruebas. Sin cambios de backend: `/simulate` y los planes ya existen.
- Los datos de ejemplo de la maqueta se reemplazan por datos reales; no se inventan frases de uso,
  medidas ni precios. Lo técnico de hoy no se pierde: queda accesible en un desplegable.
