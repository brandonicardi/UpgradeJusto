# Design

## Reasignar antes que reescribir
`:root` cambia así, y todo lo que ya usa esas variables se aclara solo:
`--bg → var(--papel)`, `--card → var(--papel-alto)`, `--raised → var(--papel-hundido)`,
`--text → var(--tinta)`, `--muted → var(--tinta-suave)`, `--accent → var(--pino)`,
`--line → var(--linea)`.

Luego, cada color fijo de `globals.css` y `v0-workbench.css` se reemplaza por el token de su
intención: estados de éxito → `encaja`, aviso → `revisar`, error → `no-encaja`, enlaces → `pino`.
Los degradados y sombras azules se quitan. Texto sobre `--accent`: `sobre-pino`.

## Estilos globales
El `button` global pasa a verse como secundario claro. Los selectores globales se mueven a
`@layer base` para que las utilidades de Tailwind les ganen, y así se quitan los `!` de `uj`.
`input`, `select`, `textarea`: fondo `papel-alto`, borde `linea-fuerte`. Las reglas con
`font-family: "Segoe UI"` se borran.

## Shell
Se reescribe el marcado de `shell.tsx` con los `Link` de la maqueta `PantallaInicio`, y se conserva
**toda** la lógica: `createRoleProbe`, `sessionChangedEvent`, manejo de Escape, `aria-current`,
`aria-expanded`, `skip-link` y la excepción de `/shared-tower-plans/`. Rutas: Mi PC `/pcs`, Mi plan
`/tower-plans`, Asistente `/chat`, Catálogo `/catalog`, cuenta `/account`.

## Verificación visual
Capturas a 1440 y 390 px de `/`, `/pcs`, `/catalog`, `/tower-plans`, `/chat`, `/account`, `/admin` y
`/build` en `tests/evidence/tema-claro/` con Playwright `channel: "msedge"`. Con la app local
(`scripts/dev.ps1`) hay datos reales; si no se puede levantar el backend, se informa.
