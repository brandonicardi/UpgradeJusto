# Design

## Restricciones encontradas en el código
1. `frontend/server.mjs` escucha fijo en `127.0.0.1:3000`.
2. `backend/upgradejusto/api/proxy_ip.py` solo acepta como proxy pares **loopback**
   (`UJ_TRUSTED_PROXY_PEERS`) con firma HMAC (`UJ_PROXY_SECRET`, ≥32 caracteres).
3. `persistence/runtime.py`: `UJ_ORIGIN` debe ser https, salvo `UJ_ALLOW_INSECURE_LOOPBACK=1`
   con `UJ_ENV=dev` y origen `http://localhost:3000`.
4. El frontend llama al backend por `CATALOG_API_URL` (por defecto `http://127.0.0.1:8000`).

## Decisiones
- **Red compartida frontend↔backend:** el servicio `frontend` usa
  `network_mode: "service:backend"`. Comparten loopback, así que la regla de seguridad
  del proxy (solo loopback) se conserva sin relajarla. El puerto `3000` se publica en
  el servicio `backend` (es el dueño de la red); el `8000` no se publica.
- **Host de escucha del frontend:** `server.mjs` lee `UJ_WEB_HOST` (por defecto
  `127.0.0.1`); en compose vale `0.0.0.0` para que el puerto publicado funcione.
- **Modo de la demo:** `UJ_ENV=dev`, `UJ_ALLOW_INSECURE_LOOPBACK=1`,
  `UJ_ORIGIN=http://localhost:3000`. Es una demo local, no producción.
- **Secreto del proxy:** volumen nombrado `secretos` montado en ambos servicios. El
  entrypoint del backend crea `/secretos/proxy` con 64 caracteres aleatorios si no existe;
  el del frontend lo exporta como `UJ_PROXY_SECRET` antes de `node server.mjs`.
- **Base:** imagen `pgvector/pgvector:pg18` (tag fijo verificado en Docker Hub). Un script
  de init crea la extensión `vector` y el usuario de la app. Volumen `pgdata`.
- **Carga de datos:** nuevo módulo `upgradejusto.demo_seed` (backend) que, de forma
  idempotente: aplica `alembic upgrade head`, ejecuta `persistence.seed`, publica los
  datos técnicos y los lotes de `data/catalogo/lotes/manifest.json` reutilizando
  `RetailService.publish` con una identidad de administrador creada por
  `bootstrap` local. Si el catálogo ya está publicado, no hace nada.
- **Imágenes:** backend `python:3.12.13-slim` + `uv sync --locked --no-dev`; frontend
  `node:24.14-*` con `npm ci` y `next build` en etapa de build, solo `.next`,
  `node_modules` de producción y `server.mjs` en la final.
- **Groq opcional:** `GROQ_API_KEY` vacía no impide el arranque.
- **Contraseñas de la base (decidido por Brandon, opción B):** sin valores por defecto,
  como promete la propuesta del TP («secretos sin valores por defecto ni credenciales
  publicadas»). `docker-compose.yml` usa `${VAR:?mensaje}` para `POSTGRES_ADMIN_PASSWORD` y
  `UJ_DB_APP_PASSWORD`: si faltan en `.env`, compose se detiene con un mensaje claro.
  `.env.example` las deja vacías con un comentario que dice que se completa cualquier clave.
- **Admin de la demo:** `demo_seed` inserta la identidad y el rol directamente porque
  `administration/bootstrap.grant` solo acepta la base local de pruebas
  (`127.0.0.1:55433`) y rechazaría `db:5432`. La contraseña del admin es aleatoria y no se
  imprime: sirve solo como identidad para publicar el catálogo, no para iniciar sesión.

## Riesgos
- Los lotes de tiendas son datos públicos obtenidos de sus sitios; quedan versionados
  como datos de demostración con su fecha. Si Brandon prefiere no publicarlos, se
  reemplazan por una muestra chica sin cambiar el diseño.
- No hay Docker en la máquina de desarrollo: la verificación final la hace Brandon.
