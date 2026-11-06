# Proposal

## Why

El motor de torre exige datos que casi ningún fabricante publica y que no importan en una PC de casa:
velocidades JEDEC de la CPU, ECC, corriente total de ventiladores, voltaje de cabezales, referencias
exactas de plataforma para la fuente. Con piezas reales nunca llega a «Encaja», aunque la PC funcione.
Brandon decidió simplificar: socket y soporte de CPU, DDR4/DDR5, potencia para la placa de video y
almacenamiento, sin coolers ni ventiladores por ahora.

## What Changes

- **Política esencial versionada** (`tower-essential-policy-1`) para toda evaluación nueva: nueve
  comprobaciones T01–T08 y T11. T09, T10 y T12 quedan fuera del alcance y se declaran, no se aprueban.
- La fuente se compara con la mayor recomendación publicada por fabricante, para cualquier plataforma.
- Un M.2 no exige dato de alimentación SATA. Dos sockets documentados distintos fallan sin fila de soporte.
- JEDEC, ECC, ATX24, EPS y largo de fuente dejan de bloquear: si faltan no importan, y si están y chocan
  fallan. Toda fuente ATX trae esos conectores de placa y casi ninguna ficha lo rotula; exigirlos volvería
  a dejar en «Falta un dato» a PCs comunes.
- El resultado «Encaja» aclara que refrigeración y ventiladores no se evaluaron.
- Las evaluaciones guardadas y los enlaces públicos viejos conservan su versión; el motor v1 queda como
  referencia del contrato histórico y no se usa para evaluar.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `compatibilidad`: el inventario pasa a ser la política esencial versionada.

## Impact

- `backend/upgradejusto/compatibility/` (`tower_essential.py`, `tower_contract.py`), `plans/`,
  `recommendations/`, `shares/`, `administration/` (lista de atributos del tablero).
- `frontend/lib/tower-compatibility.ts`, `tower-share-dto.ts` y presentación del veredicto.
- Sin migración: la versión viaja dentro de cada evaluación.
