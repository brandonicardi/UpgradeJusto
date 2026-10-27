# Entrega38 — matriz vigente27/10/2026

## Criterio y resultado

Copiar composición, medidas y jerarquía del v0 aprobado, no reinterpretarlo. Conservar
funciones reales y corregir solapamientos móviles; datos demo no son datos del producto.
Brandon rechazó la integración anterior: READY, tests y sus30PNG no aceptan la actual.

Revisión independiente directa detectó dos P2: densidad previa al inventario PC y
etapas demasiado extensas. Se corrigieron con edición explícita/gestión desplegable
y etapas cerradas con resumen de pieza/cantidad/coste/estado. La revisora **cerró ambos
P2 de escritorio** con los PNG nuevos, sin certificar paridad global ni aceptación humana.
En móvil vio tarjetas/flecha legibles y sin solapamientos; el encuadre del plan termina
al comenzar etapas: esa parte sigue sin verificación visual independiente.
Armado móvil: dos columnas objetivo/presupuesto, condición debajo; placeholder truncado
menor. Compartido público sin captura visual final. Catálogo con gate real, contraste
visual final independiente no repetido en este bloque.

## Matriz diez CU: requisito → evidencia → reserva

| CU/spec | Evidencia real registrada | Estado y límite actual |
|---|---|---|
| [01 cuentas](specs/CU01-cuentas.md) | Registro/sesión sintéticos reales en recorridos; Google TEST confirmado por Brandon | Funcional previo; no repetir acceso humano ni afirmar DEV validado |
| [02 extracción](specs/CU02-extraccion.md) | Gate histórico33 Groq/PG, revisión/confirmación/aislamiento; entrada visual92 | Parcial respecto de torre actual: no nueva extracción real en este bloque |
| [03 PCs](specs/CU03-pcs.md) | Central actual crea PC propia, lectura y comparación inmutable; edición/CRUD anteriores | Funcional; no convertir plan en modificación automática |
| [04 catálogo](specs/CU04-catalogo.md) | Gate real9categorías/fotos/ofertas PASS8.5s; rutas1440/3908PASS15.3s | Funcional; retail_first explícito web, API mantiene sort=id; ofertas vencidas |
| [05 compatibilidad](specs/CU05-compatibilidad.md) | Evaluación real en central/desdecero con faltantes y advertencias | Conservadora/parcial: no certificación física exhaustiva ni T10 cerrado |
| [06 recomendaciones](specs/CU06-recomendaciones.md) | Preview real1requiere_verificacion/0recomendadas; sin ofertas vigentes devueltas | No nueva recomendación vigente con coste completo; precio desconocido no cero |
| [07 planes](specs/CU07-planes.md) | Central1440/3902PASS20.1s: manual real,2etapas,1POST confirmado, historial200 y PC intacta | Funcional del contrato actual; coste total desconocido y estado no ready |
| [08 asistente](specs/CU08-asistente.md) |35pruebas puras PASS; turno local real FAIL31.987s, get_pc0/evaluate_pc0 | **BLOQUEADO**. Texto/historialcompleted insuficientes; sin repregunta ni más llamadas |
| [09 compartir](specs/CU09-compartir.md) | Main normal PG1PASS2.05s; navegador2PASS8s: publicar/anónimo frozen/B404/revocar/nuevo consentimiento | Funcional normal, sin factory/probes; visual público pendiente |
| [10 administración](specs/CU10-administracion.md) | Gate histórico33 rol/publicación/versiones; ruta sintética92 sólo lectura | Funcional previo, mutación torre final no repetida; no tocar roles reales |

No sumar suites solapadas ni declarar diez CU integralmente cerrados.

## Evidencia visual actual, local ignorada

- Central1440: `.local/integral38/central-final-1440/2026-10-27T15-12-15-141Z-8e2bebb1/`.
- Central390: `.local/integral38/central-final-390/2026-10-27T15-12-23-400Z-df1c2f44/`.
- Ambos índices: journeycomplete, rama `no_current_preview_quotes_manual`, historial200,
  sin overflow; no equivalen a escaneo completo del catálogo ni aprobación visual.
- Desde cero390: `.local/integral38/v0-integrated/2026-10-27T14-58-55-237Z-bfabeb61/`.
- Desde cero1440: `.local/integral38/v0-integrated/2026-10-27T14-57-08-709Z-a0756d18/`.
- Referencias: `.local/integral38/v0-reference/`, seisPNG aprobados. No sobrescribir.
- Capturas anteriores/fallos se conservan. Las anclas de comparación/acciones muestran
  detalles abiertos y luego restauran la vista compacta real; no se editan los píxeles.

Delta final:18tests focales PASS, tipos/lint/build0. No nueva suite general ni nuevas
llamadas LLM. Guía/URL/procesos: [PROBAR38_LOCAL](PROBAR38_LOCAL.md), [CONTINUAR](CONTINUAR.md).
Dockerfiles/workflows no encontrados; Docker/CI no ejecutados, pendientes reales.

La matriz previa está preservada en
[histórico](ai-log/2026-10-27-entrega38-visual-historica.md), no como aceptación activa.
