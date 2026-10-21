# CU01 — contrato acotado y bloqueo Sprint31b B

Estado: bloqueado. PostgreSQL utilizable no identificado por Build. Solo se autoriza
preparación de código/config de persistencia; no autenticación operativa ni UI login.
No sustituir PostgreSQL por SQLite/memoria. Paquetes instalados no prueban conexión.

## Preparación autorizada

SQLAlchemy con URL exclusivamente `postgresql+psycopg`, engine lazy sin conexión
al importar; Alembic en backend/alembic, migración inicial del catálogo y seed
idempotente sin borrar datos existentes. Reutilizar el contrato CU04 y su dataset
versionado. No cambiar archivos raíz escritos por Build ni leer credenciales.
No cambiar aún el repositorio readonly de A por una conexión sin verificar.

## Contrato de identidad para implementar al desbloquear

- `POST /api/auth/register`: email/password; 201 usuario público `{id,email}`;
  422 entrada inválida, 409 email ocupado. No devolver hashes ni secretos.
- `POST /api/auth/login`: email/password; 200 usuario público, cookie de sesión;
  401 genérico para credenciales inválidas. Sin user_id cliente como autorización.
- `GET /api/auth/session`: 200 usuario público con sesión válida; 401 sin ella.
- `POST /api/auth/logout`: 204, revocar sesión en servidor y expirar cookie.
- Sesiones opacas revocables almacenadas con expiración; guardar digest del token,
  no token claro. Password hashing robusto con dependencia/política por acordar
  antes de instalar. No inventar implementación segura por tener estos endpoints.
- Cookie HttpOnly, SameSite y path restringidos según flujo; Secure para HTTPS;
  excepción local HTTP explícita únicamente en desarrollo. Validación de Origin
  y protección CSRF para mutaciones; política exacta/token y tiempos pendientes
  de fijar antes de implementar y probar. No CORS abierto ni secretos en frontend.

## Gate de aceptación pendiente

PostgreSQL local autorizado utilizable; migración/seed real dos veces sin pérdidas;
persistencia tras reinicio; registro/login/logout y revocación; cookies/CSRF/origen;
pruebas HTTP negativas y aislamiento. Fallos de auth/aislamiento bloquean B/C/D.
Revisión crítica justificada cuando exista implementación de esos controles.
Preparación del catálogo no satisface CU01. C CU03 y D CU05 no se implementan ahora;
R01 sigue pendiente de D, sin ampliar motor28.
