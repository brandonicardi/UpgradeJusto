# Design

## Dónde viven
`frontend/components/uj/`, un archivo por componente y un `index.ts`. No se tocan
`components/ui.tsx` ni las clases de `globals.css`: los componentes viejos se retiran cuando
migre su última pantalla (`layout-y-navegacion`).

## Estilos
Solo utilidades de Tailwind generadas por los tokens (`bg-pino`, `text-sobre-pino`,
`text-cuerpo-fuerte`, `rounded-pill`, `shadow-sombra-1`, `p-space-5`). Ningún valor hexadecimal.
`docs/sistema-diseno/estilos/componentes.css` es la referencia de medidas y estados: se traduce
a utilidades, no se copia. Los titulares suman `font-display`.

Las pantallas viejas siguen oscuras: `:root` conserva `--bg`, `--text` y el estilo global de
`button`, `input` y `a`. Esos selectores globales pisarían a los componentes nuevos, así que
cada componente fija explícitamente fondo, color, borde y radio. Ojo con el `button` global de
`globals.css` (fondo `--accent`, `min-height: 44px`, `padding`): `uj-btn-quieto` y `uj-btn-chico`
tienen que anularlo. No se modifica ese CSS global en este cambio.

La vitrina `/sistema-diseno` envuelve todo en un contenedor con `bg-papel text-tinta` para verse
como será la app, aunque el `body` siga oscuro.

Excepciones aceptadas: las medidas de `componentes.css` que no tienen token (bordes de 1.5px,
`py-[6px]`, anchos máximos) van como valores arbitrarios de Tailwind, nunca colores. Los `!`
de Tailwind se aceptan mientras existan los selectores globales viejos; se retiran junto con
ellos en `layout-y-navegacion`.

## Contratos
```ts
type Veredicto = "compatible" | "requiere_verificacion" | "incompatible";
<Verdict estado={string | null | undefined} />            // desconocido → «Falta un dato»
<PriceTag monto moneda condicion fecha tienda enlace />   // todas opcionales; incompletas → «Sin precio»
<Button peso="principal|secundario|quieto" chico? motivo? disabled? icono? />
<Field etiqueta ayuda? error? multilinea? ...inputProps />
<Notice tono="encaja|revisar|no|info" titulo>{párrafo}</Notice>
<PartCard categoria beneficio modelo foto? precio? veredicto? href? />
<ChatBubble autor="persona|asistente">{contenido}</ChatBubble>
```
Los nombres de props van en español para coincidir con el sistema de diseño.

`PriceTag` formatea con `Intl.NumberFormat("es-AR")` y la fecha como `dd/mm/aaaa`; no calcula
precios. `ChatBubble` del asistente recibe contenido ya armado, así reutiliza
`components/markdown.tsx` sin duplicarlo. El ícono de categoría de `PartCard` sale de un mapa
Lucide (`Cpu`, `CircuitBoard`, `MemoryStick`, `Gpu`, `Zap`, `Box`, `HardDrive`, `Snowflake`, `Fan`);
si alguno no existe en la versión instalada, se elige el más cercano y se informa.

## Vitrina
`app/sistema-diseno/page.tsx` llama a `notFound()` si `NODE_ENV === "production"`. Datos de ejemplo
claramente ficticios, tomados de las maquetas. Sin llamadas a la API.

## Verificación visual
Capturas con Playwright de `/sistema-diseno` a 1440 y 390 px en `tests/evidence/componentes-base/`,
junto a cada `preview.html`, para que Brandon compare. En esta máquina Playwright usa
`channel: "msedge"`: su Chromium propio no está instalado.
