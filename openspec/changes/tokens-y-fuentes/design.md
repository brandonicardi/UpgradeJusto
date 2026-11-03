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

Los estilos tipográficos se declaran como utilidades con `@utility text-titular-xl {…}`
(tamaño, interlineado, peso, tracking y familia). En móvil, `titular-xl` baja a los
valores de `titular-l` con una media query, como pide el README del sistema.

## Fuentes
`next/font/google` en `app/layout.tsx`:
`Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" })`
y `Figtree({ …, variable: "--font-figtree" })`. Se agregan sus `.variable` al `className`
de `<html>`: solo definen variables, no aplican fuente a nada.
Riesgo: el build necesita red para descargarlas. En Docker el build ya tiene red.

## Por qué no se ve ningún cambio
Los nombres son nuevos y nada los usa todavía; `body` sigue con `var(--bg)`,
`var(--text)` y Segoe UI. El retiro de lo viejo es parte de `layout-y-navegacion`.

## Prueba
`tests/unit/design-tokens.test.ts` lee `tokens.json` y `globals.css` y comprueba que cada
token de color aparece con su valor claro y oscuro, y que cada token tiene su entrada en
`@theme inline`. Así, si alguien cambia `tokens.json`, la prueba avisa.
