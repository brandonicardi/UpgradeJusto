# Proposal

## Why
El catálogo y la ficha deben adoptar la composición de `PantallaCatalogo` y `PantallaPieza` manteniendo consulta pública, filtros y evidencia de cada variante.

## What Changes
- Búsqueda y categorías sobre una grilla de `PartCard`; conservar inspección contextual y paginación.
- Ficha con foto verificada o ícono, atributos, fuentes y cotizaciones; llamada principal al flujo existente «Comprobar con mi PC».
- Presentar vacío, carga, error y precio/foto faltantes sin datos de muestra.
- Fuera de alcance: compatibilidad personalizada en cada tarjeta, selector de PC en ficha, sumar directo al plan y orden «más barato» no soportado. No se agrega un filtro de compatibilidad ni se inventan afirmaciones de rendimiento.

## Capabilities
### New Capabilities
Ninguna.

### Modified Capabilities
- `sistema-diseno`: composición del catálogo y ficha con evidencia conservada.

## Impact
`frontend/app/catalog/page.tsx`, `[id]/page.tsx`, `presentation.tsx`, `loading.tsx`, `components/catalog-workbench.tsx` y presentación de `catalog-retail-offers.tsx`. Se mantienen parsers y política de imágenes/enlaces.

Verificación: unit `catalog-tower-consumer.test.tsx`, `retail-presentation.test.tsx`, `image-evidence-policy.test.ts`; e2e `catalog.spec.ts`, `catalog-data38.spec.ts`; capturas 1440/390.

Depende de revisión humana de las diferencias documentadas y disponibilidad de UJ. Orquestador coordina un escritor frontend después del cambio activo y revisor independiente. No se cambian APIs ni se inicia apply.
