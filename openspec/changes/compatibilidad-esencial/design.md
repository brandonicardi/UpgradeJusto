# Design

## Context

`evaluate_tower` compone `evaluate_basic` (B01–B07) con T08–T12. Sus requisitos son los de una
certificación: la aplicabilidad de la fuente solo acepta Ryzen 5000 en AM4, B02 exige JEDEC y ECC, T10
exige un total de corriente que las placas no publican y T11 pide confirmar la presencia de coolers.
Referentes: SiliconPickers declara alcance y datos sin verificar; PCBuildSage separa reglas, registro y
explicación. RigCrafter toma TDP faltante como 0 y suma 100 W fijos: esa conducta se descarta.

## Goals / Non-Goals

**Goals:** un veredicto útil con piezas reales, sin aprobar por falta de datos.

**Non-Goals:** evaluar refrigeración, ventiladores o velocidades de memoria; estimar consumo; usar datos
sin fuente; reescribir evaluaciones guardadas.

## Decisions

- **Módulo nuevo, no parámetros.** `tower_essential.py` reescribe las reglas cortas y reutiliza `Check`,
  `_allocate`, `_validated_specs` y el soporte de CPU. El motor stock no cambia. Alternativa descartada:
  una bandera en `evaluate_basic`, que mezcla dos contratos en la misma función.
- **Mismos identificadores.** T01–T08 y T11 conservan su significado, así la interfaz y las etiquetas no
  cambian. T09, T10 y T12 no se emiten: no son `pass` ni `not_applicable` sino fuera de alcance, y lo dice
  `additional_checks`.
- **Soporte por modelo y BIOS.** Igual sockets no alcanza: hace falta la fila exacta de CPU y placa, si no
  queda desconocido. BIOS sin declarar queda desconocido. BIOS anterior documentada falla.
- **Fuente.** `continuous_power_w ≥ max(recomendaciones publicadas)`. Sin ninguna recomendación queda
  desconocido, nunca cero. No se suman TDP ni se agrega reserva.
- **Almacenamiento.** Puerto por interfaz y forma; bahía y alimentación solo para SATA. Las exclusiones de
  a pares documentadas se respetan; los presupuestos compartidos quedan fuera.
- **Opcional no es ignorado.** Lo que deja de ser obligatorio se sigue leyendo: si está y choca, falla.
- **Compartir.** `tower_registry` acepta los dos orígenes y la proyección valida cada uno contra su propia
  lista de reglas, sin aflojar el viejo.

## Risks / Trade-offs

- [«Encaja» sin evaluar refrigeración] → el resultado lo dice junto al veredicto.
- [Recomendación de fuente pensada para otro sistema] → es la cifra publicada; se aclara que no es consumo.
- [Motor v1 sin uso en producción] → se conserva por sus pruebas de contrato; se puede borrar más adelante.
