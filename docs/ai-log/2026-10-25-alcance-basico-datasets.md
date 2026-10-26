# Alcance básico stock + datasets —25/10

## Autorización y propietarios

El usuario reemplazó explícitamente el alcance exhaustivo anterior para CU05/CU06.
Se evalúan CPU/placa/BIOS, RAM documentada, GPU/interfaz/alimentación, PSU bajo
política stock explícita y formato/límites nominales. Geometría avanzada y
certificación térmica/eléctrica exhaustiva se separan como advertencias adicionales.
Unknown necesario dentro del alcance sigue bloqueando; no hay checks desactivables
por cliente ni `not_applicable` artificial para las comprobaciones retiradas.

Coordinadora: specs05/06, CONTINUAR y POSTSCOPE de SPRINT33. Frontend: interfaz y
Playwright/evidencia. Backend importador: `catalog_import/`, sus tests y handoff.
Backend core: motor/consumidores/validación administrativa, excluyendo importador.
Build: adquisición pública, comandos, publicación local autenticada y registro.
Revisor: lectura independiente, sin edición. Sin escritores simultáneos por archivo.
Sin setup, instalación, cambios de proveedor/modelo/permisos, commits ni push.

## Primera muestra real, ANTES de modificar producto

Puertos3000/8000 libres y PostgreSQL existente corriendo. Configuración Playwright
con ambos servidores exclusivos, fixture socket proxy, retries0, sin trace/vídeo.
Cuenta y PC sintéticas propias; no correos personales, terminales, claves o chat.

Comando desde frontend, con helper TEST:
`node_modules/.bin/playwright.cmd test --config=playwright.evidence.config.ts`.
**1 passed/2,4s,9,8s total, exit0**. Imágenes leídas por Build; carpeta ignorada
comprobada con `git check-ignore`. Se entregaron rutas absolutas al usuario antes
de continuar implementación. No snapshots de referencia ni imágenes generadas.

- `.local/evidence/cu05-cu06-scope-v1/before/01-catalogo.png`
- `.local/evidence/cu05-cu06-scope-v1/before/02-pc-evaluacion.png`
- `.local/evidence/cu05-cu06-scope-v1/before/03-recomendaciones.png`
- `.local/evidence/cu05-cu06-scope-v1/before/03b-recomendaciones-panel.png`

Las capturas preservan unknown, faltantes y la presentación extensa previa. No
se sobrescriben para comparar con el resultado nuevo.

## Adquisición estructurada y licencias

`scripts/fetch-hardware-sample.py` usa HTTPS/TLS verificado, revisiones fijadas y
cache local ignorada. Del archivo BuildCores se leen JSON, sin ejecutar ni extraer
scripts, instrucciones AGENTS, imágenes u otros ejecutables. Solo49 candidatos
seleccionados quedan en el pequeño snapshot de entrada del importador.

| Origen | Revisión | Fecha upstream | Licencia |
|---|---|---|---|
| BuildCores OpenDB |2403cab88630625912cdd2f152f1bb1e27f8ff4d|2026-10-24|CC BY-NC-SA4.0|
| docyx pc-part-dataset |c52a04ca9465c83997ed335f7767b09a2005dd26|2025-07-23|MIT, Doc Oliver2021–2025|

Licencias completas, NOTICE BuildCores, seis esquemas y muestra estructurada en
`backend/data/hardware-import/`. La licencia NC/SA de datos no se presenta como
permiso comercial ni como licencia automática del código propio. Trabajo local,
sin publicación externa. Docyx declara USD histórico: no se importa como ARS.
BuildCores no aporta precios ni soporte CPU/BIOS garantizado.

Adquisición real:34 candidatos BuildCores y15 docyx. Repetición del comando produjo
el mismo SHA256 del snapshot, exit0, sin scraper. La propuesta usa11 piezas actuales
y16 registros de fuente; conserva14 IDs existentes. P08 regional AR y P15/P16 sin
MPN exacto permanecen sin resolver, no se aliasan automáticamente. Docyx complementa
atributos CPU/placas; TG/Solid y Pro4/ProSE se distinguen. No es solo agregar enlaces.

## Checks iniciales y revisión

- Importador: `pytest -q -p no:cacheprovider --tb=short tests/test_catalog_import.py`:
  **6 passed/0,10s, exit0**.
- TEST PG: `tests/test_catalog_import_pg.py`: **1 passed/0,30s, exit0**.
  Publicación/autorización, revisión anterior e idempotencia normal; no toda cobertura
  de ownership ni conflicto acreditada por ese test aislado.
- Contrato básico preparado: `tests/test_basic_stock_contract.py`:
  **9 passed/0,09s, exit0**; no prueba todavía API nueva activada ni positivos reales.
- Revisor encontró deriva de procedencia/idempotencia al reimportar un conflicto:
  fuentes dataset añadidas se atribuían indebidamente al valor legacy discrepante.
  Corrección asignada al importador y regresión consecutiva/PG; pendiente ejecución.
- Ruff importador lint0; formato inicial detectó cinco archivos, pendiente mecánico.

## Política PSU: evidencia decisiva consultada

ASUS DUAL4060EVO recomienda550W/1×8pin; PRIME5070OC750W/1×16pin/adaptador1→2.
Ambas notas se basan en sistema CPU/GPU overclockeado, sin identificar CPU.
NVIDIA publica actualmente4060→550W, referencia Ryzen95900X (nota8);5070→650W,
referencia Ryzen99950X (nota5). No usar el antiguo450W como dato actual.
Selección propuesta: máximo de recomendaciones aplicables más conectores originales,
stock/no OC/PBO/una GPU/desktop convencional sin cargas extraordinarias. No suma
TDP ni inventa vatios de placa/RAM o margen adicional para aprobar una demo.
TDP es clase para inferencia de aplicabilidad, jamás demanda DC máxima medida.

CX550:550W continuos,30°C, dos6+2 de un único cable. RM750e:750W continuos coherentes
en ambas fuentes; conflicto12V54,2/62,5A y repuestos PCIe sigue visible. No elegir la
cifra favorable ni afirmar certificación por salida. AMD documenta Wraith Stealth en
5600BOX y ningún cooler incluido en5700X; Noctua429 no certifica una combinación.
Fuente oficial Corsair confirma compatibilidad PCIe5 GPU sobre placa PCIe4.
URLs y texto de política final se fijarán en el contrato/evidencia del motor.

## Cierre LOCAL verificado — alcance básico, no exhaustivo

Scope `cu05-basic-stock-1`, policy `basic-stock-policy-1`, inventory
`basic-stock-inventory-1`, engine `cu05-basic-stock-engine-1`. B01–B07 obligatorias
fijas por servidor. B08 almacenamiento/B09 frontales adicionales visibles, con motivo
del cambio de inventario; sin n/a falso ni ausencia inferida. Snapshots legacy no
se reinterpretan ni recalculan. Diez CU funcionales locales respecto de sus contratos
actuales: ocho preservados32/33 y05/06 cerrados exclusivamente en la spec revisada.

### Publicación e integración reales

Corrección importador aprobada independientemente tras13 tests con PG/0,69s/exit0:
el valor legacy conflictivo ya no se atribuye a fuentes dataset añadidas. Prueba
consecutiva conserva digest/procedencia/no-op también ante conflicto. Ruff importador
formateó cinco archivos, sin cambio funcional.

`scripts/publish-hardware-sample.py --publish-project-catalog`, usando helper local
TEST y luego DEV: login propio de prueba, CSRF y rol resueltos por servidor, CU10
draft/publicación atómica existente.11 componentes,16 registros dataset y6 fuentes
manufacturer nuevas. Repetición inmediata `unchanged` en ambas DB; revisión previa
de componentes idéntica.14 IDs, precios y soporte CPU retenidos. Informes locales:
`.local/evidence/cu05-cu06-scope-v1/import-publication-upgradejusto_{dev,test}.json`.
Primer intento TEST falló antes de publicar por pasar hash de bytes al parámetro de
hash canónico; adaptador corregido, sin alterar importador ni omitir validación.

La primera evaluación real publicada A/B dio unknown por descriptor mecánico RAM
`288-PIN DIMM`: no demuestra UDIMM por sí solo. Refinación acotada usa evidencia
independiente exacta DDR4/unbuffered de fabricante, preserva raw/procedencia y rechaza
RDIMM/SODIMM/conflictos reales. Tras fix, ambas demos PostgreSQL **compatible** en
scope básico, siete controles completos y ocho advertencias cada una. No republicar
datos ni forzar alias para corregir semántica del adaptador.

### Checks ejecutados y revisión independiente

Comandos pytest desde backend con `.venv/Scripts/python.exe -m pytest -q
-p no:cacheprovider --tb=short`; PG con helper TEST existente:

| Selección focal | Resultado ejecutado |
|---|---|
| `test_catalog_import.py test_catalog_import_pg.py`, tras fix de procedencia |13 passed/0,69s/exit0|
| `test_basic_stock_{contract,engine,scenarios,imported_ram}.py` |40 passed/0,19s/exit0|
| `test_basic_stock_pg.py test_basic_stock_assistant.py` antes de nuevo socket |6 passed/1,90s/exit0|
| Regresión afectada compat D/API, recomendaciones, planes/shares PG y proyección/MCP |107 passed/2 failed inicialmente|
| Dos tests BIOS afectados en `test_recommendations.py`/`test_plans.py` tras fixture explícita |2 passed/0,10s/exit0|
| `test_basic_stock_socket.py` + PG `test_published_socket_conflict_blocks_new_evaluation_preserves_old_bytes` |9 passed/2,12s/exit0|

No sumar conjuntos solapados como una suite única. Los dos tests BIOS usaban dict
sin soporte publicado; fixtures pasan a ResolvedCatalog con soporte CPU explícito,
sin relajar asserts fail+missing ni introducir fallback productivo estático.

Revisión independiente halló un segundo medio real: socket conflictivo importado
ignorado por B01, que solo consumía fila CPU-support. Corrección reconcilia ambas
evidencias: conflictos CPU/placa y discrepancia sin marcador→requires verification;
ausencia importada no invalida soporte independiente; BIOS/longitud fail domina y
conserva missing. Nuevo PG publica contradicción mediante CU10 y conserva bytes de
PC/plan/share previos. El mismo revisor cerró B01 y **aprobó el código final para
alcance básico stock**, sin certificar medición ni compatibilidad física total.

Frontend: `npm run typecheck`, `npm run lint`, `npm run build`: exit0.
Vitest directo sobre basic-scope/compatibility/recommendations:15 passed, exit0.
Etiquetas humanas B01–B07 y deduplicación exacta de advertencias sin esconder razones.
Ruff focal corrigió nueve I001 y formato mecánico; `ruff check` exit0 y
`ruff format --check`32 archivos sin cambios/exit0. Incluye scripts de adquisición
y publicación, importador, core, consumidores y pruebas nuevas.

Desde frontend con helper TEST y runner exclusivo, comandos directos (sin wrapper
que ignore filtros):

- `node_modules/.bin/playwright.cmd test --config=playwright.config.ts
  compatibility.spec.ts recommendations.spec.ts plans.spec.ts shares.spec.ts`:
  **4 passed/11,5s total/exit0**, PG/servidores reales, propiedad/simulación/snapshots.
- `UJ_TLS_TRUST=system`, `UJ_TEST_ASSISTANT_LIVE=1`,
  `node_modules/.bin/playwright.cmd test --config=playwright.live.config.ts
  assistant.spec.ts --grep @basic`: **1 passed/6,0s,10,3s total/exit0**, Groq+PG,
  herramienta evaluate, streaming antes de done, historial de dos mensajes, owner,
  PC intacta y explicación scoped. Sin capturas de conversación ni nueva afirmación
  sobre citas RAG. Proveedor/modelo no reconfigurados.

### Resultado demo y capturas finales

A=P01/P03/2×P04/P06/P07/P09 y B=P02/P03/2×P05/P06/P08/P10; BIOS P2.30.
Ambas compatibles básicas. P16 en B:329mm supera315mm, incompatible conservando
otros faltantes. BIOS null requiere verificación. RAM2×P05 aporta16→32GB y cuesta
ARS766417.98; presupuesto1.000.000 recomienda,766417.97 rechaza. P15 sola con CX550
se rechaza; P15+P08 cuesta1882130 dentro de2.000.000, beneficio VRAM8→12GB.
Beneficio de capacidad documentada, no FPS/rendimiento gaming inventados. Precios
históricos con fecha/fuente; envío/financiación/mano de obra excluidos, no gratuitos.

Primer final:1 passed/5,5s,9,6s total/exit0; preservado en
`after/2026-10-26T00-35-30-429Z-5c032da0/`. Sus viewports quedaron a mitad de panel
por scroll de screenshot de elemento; no se borraron ni ocultaron advertencias.
Helper corrige scroll al inicio después de panel; fresh build, luego
`playwright.cmd test --config=playwright.evidence.config.ts final.spec.ts`:
**1 passed/5,9s,10,1s total/exit0**. Carpeta nueva timestamp/UUID, sin sobrescritura.
Build leyó imágenes de compatible, incompatible, recomendación RAM/GPU y móvil;
títulos/estados/advertencias legibles. Panel completo conserva advertencias que no
caben en viewport móvil. BEFORE original intacto, sin snapshots de referencia nuevos.

Rutas absolutas de evidencia real:

- [Antes: catálogo](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/before/01-catalogo.png)
- [Antes: PC/evaluación](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/before/02-pc-evaluacion.png)
- [Antes: recomendaciones](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/before/03b-recomendaciones-panel.png)
- [Después: PC A compatible](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/after/2026-10-26T00-47-03-767Z-68774420/02pcAcompatible-panel.png)
- [Después: PC B compatible](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/after/2026-10-26T00-47-03-767Z-68774420/03pcBcompatible-panel.png)
- [Incompatible](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/after/2026-10-26T00-47-03-767Z-68774420/04incompatible-panel.png)
- [Desconocido necesario](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/after/2026-10-26T00-47-03-767Z-68774420/05unknown-panel.png)
- [Recomendación RAM completa](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/after/2026-10-26T00-47-03-767Z-68774420/06recomendacion-panel.png)
- [Presupuesto insuficiente](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/after/2026-10-26T00-47-03-767Z-68774420/07presupuestoinsuf-panel.png)
- [Móvil390×844](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/after/2026-10-26T00-47-03-767Z-68774420/08movil390x844-viewport.png)
- [Móvil: panel y todas las advertencias](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/after/2026-10-26T00-47-03-767Z-68774420/08movil390x844-panel.png)
- [GPU y fuente](D:/Proyectos/UpgradeJusto-CursoIA/.local/evidence/cu05-cu06-scope-v1/after/2026-10-26T00-47-03-767Z-68774420/09-recomendacion-gpu-fuente-viewport.png)

### Preservación, privacidad y pendientes reales

Comparación final DEV/TEST con baselines locales pre-cambio: hashes originales de
PCs/grupos/planes/enlaces preservados como subconjuntos (nuevos datos propios no se
confunden con mutación). Resultado guardado en `baseline-final-check-*.json` local.
Rutas privadas/runtime ausentes de archivos seguidos; scan acotado de candidatos
datasets/scripts/evidencia-tests sin patrones de credenciales. `git check-ignore`
confirma BEFORE/AFTER fuera de Git. Índice vacío, HEAD `c1ced9e`, sin commit/push.
Sin runners escuchando3000/8000 al terminar; PostgreSQL existente no se detuvo.

No bloqueantes dentro del cierre básico revisado. Continúan advertencias físicas:
cooler instalado no registrado (5700X sin cooler incluido), cables/geom avanzada,
storage/frontales, temperatura/transitorios/certificación exhaustiva y contradicción
12V RM750e. No declarar esos puntos compatibles ni precios como vigentes. Python
3.12.15 predeploy sigue pendiente histórico; no se actualizó entorno. Cierre local,
sin autorización de despliegue, uso comercial de BuildCores ni nuevas etapas.

Revisión documental adicional: `revisor-proyecto` informó que su perfil solo permite
AGENTS/ENTORNO/MCP/PERMISOS; no revisó README/CONTINUAR/specs/demo/bitácora final.
No se ampliaron permisos ni se atribuye aprobación documental a archivos que no leyó.
Build comprobó esos encabezados/estado y registró el cierre; aprobación independiente
de código permanece la del revisor de código. `git diff --check` de los archivos
seguidos pertinentes:exit0 (solo avisos LF/CRLF, sin normalización automática).
