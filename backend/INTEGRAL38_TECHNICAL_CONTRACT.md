# Technical38 — contrato propuesto para aceptación antes de código

Estado: CONTRATO2 ACEPTADO por Build26/10/2026; delta CU05/CU10 aplicado por Build
ANTES de autorizar implementación. Representación/publicación únicamente. Sin datos técnicos nuevos,
pruebas ejecutadas, adaptación del motor ni compatibilidad aprobada por este documento.

## 1. Transporte y ownership

`Component.attributes.tower_stock_v1` es JSON serializado como string, no objeto HTTP.
Se conserva `basic_stock_v1` sin modificación. No migración: JSONB existente.
Esquema cerrado `version:1`; no extensiones, reglas, resultados, flags para desactivar
comprobaciones, expresiones, SQL ni código. Cada objeto rechaza claves duplicadas y
extras; listas son arrays JSON reales, no strings separadas por comas/substrings.
Fotos, ofertas, títulos retail y atributos de presentación no generan estos hechos.

Futuros únicos archivos de implementación de este bloque: retail/technical_*.py,
administration/models.py, administration/validation.py,
administration/repository.py (conservación de procedencia, §6) y nuevos tests
test_tower38_technical*.py. B3 conserva compatibility/tower_* y decide adaptación.
No se modifican políticas stock/eléctricas, HTTP, identidad, sesiones ni límites37.

## 2. Envelope cerrado

Claves EXACTAS: `version,identity,data,fields,conflicts,import_digest`.

- version: entero estricto1; bool no es entero.
- import_digest: SHA256 hexadecimal minúsculas64 del artefacto técnico de adquisición
  congelado; no hash de foto ni contraseña. Es trazabilidad declarada, no certificación.
- identity: `{component_id,category,name,manufacturer_part_number,source_refs}`.
  component_id1..200, name1..200 canonical strip únicamente, category exacta del
  componente; manufacturer_part_number texto1..200 o null, sin alias/UPC como MPN.
  source_refs:1..30 referencias de identidad. ID/categoría/nombre deben coincidir
  exactamente con la fila materializada (nombre tras strip solamente). Una edición
  real de identidad exige renovar/revisar envelope: nunca trasladar por similitud.
  MPN es afirmación curada ligada a esas referencias; no crea crosswalk ni fusiona IDs.
  MPN null no identifica otra variante ni permite heredar especificaciones por nombre.
- data: objeto solo con valores documentados, tipados por categoría, nunca null.
  Campo omitido = desconocido; no default cero/false/lista vacía.
- fields: EXACTAMENTE las claves presentes en data. Cada valor es array1..30 de
  SourceRef. Todo el valor compuesto de un campo queda respaldado por sus referencias;
  una lista parcial no se puede declarar inventario completo.
- conflicts: objeto por campo permitido; cada valor array2..8 de
  `{value:<tipo del campo>,source_refs:[SourceRef,...]}`. Debe contener al menos dos
  valores distintos y documentados. Ese campo no aparece en data/fields: queda
  desconocido para el adaptador. No resolución por orden, mayoría o fuente reciente.

`SourceRef={source_id,url,consulted_on,locator}`; strings estrictos no vacíos,
source_id1..200, URL1..2000, locator1..2000, consulted_on fecha ISO YYYY-MM-DD.
No descarga, DNS ni acceso de archivos. Se usa validador de procedencia SourceData
existente: esta publicación no es un downloader ni amplía protocolos de adquisición.

En materialize, CADA referencia (identidad, datos, conflictos) debe resolver UNA
SourceData de esa misma revisión por source_id/url/fecha/locator exactos, y su par
(source_id,url) debe estar en component.sources. Referencias ausentes, ambiguas o
discrepantes:422, publicación completa rollback, puntero sin cambios. Máximo30 fuentes
del componente existente se conserva; un mismo documento puede respaldar varios campos.
La procedencia acredita la afirmación curada; validación estructural no lee/verifica
automáticamente el contenido de un manual ni prueba equivalencia de variantes.

## 3. Campos y tipos nominales

Todos los números de esta versión son enteros JSON estrictos y finitos, sin floats,
booleanos, texto numérico o unidades embebidas. No conversiones de texto fabricante.
Medidas fraccionarias no representables exactamente como mm enteros quedan fuera
de versión1: no redondear ni truncar para publicar; omitir conserva desconocido.
Positivo =1..1000000000; Count=0..1000000. Cero SOLO es válido en Count y debe tener
evidencia explícita de cero; ausencia de evidencia nunca lo genera. Strings1..100,
strip sin casefold, sin controles. Colecciones sin duplicados, máximo64 elementos.

| Categoría | Claves permitidas y tipos |
|---|---|
| motherboard | tower_ports:NominalResource[]; fan_headers:NominalResource[]; shared_limits:SharedLimit[]; fan_total_current_ma:Count |
| case | storage_bays:NominalResource[]; cooler_height_limit_mm:Positivo; fan_positions:Count; fan_supported_sizes_mm:Positivo[] |
| storage | storage_interface:enum; storage_form:enum; sata_power_count:Count |
| cooler | cooler_sockets:string[]; cooler_type:air\|liquid\|passive; cooler_height_mm:Positivo; fan_count:Count; fan_voltage_mv:Positivo; fan_current_ma:Positivo; fan_connector:enum; thermal_compound_required_on_remount:bool; thermal_compound_included:bool |
| fan | fan_size_mm:Positivo; fan_voltage_mv:Positivo; fan_current_ma:Positivo; fan_connector:enum |
| gpu | tower_port_kind:enum; tower_port_form:enum |
| psu | sata_power_count:Count |
| cpu | stock_cooler_included:bool estricto; cooler_sockets/cooler_type/cooler_height_mm/fan_count/fan_voltage_mv/fan_current_ma/fan_connector/thermal_compound_required_on_remount/thermal_compound_included con tipos cooler, SOLO del cooler incluido exacto documentado |

RAM: sin campos tower en versión1 (no envelope RAM); mantiene contrato básico.
CPU stock_cooler_included:false no autoriza inventar detalles del cooler; detalles
de cooler incluido requieren stock_cooler_included:true con evidencia. Un false
aislado es ausencia explícitamente documentada, no default.

Steering autorizado26/10, documentado ANTES de implementar esos dos campos:
thermal_compound_required_on_remount y thermal_compound_included son bool estrictos
con SourceRef como cualquier otro hecho, solo cooler/CPU con cooler incluido
documentado. Omitidos siguen desconocidos. required_on_remount requiere fabricante
o instalación documentada; no inferir necesidad universal por cambiar CPU/placa.
included describe el PAQUETE NUEVO documentado, no remanente en cooler usado,
disponibilidad del usuario ni pasta reutilizable ilimitadamente. El consumidor CU06
debe distinguir operación/producto nuevo y confirmación explícita de materiales.
Build actualizará la aclaración en specs antes de habilitar consumidor. AG400 no
recibe valores aquí: inclusión actualmente desconocida según comunicación Build.

Vocabulario exacto inicial de publicación; su consumo exige adaptación explícita B3,
no se afirma que estos objetos ya estén conectados al motor existente:
- storage_interface: SATA|M2-NVMe|M2-SATA.
- storage_form: 2.5-inch|3.5-inch|2242|2260|2280|22110.
- tower_port_kind: PCIe; tower_port_form: x1|x4|x8|x16.
- fan_connector: 3pin|4pin. Es conector nominal, no prueba de regulación PWM/DC.
  Se conservan estos tokens exactos también en accepts de fan_headers; no aliases
  fan3/fan4 ni traducciones implícitas. Cualquier traducción de DTO futuro debe ser
  explícita/versionada por B3, nunca matching aproximado.
- cooler_sockets: identificadores exactos documentados (ejemplo sintético AM4 no
  se transforma en AM5); no substring ni alias aproximado.

`NominalResource={resource_id,kind,accepts,voltage_mv,max_current_ma,excludes,group,cost}`
con TODAS las claves requeridas, igual forma JSON que DTO nominal del dominio:
- resource_id1..100 único en todas las colecciones de recursos del componente.
- kind según contexto: tower_ports=SATA|M2-NVMe|M2-SATA|PCIe;
  fan_headers=fan; storage_bays=storage-bay. El kind fan es etiqueta nominal de
  publicación: no introduce validación eléctrica ni exige al motor un hardcode nuevo.
- accepts array1..16, valores del vocabulario correspondiente: storage_form para
  puertos storage/bahías; tower_port_form para PCIe; fan_connector para headers.
- voltage_mv/max_current_ma:Positivo|null; null mantiene límite desconocido,
  no cero. Solo fan_headers admite valores no null en versión1.
- excludes:array0..64 de resource_id distintos existentes en la misma colección;
  sin autorreferencia. Exclusión declarada no exige inventar relación simétrica.
- group:string1..100|null; cost:Positivo (sin coste monetario, unidad de recurso).
  Grupo no null exige SharedLimit del mismo componente. No fórmulas ni prioridades.

`SharedLimit={group:string1..100,capacity:Count}`; grupos únicos, máximo64.
Las listas tower_ports/fan_headers/storage_bays/shared_limits pueden ser [] SOLO
cuando la fuente acredita inventario completo vacío o ausencia de restricciones
compartidas aplicables. No completar inventarios con defaults. Si la lista no es
exhaustiva, se omite el campo entero: versión1 no expresa subconjuntos como completos.

Estos límites representan observaciones; no fijan política eléctrica. En especial,
fan_total_current_ma solo puede publicarse si la fuente acredita ESE límite global;
no se deriva sumando headers. Si falta, se omite. Tratamiento de su necesidad y
alcance eléctrico global queda a resolución explícita B3/coordinación, no a B2.

## 4. Conflictos, límites y coexistencia

No sobrescribir semánticamente basic_stock_v1. Para claves solapadas actualmente
(case.cooler_height_limit_mm), un valor tower distinto del básico documentado provoca
422 salvo representación explícita en conflicts con ambos valores y referencias
registradas. Nunca se elimina/edita envelope básico automáticamente. Adaptador futuro
debe dominar con desconocido en ese campo; no seleccionar silenciosamente un envelope.
Duplicados JSON, recursos/grupos repetidos o dos valores conocidos competidores en
data se rechazan. Observaciones divergentes se publican solo como conflicto explícito.
No probar resolución del conflicto ni cobertura completa en este bloque.

Límites: tower_stock_v1 máximo24000 BYTES UTF8; solo esta clave obtiene excepción al
límite2000 caracteres de atributos legacy. Máximo500 ocurrencias SourceRef en total
por envelope (incluye identidad/conflictos),30 por lista,64 recursos por colección,
64 grupos,8 observaciones por conflicto; envelope de categoría limita claves al
cuadro. Más de500 referencias es422. Cap de cuerpo37 existente conserva prioridad:
el JSON exterior/escaping también cuenta; se conserva el cap37 aplicable a la ruta,
sin ampliarlo. No confundir CU10/general (262144) con extracción (65536).
No recepción masiva sin cota, reconfiguración de cuotas ni nuevo proveedor.

## 5. Ejemplo exclusivamente SINTÉTICO, no evidencia de hardware

Valor string de attributes.tower_stock_v1 (aquí mostrado como JSON para legibilidad):

```json
{
  "version": 1,
  "identity": {
    "component_id": "synthetic-storage-38",
    "category": "storage",
    "name": "SYNTHETIC TEST DRIVE",
    "manufacturer_part_number": null,
    "source_refs": [{"source_id":"synthetic-manual","url":"https://example.com/synthetic-manual","consulted_on":"2026-10-26","locator":"SYNTHETIC fixture section"}]
  },
  "data": {"storage_interface":"M2-NVMe","storage_form":"2280","sata_power_count":0},
  "fields": {
    "storage_interface":[{"source_id":"synthetic-manual","url":"https://example.com/synthetic-manual","consulted_on":"2026-10-26","locator":"SYNTHETIC fixture section"}],
    "storage_form":[{"source_id":"synthetic-manual","url":"https://example.com/synthetic-manual","consulted_on":"2026-10-26","locator":"SYNTHETIC fixture section"}],
    "sata_power_count":[{"source_id":"synthetic-manual","url":"https://example.com/synthetic-manual","consulted_on":"2026-10-26","locator":"SYNTHETIC fixture section"}]
  },
  "conflicts": {},
  "import_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

Este ejemplo no acredita socket, consumo, rendimiento, precio ni compatibilidad.

## 6. Operaciones CU10 existentes, sin endpoint nuevo

1. POST /api/admin/revisions `{base_version:ACTIVE}` crea draft por identidad servidor.
2. POST /api/admin/revisions/DRAFT/sources `{data:{source_id,url,consulted_on,locator}}`
   registra referencias (o usa filas existentes exactas). El row_id de colección
   no sustituye source_id; no permitir ambigüedad de source_id al publicar tower.
3. PATCH /api/admin/revisions/DRAFT/components/COMPONENT_ROW_ID
   `{data:{attributes:<objeto COMPLETO preservando atributos previos y añadiendo
   tower_stock_v1:string>,sources:<lista COMPLETA preservando fuentes y agregando las
   técnicas necesarias>}}`. PATCH de attributes sustituye objeto, no deep-merge:
   cliente conserva explícitamente basic_stock_v1 y otros valores existentes.
   COMPONENT_ROW_ID es el ID materializado que identity.component_id debe reproducir.
4. POST /api/admin/revisions/DRAFT/publish `{expected_active_version:ACTIVE}` valida
   lote completo y referencias, publica atómicamente con rol fresco PG. Fallos422,
   conflicto revisión409, rol403. Sesión/CSRF/cuotas37 permanecen como están.

No user_id/owner del modelo autorizante. Política de conservación de procedencia
para implementar tras aceptación (NO comportamiento ya implementado):

- Mismo component_id; nombre idéntico tras strip únicamente y categoría idéntica.
- El conjunto nuevo de component.sources contiene TODAS las parejas (source_id,url)
  anteriores, intactas. Se permite exclusivamente añadir fuentes técnicas; no
  eliminar una previa ni cambiar su URL bajo el mismo ID. Cambiar nombre real,
  categoría o retirar/cambiar parejas mantiene el guard conservador: no heredar.
- Antes de conservar cada recurso, identity.store/product_id/variant_key/mpn/gtin
  permanecen exactamente como estaban ligados a ese component_id; no reasignar un
  recurso ni reconciliar otra pieza. identity.source_url debe seguir en las fuentes
  nuevas del componente y los SourceRef técnicos deben pasar materialize por separado.
  Para IDs vendor, comprobar además correspondencia determinística store/product_id
  con component_id. No deducir igualdad de MPN desde GTIN, nombre o envelope ajeno.
- Agregar fuentes no modifica identity retail, imagen ni offers: se copia el recurso
  completo solo a la NUEVA revisión. Las publicaciones y quotes previas no cambian.
  component.sources solo contiene id/url: fechas/locators de SourceData se validan
  por los SourceRef técnicos, pero no se usan para rejuvenecer ni reescribir registros
  de adquisición/ofertas ya congelados. La conservación de fuentes id/url no afirma
  por sí sola que un manual describa la variante: sigue obligatorio el binding exacto
  identity del envelope a ID/categoría/nombre materializados; discrepancia es422.

Esto permite, por ejemplo conceptual, añadir fuente AMD a cg-13355 sin perder su
oferta si cumple todas esas condiciones. No publica aquí datos AMD ni MPN/atributos
de ese producto. Es conservación de identidad/procedencia, NO regla de compatibilidad.
La futura implementación se limita a administration/repository.py y tests propios;
retail/repository.py no requiere cambio para este supuesto de superset conservado.
No existe recuperación automática de recursos retirados: el refresh retail actual
pone en cuarentena un ID existente sin previous_identity. No prometer que un refresh
comercial reponga recursos después de incumplir el guard ni eludir esa cuarentena.

## 7. Aceptación antes de integración del motor

- Pure: forma cerrada/duplicados; tipos estrictos/NaN/Infinity/bools como números;
  campos por categoría, inventarios, grupos/exclusiones y enums exactos; byte cap,
  501 refs rechazadas; ausencia preservada como unknown; conflictos no defaults.
- PG TEST real: rol fresco/revocación; referencias ID/URL/fecha/locator y fuentes
  del componente exactas; identidad incorrecta y solapamiento básico conflictivo422;
  atomicidad, puntero intacto al fallar, revisión anterior inmutable y reproducible.
- Publicación/republish: conserva basic_stock_v1; refresh comercial conserva técnica;
  recursos/quotes previos inmutables; conservación retail con fuentes sin cambios y
  con superset técnico documentado que satisface §6. Verificar oferta/foto intactas
  y no rejuvenecidas; misma identidad, origen retail retenido y recursos anteriores
  inmutables. Retirada/cambio de fuente previa, nombre/categoría distintos o identidad
  retail inconsistente no heredan; binding técnico incorrecto rechaza publicación.
- No fetch/SQL/proveedor desde datos; rutas existentes conservan controles37.
- B3 integra resolver separado después de READY y con versión/digest en evaluación;
  debe mantener fail dominante/faltantes y unknown para evidencia ausente/conflictiva.
  Este bloque solo habilita publicar observaciones: NO demuestra verde ni cierre CU05.
