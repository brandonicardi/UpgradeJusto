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
- [ ] 3.2 Revisor: sin aprobar por falta de datos, históricos intactos, sin decisión en la interfaz.
