# Sprint31b — resultado histórico por bloques

2026-10-20; resumido documentalmente en31c. Autorización CU04→CU01→CU03→CU05,
sin CU02/06/07/08/09/10, sin publicación. No se inició31 separado ni se repitieron
pilotos28–30. Los diez CU siguen como meta, no todos están implementados.

| Bloque | Estado al cierre31b | Evidencia/límite |
|---|---|---|
| A CU04 | verificado | API/UI reales,14 piezas/seis categorías; filtros, páginas, detalle, procedencia, precios históricos/desconocidos; pytest118, Vitest12, Playwright2 y checks0 |
| B CU01 | bloqueado | Preparación SQLAlchemyPG/Alembic/seed probada solo estática/unitariamente; sin PG real ni auth |
| C CU03 | pendiente | CRUD/propiedad A/B/persistencia no implementados, depende de B |
| D CU05 web/R01 | pendiente | Sin servicio propietario/sustitución/UI ni R01; motor28 parcial preservado |

Build hizo setup, archivos raíz y contraste de metadatos. Coordinador dirigió
contratos/seguimiento; backend/frontend escribieron sus carpetas; revisor sin
edición/shell. Modelos efectivos Sol medium, topes32/32/32/20. No garantía de cuota
o cierre por tope. Checkout compartido, sin dos escritores ni reversión de ajenos.

Node24.14.0/npm11.19.1 y dependencias exactas verificadas antes de instalar en31b;
pins/locks conservados. ESLint9.39.5 EOL pendiente,10 con conflicto real de peers.
No Docker/psql/servicio PostgreSQL o listener5432/5433 utilizable identificado.
No se instaló servidor ni se sustituyó por SQLite/memoria. No pruebas de auth/PG.

Contrato A antes de frontend: [CU04](specs/CU04-catalogo.md); preparación y seguridad
futura B: [CU01](specs/CU01-cuentas.md). La API sigue usando dataset versionado,
no persistencia preparada. Fotos sin permiso/fuente se representan con placeholder.

Checks individuales reales y fallos/correcciones históricas en
[bitácora31b](ai-log/2026-10-20-sprint31b-web.md). El script común no se ejecutó
completo en31b; el helper sí obtuvo web/API200 y cerró solo procesos propios.
Ver [bitácora31c](ai-log/2026-10-21-etapa31c-privacidad-commits.md) para nueva verificación.

Próximo requisito de producto: PostgreSQL exclusivo dev+test, migración desde base
vacía, seed idempotente dos veces, conservación/rollback/reinicio y pruebas reales;
entonces implementar CU01 antes de CU03/CU05 web.31c no ejecuta ese trabajo ni32.
