# Integral38 — contrato servidor/frontend, revisión2

Estado: contrato de integración definido; NO endpoints38 implementados ni cierre.
Encargo completo recibido por transmisión del coordinador. Patch conjunto de este
archivo y specs externas fue denegado; esta entrega se limita a backend. Coordinación
confirmó que Build YA aplicó el delta38 a las diez specs CU01–CU10 y aceptó revisión2
antes de implementación38A. Históricos37 y
cu05-basic-stock-1 permanecen vigentes para sus versiones, no para torre completa.

## 1. Torre versionada: API/DTO para frontend

Nueve categorías exactas: cpu,motherboard,ram,gpu,psu,case,storage,cooler,fan.
Monitor/periféricos fuera. Rutas nuevas `/api/towers` reutilizan header/ID/revisión
de PCs y propietario servidor. Rutas `/api/pcs` legacy siguen seis categorías; una
torre guardada en v2 no se puede editar/evaluar por proyección legacy truncada:
409 `Tower configuration requires tower API`.

`TowerCreate={schema_version:2,name,category_status,lines,context}`.
`TowerUpdate=TowerCreate+{revision:int>=1}`.
`Tower=TowerCreate+{id:UUID,revision:int>=1,origin_schema:1|2}`.
`context={bios_version:string|null,notes:string|null}` con límites100/1000 actuales.
category_status tiene EXACTAMENTE las nueve claves, valores present|unknown|absent.
present requiere al menos una línea; unknown/absent no admite líneas. Unknown NO es
ausencia. Ausencia declarada no elimina necesidades: un CPU puede requerir cooler o
salida gráfica aunque el usuario declare que no tiene esas piezas.

`lines[]={line_id:UUID|null,category,component_id:string|null,
declared_model:string|null,quantity:int}`. Exactamente uno de component_id o
declared_model, texto1..200 sin especificaciones deducidas. Nuevas líneas omiten o
envían null line_id; servidor asigna UUID. Existing line_id debe pertenecer a esa PC.
Respuesta tiene UUID siempre. CPU/placa/GPU/PSU/gabinete/cooler: una línea/quantity1.
RAM máximo4 grupos/16 módulos; storage máximo16 discos totales; fan máximo8 grupos/
32 unidades; máximo36 líneas. Son cotas del DTO, NO compatibilidad presumida.
RAM quantity son módulos; GB por módulo/total solo se derivan de evidencia confiable,
si falta quedan null. No parsear declarados como especificaciones.

GET `/api/towers?page=1&page_size=20` → `{items:[Tower],total,page,page_size}`;
page_size1..50. POST201, GET/PUT `/api/towers/{id}`200, DELETE204. Ownership404,
revisión409, inválidos422. GET legacy → adaptación sin escritura origin_schema1,
UUID línea determinista por PC/categoría, categorías faltantes unknown, no absent.
Primer PUT explícito guarda v2. No migración/reinterpretación por leer.

POST `/api/towers/{id}/simulate`:
`{expected_pc_revision,actions:[{action,category,line_id,candidates,candidate_context}]}`.
action=replace_category|replace_line|add_line|remove_line. candidates contiene
`{component_id,declared_model,quantity}` con la misma exclusión de línea.
replace_category retira todo el conjunto anterior; obligatorio para RAM. add_line
solo storage/fan. replace_line/remove_line exigen línea propia de categoría;
remove_line usa candidates vacío. candidate_context solo motherboard y contiene
`{bios_version:string|null}`. Reemplazar motherboard NO hereda BIOS si se omite:
queda null. Consultar/simular no persiste. No owner_id ni resultados cliente.

## 2. Persistencia38A

Migración aditiva38_a_001 parent37_001: tower_configurations(pc_id PK/FK pcs,
schema_version2,category_status JSONB), tower_lines(PK pc_id,line_id UUID,
category,component_id nullable,dataset_version nullable,declared_model nullable,
quantity,position). XOR selección/declaración, FK catálogo versionado cuando hay
selección, cantidades/checks explícitos. No PK por categoría para múltiples discos.
pc_component_groups y JSON históricos se conservan, sin backfill destructivo.
Constraint catálogo se amplía a nueve categorías en revisión nueva. Gate TEST sobre
copia sintética de versión anterior; no migrar/borrar datos DEV como prueba.

## 3. Catálogo, imágenes y ofertas38B

GET catálogo conserva query/paginación; GET por ID resuelve cualquiera, también>50.
Todos los flujos resuelven IDs servidor, no buscando solo en primeras50 opciones.
Sin recorte60 ni inflación con duplicados/periféricos. Columnas image:null antiguas
quedan históricas: evidencia visual/ofertas se almacenan en recursos versionados
por publicación, se agregan al DTO leído, nunca alteran publicaciones anteriores.

`ImageEvidence={url,alt,source_url,retrieved_at,rights_note,exact_variant,status}`;
status verified|unavailable|quarantined. Component.image es null si no hay foto
verified/variante exacta con HTTPS y host permitido. Alt/fallback honestos siempre.
No URL del usuario/modelo; no SVG/data/file, credenciales, IP privada o redirect.
Este bloque referencia URLs verificadas, NO proxy descargador general. Una descarga
servidor futura exige gate SSRF/tipo/tamaño/tiempo separado. Fotos no prueban compat.
La licencia dataset no concede derechos de fotos; conservar derechos/condiciones,
origen y fecha; no redistribuir imágenes/código sin licencia probada.

`Offer={offer_id,store:compragamer|venex,product_id,component_id,variant_key,
amount:string,currency:ARS,condition:cash|list,availability:in_stock|out_of_stock|unknown,
stock_quantity:int|null,source_url,observed_at,expires_at,status}`;
status fresh|stale|unavailable. Decimal ARS dos decimales, nunca cuotas como total.
Política retail-offer-freshness-1:24h desde consulta; pasada expires_at muestra stale,
no precio vigente ni cero. Solo fresh/in_stock/variante exacta/condición elegida
resuelve presupuesto actual; no garantía de stock futuro. Snapshots guardan quote
utilizada; GET no recotiza. Histórico básico no se presenta como oferta actual.

Build informó26/10: fuente CG1795 generales; filtro producto tipo5 y subcategorías
CPU27/48,MB26/49,RAM15(no47SODIMM),GPU6/62/116,PSU34,case7,storage19/81,cooler36,fan35.
Combos/outlet/solo-en-combo/no vendible no constituyen oferta utilizable. Thermal67
es dependencia, no décima categoría. MPN desde SKU:MPN con prueba de variante; no
asociar BIOS/consumo/foto a curación por similitud. Fotos: host real comunicado
imagenes.compragamer.com, evidencia en JS/plantilla del proveedor y verificación de
red pendiente de Build. Registrar URL REAL por producto, no inventar patrón como
prueba de existencia. Contado especial es transferencia/depósito; lista no cuotas.
Venex solo páginas públicas permitidas, sin búsqueda prohibida/CAPTCHA/bypass.
ZIP técnico sin licencia encontrada: referencia conceptual, adaptadores propios,
no redistribuir código/finanzas privadas. BuildCores/docyx aportan atributos/licencia/
hash/revisión, no ARS vigentes ni CPU/BIOS universales. Importación repetible con
cuarentena/publicación CU10 atómica/cache/refresh acotado, no scraping en render.

## 4. Evaluación torre: conservar fail/unknown/versiones

POST `/api/towers/{id}/evaluate` `{expected_pc_revision}`. evaluate/simulate conserva
claves EvaluationResponse y evaluated_configuration torre normalizado.
scope.id=cu05-tower-stock-1, policy=tower-stock-policy-1,
inventory=tower-stock-inventory-1, rules=cu05-tower-stock-engine-1.
Inventario fijo T01CPU/BIOS,T02RAM,T03GPU/interfaz,T04GPU/largo,T05PSU,
T06conexiones,T07formatos,T08storage,T09cooler,T10fans,T11identificación/presencia,
T12asignación compartida/potencia aplicable. Evaluar todas las reglas aplicables:
fallo conocido domina, mantiene faltantes; unknown necesario bloquea verde. Sin
flags cliente para desactivar reglas. Declarados no obtienen datos inventados.
Asignación nominal documentada no significa instalación/térmica medida. Geometría
avanzada/certificación térmica-eléctrica exhaustiva siguen warnings/excludes visibles.
cu05-basic-stock-1/B01–B07 y legacy12 guardados/reproducibles quedan intactos; nunca
etiquetar verde básico como torre completa omitiendo nuevas necesidades.

## 5. Recomendaciones, dependencia y planes

POST `/api/towers/{id}/recommendations/preview`:
`{expected_pc_revision,objective:general|gaming|productivity,budget_ars,
price_condition:cash|list,mode:automatic|manual_comparison,workload:blender-cpu|null,
materials:[],alternatives:[]}`.
Alternatives solo manual, con key/actions de simulación. Respuesta
`{pc_id,pc_revision,objective,budget_ars,mode,items,missing_fields,limitations}`.
Cada item conserva actions/evaluación/beneficio before-after/coste incremental,
dependencias/ofertas/versiones. Automatic propone desde catálogo COMPLETO y métricas
curadas aplicables al objetivo. Sin respaldo: faltante y comparación manual claramente
nombrada, no recommended ficticio. VRAM/núcleos/precio no prueban rendimiento;
gaming/productivity requieren índice/fuente/workload/condiciones/versiones aplicables,
no FPS inventados. Capacidad general se etiqueta capacidad, no rendimiento universal.

Dependencia calculada `{kind,required,state,component_id,offer_id,amount_ars,
source_refs,reason}` con state included|available_confirmed|priced|missing, null
cuando no corresponde. `materials:[{kind:thermal_compound,state:available_confirmed,
confirmed:true}]` es confirmación explícita usuario, no nota ni aprobación del motor.
Necesidad debe probarse por operación/cooler/inclusión; NO pasta universal al cambiar
CPU/placa. Si requerida y no incluida/disponible confirmada/cotizada: coste incompleto.
Recommended requiere compatibilidad completa, beneficio apropiado, coste completo y
presupuesto suficiente; insuficiente rejected. Envío/financiación/mano de obra
separados/excluidos explícitamente. Planes acumulan actions y quotes/materiales/scope;
recalcular es acción explícita, nunca GET ni modificación automática de PC.

## 6. Google GIS y seguridad

GET `/api/auth/google/config` → `{enabled,client_id:string|null}` público, no secreto.
POST `/api/auth/google/attempts` con cookie anónima/local+CSRF/Origin →
`{attempt_id:UUID,nonce:string,expires_at}`; nonce aleatorio hash PG, ligado sesión/
Origin, TTL5min, cuota emisión37 por IP. POST `/api/auth/google`
`{attempt_id,credential}` con mismos controles → usuario público y cookie rotada.
credential es IDtoken, no access/refresh ni token_type decidido por cliente.
Verificar firma/algoritmo,issuer,audience,iat/exp,semántica IDtoken,nonce. Uso de
intento único atómico junto con identidad y rotación. No guardar/loggear JWTs.
401 token inválido,403 CSRF/Origin,409 intento inválido/consumido/expirado,
429 Retry-After,503 verificador/certificados no disponibles; errores sanitizados.
Identidad única(issuer,sub); NUNCA auto-link por email. Google-only usa email local
nullable/password_hash nullable explícitos, profile_email/display_name separados;
login local no acepta hash ausente. Email igual no fusiona cuentas ni demuestra
propiedad local. Migración38_b_001 para identidades externas/intentos/nullable,
sin contraseña ficticia ni cambiar identidades existentes.

Build confirmó C7 oficial /googleapis/google-auth-library-python y
/websites/developers_google_identity; verify_oauth2_token firma/iat/exp/issuer,
nuestros checks nonce/attempt/CSRF/rotación adicionales. Dependencia propuesta exacta
google-auth[requests]==2.62.0 compatible Python3.12.13, requests2.34.2 existente.
Pin/lock/sync solo tras modificación concreta por backend y ejecución Build; aquí
no se instalaron deps. Client ID solo archivo público autorizado/env, no secretos.
Origen localhost:3000, servidor loopback; orígenes GIS localhost/localhost:3000 no
se acreditan por leer un ID. Navegador real Google necesita acción humana: reportar
pendiente sin bloquear otros bloques, nunca pedir contraseña/códigos al modelo.
Controles37 de bytes5s/cuotas/CSRF/sesiones/ownership/cancel/UUID se conservan.

## 7. Extracción/asistente/share/admin

Rutas torre `/api/towers/extract` y `/api/towers/extract/confirm`: propuesta
TowerCreate editable, evidencia por nueve categorías y líneas, revisión catálogo,
confirmed:true antes de PCService persistente. Unknown/declarado no es ausencia ni
datos extraídos inventados. Cap65536/cuota proveedor37 compartida, sin archivos del
sistema/detección. Siete herramientas MCP conservan nombres/ownership; get_pc puede
devolver torre versionada, herramientas de evaluate/simulate/recommend/plan adaptan
DTO según schema/scope sin truncar ni aceptar user_id autorizante/SQL arbitrario.
Chat: contexto PC, Markdown seguro, fuentes, progreso/cancel/historial conservados.
Shares nuevos conservan quotes/scope/evidencia/advertencias sin notas privadas;
revocación igual, links anteriores sin recálculo. CU10 edita datos/ofertas/media/
métricas versionados con rol fresco, no código ejecutable/reglas del modelo.

## 8. Delta de specs requerido antes de implementar/activar

CU01: §6 GIS/nonce/identidad/nullable/gate humano. CU02: §7 propuesta torre editable,
confirmación y declaraciones. CU03: §1–2 líneas/varios discos/unknown/ownership y
migraciones aditivas. CU04: §3 nueve categorías, >50 por ID, imágenes/ofertas/licencias.
CU05: §4 nuevo inventario torre conservador, básico histórico intacto. CU06: §5
propuestas por métrica/objetivo/coste real y manual honesta. CU07: §5 etapas acumuladas,
reemplazo RAM/BIOS/quotes. CU08: §7 siete MCP/DTO torre/controles37. CU09: §7 shares
versionados/revocación/privacidad/bytes históricos. CU10: §3/7 importación amplia,
quarentena/procedencia/rol/publicación atómica. No reinterpretar cierres históricos.
Specs externas YA actualizadas por Build según confirmación de coordinación previa
a38A. Su ownership es Build; backend no las reescribe ni considera el permiso
documental anterior un bloqueo vigente.

## 9. Evidencia complementaria comunicada por Build26/10

No es consulta/ejecución propia. Captura/hash congelado pendientes antes de publicar
métrica. Blender Open Data oficial, Blender4.5.0, device_typeCPU, agregado por nombre:
AMD Ryzen5 5600 6-Core Processor median149.8979371914048 N131;
AMD Ryzen7 5700X 8-Core Processor median214.38925258002163 N424.
Fuentes exactas:
https://opendata.blender.org/benchmarks/query/?device_name=AMD+Ryzen+5+5600+6-Core+Processor&device_type=CPU&blender_version=4.5.0&group_by=device_name&response_type=datatables
https://opendata.blender.org/benchmarks/query/?device_name=AMD+Ryzen+7+5700X+8-Core+Processor&device_type=CPU&blender_version=4.5.0&group_by=device_name&response_type=datatables
Definición: https://opendata.blender.org/about/#benchmark-score ; samples/min sumados
entre escenas, mayor es mejor. Métrica curada podrá respaldar SOLO objective
productivity CON workload=blender-cpu explícito y contexto de referencia visible.
No generalizar a productividad universal, juegos, FPS ni garantía por sistema stock.
Datos comunitarios dinámicos/heterogéneos; OC/sistemas no controlados. Aproximadamente
43% es diferencia del SCORE agregado, no aceleración causal garantizada de una PC.
Mantener scores Decimal completos como strings y N/fecha/versión/raw_sha256/fuente/
límites; matching de modelo exacto documentado, jamás similitud ni whitelist de IDs.
Si workload es null, esta métrica no convierte automáticamente productivity en
beneficio sustentado. No inventar dato para gaming/general.

TechPowerUp5070FE: posible evidencia GPU, lectura visual/transcripción PNG y
aplicabilidad a variante ASUS aún pendientes. No ingresar números ni recomendar
por esa fuente todavía; no confundir5070Ti ni extrapolar certificación física.

Build informó fetch fijo CG exitoso:1795 generales →667 torre,1128 excluidos,0duplicados;
90CPU/177MB/67RAM/80GPU/44PSU/72case/48storage/74cooler/15fan.616 ofertas contado
potencialmente utilizables según flags; se exige validar sus metadatos/frescura en
la publicación.667 nombres de fotografía NO son667 fotografías verificadas: solo
3 comprobaciones CPU/GPU/fan200JPEG informadas. No afirmar catálogo DB importado,
porcentaje final de fotos/evidencia/precios ni cobertura a partir del fetch raíz.
Backend no ejecutó ni editó el script de Build ni leyó datos privados de investigación.

## 10. Gates y continuidad

Build único runner TEST: esquema anterior sintético/rollback, dos discos diferentes/
fans/declarado/unknown/absent, aislamiento A/B, >50 por ID en TODOS los flujos,
extract-confirm, tres estados/quotes/materiales/presupuesto/etapas, Google contrato,
imágenes/remoto y cuotas37. Revisión seguridad/funcional/visual con capturas1440/390.
No mocks como Google/Groq real, no DEV como prueba de migración, no shell propio,
no commits propios/push/hosting. Al cierre Build deja PG/API/web localhost vivos,
sin arrancarlos durante este checkpoint. Contrato definido no acredita producto38.
