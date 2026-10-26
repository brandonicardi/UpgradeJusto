# Inventario para revisión Git futura — entrega visual

Estado: entrega visual local cerrada, con revisión independiente funcional y visual.
Inventario listo para futura revisión por archivo; **no staging/commit/push**.

## Separar de trabajo preexistente

HEAD al iniciar: `c1ced9e`. El checkout ya contenía cambios y archivos sin seguimiento
de Sprint32/33 y cierre básico. Este inventario **no atribuye todo `git status` al
rediseño** ni autoriza incluirlo automáticamente en un commit. Revisar cada archivo
por nombre/contenido antes de seleccionar, y destino/visibilidad antes de publicar.

## Delta visual realizado

- Shell, layout/metadata, CSS/tokens y primitivas reutilizables de frontend.
- `/pcs` y sus formularios/evaluación/recomendaciones: nueva composición, textos
  humanos, dinero y detalle accesible; contratos de servicios intactos.
- Catálogo/detalle, cuenta, importación, planes/compartidos, asistente y administración.
- Ilustraciones propias de seis categorías, manifiesto cerrado y condiciones de uso.
- Tests/selectores accesibles y evidencia visual; no snapshots de referencia nuevos.
- README, DEMO, matriz/continuidad y bitácora visual con resultados efectivamente
  ejecutados. La documentación histórica/bitácoras previas se conserva.

## Exclusiones de Git

`.local/` con capturas, informes, hashes, cuentas, runtime/BD y logs; `.env` y claves;
`node_modules/`, `.next/`, `.venv/`, cachés, trazas y salidas de runners. No incorporar
configuración privada de agentes/MCP ni fuentes privadas. Las rutas de evidencia en
Markdown no convierten los PNG locales en archivos a publicar.

## Archivos del delta visual identificados (revisar por nombre)

Archivos candidatos del rediseño y su validación, agrupados para revisión humana:

- `frontend/app/globals.css`, `frontend/app/layout.tsx`.
- `frontend/components/ui.tsx`, `shell.tsx`, `product-visual.tsx`.
- `frontend/lib/presentation.ts`, `product-visuals.ts`, `session-role.ts`, `auth.ts`.
- `frontend/app/pcs/pcs.tsx`, `compatibility.tsx`, `evaluation-summary.tsx`,
  `recommendations.tsx`; `frontend/app/pcs/import/page.tsx`, `proposal.tsx`.
- `frontend/app/catalog/page.tsx`, `[id]/page.tsx`, `presentation.tsx`;
  `frontend/app/account/page.tsx`; `frontend/app/plans/plans.tsx` y controles asociados.
- `frontend/public/illustrations/{cpu,motherboard,ram,gpu,psu,case}.svg`:
  dibujos propios de categoría, no fotos ni representaciones de modelo exacto.
- `frontend/playwright.design.config.ts`,
  `frontend/tests/evidence/design-reference.spec.ts`, unitarios
  `visual-central`, `presentation`, `session-role`; selectores de E2E afectados y
  gate curation `@session-navigation`. Mantener aserciones de negocio originales.
- `frontend/ASSETS.md`, `DESIGN-CHECKPOINT.md`, `README.md`.
- `frontend/components/message-render.tsx`; `frontend/lib/message-presentation.ts`,
  `assistant-presentation.ts`, `evaluation-presentation.ts`, `extraction-presentation.ts`.
- `frontend/app/chat/chat.tsx`, `frontend/app/admin/page.tsx`,
  `frontend/app/plans/replacements.tsx`, `shares.tsx`;
  `frontend/lib/shared-html.ts`, `frontend/app/shared/[token]/route.ts`;
  `frontend/app/error.tsx`, `not-found.tsx`.
- `frontend/tests/evidence/visual-final.spec.ts`,
  `frontend/tests/support/visual-evidence.ts`, `basic-scope.ts` y selectores afectados.
  Unitarios `message-render`, `extraction-presentation`, `visual-rest`, `design-config`;
  tests de compartidos y LIVE adaptados a presentación, manteniendo controles de negocio.
- Documentación raíz: `AGENTS.md`, `README.md`, `docs/DEMO.md`, `CONTINUAR.md`,
  este inventario y `docs/ai-log/2026-10-26-entrega-visual.md`.

Compartidos/CSP, chat/admin/errores y evidencia final completados. `/` conserva el
redirect al catálogo. No usar esta sección como lista automática de staging ni afirmar que cada
archivo listado es nuevo: algunos ya contenían trabajo funcional sin commit.

## Matriz de cumplimiento local (funcional + presentación)

| CU | Resultado verificado en esta entrega |
|---|---|
|01|Cuenta compacta; registro/login/logout y sesiones reales; cambio de rol en misma ruta|
|02|Progreso, propuesta editable, no persistencia previa, confirmación real y cancelación|
|03|PC/editor de seis categorías, CRUD/propiedad, vacíos y móvil sin overflow|
|04|Tarjetas/ficha, precio desconocido, filtros AND/paginación y teclado/selector móvil|
|05|Compatible sin OC, incompatible y falta información; riesgos visibles y detalle completo|
|06|Comparación16→32GB, coste/restante/déficit, GPU+PSU conjunta; sin FPS inventados|
|07|Etapas acumuladas/costos/borrador, propietario y recálculo explícito; históricos preservados|
|08|Conversación natural real, renderer seguro, streaming/citas/historial/UUID409/cancelación|
|09|Lectura pública coherente, CSP/escape, distinción fallo/faltante, revocación e históricos|
|10|Rol servidor, revisiones/tabla, edición en borrador/publicación confirmada e inmutabilidad|

Pruebas por bloques, no una suite nueva única: tipos/lint/build finales0,94 unitarios
antes de los últimos deltas y22/4 focales posteriores solapados; nueve escenarios
normales únicos, curation2 + rol1, asistente real2 y evidencia visual focal. Resultados
y fallos/correcciones exactos en [bitácora](ai-log/2026-10-26-entrega-visual.md).

Revisora independiente general observó selecciones PNG1440/390 y leyó el código:
P1/P2 cerrados, aprobación final visual y funcional frontend. No se atribuye inspección
a perfiles que no tuvieron permisos ni certificación WCAG/backend integral.

## Preservación y reservas

DEV/TEST: originales PC/grupos/planes/enlaces preservados y catálogo/soporte/fuentes
idénticos;157 hashes backend/datos/dependencias iguales. No cambios de motor, API,
proveedores, locks o instalaciones. Privacidad85 candidatos sin patrones de claves,
evidencia ignorada, índice vacío, HEAD `c1ced9e`; sin runners3000/8000 al terminar.
Scan de patrones no equivale a auditoría de secretos completa.

Se usan seis SVG propios de categoría (`ASSETS.md`), no fotografías de modelos.
Precios históricos y compatibilidad básica stock, no certificación física exhaustiva;
RAM en extracción requiere cantidades numéricas explícitas, palabras no garantizadas.
Python de mantenimiento predeploy pendiente histórico, fuera de esta etapa.
No publicar sin revisar separadamente derechos de datos, destino, visibilidad y secretos.
**Detener al cierre; ningún incremento nuevo autorizado por este inventario.**
