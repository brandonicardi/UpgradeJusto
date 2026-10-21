# Agentes de desarrollo

No son agentes del producto ni implementan CU08. Política: [ORQUESTACION](ORQUESTACION.md).

| Rol local | Responsabilidad | Tope por turno en31b |
|---|---|---:|
| coordinador-upgradejusto | Contratos, delegación y seguimiento documental; sin shell ni código producto | 32 |
| backend-upgradejusto | backend/, pruebas y migraciones asignadas; sin delegación | 32 |
| frontend-upgradejusto | frontend/, accesibilidad y consumo de API real; sin delegación | 32 |
| revisor-codigo | Revisión independiente, sin edición, shell ni delegación | 20 |
| revisor-proyecto | Revisión documental previa de cuatro archivos; perfil conservado sin modificación | propio |

Los cuatro perfiles editables usan Sol medium por defecto. La selección explícita
de sesión y el override nativo por tarea son independientes del perfil. Modelos y
permisos disponibles no autorizan un incremento nuevo.

## Evidencia histórica del 2026-10-20

- Primera prueba de revisor-proyecto: una invocación, cuatro lecturas completas
  (AGENTS, ENTORNO, MCP y PERMISOS), sin otras herramientas ni modificaciones.
  No encontró incoherencias demostrables en ese estado. Modelo Sol medium heredado
  y relación padre/hijo contrastados por API. No prueba estado actual ni aislamiento.
- Etapa29: perfiles nativos descubiertos; coordinador primario y especialistas Sol
  medium. Recuperación explícita entre primarias comprobada en29b, sin importar
  conversaciones. Una recarga29 canceló una operación;29b no necesitó recarga.
- Etapa30: tres hijos nuevos, Luna low para extracción, Sol medium para corregir
  un fixture deliberadamente incompleto y Astra medium para revisión. Los modelos
  efectivos se contrastaron por metadatos; el fixture no fue un fallo de Luna.
- Sprint31b: coordinación, implementación y revisión Sol medium. No se invocaron
  otros modelos por rutina. Topes ampliados a32/32/32/20 para el alcance autorizado.

Detalle: [29/29b](ai-log/2026-10-20-etapa29-orquestacion-engram.md),
[30](ai-log/2026-10-20-etapa30-modelos-contexto.md),
[31b](ai-log/2026-10-20-sprint31b-web.md).

`.opencode/` y `opencode.json` reales permanecen locales ignorados. La documentación
no conserva sus valores privados ni garantiza reproducción byte a byte. El ejemplo
[de handoff](../examples/orchestration/handoff.md) conserva el procedimiento sin
activar perfiles, proveedores o memoria. No se modificó revisor-proyecto en31c.
