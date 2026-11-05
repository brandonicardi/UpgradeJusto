# Proposal

## Why

Los precios son la mitad de la decisión y hoy son una foto: los lotes de CompraGamer y Venex se
observaron el 26/10. Brandon quiere precios actualizados de tiendas argentinas como referencia.

## What Changes

- Renovar los lotes con los dos lectores que ya existen, en vez de escribir uno nuevo.
- Mostrar esos valores como «precio de referencia», con moneda, fecha y tienda.
- Dejar un comando único y acotado para repetir la lectura.
- HardGamers no se lee: ver `design.md`.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `catalogo`: renovación de precios de referencia.

## Impact

- `scripts/fetch-store-catalog.py`, `scripts/fetch-venex-offers.py`, `data/catalogo/lotes/`.
- Textos de precio en el frontend, si hace falta aclarar que son de referencia.
- Pedidos reales a sitios de terceros: **no se ejecuta sin el OK de Brandon**.
