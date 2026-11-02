# CU10 — contrato Sprint33 (autorizado24/10)

> Vigencia documental 27/10/2026: esta spec reúne requisitos y contratos por versión. Una frase fechada como «antes de implementar», «pendiente» o un resultado Sprint32/38 describe ese incremento; no acredita ni niega el estado de la entrega actual. Estado y aceptación únicos: [CONTINUAR](../CONTINUAR.md) y [matriz](../ENTREGA38_VISUAL.md). Desarrollo detenido; esta consolidación no autoriza ejecutar órdenes históricas.

## Publicación técnica38 — contrato aceptado antes de código

CU10 existente permite `tower_stock_v1` cerrado con tipos, identidad exacta y fuentes
registradas conforme [Technical38](CU05-compatibilidad.md#origen-backend-integral38-technical-contract-md).
Legacy2000 caracteres permanece salvo esa clave acotada24000 bytes; body37 según
ruta sin aumentar. Referencia ausente/ambigua/conflictiva/extra es422 y rollback;
rol fresco, revisión esperada y snapshots inmutables se conservan. Ningún downloader,
SQL/código/reglas ejecutables ni resultados preaprobados en el envelope.
Para misma identidad/nombre tras strip/categoría, agregar solo fuentes técnicas
preservando todas las parejas anteriores y origen vendor mantiene recursos retail
sin refrescar fecha. Quitar/cambiar fuentes o renombrar pieza conserva el guard
conservador; no reconciliar MPN por parecido/GTIN ni reasignar recursos. Pruebas deben
contrastar superset legítimo y rechazo/retirada ante cambio real, no desactivar
inmutabilidad ni modificar publicaciones viejas. Es contrato previo, no gate aprobado.

## Delta autorizado38 — antes de implementar

Administración versiona importaciones amplias, ofertas/media/métricas con rol fresco
servidor, validación, cuarentena de conflicto y publicación atómica; no código/reglas
ejecutables/SQL arbitrario ni modificar snapshots publicados. Fuente/revisión/hash/
fecha/licencia por importación, variante exacta antes de unir datos/foto/oferta.
Actualización explícita/acotada/cache, no descarga masiva por render. Respeta robots
Venex y no elude bloqueo/CAPTCHA; código kit sin licencia solo referencia no copiada.
Contrato [§3/7](CU03-pcs.md#origen-backend-integral38-contract-md). Aceptación: idempotencia/cuarentena/
atomicidad/rol/precios vencidos/fuentes/licencias y conteos reales por categoría.
No acredita importación amplia ni permisos probados por esta nota; histórico33 intacto.

## Autoridad y alcance

Rol `admin` en PostgreSQL resuelto por servidor en cada operación; nunca rol/user_id
del cliente/modelo. Build creará una cuenta NUEVA de prueba del proyecto
`@example.test`, con credencial exclusivamente local en archivo ignorado, y la
designará explícitamente al bootstrap local mediante
`--email <cuenta-nueva@example.test> --confirm-project-test-account`.
No requiere pedir cuenta al usuario; no usar cuentas personales ni seleccionar
preexistentes por heurística. Sin elevación por autorregistro/endpoint público.

Catálogo/precios ARS/fuentes/referencias y parámetros **ya soportados**: filas de
soporte CPU exacto con minBIOS/earlierBIOS/evidencias de `curation.py`. No inventar
tolerancias, familias completas, código, SQL ni DSL. Motor puro y costes desconocidos/
conservadores intactos.

## Revisiones

Borrador privado admin basado en activa. Publicar crea revisión inmutable y cambia
puntero activo en una transacción PG; fallo conserva anterior. Publicado no admite
editar/eliminar: corrección requiere otra revisión. Plan/share/evaluación preservan
snapshots y versiones anteriores, sin actualizaciones retroactivas.

Repositorio actual fija `DATASET_VERSION`: revisión activa se fija al **construir
repositorio por request**, compartida durante todo el recorrido. No mutar constante
global ni mezclar revisiones. Publicación bloqueada si no se demuestra consistencia.

## API corta — anterior al frontend

Prefijo existente + `/admin`. Todas las rutas401 sin sesión/403 no admin. JSON
cerrado. Listados `{items,total,limit,offset}` con `limit`1–100/default25 y `offset`>=0.

- `GET /admin/revisions`: versiones/estados `draft|published`, base y activa.
- `POST /admin/revisions` `{base_version: string}` →201 `{id,base_version,status}`;
  409 si base no es activa.
- `GET /admin/revisions/{id}/{collection}`: filas paginadas.
- `POST /admin/revisions/{id}/{collection}` `{data: <DTO cerrado>}` →201 fila.
- `PATCH /admin/revisions/{id}/{collection}/{row_id}`
  `{data: <DTO parcial cerrado>}` →200 fila completa validada.
- `DELETE /admin/revisions/{id}/{collection}/{row_id}` →204, solo borrador.
- `POST /admin/revisions/{id}/publish` `{expected_active_version: string}` →200
  `{dataset_version: string,status: "published"}`.409 si cambió base/puntero o ya
  publicado;422 datos/referencias inválidos, sin cambios parciales.

`collection` enum **components|prices|sources|cpu_support**, nunca tabla/columna libre.
Backend entrega mapa de campos de DTO existentes y asociación con minBIOS/earlierBIOS/
evidencias reales antes del frontend; no inventar atributos para llenar contrato.
IDs/versiones servidor; tipos/enums/uniquidad/referencias internas validados antes
de publicar. Categorías CPU/motherboard/RAM/GPU/fuente/gabinete. Precio ARS con importe
válido no negativo, fecha y fuente obligatorias; desconocido no es cero. Procedencia
explícita sin evidencia fabricada ni navegación de URLs arbitrarias por servidor.
Campos extra/inválidos422, inexistente404, edición/eliminación publicado409.

## Aceptación — FUNCIONAL LOCAL APROBADO25/10

Mismo revisor aprobó delta UI tras resolver hallazgos backend. Gate real Build:
usuario normal403; borrador precio/fuente PATCH200 y publicación200; revisión previa
inmutable y edición de publicado409. UI acredita edición/publicación precio/fuente;
CRUD de cuatro colecciones está probado en backend, NO afirmar recorrido manual UI
de las cuatro. PG TEST posterior exit0: activa publicada,14 componentes coherentes
con repositorio y precios/fuentes actuales iguales a seed por comparación ID/data;
históricos no mutados. Sin reglas arbitrarias; un worker local, sin despliegue.
Los criterios siguientes conservan el alcance; detalles/checks finales en SPRINT33.

PG real: no admin rechazado en cada ruta; rol inyectado no concede permisos;
bootstrap sin email explícito/confirmación de cuenta de prueba rechazado. CRUD borrador, validación CPU/fuentes/
precios y publicación atómica/conflicto; fallo conserva activa. Catálogo público
usa nueva revisión consistentemente y snapshot previo plan/share/evaluación permanece
idéntico. UI accesible, sin editor arbitrario ni mocks finales. Revisión independiente
crítica auth/aislamiento y delta integrado antes de cerrar; sin fullsuites32 rutinarias.
