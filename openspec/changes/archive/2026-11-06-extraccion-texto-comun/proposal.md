# Proposal

## Why

La extracción (CU02) fallaba con texto común. Medido en vivo el 5/11: cualquier categoría que el
modelo marcaba como desconocida con datos, o con una ausencia no literal, devolvía 502 a la persona.
Con eso corregido, la propuesta salía vacía: «Procesador Ryzen 5 5600X, placa de video RTX 3060» no
producía ninguna línea, porque la gramática de rótulos solo aceptaba `;`, saltos de línea y
«categoría:». Además, el modelo devolvía JSON con forma inválida en parte de las corridas.

## What Changes

- Una categoría `unknown` puede conservar observaciones para revisar; no entran como pieza confirmada.
- Una ausencia sin frase negativa literal se degrada a `unknown`, en vez de fallar toda la propuesta.
- La gramática de rótulos acepta comas, « y » y prefijos naturales de categoría.
- El proveedor pide la salida en modo JSON, para reducir las respuestas mal formadas.
- En categorías de una sola unidad, un modelo literal sin cantidad vale 1.

## Impact

- `backend/upgradejusto/extraction/` y sus pruebas. El chat no cambia.
- Sin cambios en la confirmación: la propuesta sigue siendo editable y nada se guarda sin confirmar.
- Las reglas de citas literales, identidad exacta de catálogo y cantidad explícita no se aflojan.
