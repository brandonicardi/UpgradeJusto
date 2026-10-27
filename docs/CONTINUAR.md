# Estado ACTUAL — UpgradeJusto

Actualizado: **27/10/2026,12:17ART**. Única referencia operativa vigente.
Cronología preservada en [HISTÓRICO](ai-log/2026-10-27-continuar-historico.md) y bitácora38;
sus previews/cuotas/aprobaciones anteriores no describen el estado actual.

## Autorización y límites

- Brandon autoriza reanudar desde archivos existentes, completar versión usable hoy.
  No reiniciar37/38 ni repetir instalaciones/pruebas sin delta.
- Última medición real Codex: **25% semanal libre**, cuenta compartida. **Nuevo corte15%
  libre para reservar10%**. Sustituye cortes anteriores. Ante orden externa: checkpoint
  breve y parar padre/hijos sin reanudar. Tokens/cost no miden esa cuota.
- Sin pagos/reset/cambio de cuenta/push/deploy ni seguridad global. Conservar datos,
  diez CU, compatibilidad determinística, propiedad/CSRF/HMAC y confirmación explícita.
- Build coordina un bloque principal por vez. Backend y frontend tienen un único
  escritor asignado cuando se delega. No agentes redundantes ni auditorías generales.

## Entorno y procesos comprobados

- Commit local **5f5ced3**, descendiente de e499ac3: siete archivos del transporte
  local/config/pins/pruebas/contrato; no declara CU08 aceptado. Resto conservado; no push.
- **Web/API activos: http://localhost:3000**. Arranque normal verificado12:14ART:
  webPID27992/127.0.0.1:3000, APIPID20364/127.0.0.1:8000; ocho páginasHTTP200,
  healthok y Googleenabledtrue. Proveedor efectivo **ollama**, CU08 sigue bloqueado.
  Manifiesto `.local/logs/preview38/20261027T151341Z-f8cf1291307b480e9b8c0948619f240b/owned-processes.json`.
  Parada por identidad en PROBAR38_LOCAL; no ejecutar runners mientras está activo.
- Ollama0.40.11 portable: **PID32580,127.0.0.1:11434**. Un único modelo instalado:
  Qwen3:4B Q4_K_M; digest359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7.
  Runtime/modelo en.local/ollama ignorado. RX6800/Vulkan comprobado, sin drivers/WSL/
  overrides ni instalación global. No volver a descargar.
- Base de entrega: PostgreSQL **TEST** existente. Google humano TEST fue confirmado
  por Brandon; no repetir login ni acceder a su cuenta. No migrar/resetear DEV por rutina.
- Montaje comprobado: aplicación normal `upgradejusto.main:app`, **no factory ni
  inyección de fallos**. CU09 normal PG y navegador aprobados.

## Estado de CU y evidencia

| Alcance | Estado actual |
|---|---|
| CU01 | Login local/Google implementados; Google TEST confirmado por usuario, no DEV |
| CU02 | Extracción/confirmación funcional con evidencia anterior; visual92 posterior pendiente |
| CU03/CU04 | CRUD/selección/listado reales; retail_first API/web y fotos/ofertas gatePASS |
| CU05/CU06 | Motor/propuestas reales y conservadores; no certificar torre física completa/T10 sin datos |
| CU07 | Central1440/3902PASS20.1s: manual real/dos etapas/guardado/historial/PC intacta; coste desconocido |
| CU08 | **BLOQUEADO respecto de herramientas reales y respuesta fundada**; ver siguiente bloque |
| CU09 | Main normal PG1PASS2.05s/navegador2PASS8s: publicar/frozen/B404/revocar/nuevo consentimiento |
| CU10 | Gestión/rol previos y ruta sintética actual sólo lectura; nueva mutación final no repetida |
| UI/v0 | P2 PC y etapas escritorio cerrados por revisión PNG directa; no aceptación humana/global |

No declarar diez CU cerrados. Delta visual final18tests PASS/tipos/lint/build0.
Capturas nuevas conservadas en ENTREGA38_VISUAL; etapas móvil fuera del encuadre revisado,
visual compartido y contraste catálogo final independiente pendientes. Ofertas vencidas:
rama manual sin cotizaciones actuales devueltas, no escaneo exhaustivo del catálogo.
No se cambiaron fechas/reloj ni se inventó presupuesto aprobado.

## Chat — bloque detenido, no siguiente acción automática

1. Diagnóstico ya reproducido sin LLM: serialización nativa de `Ollama.Tool` pierde
   `$defs/oneOf/$ref`; un campo referenciado queda `{}`. No se demostró causa única.
2. Reparación guardada: `assistant/ollama_schema.py` expande referencias y usa transportes
   HTTPX públicos por binding/stream para conservar cuerpos de herramientas ante la
   proyección SDK.35pruebas focales PASS; Ruff check/formato0. MCP/validación/7herramientas,
   permisos,90s/rondas y política sin cambios. No se afirma equivalencia de todas las
   restricciones con el formato Go nativo; el servidor valida autoritativamente.
3. Primer turno local real: get_pc0/evaluate_pc0, texto/historialcompleted,
   TTFT28.2s/total39.1s. **Fallo de aceptación**, no chat funcionando.
4. Única consulta focal Astra utilizada, disponibilidad verificada en mismo proveedor,
   sin cambio global. Revisó fuente y respaldó la vía de transporte y sus gates.
5. **Turno real posterior a esa reparación/revisión FAIL:** get_pc0/evaluate_pc0,
   TTFT21.014s/total31.987s, texto/historialcompleted, limpieza completa. No hubo error
   de SDK ni herramienta ejecutada. La pérdida de esquema no era explicación suficiente.
   Repregunta fundada no ejecutada porque falla el primer criterio.
6. **BLOQUE DE CHAT DETENIDO** y bloqueo informado públicamente al supervisor. No más
   consultas/modelos/descargas/reintentos automáticos. Siguiente decisión requiere
   nueva hipótesis y autorización; sólo continuar trabajo independiente autorizado.

Groq sigue configurable y extracción conserva Groq; no alternancia ciega de proveedores.
Ollama ya instalado no elimina defectos de contrato. Guías `IA_LOCAL38` y `PROBAR38_LOCAL`
reconciliadas con el resultado actual; sus versiones previas se preservaron como historia.

## Cierre local y reservas

App disponible para prueba humana, sin prometer cierre integral. Backend/frontend/revisora
en pausa tras sus retornos; sin rescates ni nuevas llamadas. Mantener stack propio para
Brandon, no confundir detener agentes con apagar la URL solicitada. Dockerfiles/workflows
no encontrados; Docker/CI no ejecutados. Próximo paso funcional crítico: nueva hipótesis
autorizada para CU08; no reintentar automáticamente. Resto de cambios frontend/CU09 y
datos públicos acumulados sigue sin commit global, conservado y fuera del commit de chat.
