# Entrega visual — cierre local revisado26/10

Dictamen final independiente: aprobado el delta funcional frontend y su cierre visual, todos los P1/P2 cerrados. Último helper de advertencias:4 unitarios/exit0 y relectura independiente; tipos/lint/build finales0 por Build. Recorridos/capturas anteriores aprobados no se repitieron por ese ajuste. Documentación y resultados en [bitácora](../docs/ai-log/2026-10-26-entrega-visual.md). No hay trabajo de producto pendiente autorizado por esta entrega.

El frontend escritor no ejecutó comandos: los resultados pertenecen a Build, la inspección independiente a la revisora general. Backend/datos/dependencias preservados por hashes; sin commits/push/deploy.

## Registro de implementación superado — no pendientes vigentes

## Estado y propiedad
Frontend exclusivo de esta sesión; escritura pausada para runner/revisión independiente de Build. Sin backend, dependencias, entorno, permisos ni proveedores modificados. Sin commits/push/deploy.

Gate central aprobado por coordinación sobre las cuatro PNG reales `reference/2026-10-26T02-11-36-331Z-055bde79`. Referencias y evidencia anterior preservadas. 2A informado por Build: tipos/lint/unit/build aprobados, auth/PCs/planes aprobados, navegación admin/login/logout misma ruta aprobada; catálogo localizó sólo selector ambiguo de precio desconocido. Selector corregido por región `Resumen del componente`, sin alterar el dato/API.

## Pantallas cubiertas por implementación
- `/` conserva redirect real a `/catalog`; no se inventó otro flujo de entrada.
- `/catalog` y ficha: tarjetas contenidas, precios históricos, variantes completas, ilustraciones, fuentes plegables y aviso visible de conflictos top-level o envelope `basic_stock_v1.conflicts` / `data.capacity_conflict`.
- `/account`: formulario compacto, sesión privada y datos personales plegados; rol administrativo conocido sólo por servidor, invalidado al cambiar sesión.
- `/pcs`: estado vacío con CTA, editor sin IDs visuales, seis categorías, compatibilidad/simulación y recomendaciones reales. PC → formulario → resultado en DOM y visual. SKU secundario; capacidad documentada, riesgos/bloqueos visibles.
- `/pcs/import`: texto → extracción → revisión editable → confirmación explícita, sin guardado implícito.
- `/plans`: lista, editor y etapas acumuladas; coste/beneficio/condiciones completos, etiquetas humanas y evaluación compartida con distinción legacy.
- Publicaciones privadas: confirmación y revocación conservadas. `/shared/[token]`: composición pública readonly, sin scripts, enlaces, imágenes ni acciones; CSS local autorizado por hash SHA-256 exacto, resto CSP cerrado.
- `/chat`: columna de conversaciones, historial y compositor; estados de herramientas traducidos/citas plegables. Orquestación SSE, cancelación, UUID e historial sin cambios.
- `/admin`: revisiones, tabla compacta, colecciones humanas, datos/JSON técnicos plegables y guardas de publicación intactas.
- Error/not-found: acciones y mensajes coherentes. No existía pantalla loading independiente.

## Comandos registrados de este delta (historia)
Desde `frontend/`, con mutex y build fresco; no iniciar servidores adicionales:

```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/visual-rest.test.ts tests/unit/shares.test.ts tests/unit/visual-central.test.tsx
npm run build
.\node_modules\.bin\playwright.cmd test --config=playwright.config.ts catalog.spec.ts --grep "raíz, filtros"
.\node_modules\.bin\playwright.cmd test --config=playwright.config.ts plans.spec.ts shares.spec.ts
.\node_modules\.bin\playwright.cmd test --config=playwright.design.config.ts visual-final.spec.ts --grep "@visual-core"
```

Opt-ins separados, con configuración TEST/PG/proveedor y credenciales de prueba existentes inyectadas por Build sólo al runner:
```powershell
.\node_modules\.bin\playwright.cmd test --config=playwright.curation.config.ts curation.spec.ts --grep "CU10 PG real"
.\node_modules\.bin\playwright.cmd test --config=playwright.live.config.ts assistant.spec.ts --grep "@basic"
.\node_modules\.bin\playwright.cmd test --config=playwright.live.config.ts assistant.spec.ts --grep "CU08 LIVE real"
.\node_modules\.bin\playwright.cmd test --config=playwright.design.config.ts visual-final.spec.ts --grep "@visual-curation"
.\node_modules\.bin\playwright.cmd test --config=playwright.design.config.ts visual-final.spec.ts --grep "@visual-live"
```
Chat fue refactorizado visualmente: el gate existente de streaming/cancelación es pertinente; no repetirlo por rutina. El turno visual natural es distinto del prompt técnico de herramientas y está autorizado sólo sobre conversación sintética propia. No capturar el gate técnico.

## Evidencia final preparada, todavía no generada por este escritor
`visual-final.spec.ts`, tres selecciones explícitas, cada una crea directorio nuevo `.local/evidence/visual-delivery-v1/final/<timestamp-uuid>/`:
- `@visual-core`: cuenta vacía, PC vacía, catálogo/ficha, PC compatible, editor, incompatible P16 en B, BIOS desconocida, RAM16→32 por ARS766417.98, presupuesto766417.97 rechazado, GPU+PSU1882130, plan/editor/publicación readonly. Cada pantalla1440/390, fullpage/viewport y resultado con scroll natural cuando corresponde. API verifica PCs intactas y limpia sólo sus recursos.
- `@visual-curation`: importación/propuesta editable realmente extraída, sin confirmar persistencia; admin con rol PG conocido, sólo lectura. Verifica listas/revisiones intactas.
- `@visual-live`: conversación natural nueva propia, un turno real, historial completado y cleanup. Sin correos, contraseñas, claves o prompts internos en capturas/logs. Trace/video/screenshots automáticos off; fallos por fase estática.

Actualización Build 2B: tipos/lint/build0; 94 unitarios en18 archivos aprobados. Selección E2E:5 aprobados y1 fallo localizado en el acceso a fuentes anidadas de compatibilidad. Test corregido: abre la regla humana de gabinete/formatos, comprueba identidad B07 y enlaces HTTP(S) visibles con href exacto procedente de la evidencia API. Asserts posteriores de BIOS/fallo/desconocido intactos. No hubo cambio de producto ni repetición de checks por este escritor.

Incidente de runner visual-core: no ejecutó el caso ni produjo capturas; `defineConfig(base, overrides)` concatenó dos arrays webServer y duplicó los servidores. No fue defecto del backend/producto. Corregido `playwright.design.config.ts` para pasar un único objeto con spread de base y una sola colección mapeada, conservando los dos servidores reales reuse=false y la eliminación de credenciales admin en sus entornos. Guard estático nuevo `tests/unit/design-config.test.ts`, sin importar/arrancar Playwright desde Vitest. Cambio sólo de config/test: no requiere reconstruir producto.

Próximos focales: Vitest `tests/unit/design-config.test.ts`; visual-core con configuración design y archivo visual-final explícito; `.\node_modules\.bin\playwright.cmd test --config=playwright.config.ts compatibility.spec.ts`. No repetir los otros cinco aprobados por rutina.

Actualización de evidencia comunicada por Build: visual-core aprobado, PNG en `final/2026-10-26T03-18-55-483Z-ecd5b5f2`; asistente natural aprobado, PNG en `final/2026-10-26T03-21-46-072Z-f3c4df48`; compatibilidad y LIVE legado con citas/UUID/cancelación aprobados. No repetir estos gates por rutina.

Visual-curation obtuvo HTTP502 en extract-response. La fixture usaba cantidad escrita en palabras; coordinación confirmó que el contrato CU02 vigente exige evidencia numérica explícita para esa selección RAM. Fixture alineada al formato `2x` del gate funcional ya aprobado, sin ampliar backend ni parsing. Cantidades en palabras quedan como límite de ese contrato. El cuerpo exacto del502 previo no se clasificó: no afirmar causa interna del proveedor ni cuota. Nuevo diagnóstico sólo permite enums de dos mensajes conocidos y `unclassified`, nunca cuerpos/texto libre. Se conserva evidencia de seis categorías, revisión editable, confirmación deshabilitada y lista de PCs intacta.

Visual-curation corregida fue aprobada por Build: imágenes `final/2026-10-26T03-24-44-608Z-b1fefb28` (importación/propuesta/admin). No repetir admin ni core completo por los siguientes ajustes focales.

## Pulido posterior a lectura real de PNG y revisión de código
- Chat: renderer React local para párrafos/negritas/listas/tablas como tarjetas dt/dd. Escape de texto, sin HTML ejecutable, autolinks, imágenes ni dependencias. Marcado no soportado se conserva como texto. API/historial/stream siguen con sus bytes originales; aserción UI compara fragmentos de presentación y mantiene hashes exactos del servidor.
- Móvil con conversación seleccionada: gestión de conversaciones plegable, accesible por teclado/Enter/Escape; diálogo prioritario. Desktop conserva dos columnas. Estado completado: “Guardado”, estado técnico completo en detalles.
- Catálogo móvil: categoría a todo el ancho, tamaño de página y acciones en filas propias; paginación táctil. Sin cambio de filtros HTTP.
- Riesgo PSU: metadato `psu_12v_documentation_conflict` desconocido/fallido/adicional hace visible la contradicción documental aunque el motivo F10/F11 no incluya esa palabra. Otro aviso 12V no se convierte automáticamente en conflicto. Sin alterar veredictos del motor.
- Brief de evaluación dependiente del alcance, también en compartidos: legacy conserva su explicación original, no recibe promesa básica actual. Fallos/faltantes públicos muestran nombre humano y estados separados antes de detalles.
- Propuesta: resumen castellano de faltantes estructurados; advertencias originales completas plegadas. Riesgos conocidos continúan visibles. Última copia de “snapshot” retirada del botón del editor de planes, callback intacto.

### Checks/capturas focales registrados (historia)
Desde `frontend/`, sin repetir los gates anteriores completos:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/message-render.test.tsx tests/unit/extraction-presentation.test.ts tests/unit/visual-central.test.tsx tests/unit/visual-rest.test.ts tests/unit/shares.test.ts
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.design.config.ts visual-final.spec.ts --grep "@visual-(polish|data)"
.\node_modules\.bin\playwright.cmd test --config=playwright.design.config.ts visual-final.spec.ts --grep "@visual-import"
.\node_modules\.bin\playwright.cmd test --config=playwright.design.config.ts visual-final.spec.ts --grep "@visual-live"
```
`@visual-polish`: sólo catálogo 1440/390, ancho útil y teclado; no LLM. `@visual-data`: sólo GPU+PSU y compartidos positivo/fallo+pendiente, con datos reales/recursos propios; no LLM. `@visual-import`: una extracción real de formato vigente, sólo propuesta sin confirmar; requiere opt-in de extracción. `@visual-live`: un turno natural real propio, renderer y gestión móvil; requiere opt-in asistente. Los dos últimos son nuevas capturas necesarias tras cambios de esas vistas, no reintentos automáticos de proveedor. Nuevas carpetas timestamp/UUID; no regenerar evidencia previa.

Asistente @basic: selector de texto adaptado a presentación sin perder aserciones de streaming/citas/hashes/propiedad. No se requiere repetir el gate legado de cancelación por este renderer; la orquestación no cambió. Si Build necesita validar el consumidor @basic, usar exclusivamente su filtro, nunca capturarlo.

Build informó tipos/lint/build0 y22 tests focales aprobados. `@visual-data` aprobado (riesgo PSU, compartidos, fallos/faltantes y PC intacta): no repetir por rutina. `@visual-polish` falló en la secuencia de teclado nativo antes de capturar. Se quitó Escape innecesario y se usan Locator.press(Home/Tab/Shift+Tab), con aserciones reales del destino de foco y fases focus/home/tab/reverse. Diagnóstico limitado a activeName en whitelist category/page_size/q/other. Sin cambios de producto ni asignación artificial de foco al siguiente control.

Próximo catálogo exclusivamente: `node .\node_modules\@playwright\test\cli.js test --config=playwright.design.config.ts visual-final.spec.ts --grep "@visual-polish"`. Usar Node CLI para expresiones OR: el wrapper CMD puede interpretar el carácter pipe; no es defecto del producto ni dependencia nueva.

Este pendiente histórico quedó cerrado por los resultados y dictamen del encabezado; no iniciar otra ronda de capturas o llamadas LLM por rutina.
