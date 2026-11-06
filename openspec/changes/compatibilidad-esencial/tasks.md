# Tasks

Aprobado por Brandon el 6/11 («no te compliques tanto, no agregues lo de los coolers»); delegó las
decisiones restantes mientras dormía. Antes de `datos-tecnicos-reales`, que depende de este alcance.

## 1. Motor
- [x] 1.1 Contrato: versión, alcance y `ESSENTIAL_REQUIRED`. Prueba: `test_tower_essential.py`.
- [x] 1.2 T01–T08 y T11 en `tower_essential.py`. Prueba: positivo, cada dato esencial faltante queda
      desconocido, cada choque documentado falla, y la incompatibilidad domina.
- [x] 1.3 Cooler, ventiladores, JEDEC y ECC no bloquean. Prueba: sin esos datos da `compatible`.
- [x] 1.4 M.2 sin dato SATA; SATA exige puerto, bahía y alimentación. Prueba: casos de almacenamiento.

## 2. Integración
- [x] 2.1 Evaluar, simular, planes y recomendaciones usan la política esencial. Prueba: suite de torre.
- [x] 2.2 Compartir acepta las dos versiones sin aflojar ninguna. Prueba: `test_tower38_share_pure.py`.
- [x] 2.3 El tablero de admin solo marca atributos esenciales. Prueba: `test_tower_engine_attributes.py`.
- [x] 2.4 Interfaz: acepta ambas versiones y aclara qué no se evaluó. Prueba: `npm test`.

## 3. Verificación
- [ ] 3.1 `pytest` con PostgreSQL y `ruff`.
      (Sin PG: 1036 pasan. PG dirigido a lo tocado: 26 + 10 comparten en verde. La corrida PG amplia
      conserva fallas baseline ya conocidas: RAG sin chunks, share_expiry_http, share_logging y el
      diagnóstico live opt-in; la fase limpia además falla MCP/extracción por catálogo de 14 piezas.)
- [x] 3.2 Revisor: sin aprobar por falta de datos, históricos intactos, sin decisión en la interfaz.
      (Revisor independiente ejecutado; hallazgo importante de `not_applicable` laxo en compartir
      corregido y revalidado. Queda observación de trazabilidad: pantallas nuevas sin tarea propia.)

## 4. BIOS fuera del alcance (decisión de Brandon, 6/11)
- [x] 4.1 Contrato nuevo: `tower-essential-policy-2`, `cu05-tower-essential-engine-2`, alcance
      `cu05-tower-essential-2`; la política 1 queda como contrato histórico. Prueba: contrato y
      `test_tower_essential.py` (103 pruebas puras; 58 con PostgreSQL).
- [x] 4.2 Motor: soporte exacto CPU/placa sin leer BIOS; sin faltante por BIOS ausente y sin fallo por
      BIOS anterior. Prueba: casos nuevos en `test_tower_essential.py`.
- [x] 4.3 Compartir: acepta stock, esencial 1 y esencial 2 con su propia lista de reglas, etiquetas y
      alcance; los planes viejos no se recalculan. Prueba: `test_tower38_share_pure.py` y
      `test_tower38_share_normal_pg.py`.
- [x] 4.4 Interfaz: valida ambas versiones esenciales, deja de pedir BIOS para evaluar, muestra el
      alcance sin afirmar validación. Prueba: `npm test` y `npm run typecheck` (854 unitarias y
      typecheck limpio; contrato v2 y `not_applicable` cubiertos).
- [x] 4.5 Extracción y textos: la propuesta guardada deja de exigir BIOS antes de confirmar; el dato
      guardado se conserva. Prueba: `test_tower38_extraction.py` y unitarias de importación.
- [x] 4.6 Verificación integrada: `pytest` dirigido con PostgreSQL, `ruff` y recorrido manual sin BIOS
      (103 puras + 58 PG dirigidas; `ruff check`/`format` limpios; captura real sin BIOS).

## 5. Piezas identificadas sin hechos y PC ya armada (diagnóstico de Brandon, 6/11)
- [x] 5.1 Diagnóstico: la PC «Mi primer pc gamer» (rev 3) tiene CPU Ryzen 7 5700G (cg-12369), ASUS
      PRIME B550M-A AC WIFI (cg-10422), Corsair Vengeance RGB PRO 8 GB ×2 (cg-13664), Gigabyte RTX
      3060 12 GB (cg-11871), ADATA XPG PYLON 750 W (cg-11736), Team Vulcan Z 1 TB SATA (cg-13867) y
      Be Quiet DARK ROCK ELITE (cg-16487). Ninguna tiene atributos técnicos publicados (`attributes`
      vacío), por eso T01–T08 quedan desconocidas; T11 suma `case.presence`. El veredicto real del
      motor es `requiere_verificacion`, no `incompatible`: la frase «Hay piezas que no encajan» de la
      captura es un defecto de interfaz o de una versión previa.
- [x] 5.2 Declaración explícita de PC ya armada: `context.assembly_state` (`assembled` / `new` /
      nulo), con migración `39_002_pc_assembly_state` y validación. No se infiere por existir guardada.
- [x] 5.3 Motor: en una PC declarada armada, la ausencia o desconocimiento del gabinete no bloquea
      T01/T02/T03/T05/T06; T04/T07/T08 pasan a `not_applicable` con motivo cuando dependen de datos
      del gabinete no comprobados, nunca a `pass`. Cooler y ventiladores siguen opcionales y no
      cuentan para completitud. Una pieza futura no hereda la declaración (`apply_tower_actions`
      cambia `assembled` a `new`). Prueba: 103 puras y 58 con PostgreSQL en verde.
- [x] 5.4 Interfaz: contador sin cooler/ventiladores; tarjeta distingue «identificada, faltan datos
      técnicos» de «completa»; muestra T11 y la causa real de cada faltante; no pide recargar la
      misma pieza. Prueba: unitarias de Mi PC y captura 1440/390 con la PC de la observación
      (`.local/capturas/pantallas-pcs/corrida-2026-11-06T14-18-40-279Z/`).
- [x] 5.5 Verificación: suite dirigida con PostgreSQL, `ruff`, `npm test`, `typecheck`, `lint` y
      recorrido de PC armada con gabinete desconocido (854 unitarias; 26 PG; captura sin desborde).

## 6. Espacio físico y autocompletado (decisiones de Brandon, 6/11)
- [x] 6.1 Motor: el espacio físico (largo de GPU y formatos del gabinete) NO se evalúa cuando faltan
      medidas, en cualquier PC: T04 y T07 pasan a `not_applicable` si quedaron desconocidas, con
      aviso visible. Un `fail` documentado sigue `incompatible`; nunca se convierte en pass. T11 deja
      de exigir la presencia del gabinete. Prueba: 93 puras y tests PG dirigidos en verde.
- [x] 6.2 Interfaz: aviso «Chequeá que entre en tu gabinete» en evaluación y plan cuando el espacio
      físico no se evaluó; no presentarlo como aprobado. Prueba: unitaria de presentación y captura
      real de Mi PC.
- [ ] 6.3 Autocompletado de modelo propio: inspeccionar el selector actual antes de tocar; búsqueda
      debounced contra el catálogo, lista accesible por teclado, foto/categoría/modelo y selección
      explícita que liga el ID exacto. El texto libre sigue editable y desconocido; no seleccionar
      automáticamente ni inferir compatibilidad. Prueba: unitarias de interacción y `npm test`.
- [ ] 6.4 Evitar reescritura arbitraria de la maqueta: el ajuste usa los tokens y la estructura
      existente del sistema de diseño. Prueba: captura 1440/390 y revisión de tokens.
