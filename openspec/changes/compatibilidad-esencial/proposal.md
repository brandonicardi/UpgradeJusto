# Proposal

## Why

El motor de torre exige datos que casi ningún fabricante publica y que no importan en una PC de casa:
velocidades JEDEC de la CPU, ECC, corriente total de ventiladores, voltaje de cabezales, referencias
exactas de plataforma para la fuente. Con piezas reales nunca llega a «Encaja», aunque la PC funcione.
Brandon decidió simplificar: socket y soporte de CPU, DDR4/DDR5, potencia para la placa de video y
almacenamiento, sin coolers ni ventiladores por ahora.

## What Changes

- **Política esencial versionada** (`tower-essential-policy-2`) para toda evaluación nueva: nueve
  comprobaciones T01–T08 y T11. T09, T10 y T12 quedan fuera del alcance y se declaran, no se aprueban.
- **La BIOS queda fuera del alcance de las evaluaciones nuevas.** No se pregunta, no bloquea si falta y
  no falla si es anterior: la decisión de Brandon (6/11) es que importan la placa y su compatibilidad.
  Se mantiene el soporte documentado del modelo exacto de CPU en el modelo exacto de placa (socket solo
  no alcanza). La versión de BIOS guardada se conserva y se muestra como dato, nunca como aprobación.
- La fuente se compara con la mayor recomendación publicada por fabricante, para cualquier plataforma.
- Un M.2 no exige dato de alimentación SATA. Dos sockets documentados distintos fallan sin fila de soporte.
- JEDEC, ECC, ATX24, EPS y largo de fuente dejan de bloquear: si faltan no importan, y si están y chocan
  fallan. Toda fuente ATX trae esos conectores de placa y casi ninguna ficha lo rotula; exigirlos volvería
  a dejar en «Falta un dato» a PCs comunes.
- El resultado «Encaja» aclara que refrigeración y ventiladores no se evaluaron.
- Las evaluaciones guardadas y los enlaces públicos viejos conservan su versión y su política; el motor
  `tower-essential-policy-1` queda como contrato histórico y el motor stock v1 como referencia. Ninguno se
  usa para evaluar de nuevo. Compartir acepta las tres versiones, cada una validada contra su contrato.

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
