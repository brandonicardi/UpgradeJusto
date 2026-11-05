# Proposal

## Why

La app sigue oscura y técnica, que es lo que los docentes marcaron. Migrar pantalla por pantalla
deja por el camino una mezcla de claras y oscuras. Este cambio pasa **toda** la app al tema claro
de una vez y cambia la navegación, para que cada pantalla que se rediseñe después solo mejore.

## What Changes

- Nuevo `Shell` según las maquetas: logo de texto y navegación Mi PC, Mi plan, Asistente, Catálogo
  y Entrar / Tu cuenta. Conserva salto al contenido, menú móvil, enlace de Administración por rol
  y la ruta de plan compartido sin navegación.
- `body` pasa a `papel`, `tinta` y Figtree; titulares en Bricolage.
- Las variables viejas (`--bg`, `--card`, `--raised`, `--text`, `--muted`, `--accent`, `--line`)
  pasan a apuntar a los tokens, y los colores fijos de `globals.css` y `v0-workbench.css` se
  reemplazan por tokens. Las pantallas viejas quedan claras, legibles y con su misma estructura.
- `color-scheme: light`. Los componentes `uj` dejan de necesitar `!`.
- Fuera de alcance: rediseñar el contenido de cada pantalla y borrar clases viejas todavía usadas.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `sistema-diseno`: la app completa usa el tema claro; se reemplaza el requisito de no cambiar
  la apariencia de las pantallas existentes.

## Impact

- Modificados: `frontend/components/shell.tsx`, `frontend/app/globals.css`,
  `frontend/app/v0-workbench.css`, `frontend/components/uj/*` (quitar `!`) y las pruebas del shell.
- Cambio visible en todas las pantallas. Sin cambios en backend ni API.
