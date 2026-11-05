# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaConviene` y
`PantallaMiPlan`. Requiere revisión humana y `pantallas-pc-y-agregar` archivado.

## 0. Decisión previa
- [x] 0.1 Resuelto el 5/11: «lista», «bloqueada» y «requiere verificación» no son progreso de compra.
      El progreso real llega con `progreso-del-plan`; acá no se simula.

## 1. Propuestas (prueba primero)
- [ ] 1.1 Principal y alternativas en el orden del servidor; primera no recomendada sin el título.
      Prueba: primera propuesta bloqueada. `tests/unit/tower-recommendations.test.tsx`.
- [ ] 1.2 Cambio, beneficio, coste y estado antes del detalle; coste incompleto junto a la acción.
      Prueba: total desconocido y presupuesto excedido con fuentes accesibles.
- [ ] 1.3 Mostrar 6 más conserva orden y cotizaciones sin recotizar.
      Prueba: sin pedidos nuevos para las visibles. `tests/unit/preview-metadata.test.ts`.
- [ ] 1.4 Preparar plan abre el borrador, sin decir que quedó agregado.
      Prueba: rótulo y editor; ningún guardado al activar.

## 2. Plan
- [ ] 2.1 Etapas y resumen de costes informados, sin «Hecha», «Comprada» ni progreso de gasto.
      Prueba: plan con etapas listas, bloqueadas y por verificar. `tests/unit/tower-plans.test.tsx`.
- [ ] 2.2 Lectura histórica identificada, con cotizaciones conservadas y vuelta a la actual.
      Prueba: versión anterior, sin jerga interna.
- [ ] 2.3 Conservar detalle, edición, recálculo y baja.
      Prueba: `tests/unit/tower-plan-deactivation.test.tsx`.

## 3. Verificación
- [ ] 3.1 `npm test`, `npm run typecheck`, `npm run lint`, y e2e `tower-recommendations38.spec.ts` y
      `tower-plans38.spec.ts`.
- [ ] 3.2 Capturas reales de una propuesta y de `/tower-plans/[id]` a 1440 y 390.
- [ ] 3.3 Revisor: fidelidad, que la interfaz no decida compatibilidad ni calcule precios, y alcance.
