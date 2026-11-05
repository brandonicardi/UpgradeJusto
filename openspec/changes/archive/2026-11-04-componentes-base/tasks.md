# Tasks

Todas las tareas las hace el agente `frontend`, salvo la revisión. Comandos desde `frontend/`.
Leer antes `docs/sistema-diseno/README.md`
y el `README.md` y `preview.html` de cada componente.

## 1. Preparación
- [x] 1.1 Instalar `lucide-react` con versión exacta y crear `components/uj/index.ts`.

## 2. Componentes con reglas del producto (prueba primero)
- [x] 2.1 `Verdict`: los tres estados y el desconocido → «Falta un dato».
      Prueba: `tests/unit/uj-verdict.test.tsx`, incluido que ningún valor raro da «Encaja».
- [x] 2.2 `PriceTag`: precio completo y cada dato faltante → «Sin precio».
      Prueba: `tests/unit/uj-price-tag.test.tsx`, incluido que nunca muestra `$ 0`.
- [x] 2.3 `PartCard`: orden fijo y sin foto → ícono de categoría.
      Prueba: `tests/unit/uj-part-card.test.tsx`.

## 3. Componentes generales (prueba primero)
- [x] 3.1 `Button`: tres pesos, chico, deshabilitado con `motivo`. Anula el `button` global.
- [x] 3.2 `Field`: etiqueta visible, ayuda, error con `aria-describedby`, multilínea.
- [x] 3.3 `Notice`: cuatro tonos y `role` correcto.
- [x] 3.4 `ChatBubble`: persona a la derecha, asistente a la izquierda, sugerencias y cuadro.
      Prueba 3.x: `tests/unit/uj-general.test.tsx`.

## 4. Vitrina
- [x] 4.1 `app/sistema-diseno/page.tsx` con todos los estados y `notFound()` en producción.
- [x] 4.2 Capturas a 1440 y 390 px en `tests/evidence/componentes-base/`. Sin scroll horizontal
      en 390 px.

## 5. Verificación
- [x] 5.1 `npm test` (única falla aceptada: `curation.test.ts`), `npm run typecheck`, `npm run lint`.
- [x] 5.2 `git grep -nE "#[0-9a-fA-F]{3,8}" -- frontend/components/uj` sin resultados.
- [x] 5.3 Ninguna pantalla cambió: el diff en `frontend/app/` y `frontend/components/` solo
      incluye `app/sistema-diseno/` y `components/uj/`, y `app/globals.css` no se tocó.
- [x] 5.4 Revisor: fidelidad contra las maquetas, reglas del producto y que el diff no toca
      pantallas existentes.

## 6. Aprobación visual (Brandon)
- [x] 6.1 Abrir `/sistema-diseno` y compararla con `docs/sistema-diseno/index.html`. Aprobado por Brandon sobre la captura; el detalle fino se revisa en las pantallas.
