# Tasks

Agente `frontend`, salvo la revisión. Leer `docs/sistema-diseno/README.md`, `design.md` y la
cabecera de `docs/sistema-diseno/componentes/PantallaInicio/preview.html`.

## 1. Prueba primero
- [x] 1.1 Ampliar `tests/unit/design-tokens.test.ts`: falla si `globals.css` o `v0-workbench.css`
      tienen hexadecimales o `rgba` fuera de la definición de tokens.

## 2. Tema
- [x] 2.1 Reasignar variables viejas, `color-scheme: light` y `body` según `design.md`.
- [x] 2.2 Reemplazar los colores fijos de `globals.css` y `v0-workbench.css` por tokens.
- [x] 2.3 Selectores globales en `@layer base`; quitar `!` de `components/uj`.

## 3. Navegación
- [x] 3.1 Reescribir el marcado de `shell.tsx` sin perder su lógica; actualizar sus pruebas.

## 4. Verificación
- [x] 4.1 `npm test` (única falla aceptada: `curation.test.ts`), `npm run typecheck`, `npm run lint`.
- [x] 4.2 Capturas a 1440 y 390 px en `tests/evidence/tema-claro/`: sin zonas oscuras, sin texto
      ilegible y sin scroll horizontal en 390 px.
- [x] 4.3 Revisor: contraste AA, accesibilidad del shell y que no se perdió lógica.
