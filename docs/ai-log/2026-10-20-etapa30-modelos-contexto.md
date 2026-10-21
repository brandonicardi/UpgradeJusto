# Etapa30 — selección nativa y contexto eficiente

2026-10-20. Resumen técnico saneado en31c; no reejecución del piloto. Entorno de
desarrollo, sin producto, instalaciones, cambios de proveedor/cuentas, commit o push.
Build configuró cuatro perfiles y contrastó metadatos; coordinador dirigió el piloto.

## Criterios y evidencia histórica

Schema nativo subagent admitía override model, no steps por llamada. Se probaron
tres hijos nuevos sobre defaults Sol medium, sin perfiles adicionales:

| Ruta | Modelo efectivo | Pasos observados / tope | Resultado |
|---|---|---:|---|
| Coordinación | Sol medium | 12/20 | Tres hijos y decisión técnica mínima |
| A simple | Luna low | 4/8 | Extracción de siete campos obligatorios cumplida |
| B control | Sol medium | 2/8 | Restauró missing_fields del fixture incompleto |
| C revisión | Astra medium | 7/12 | Revisión documental/conceptual sin fallos demostrados |

Build contrastó modelos, variantes y relaciones padre/hijo mediante API. Override
probado efectivamente, no solo etiquetado en el handoff. No cuarta invocación,
bucles ni fallback observado. No se forzó agotamiento del tope: no prueba el control
de último paso. Steps no son cuota monetaria, tokens o garantía de cierre.

A extrajo verdict, rule_results, missing_fields, rules_version, data_revision,
pc_revision y coverage; estados y desconocidos diferenciados de cero/falso.
Solo en el handoff B se omitió missing_fields de una copia rotulada sintética;
la respuesta original de Luna quedó intacta. El control no prueba inferioridad
de Luna ni fallo real suyo. Astra sustituyó revisión normal, no la duplicó.
Control conceptual: fail conocido más datos ausentes implica incompatible y
conserva faltantes/cobertura parcial. Fue razonamiento estático, no test de motor.

Dos lecturas del coordinador fueron denegadas, sin ampliar permisos. Cero relecturas
exitosas idénticas por sesión según contraste de rangos/hash, pero una lectura
documental fue más amplia de lo necesario. No se concluye ausencia de desperdicio.
Handoffs83/151/236 palabras y retornos139/97/212, dentro de objetivos600/300;
palabras/caracteres no son tokens exactos.

## Métricas históricas (no factura ni tamaño de contexto)

| Ámbito | input | output | reasoning | cache.read | cache.write | Herramientas |
|---|---:|---:|---:|---:|---:|---:|
| Setup Build, ventana delimitada antes del piloto | 43147 | 11002 | 7920 | 4159744 | 0 | 23 |
| Coordinador | 41988 | 4209 | 165 | 135040 | 0 | 12 |
| A Luna | 4795 | 437 | 0 | 10368 | 0 | 3 |
| B Sol | 3809 | 262 | 0 | 3456 | 0 | 1 |
| C Astra | 13334 | 680 | 45 | 40960 | 0 | 6 |

Contadores acumulados de sesiones nuevas; setup excluye cierre posterior y etapas
previas. No sumar categorías como costo sin semántica del adaptador. cost0 no prueba
gratuidad o cuota de login. CLI146645ms incluye herramientas/hijos; tiempos entre
creación e idle incluyen esperas y no son latencias comparables. No porcentaje de
ahorro o superioridad frente a29, que realizó otra tarea.

## Cierre y límites

Una decisión técnica guardada históricamente con proyecto explícito,
capture_prompt:false y sesión real registrada; sin conversaciones ni nueva
recuperación ciega. Evidencia detallada y perfiles reales quedaron locales ignorados.
Revisor-proyecto/configuración MCP/autenticación/binarios y producto preservados.
No suite, demo o instalación. La revisión fue del estado/fragmentos y delta recibido,
no certificación exhaustiva del diff histórico ni aislamiento de seguridad.

Aceptación acotada: selección real A/B/C, control sintético distinguido y revisión
independiente. Topes piloto20/8/8/12 sustituidos en31b por32/32/32/20 con alcance
expreso. Ver [política vigente](../ORQUESTACION.md). No repetir piloto en31c.
