# Continuar — cierre local31c

## Estado vigente (2026-10-21)

- CU04 funciona: catálogo API/web real,14 piezas/seis categorías, dataset
  `sprint31b-a-v1`, filtros/paginación/detalle/fuentes/desconocidos.
- CU01: solo preparación PostgreSQL/Alembic/seed; **sin PostgreSQL real ni auth**.
- CU03 y CU05 web/R01 pendientes por esas dependencias. Motor28 parcial conservado;
  dos subreglas GPU no habilitan compatibilidad global. Los diez CU siguen como meta.
- 31c revisa privacidad y registra29/30/31b en commits locales, sin push ni32.
  Identidad Git existente conservada por autorización expresa; no se cambió autoría.

Snapshot integrado creado: `347a87a6f5f8f0641b4dbeec8df2b14bf32b16c2` (64 archivos,
documentación29/30 y catálogo web31b/preparación PG saneados). El commit de cierre
documental posterior registra este hash previo; su propio hash solo va en la entrega.
Verificación nueva31c:118 pytest,12 Vitest,2 Playwright, tipos/lint/build/Ruff/sync0;
incidencia de captura PowerShell y warning de caché documentados, no ocultados.

## Ejecución y evidencia

[README](../README.md) para arranque/checks; [SPRINT31B](SPRINT31B.md) y
[bitácora31b](ai-log/2026-10-20-sprint31b-web.md) para resultados históricos118/12/2.
Las comprobaciones nuevas31c y commits previos al cierre se registran en
[bitácora31c](ai-log/2026-10-21-etapa31c-privacidad-commits.md), no se confunden con31b.
Contratos: [CU04](specs/CU04-catalogo.md), [CU01](specs/CU01-cuentas.md),
[CU05 parcial](specs/CU05-compatibilidad.md). Política de desarrollo:
[ORQUESTACION](ORQUESTACION.md). No repetir pilotos29/30 o recuperación de memoria.

## Privacidad y conservación

Documentos actuales saneados; configuración personal, memoria, credenciales,
dependencias y artefactos permanecen ignorados. Originales documentales concretos
se conservan localmente. No se abrieron chats, cuentas, memoria o bases de sesiones.
El historial alcanzable previo conserva rutas locales en bitácoras25/27/28:
sanear HEAD **no borra blobs anteriores**. No se reescribió historia. El repositorio
no se declara listo para publicar; requiere revisión/decisión específica del
historial y del destino/visibilidad antes de cualquier futuro push.

## Próximo punto exacto (no ejecutar automáticamente)

Revisar el resultado31c antes de32. PostgreSQL local exclusivo para desarrollo y
pruebas sigue siendo requisito pendiente: migraciones/seed dos veces/reinicio y
pruebas reales antes de cerrar CU01 y avanzar CU03/CU05 web. Sin instalar PG/OpenSpec,
actualizar dependencias o abrir nuevas funciones en31c. Mantenimiento Python3.12.15
y ESLint pendiente; no actualizar automáticamente. Sin remoto/publicación autorizados.
