# Seguridad37 — lector de entrada acotado, pendiente de Build/revisión

Sólo frontend. Sin cambios de estética/producto38, permisos, dependencias, proveedores ni entorno. Sin shell/runners/commits por este escritor.

## Contrato implementado para coordinar backend
- `lib/request-body.ts`: `REQUEST_BODY_LIMITS` cerrado/congelado: JSON general262144 bytes, auth8192, mensaje de asistente32768, extracción de texto65536. Confirmación de extracción y creación de conversación usan el general.
- `REQUEST_BODY_TIMEOUT_MS=5000`: plazo total fijo desde entrada, no renovable por actividad. Chequeo monotónico además del temporizador, también para chunks vacíos/ya disponibles.
- `Content-Length` se valida anticipadamente: sólo dígitos no negativos; exceso413, formato inválido400. No se confía en el valor para el tamaño real.
- Cuenta bytes de `Request.body` sin CL y aun si CL declara menos. Un único buffer de capacidad fija; no copia el chunk que excede el límite. UTF8 fatal, válido con caracteres partidos entre chunks.
- 413 tamaño; 408 lectura vencida o aborto del solicitante; 400 UTF8 inválido/cuerpo ilegible/CL mal formado. Respuestas y razones de cancelación constantes, sin reflejar entradas, razones de aborto ni excepciones.
- Cancela lector/cuerpo al rechazar y libera lock/listener/timer sin esperar un hook cancel potencialmente bloqueante. Una sola carrera de promesas, no un handler de deadline acumulado por chunk.
- Upstream timeout comienza después de la lectura acotada. Se mantienen duraciones existentes, incluyendo SSE105s y `request.signal`; stream upstream se pasa sin buffer ni replay.
- `Retry-After` en429 preservado como segundos o HTTP-date de formato cerrado; nunca texto libre. Asistente/curation muestran límite/cuota de forma normalizada, sin reintentos automáticos.

## Archivos
Helper de cuerpo y Retry-After; auth route; proxies assistant/pcs/compatibility/recommendations/plans/shares/curation; mensajes locales auth/assistant/curation. Firmas, Origin literal, Cookie/CSRF y guards de rutas/métodos/query conservados. Publicación anónima sigue sin credenciales;429 público conserva Retry-After en vez de convertirse en503.

## Checks preparados (NO ejecutados por este escritor)
Desde `frontend/`, Build ejecuta en TEST, mutex habitual:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/request-body.test.ts tests/unit/request-body-proxies.test.ts tests/unit/auth.test.ts tests/unit/assistant.test.ts tests/unit/curation.test.ts tests/unit/gateway.test.ts tests/unit/pcs.test.ts tests/unit/compatibility.test.ts tests/unit/recommendations.test.ts tests/unit/plans.test.ts tests/unit/shares.test.ts
```
Los tests nuevos son unitarios aislados: límites exactos/+1, multibyte, CL mentiroso/mal formado, falta de CL, timeout no deslizante, cancel que nunca resuelve, abort/reason saneado, no-forward antes de413/408, firmas/cabeceras reales del helper y429. No sustituyen integración contra backend real.

Pendiente: checks de Build, alineación del backend con contrato y revisión independiente de seguridad37. No autoriza iniciar38 ni declarar37 aceptado.
