# Tasks

Ejecutar después de `docker-compose` (comparten `scripts/` y `backend/data/`).

## 0. Línea de base
- [ ] 0.1 Anotar la cantidad de pruebas: backend
      (`$env:UJ_TEST_POSTGRES="0"; .\.venv\Scripts\python.exe -m pytest -q --collect-only -q | Select -Last 1`)
      y frontend (`npm test`).

## 1. Backend (agente `backend`)
- [ ] 1.1 Renombrar `backend/tests/*38*` y `*92*` con `git mv` a nombres descriptivos en
      español; actualizar imports entre pruebas.
- [ ] 1.2 Renombrar `backend/data/technical38/` → `backend/data/tecnicos/` y sus referencias.
- [ ] 1.3 Renombrar archivos de `backend/alembic/versions/` que contengan `38`, sin tocar
      `revision`/`down_revision`. Verificar: `alembic heads` muestra una sola cabeza.

## 2. Frontend (agente `frontend`)
- [ ] 2.1 Renombrar `playwright.*38*.config.ts`, `tests/e2e/*38*`, `tests/evidence/*38*`,
      `tests/unit/*38*` y actualizar referencias y scripts de `package.json`.

## 3. Scripts (agente `infra`)
- [ ] 3.1 Renombrar `scripts/*38*` y `*92*`; reemplazar `.local/integral38` por
      `.local/tiendas` en los scripts.

## 4. Verificación
- [ ] 4.1 Misma cantidad de pruebas que en 0.1; `ruff check .`, `npm run typecheck`, `npm run lint`.
- [ ] 4.2 `git grep -n -E "38|92" -- backend/tests frontend/tests scripts` sin nombres de etapa.
- [ ] 4.3 Revisor: confirmar que no cambió comportamiento (solo nombres y rutas).
