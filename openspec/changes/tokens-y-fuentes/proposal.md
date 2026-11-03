# Proposal

## Why

La interfaz actual es oscura, técnica y usa colores y tamaños sueltos. Ya existe un sistema
de diseño aprobado (`docs/sistema-diseno/`). Antes de rediseñar pantallas hace falta que sus
tokens y fuentes existan en el frontend, para que cada cambio posterior use la misma base.

## What Changes

- Pasar todos los tokens de `docs/sistema-diseno/tokens.json` a `frontend/app/globals.css`:
  - variables CSS en `:root` (tema claro) y para el tema oscuro, por
    `prefers-color-scheme: dark` y por `[data-theme="oscuro"]` / `[data-theme="claro"]`;
  - bloque `@theme inline` de Tailwind 4 que expone colores, familias, espacios, radios
    y sombras como utilidades (`bg-papel`, `text-tinta`, `font-display`, `rounded-pill`…);
  - estilos tipográficos como utilidades (`text-titular-xl`, `text-cuerpo`, `text-precio`…).
- Cargar Bricolage Grotesque y Figtree con `next/font/google` en `app/layout.tsx`,
  solo como variables CSS (`--font-bricolage`, `--font-figtree`).
- **Sin cambios visibles:** ninguna pantalla ni componente usa todavía los tokens; el
  `body` conserva su fuente y colores actuales. Los nombres nuevos no chocan con las
  variables viejas (`--bg`, `--text`, `--accent`…).
- Fuera de alcance: componentes, pantallas, íconos y borrar los estilos viejos.

## Capabilities

### New Capabilities
- `sistema-diseno`: base visual compartida del frontend (tokens, temas y tipografías)
  que todas las pantallas deben usar.

### Modified Capabilities
(ninguna)

## Impact

- Modificados: `frontend/app/globals.css`, `frontend/app/layout.tsx`.
- Nuevo: `frontend/tests/unit/design-tokens.test.ts`.
- Dependencias: ninguna nueva (`next/font` viene con Next). El build descarga las fuentes
  de Google una vez y las sirve desde el propio sitio.

## Cambios siguientes (no se abren todavía)

Cada uno con su propuesta, en este orden. Todos respetan `AGENTS.md`: el veredicto lo da
el motor y la UI solo lo muestra con color + ícono + palabra; todo precio con moneda, fecha
y tienda; nunca FPS ni datos inventados («No tenemos ese dato todavía»).

1. `componentes-base`: Lucide como dependencia; `Button`, `Field`, `Notice`, `Verdict`,
   `PriceTag`, `PartCard`, `ChatBubble`. `Verdict` traduce `compatible` → «Encaja»,
   `requiere_verificacion` → «Falta un dato», `incompatible` → «No encaja».
2. `componentes-pc-y-plan`: `PcSlots` (nueve piezas con su ícono), `GoalPicker`,
   `BudgetSlider`, `UpgradeCard`, `PlanSteps`.
3. `layout-y-navegacion`: shell nuevo (logo de texto, navegación, tema claro por defecto),
   y retiro de las variables y clases viejas que ya nadie use.
4. `pantalla-ingreso-y-cuenta`: Ingreso/registro y Tu cuenta.
5. `pantalla-inicio-y-armar`: Inicio («¿Qué querés que tu PC haga mejor?») y Armar una PC.
6. `pantalla-mi-pc-y-agregar`: Tu PC y Agregar PC (pegar lista → revisar → confirmar).
7. `pantalla-conviene-y-plan`: Lo que te conviene y Tu plan, paso a paso.
8. `pantalla-catalogo-y-pieza`: Catálogo y Pieza.
9. `pantalla-compartir-y-admin`: Compartir, Plan compartido y Administración.
10. `asistente-flotante`: chat como panel flotante en todas las pantallas, respuestas en
    Markdown (sin asteriscos crudos) y la pantalla completa «Preguntale al asistente».
    Va al final y se apoya en el cambio `chat-groq`.
