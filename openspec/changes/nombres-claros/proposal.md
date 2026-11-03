# Proposal

## Why

Archivos de pruebas, scripts, migraciones y configuraciones llevan nombres de etapas internas
viejas (`tower38`, `integral38`, `retail38`, `assistant92`, `preview38`…). No dicen nada a
quien lee el repo y los docentes marcaron el exceso de ruido.

## What Changes

- Renombrar archivos con nombres por lo que hacen, por ejemplo:
  `backend/tests/test_tower38_share_pg.py` → `test_torre_compartir_pg.py`,
  `scripts/local-preview38.ps1` → `scripts/vista-previa-local.ps1`,
  `frontend/playwright.catalog38.config.ts` → `playwright.catalogo.config.ts`,
  `backend/data/technical38/` → `backend/data/tecnicos/`.
- Actualizar todas las referencias (imports, rutas en scripts y `package.json`).
- Archivos de migración Alembic: renombrar solo el nombre de archivo; **no** cambiar
  `revision`/`down_revision`.
- Rutas a `.local/integral38/` en scripts → `.local/tiendas/` (carpeta local ignorada).
- Fuera de alcance: identificadores guardados en la base o dentro de los datos
  (versiones de esquema, nombres de tablas). Cambiarlos exigiría migrar datos.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
(ninguna — es un renombrado sin cambio de comportamiento; `skip_specs: true`)

## Impact

~65 archivos de pruebas, scripts y configuración. Ningún cambio en `backend/upgradejusto/`
ni en `frontend/app|components|lib`. Verificación: misma cantidad de pruebas antes y después.
