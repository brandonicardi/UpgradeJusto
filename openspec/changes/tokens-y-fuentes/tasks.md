# Tasks

Todas las tareas las hace el agente `frontend`. Comandos desde `frontend/`.

## 1. Prueba primero
- [ ] 1.1 Crear `tests/unit/design-tokens.test.ts`: lee `../docs/sistema-diseno/tokens.json`
      y `app/globals.css`; falla si falta algún token de color (valor claro y oscuro),
      espacio, radio, sombra o estilo tipográfico, o su entrada en `@theme inline`.
      Verificar: `npm test -- tests/unit/design-tokens.test.ts` falla (todavía no hay tokens).

## 2. Tokens
- [ ] 2.1 En `app/globals.css`, después de `@import "tailwindcss";`, agregar las variables
      de color claro/oscuro, espacios, radios y sombras según `design.md`.
- [ ] 2.2 Agregar el bloque `@theme inline` con colores, familias, espacios, radios y sombras.
- [ ] 2.3 Agregar las utilidades tipográficas `text-titular-xl` … `text-precio` con `@utility`.
      Verificar 2.x: `npm test -- tests/unit/design-tokens.test.ts` pasa.

## 3. Fuentes
- [ ] 3.1 En `app/layout.tsx`, cargar Bricolage Grotesque y Figtree con `next/font/google`
      (`variable`, `display: "swap"`, `subsets: ["latin"]`) y sumar sus `.variable` al
      `className` de `<html>`. No aplicar la fuente al `body`.

## 4. Verificación completa
- [ ] 4.1 `npm run typecheck` sin errores.
- [ ] 4.2 `npm run lint` sin errores.
- [ ] 4.3 `npm test` sin fallas nuevas (la falla previa de `curation.test.ts` se reporta
      aparte, no se arregla en este cambio).
- [ ] 4.4 Revisor: el diff solo toca `globals.css`, `layout.tsx` y la prueba nueva; ningún
      componente ni pantalla.
