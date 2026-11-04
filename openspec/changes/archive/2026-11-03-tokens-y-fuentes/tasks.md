# Tasks

Todas las tareas las hace el agente `frontend`. Comandos desde `frontend/`.
Node: `$env:Path="C:\Users\RISUS\.local\node24;$env:Path"`.

## 0. Captura de referencia (antes de tocar código)
- [x] 0.1 Crear `tests/evidence/tokens-sin-cambios.spec.ts` y su config de Playwright que
      capture `/`, `/catalog` y `/pcs` a 1440×900 contra `npm run build` + `npm start`
      (o el modo que ya usen las configs de `tests/evidence`). Guardar en
      `tests/evidence/tokens-antes/`. Verificar: existen las 3 imágenes.

## 1. Prueba de tokens
- [x] 1.1 Crear `tests/unit/design-tokens.test.ts`: lee `../docs/sistema-diseno/tokens.json`
      y `app/globals.css`; falla si falta algún token de color (valor claro y oscuro),
      espacio, radio, sombra o estilo tipográfico (`--text-<nombre>` con line-height,
      font-weight y, si tiene, letter-spacing), o su entrada en `@theme`.
      Verificar: `npm test -- tests/unit/design-tokens.test.ts` falla (todavía no hay tokens).

## 2. Tokens
- [x] 2.1 En `app/globals.css`, después de `@import "tailwindcss";`, agregar las variables
      de color claro/oscuro, espacios, radios y sombras según `design.md`.
- [x] 2.2 Agregar el bloque `@theme inline` con colores, familias, espacios, radios y sombras.
- [x] 2.3 Agregar los estilos tipográficos con el mecanismo nativo `--text-*` de `@theme`.
      Verificar 2.x: `npm test -- tests/unit/design-tokens.test.ts` pasa.

## 3. Fuentes y tema
- [x] 3.1 En `app/layout.tsx`, cargar Bricolage Grotesque y Figtree con `next/font/google`
      (`variable`, `display: "swap"`, `subsets: ["latin"]`) y sumar sus `.variable` al
      `className` de `<html>`. No aplicar la fuente al `body`.
- [x] 3.2 Agregar `data-theme="claro"` a `<html>`.

## 4. Verificación completa
- [x] 4.1 `npm run typecheck` sin errores.
- [x] 4.2 `npm run lint` sin errores.
- [x] 4.3 `npm test` sin fallas nuevas (la falla previa de `curation.test.ts` se reporta
      aparte, no se arregla en este cambio).
- [x] 4.4 Capturar de nuevo en `tests/evidence/tokens-despues/` y comparar con
      `tokens-antes/`: las 3 pantallas idénticas.
- [x] 4.5 Revisor: el diff solo toca `globals.css`, `layout.tsx`, las pruebas y la
      evidencia; ningún componente ni pantalla.
