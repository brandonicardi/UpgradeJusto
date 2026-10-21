# Frontend31b — CU04 real

Catálogo readonly contra API real. `/` redirige a `/catalog`; filtros GET combinados
antes de paginar; `/catalog/[id]` muestra atributos y referencias. No login,
escrituras, evaluación de compatibilidad, fotos ni dataset de respaldo en cliente.
Next consulta en servidor CATALOG_API_URL (default http://127.0.0.1:8000), sin
credenciales; conserva importes string, moneda, fecha y procedencia histórica.

Desde frontend/, scripts individuales existentes: `npm run typecheck`, `npm run lint`,
`npm run test`, `npm run build`, `npm run test:e2e`. Preparación en [README raíz](../README.md).
Next genera next-env.d.ts y tipos locales (ignorados) al ejecutar build/dev; en un
checkout nuevo generar esos archivos antes del primer typecheck.

Playwright inicia ambos procesos con reuseExistingServer:false; requiere3000/8000
libres, backend preparado y Chromium existente.31c hizo portable la ruta por defecto
a ../.local/ms-playwright; admite PLAYWRIGHT_BROWSERS_PATH explícito. Resultados y
reporte van a ../.local/playwright-results y ../.local/playwright-report.
No intercepta ni simula HTTP. No detener una web ajena para correr tests.

## Evidencia histórica31b (2026-10-20)

Tipos/lint/build y12 Vitest/2 Playwright contra API real terminaron0, corroborados
por Build. Primer E2E falló por ruta Windows y segundo por localizadores ambiguos;
corregidos con revisión focalizada y recorrido posterior aprobado. A quedó cerrado,
no sigue pendiente de corroboración. No se ejecutaron tests PG/auth desde frontend.
Detalle: [bitácora31b](../docs/ai-log/2026-10-20-sprint31b-web.md).
Verificación actual31c: [bitácora31c](../docs/ai-log/2026-10-21-etapa31c-privacidad-commits.md).
