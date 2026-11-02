# Evidencia nominal torre38 — investigación, no certificado de compatibilidad

Consulta26/10/2026. Separa fuentes leídas directamente de índices de búsqueda.
No datos de fabricante inventados ni evidencia sintética presentada como real.

## ASRock B550M Pro4 original (no Pro SE)

Manual oficial: https://download.asrock.com/Manual/B550M%20Pro4.pdf
Build descargó PDF directamente: HTTP200,5277162 bytes, SHA256
`51e64b0c82ce2e77236a89500e42b5f05858920e248d436bb0e931733ab2b319`.
PDF protegido conservado local ignorado, no redistribuido. Extracción con pypdf
existente: aviso de fontTools ausente; no instalación. Se verificó texto legible de
secciones concretas, no asumir completas las partes con problemas de codificación.
Primer print de texto con µ falló por cp1252 del terminal; JSON escapado corrigió
salida, sin modificar fuente ni datos.

- PDFp8/manualp2: PCIE1 Gen4×16 con Matisse, Gen3×16 con Renoir; PCIE3 Gen3×4.
  No extrapolar automáticamente la tabla antigua a soporte exacto Ryzen5000/BIOS;
  conservar lista CPU/BIOS curada previa como fuente separada.
- PDFp10/manualp4: seis SATA3; M2_1 M-Key2280 PCIe hastaGen4×4/Matisse oGen3×4/Renoir.
  M2_2 M-Key2280 SATA oPCIeGen3×2. **M2_2 comparte con SATA3_5_6: usar uno desactiva otro**.
- PDFp11/manualp5: CPU_FAN1 4pines, máximo1A/12W. CPU_FAN2/WP 4pines. Cuatro
  CHA_FAN/WP 4pines; texto indica máximo2A/24W de fan de chasis/waterpump.
  CPU_FAN2 yCHA_FAN1–4 detectan3/4pines.
- PDFp35–36/manualp29–30: conexión3pines en1–3 de header4pines; pin de alimentación
  rotulado FAN_VOLTAGE. No confundir límites RGB12V/3A/36W yARGB5V/3A/15W con fans.

No hay en esas secciones un presupuesto agregado global de todos los headers.
**No sumar máximos y presentar esa suma como límite global del fabricante.**
La política de aplicabilidad de ese dato debe resolverse explícitamente antes de
verde; tampoco inventar conflicto GPU/M2 por chipset o silencio documental.

## DeepCool AG400 exacto

https://www.deepcool.com/products/Cooling/cpuaircoolers/GAMMAXX-AG400-Single-Tower-CPU-Cooler-1851-1700-AM5/2024/15898.shtml
Lectura directa por investigadora y Build: Application For/Technical Spec:
P/N `R-AG400-BKNNMN-G-1`, EAN6933412727590; AM4/AM5;125×92×150mm;
ventilador120×120×25mm,4-pinPWM,12VDC,0.17A,2.04W. No usar claim comercial220W
como certificación de temperatura/demanda eléctrica del CPU.

Manual enlazado real: https://www.deepcool.com/download/pdf/AG400&AG400_LED.pdf
HTTP200,1828568 bytes/20 páginas; SHA256
`83909972990a7197e1dec9614141840fbbcca1aed47a5833cf5e3153da052de7`.
Páginas principalmente diagramas; texto extraído no prueba contenido del paquete.
**Pasta incluida permanece desconocida** hasta observar su evidencia, no trasladar
afirmaciones de AK400/AG400ARGB ni añadir coste desconocido universal a todo cambioCPU.

## Kingston NV3 500GB y gabinete/fans

Investigadora leyó producto oficial https://www.kingston.com/en/ssd/nv3-nvme-pcie-ssd:
M.22280,500GB,PCIe4.0×4NVMe,22×80×2.3mm. Referencia de datasheet oficial
https://www.kingston.com/datasheets/SNV3S_us.pdf apunta a `SNV3S/500G`;
confirmar directamente ese identificador antes de asociar SKU de tienda. No confundir2230.

Verificación directa posterior Build: página HTML devuelve403; no se eludió bloqueo.
El datasheet oficial enlazado sí respondió200,137129 bytes/2 páginas, SHA256
`bb95b3a56ad52ae572c3f56f93433c22439be0ded3218dbcef86e49d6ec01e6b`.
Texto legible p1: M.22280,PCIe4.0×4NVMe,500GB,22×80×2.3mm. P2 Part Numbers
M.22280 identifica `SNV3S/500G`; M.22230 es `SNV3SM3/500G`, distinto. Documento
MKD-06162025, copyright2025. No usar velocidades secuenciales como rendimiento de
objetivo general ni asumir precio/stock; crosswalk retail aún requiere MPN exacto.

Cruce posterior Build **solo lectura TEST**: recurso publicado `cg-20214` declara
`identity.mpn=SNV3S/500G`, categoría storage y vendorID20214. Coincide exactamente
con Part Numbers del PDF anterior; no comparación por título ni GTIN. Esto habilita
curación nominal de esa variante con su fuente registrada, todavía no publicada por
este documento. La misma consulta no encontró AG400 en el catálogo activo; no
reutilizar AG400ARGB/AK400 ni inventar una oferta para resolverlo.

Publicación posterior **solo TEST**, con rol PG fresco vía CU10 existente:
`revision-3014a27f8dee4150b16d83d756a2a3cb`, sobre691 registros conservados. Para
`cg-20214` se publicaron únicamente `storage_interface:M2-NVMe` y `storage_form:2280`
en envelope tipado ligado a MPN/fuente exactos. Entrada pública de observaciones:
`backend/data/technical38/kingston-nv3-500g-observation.json`, SHA256
`59c1d8be74e929cc6b1f6fca47399483ea5d7ae47343ced00cffa443c7f2b9da`.
Se contrastaron recurso retail completo antes/después e histórico intactos; fecha,
precio, stock y foto no se refrescaron. No se publicaron watts, conectores de energía
ni compatibilidad inferidos. Dos hechos reales no completan toda la evaluación.

Fractal Meshify C Black Solid `FD-CA-MESH-C-BKO`: investigación registra dos DynamicX2
GP-12 de120mm incluidos y máximo cooler170mm; enlace histórico oficial
https://www.fractal-design.com/products/cases/meshify-series/meshify-c/meshify-c.
Dato por registrar contra documento descargable antes de publicación técnica nueva.

Búsqueda del documento oficial DynamicX2 devuelve3pines,12V,0.18A máximo y1.32W
nominal para GP-12 **noPWM**. No usar variante PWM0.2A. Consulta directa de la URL
histórica actual redirigió a listado de fans nuevos, no confirmó la ficha antigua;
descarga del antiguo product-sheet devolvió HTTPError. No convertir extracto indexado
en lectura directa aprobada ni deducir corriente a partir de RPM/CFM/potencia.

## Estado

Evidencia parcial legítima para curación versionada posterior. No se ha incorporado
al catálogo/motor por este documento, ni demostrado aún un positivo real completo.
Faltantes concretos: fuente directa del fan incluido, política de límites agregados,
contenido térmico del paquete si materialmente necesario y crosswalk de variante.

### Aplicabilidad T10 — contraste de fuente, no nueva política

Build leyó `backend/upgradejusto/compatibility/tower_engine.py:358–410`: la lectura
de `motherboard.fan_total_current_ma` en399 es incondicional, aun si no se construyeron
cargas. Revisor independiente contrastó el fragmento transmitido con contrato38:
el caso sin cargas reales documentadas merece criterio explícito de inaplicabilidad
y prueba T10 aislada; esa prueba no se ejecutó ni demuestra hardware/positivo global.
Cantidad desconocida no es cero: su lectura previa conserva el faltante.

Para cargas positivas, límites por header no prueban límite agregado ni su ausencia.
Resolver ese requisito exige fuente y decisión contractual versionada; no sumar
headers ni cambiar unknown por compatible. Corriente GP12 continúa sin fuente directa
recuperada válida. No se cambió regla, dataset, revisión previa ni política por este
contraste. Próximo mínimo: evidencia eléctrica por variante/conexión; si falta agregado,
definición acotada de aplicabilidad antes de implementar, no investigación indefinida.
