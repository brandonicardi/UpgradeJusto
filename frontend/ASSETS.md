# Recursos visuales locales

Las seis ilustraciones SVG de `public/illustrations/` fueron dibujadas para este proyecto. Son diagramas genéricos de categoría, no fotografías, renders de modelos ni representaciones de dimensiones reales. No incorporan recursos de terceros ni atribuyen una licencia de terceros a su contenido; quedan sujetos a las condiciones del proyecto.

`components/product-visual.tsx` carga exclusivamente el manifiesto local cerrado por categoría y siempre identifica la ilustración en su texto alternativo. `image: null` en la API no se modifica. Los alias conocidos de `lib/product-visuals.ts` identifican referencias, nunca equivalencia física ni compatibilidad. Referencias adicionales usan su categoría del catálogo real, sin suponer un modelo a partir del ID. No hay URLs remotas, fuentes remotas ni imágenes generadas de productos.
