# Design

Cambio de presentación de propuestas y planes. El motor, las recomendaciones y la planificación no
cambian; la interfaz muestra lo que devuelve la API.

## Decisiones
- **Principal es la primera, no la mejor:** la tarjeta destacada es la primera del servidor, en su
  orden. El título «lo que más te conviene» se usa solo si esa propuesta está recomendada; si está
  descartada, bloqueada o por verificar, destaca ese estado y sus faltantes.
- **`UpgradeCard` con otra acción:** su `onSumar` dice «Sumar a mi plan», y aquí la acción abre un
  borrador. El rótulo pasa a ser «Preparar plan», con una prop de texto si hace falta; el cambio va
  con su prueba. La acción abre el editor y el guardado sigue aparte.
- **«Ver otras opciones»:** el revisor de `componentes-pc-y-plan` marcó ese botón como faltante. Si
  aquel cambio lo agrega, acá se conecta a Mostrar 6 más.
- **`diferencia`:** sale de la API. Si el total es desconocido o el presupuesto no alcanza, ese estado
  queda junto a la acción, sin calcular saldo.
- **Mostrar 6 más:** revela las siguientes en orden y no vuelve a cotizar las visibles.
- **`PlanSteps` y los estados del servidor:** su `estado` obligatorio (`hecha`, `actual`, `pendiente`)
  es avance de compra, y `lista`, `bloqueada` o `requiere verificación` no lo son. Se usa como lectura
  de orden: nunca se pasa `hecha` y `veredicto` lleva el estado real. Como `actual` y `pendiente` también
  sugieren progreso, lo esperable es sumar una variante neutra con su prueba.
- **Lectura histórica:** rótulo de versión anterior en palabras comunes, cotizaciones conservadas y
  acceso a la versión actual. Nada de «revisión N».

## Aceptación requerida
Brandon debe aceptar que el plan no muestra progreso de compra, a diferencia de `PantallaMiPlan`.

## Orden
Después de `pantallas-pc-y-agregar`, porque los dos tocan `/pcs`.
