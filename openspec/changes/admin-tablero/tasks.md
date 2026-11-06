# Tasks

Requiere `catalogo-y-pieza-fieles` terminado y `pantallas-compartir-y-admin` archivado antes de archivar
este cambio. Las pruebas de PostgreSQL necesitan la base levantada.

## 1. Backend (agente `backend`)
- [x] 1.1 Constante de atributos que usa el motor por categoría.
      Prueba: coincide con `missing_fields` de una evaluación con piezas vacías.
- [x] 1.2 Conteo agregado de PCs por pieza en el servicio de `pcs`, sin dueños.
      Prueba: dos cuentas y dos revisiones dan el total; la salida no tiene identificadores.
- [x] 1.3 Tablero: cuatro métricas y listas paginadas. Prueba: oferta de 8 días es vieja, de 7 no;
      desconocido no es cero; revisión activa solamente.
- [x] 1.4 Migración de `manual_price_changes`. Prueba: `alembic heads` da una sola cabeza.
- [x] 1.5 Extraer la copia de `publish` sin cambiar los lotes. Prueba: las pruebas retail siguen en verde.
- [x] 1.6 Publicar un precio. Prueba: conserva foto y oferta de lista, escribe el registro, 409 si
      cambió la activa, 422 por importe, fecha, enlace ajeno o pieza sin tienda; sin registro no publica.
- [x] 1.7 Endpoints con rol y CSRF. Prueba: 403 sin rol, y el `user_id` del cuerpo se rechaza.

## 2. Frontend (agente `frontend`)
- [x] 2.1 Proxies, gateway y cliente tipado. Prueba: `route-test-admin.test.ts`.
- [x] 2.2 Tablero y pestañas «Datos faltantes» y «Precios viejos» desde `PantallaAdmin`. Prueba: sin
      números si falla el pedido; rótulos para cada atributo.
- [x] 2.3 «Cargar un precio» con resumen y confirmación. Prueba: sin confirmar no hay POST; «Cargar
      precio» de la lista completa la pieza.
- [x] 2.4 «Completar» abre la pieza en el editor. Prueba: el borrador se crea solo al confirmar.
- [ ] 2.5 Editor de revisiones debajo del tablero, sin perder función. Prueba: `curation.spec.ts`.

## 3. Verificación
- [ ] 3.1 `pytest` con PostgreSQL, `ruff`, `npm test`, `npm run typecheck`, `npm run lint` y e2e de curación.
- [ ] 3.2 Captura real al lado de la maqueta, a 1440 y 390, con las diferencias listadas.
- [ ] 3.3 Revisor: rol en el servidor, sin datos de dueños, precio sin inventar y registro atómico.
