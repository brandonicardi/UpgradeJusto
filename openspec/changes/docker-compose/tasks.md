# Tasks

## 1. Frontend (agente `frontend`)
- [x] 1.1 `frontend/server.mjs`: leer el host de `UJ_WEB_HOST` con valor por defecto
      `127.0.0.1`, validando que sea `127.0.0.1` o `0.0.0.0`.
      Verificar: `npm run typecheck` y `npm test` en `frontend/`.

## 2. Backend (agente `backend`)
- [x] 2.1 Crear `backend/upgradejusto/demo_seed.py` (ejecutable con
      `python -m upgradejusto.demo_seed`): migraciones, `persistence.seed`, datos técnicos
      y lotes de `data/catalogo/lotes/manifest.json` vía `RetailService.publish`;
      idempotente (si ya está publicado, sale con código 0 sin cambios).
      Ruta de datos configurable con `UJ_DEMO_DATA_DIR` (por defecto `../data/catalogo`).
- [x] 2.2 Prueba unitaria `backend/tests/test_demo_seed.py` que valide la lectura del
      manifiesto y el rechazo de rutas fuera de la carpeta de datos (sin base).
      Verificar: `$env:UJ_TEST_POSTGRES="0"; .\.venv\Scripts\python.exe -m pytest -q tests/test_demo_seed.py`
      y `.\.venv\Scripts\ruff.exe check .`

## 3. Infraestructura (agente `infra`)
- [x] 3.1 `backend/Dockerfile` y `backend/.dockerignore` (multi-stage, uv, Python 3.12.13).
- [x] 3.2 `frontend/Dockerfile` y `frontend/.dockerignore` (Node 24, `npm ci`, `next build`).
- [x] 3.3 `scripts/docker/backend-entrypoint.sh` (secreto del proxy + `demo_seed` + uvicorn
      en `127.0.0.1:8000`) y `scripts/docker/frontend-entrypoint.sh` (lee el secreto).
- [x] 3.4 `scripts/docker/db-init.sql` (extensión `vector`, usuario de la app).
- [x] 3.5 `docker-compose.yml` según `design.md` (servicios, healthchecks, `depends_on`,
      `network_mode`, volúmenes `pgdata` y `secretos`, solo puerto 3000 publicado).
- [x] 3.6 `.env.example` con todas las variables, valores vacíos para claves y
      comentarios de una línea.
      Verificar 3.1–3.6: `docker compose config` si Docker está instalado; si no,
      reportar "no verificado" y revisar que no haya secretos (`git diff`).

## 4. Revisión (agente `revisor`)
- [x] 4.1 Revisar el diff contra esta spec y `AGENTS.md` (secretos, puertos, loopback).

## 5. Correcciones de la revisión
- [x] 5.1 (`infra`) `scripts/docker/db-init.sql`: los nombres de rol y base van como
      identificadores (`:"uj_app_user"`, `:"uj_db_name"`), no como literales (`:'…'`),
      en `CREATE ROLE` y en los `GRANT`; la contraseña sigue como literal (`:'uj_app_password'`).
      Verificar: si hay motor de Docker, `docker compose up -d db` y
      `docker compose logs db` sin `syntax error`; si no, revisión del archivo.

- [x] 5.2 (`infra`) Contraseñas obligatorias según `design.md`: en `docker-compose.yml`
      reemplazar los valores por defecto de `POSTGRES_ADMIN_PASSWORD` y `UJ_DB_APP_PASSWORD`
      (las 3 apariciones) por `${…:?Defini … en .env (cualquier clave)}`; comentar en
      `.env.example` que hay que completarlas. Verificar: con ambas definidas
      `docker compose config --quiet` sale 0; con una vacía falla mostrando el mensaje;
      ninguna clave por defecto en el repo.

## 6. Verificación en ejecución
Se verifica en GitHub Actions (`.github/workflows/docker.yml`): la PC de desarrollo no puede
correr Docker porque su Windows no abre discos virtuales.
- [ ] 6.1 `docker compose up --build`; abrir `http://localhost:3000`, ver el catálogo con
      productos y crear una cuenta.
- [ ] 6.2 Contar productos publicados, `docker compose restart backend`, volver a contar:
      la cantidad no cambia (idempotencia).
