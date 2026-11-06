# Design

## Context

Las ofertas viven en `retail_resources.offers`, por revisión. Cada pieza de tienda tiene identidad
`cg-<id>` o `venex-<id>`, así que su tienda es conocida. La colección `prices` de las revisiones
manuales no llega a la ficha ni al catálogo, que muestran ofertas. No existe auditoría de cambios.

## Goals / Non-Goals

**Goals:** tablero con datos reales, carga de un precio que se vea en la ficha, y registro de autoría.

**Non-Goals:** USD, tiendas nuevas, otorgar roles desde la web, auditar las demás operaciones de
curación, y cambiar la vigencia de 30 días.

## Decisions

- **Precio como oferta, no como fila `prices`.** Si no, la ficha no lo mostraría. El método nuevo de
  `RetailRepository` reutiliza la copia de `publish`: extraer esa parte a una función compartida, sin
  cambiar el comportamiento de los lotes. Reemplaza solo la oferta `cash`, de modo que la de lista y
  la foto quedan intactas. Pasar por `publish` con un lote de un registro no sirve: pisaría las dos
  ofertas con la fecha nueva.
- **Versión y publicación.** Revisión `retail-<sha256>`, formato que el gateway y `proxy_ip` ya aceptan.
  Fila en `retail_publications` con `source_version` `manual-<uuid>`, `partial_batch` verdadero y
  `pagination_complete` falso. Mismo control de revisión activa con bloqueo y mismo `_authorize`.
- **Fecha.** «Visto el» es un día en hora de Argentina. Se rechaza un día futuro o de hace más de 30
  días, porque nacería vencido. Si es hoy, `observed_at` es el instante actual; si no, las 12:00 de ese
  día. Así una carga de hoy nunca queda con fecha futura, que `current_offer` tomaría como no vigente.
- **Enlace.** `retail_url(value, store)`, igual que las tiendas.
- **Datos faltantes.** Lista cerrada por categoría, con los atributos que `compatibility/` lee, en una
  constante del motor sin lógica nueva. Una prueba la contrasta con lo que el motor reporta en
  `missing_fields`. Los rótulos para personas viven en `frontend/lib`.
- **PCs afectadas.** `count(distinct pc_id)` por `component_id` en `tower_lines`, en todas las revisiones
  y sin unir dueños, a través de un método del servicio de `pcs`. Los planes y enlaces no cuentan.
- **7 días.** Una sola constante, la de «el más bajo». Un dato de `prices` no cuenta como precio reciente.
- **Tiendas.** Cantidad de `store` distintos en las ofertas de la revisión activa.
- **API.** `GET /api/admin/dashboard` y `POST /api/admin/prices` con `expected_active`, CSRF y rol en el
  servidor. Las listas son paginadas, con `limit` hasta 100. Hay que sumar las rutas a los proxies, al
  gateway y al guard de `proxy_ip`.
- **Registro.** Tabla `manual_price_changes` en migración nueva, escrita en la misma transacción.
- **«Completar».** Lleva al editor actual con la pieza abierta en un borrador, que se crea solo si la
  persona lo confirma.

## Risks / Trade-offs

- [Copiar una revisión entera por cada precio] → es lo que ya hace un lote, y el catálogo es chico.
- [El tablero recorre todo el catálogo] → se calcula al pedirlo; sin caché mientras el tamaño lo permita.
- [PCs con piezas de revisiones viejas] → se cuentan todas, porque el `component_id` se mantiene.
