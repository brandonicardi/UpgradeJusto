# Design

## Variables + `@theme inline`
Tailwind 4 genera utilidades a partir de `@theme`. Para que el tema oscuro funcione sin
duplicar clases (`dark:`), los colores se declaran **dos veces**:

1. Valores reales como variables propias (`--papel`, `--pino`…) en `:root`, en
   `@media (prefers-color-scheme: dark) { :root:not([data-theme="claro"]) {…} }` y en
   `:root[data-theme="oscuro"]` — mismo esquema que `docs/sistema-diseno/estilos/tokens.css`.
2. `@theme inline { --color-papel: var(--papel); … }` para que la utilidad `bg-papel`
   lea la variable en tiempo de ejecución. `inline` evita que Tailwind congele el valor.

Espacios, radios y sombras van igual (`--spacing-space-5`, `--radius-pill`,
`--shadow-sombra-1`). Las familias: `--font-display: var(--font-bricolage), "Figtree",
system-ui, sans-serif` y `--font-sans-uj: var(--font-figtree), system-ui, …`.
No se redefine `--font-sans` de Tailwind para no cambiar la fuente actual del `body`.

Los estilos tipográficos usan el mecanismo nativo de Tailwind 4 en `@theme`:
`--text-titular-xl: 48px; --text-titular-xl--line-height: 52px;
--text-titular-xl--font-weight: 700; --text-titular-xl--letter-spacing: -0.02em;`.
Así `text-titular-xl` funciona con variantes (`text-titular-l md:text-titular-xl` para el
paso a móvil que pide el sistema). La familia no viaja en el tamaño: los titulares suman
`font-display` en el componente.

## Tema
Se definen los valores claros y oscuros, pero `<html>` lleva `data-theme="claro"` fijo
hasta que todas las pantallas usen el sistema nuevo; así no conviven pantallas claras y
oscuras. Activar el tema oscuro es un cambio aparte, al final.

## Fuentes
`next/font/google` en `app/layout.tsx`:
`Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" })`
y `Figtree({ …, variable: "--font-figtree" })`. Se agregan sus `.variable` al `className`
de `<html>`: solo definen variables, no aplican fuente a nada.
Riesgo: el build necesita red para descargarlas. En Docker el build ya tiene red.

## Por qué no se ve ningún cambio
Los nombres son nuevos y nada los usa todavía; `body` sigue con `var(--bg)`,
`var(--text)` y Segoe UI. El retiro de lo viejo es parte de `layout-y-navegacion`.

## Pruebas
**Sin cambios visibles:** antes de tocar nada se capturan con Playwright `/`, `/catalog` y
`/pcs` a 1440×900 en `frontend/tests/evidence/tokens-antes/`; al final se capturan de nuevo
en `tokens-despues/` y se comparan píxel a píxel (`toHaveScreenshot` o comparación de
buffers). Si el backend no está levantado, las pantallas muestran su estado de error de
forma igual antes y después, lo que alcanza para comprobar que no cambió el estilo.

**Tokens:** `tests/unit/design-tokens.test.ts` lee `tokens.json` y `globals.css` y comprueba que cada
token de color aparece con su valor claro y oscuro, y que cada token tiene su entrada en
`@theme inline`. Así, si alguien cambia `tokens.json`, la prueba avisa.
