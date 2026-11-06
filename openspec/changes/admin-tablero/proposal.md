# Proposal

## Why

Brandon pidió pantallas iguales a las maquetas y que lo que falta se construya. `PantallaAdmin` muestra
un tablero con qué hay que atender y un formulario para cargar precios. `/admin` hoy solo tiene el
editor de revisiones: no hay métricas, ni conteo de PCs afectadas, ni carga directa de un precio.

## What Changes

- Tablero de `/admin`: piezas en el catálogo, con datos faltantes, sin precio de los últimos 7 días y
  tiendas usadas como fuente. Todo calculado en el servidor con datos reales.
- Lista «Datos faltantes» con lo que le falta a cada pieza y a cuántas PCs afecta, y lista «Precios
  viejos» con su último precio, tienda y fecha.
- «Cargar un precio»: publica un precio de contado de una pieza, con tienda, fecha y enlace, previa
  confirmación. Queda registrado quién lo hizo y cuándo.
- El editor de revisiones actual se conserva debajo del tablero.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `administracion`: suma tablero, carga de precio y registro de cambios.
- `sistema-diseno`: `/admin` deja de excluir tablero y «Publicar precio».

## Impact

- `backend/`: servicio de tablero, publicación de un precio en `retail`, conteo agregado en `pcs`,
  una tabla nueva con migración y dos endpoints.
- `frontend/`: tablero, formulario, proxies y sus pruebas.
- Depende de `catalogo-y-pieza-fieles` (regla de 7 días) y de archivar antes
  `pantallas-compartir-y-admin`, cuya spec este cambio modifica.
- Diferencias con la maqueta, a propósito: solo ARS, porque la spec lo exige; la tienda sale de la pieza
  y la cantidad de tiendas es la real, no los valores de ejemplo.
