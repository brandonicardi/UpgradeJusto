# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaConviene` y
`PantallaMiPlan`. Requiere revisión humana y `pantallas-pc-y-agregar` archivado.

## 0. Decisión previa
- [x] 0.1 Resuelto el 5/11: «lista», «bloqueada» y «requiere verificación» no son progreso de compra.
      El progreso real llega con `progreso-del-plan`; acá no se simula.

## 1. Propuestas (prueba primero)
- [x] 1.1 Principal y alternativas en el orden del servidor; primera no recomendada sin el título.
      Prueba: primera propuesta bloqueada. `tests/unit/tower-recommendations.test.tsx`.
- [x] 1.2 Cambio, beneficio, coste y estado antes del detalle; coste incompleto junto a la acción.
      Prueba: total desconocido y presupuesto excedido con fuentes accesibles.
- [x] 1.3 Mostrar 6 más conserva orden y cotizaciones sin recotizar.
      Prueba: sin pedidos nuevos para las visibles. `tests/unit/preview-metadata.test.ts`.
- [x] 1.4 Preparar plan abre el borrador, sin decir que quedó agregado.
      Prueba: rótulo y editor; ningún guardado al activar.

## 2. Plan
- [x] 2.1 Etapas y resumen de costes informados, sin «Hecha», «Comprada» ni progreso de gasto.
      Prueba: plan con etapas listas, bloqueadas y por verificar. `tests/unit/tower-plans.test.tsx`.
- [x] 2.2 Lectura histórica identificada, con cotizaciones conservadas y vuelta a la actual.
      Prueba: versión anterior, sin jerga interna.
- [x] 2.3 Conservar detalle, edición, recálculo y baja.
      Prueba: `tests/unit/tower-plan-deactivation.test.tsx`.

## 3. Verificación
- [ ] 3.1 `npm test`, `npm run typecheck`, `npm run lint`, y e2e `tower-recommendations38.spec.ts` y
      `tower-plans38.spec.ts`.
      Hecho por el orquestador: `npm test` 613/613, `npm run typecheck` y `npm run lint` en verde.
      E2e ejecutados el 5/11: 1 aprobado y 5 fallidos, por eso esta tarea queda sin marcar.
      Tres fallan por entorno: `upgradejusto_test` tiene 0 `retail_publications` (desarrollo tiene 22)
      y el servidor devuelve 0 propuestas. Dos fallan por un selector viejo, previo a este cambio:
      `tower-recommendations38.spec.ts:212` busca la casilla dentro del formulario y está en un
      `details` cerrado. Pendiente: cargar precios en la base de test y corregir el selector.
- [x] 3.2 Capturas reales de una propuesta y de `/tower-plans/[id]` a 1440 y 390.
      Nota: `.local/capturas/pantallas-conviene-y-plan/` (1-propuesta-1440, 2-propuesta-390,
      3-plan-1440, 4-plan-390) contra `localhost:3000` con 128 propuestas reales y un plan real
      guardado por la interfaz. Los totales salieron «desconocido / incompleto» porque la
      recomendación real no tenía cotización completa para esas piezas; no se inventaron precios.
- [x] 3.3 Revisor: fidelidad, que la interfaz no decida compatibilidad ni calcule precios, y alcance.
      Revisor independiente: sin bloqueantes. Importante: quedan los e2e sin ejecutar (los corre el
      planificador). Menor: al abrir «Base de PC y versiones conservadas» se ven valores internos de
      versiones; no se tocó por ser evidencia técnica y quedar fuera de los textos principales.
