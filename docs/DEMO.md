# Demo local — UpgradeJusto

## Presentación visual revisada26/10

La referencia «Tu próxima mejora» y el resto de la entrega fueron inspeccionados
con imágenes reales1440/390. Revisión independiente funcional y visual aprobada;
recorridos reales y build final verificados. El motor básico anterior se conserva.
[Checkpoint y capturas](ai-log/2026-10-26-entrega-visual.md).

### Abrir el entorno existente

Desde PowerShell en la raíz, con PostgreSQL local existente disponible y puertos
3000/8000 libres: `./scripts/dev.ps1 -SystemTrust`. Abrir
`http://127.0.0.1:3000/pcs`; cuenta en `/account`, catálogo público en `/catalog`.
El script carga configuración protegida existente y Ctrl+C detiene sus procesos.
No iniciar Playwright simultáneamente ni repetir instalaciones/bootstrap/seed.

### Recorrido de presentación

- **Tu próxima mejora:** elegir PC propia, mostrar seis componentes, comprobar,
  elegir objetivo/presupuesto y sustitución explícita; «Buscar mejora». Comparar
  antes→después, capacidad documentada, coste/presupuesto y condiciones históricas.
- **No todo es compatible:** mostrar largo GPU incompatible, BIOS sin dato y
  presupuesto insuficiente. El detalle técnico está disponible, pero bloqueantes
  y advertencia breve siguen visibles. Simular/comparar no cambia la PC guardada.
- **Importación:** pegar texto sintético, revisar/editar propuesta y confirmar;
  demostrar que extraer/cancelar no persiste nada.
- **Planes/enlaces:** etapas acumuladas, borrador, confirmación de recálculo,
  enlace de solo lectura y revocación. No reinterpretar resultados históricos.
- **Asistente:** conversación sintética propia, streaming/cancelación y fuentes;
  nunca mostrar prompts internos, credenciales ni conversaciones ajenas.
- **Administración:** cuenta de prueba con rol servidor conocido, borrador y
  publicación confirmada. Una cuenta normal no adquiere permisos por navegación.

Ilustraciones locales identificadas como tales, no fotos de productos. Sin fuentes
remotas necesarias para arrancar. No presentar datos o precios desconocidos como0.

## Recorrido vigente CU05/CU06, cierre local25/10

Usar cuentas sintéticas propias con el catálogo importado activo. No reejecutar
setup, bootstrap, seeds o adquisición por rutina. No cambiar PCs del usuario.

1. Catálogo:14 piezas, seis categorías, fuentes BuildCores/docyx y fabricante.
   Los precios son históricos ARS; USD docyx2025 no es una oferta argentina.
2. En `/pcs`, crear demo A: P01/P03/2×P04/P06/P07/P09; BIOS P2.30.
   Evaluar: **compatible en alcance básico stock**, siete checks y advertencias.
   Mostrar scope, supuestos, exclusiones y faltantes, no solo el color del estado.
3. Demo B: P02/P03/2×P05/P06/P08/P10, misma BIOS: compatible básico.
   Simular P16: incompatible por329mm frente al límite315mm. BIOS null: requiere
   verificación. No guardar automáticamente ninguna simulación.
4. Sobre A, objetivo GENERAL, sustituir RAM por2×P05: total ARS766417.98 y capacidad
   16→32GB. Presupuesto1.000.000 recomienda;766417.97 rechaza. No prometer FPS.
5. P15 sola con CX550 se rechaza; P15+P08, presupuesto2.000.000, total1882130,
   recomendación básica con beneficio documentado VRAM8→12GB, no rendimiento medido.
6. Plan acumulado, enlace de solo lectura/revocación y asistente conservan alcance,
   warnings e identidad servidor. El LLM explica, no decide ni certifica físicamente.

Stock sin OC/PBO, una GPU, desktop convencional; no certifica instalación real,
cooler/cables, geometría avanzada, transitorios o térmica/electricidad exhaustiva.
El 5700X no incluye cooler. La contradicción12V RM750e sigue visible. Datos
necesarios desconocidos o contradictorios dentro del alcance no pasan a compatible.

Evidencia real final:4 consumidores web aprobados,1 LIVE asistente Groq+PG,
1 recorrido de capturas con ambas demos/negativo/unknown/recomendaciones/móvil.
[Bitácora y capturas antes/después](ai-log/2026-10-25-alcance-basico-datasets.md).
Diez CU funcionales locales respecto de sus contratos actuales; no despliegue ni
cumplimiento del alcance físico exhaustivo anterior. Revisión independiente aprobada.

## Límites de esta entrega e historia

- Para extraer RAM, escribir cantidades numéricas explícitas, por ejemplo
  `2x Kingston KVR32N22S8/8`. Cantidades en palabras no están garantizadas por el
  validador actual. Siempre revisar propuesta y confirmar, sin detección local.
- Precios históricos, no ofertas vigentes; ilustraciones de categoría, no fotos
  de los modelos. No se certifican montaje físico ni térmica/electricidad exhaustiva.
- Administración exige rol resuelto por servidor. Usar únicamente la cuenta de
  prueba ya preparada; no repetir bootstrap ni proyectar sus credenciales.
- Un fallo de proveedor se muestra como error, nunca como respuesta simulada. Las
  citas y explicaciones del asistente no sustituyen al motor determinístico.
- El relato de etapas anteriores permanece en [SPRINT32](SPRINT32.md),
  [SPRINT33](SPRINT33.md), [bitácora anterior CU05/06](ai-log/2026-10-25-cu05-cu06-evidencia.md)
  y [cierre básico](ai-log/2026-10-25-alcance-basico-datasets.md). Sus estados parciales
  históricos no son instrucciones de la demo vigente; ninguna bitácora se borró.
- [Inventario para revisión Git futura](ENTREGA_LOCAL_INVENTARIO.md): revisar archivos,
  historial/destino/visibilidad antes de seleccionar. Sin staging, commits, push ni
  despliegue en esta ejecución.
