# Etapa 28 — dominio CU05 parcial y reproducible

Fecha local: 2026-10-20, UTC−03:00. Autorización acotada del usuario: contrato mínimo,
agregación conservadora y dos subreglas respaldadas, sin aceptar todo lo propuesto
en etapa25 ni cerrar demo. Se mantiene la fuente en alcance; potencia pendiente.

## Estado y decisiones de este incremento

- Raíz del proyecto comprobada, rama `codex/base-backend` (ruta saneada en31c).
  Commits previos `388818d` y `c25ff31` conservados. Al iniciar no había cambios
  seguidos/preparados; los cuatro documentos locales AGENTES/ENTORNO/MCP/PERMISOS
  estaban sin seguimiento y no se modificaron ni seleccionaron.
- Se leyeron AGENTS, CONTINUAR, CU05 y solo filas pertinentes de HARDWARE_DEMO:
  P15/P16/P07/P10, F07/F08/F09/F13/F19 y negativo de ramales. Sin investigación nueva
  de piezas, setup, carpetas privadas, agentes/MCP o credenciales.
- Antes de código se resumieron contrato, rutas y criterios en la conversación.
  Se usó Pydantic ya instalado más biblioteca estándar, con modelos estrictos,
  congelados y tuplas para no dejar colecciones mutables dentro del dominio.
  Context7 consultado para la [versión 2.14.1](https://github.com/pydantic/pydantic/tree/v2.14.1/docs),
  strict/frozen/extra forbid, validadores y finitud; no se agregaron dependencias.
- El consumidor solo entrega configuración resuelta con evidencia y revisiones.
  No resolución pc_id/propiedad/catálogo, sustituciones, planes, persistencia ni API CU05.
  El inventario no se recibe del consumidor; agregador privado admite inventario
  sintético solo en pruebas internas. Un inventario vacío/incompleto no habilita compatible.
- Se decidió distinguir cobertura completa de aprobación: todos pass/fail/no_aplica
  resueltos cubren comprobaciones, pero cualquier fail mantiene incompatible.
  En producción quedan siempre las diez comprobaciones sin implementar de este incremento.

## Expectativas primero y correcciones observadas

1. Se escribieron `tests/test_compatibility.py` antes del dominio.
   Primera ejecución: código2, error de colección por módulo aún inexistente.
2. Se creó contrato/inventario y un evaluador temporal que solo emitía pendientes;
   antes de implementar las subreglas se ejecutaron expectativas de límites y
   ramales: **4 fallos esperados**, código1 (`not_implemented` en lugar de pass/fail).
   Esto comprobó fallos de comportamiento además del error inicial de importación.
3. Se implementaron subreglas y agregación; 49 pruebas iniciales de dominio pasaron.
   Se añadieron pruebas de ejemplos reales/runner, revisiones, coerción, duplicados,
   revalidación, no mutación, inventario completo sintético e inventarios parciales.
4. La cobertura inicialmente confundía aprobación con resolución; se ajustó para
   que un inventario sintético totalmente resuelto con un fail tenga cobertura completa
   pero veredicto incompatible. Además, faltantes explícitos nunca permiten compatible.
5. Ruff format --check inicial devolvió1 para seis archivos nuevos. Formateador
   aplicado solo a esos archivos, código0; Ruff lint no requirió correcciones.
   Suite final: **66 aprobadas incluyendo salud**, sin prueba de importación duplicada.

## Archivos

Nuevos:
- `backend/upgradejusto/compatibility/__init__.py`
- `backend/upgradejusto/compatibility/models.py`: entrada/salida estrictas, mediciones,
  referencias, condiciones, topología/asignaciones y validación de IDs/cantidades.
- `backend/upgradejusto/compatibility/rules.py`: largo y ramales, sin marcas hardcodeadas.
- `backend/upgradejusto/compatibility/evaluation.py`: inventario fijo versionado,
  evaluación de ambas reglas sin cortocircuito y agregación conservadora.
- `backend/upgradejusto/compatibility/examples.py`: extracto local documental versionado.
- `backend/upgradejusto/compatibility/demo.py`: runner JSON, sin red/escrituras.
- `backend/tests/test_compatibility.py`: fixtures sintéticos para comportamiento/límites.
- `backend/tests/test_compatibility_examples.py`: S08/S10/derivado y runner real.
- Esta bitácora.

Actualizados: `backend/README.md`, `docs/specs/CU05-compatibilidad.md`,
`docs/CONTINUAR.md` y `AGENTS.md` (nuevo comando operativo y alcance acotado).
HARDWARE_DEMO, R10 y política de potencia no se cambiaron. pyproject, lockfile y pin
no necesitaron cambios. Sin frontend, BD, IA, módulos vacíos, plugins o endpoint nuevo.

## Subreglas y ejemplos ejecutados

Reglas `cu05-28.1`. Datos de ejemplos `hardware-demo-25.1/extract-28.1` con etiquetas
de revisión documental, no UUID ni versiones persistidas inventadas. Referencias
transcritas del registro de etapa25 con URL/sección/fecha, sin nueva consulta de hardware.

| Ejemplo | Hechos/evidencia | Resultado del mismo evaluador usado en tests |
|---|---|---|
| S08 documental | P15 PRIME-RTX5070-O12G, adaptador2×PCIe8; P07 CX550 CP-9020277/RPS0127, dos6+2 de CX-PCI1; F07/F09/F19; sin otra ruta válida según escenario | incompatible por R06.ramales_adaptador; solo1 ramal libre para2 entradas |
| S10 documental | P16 TUF-RTX5070-O12G-GAMING329 mm; P10 Meshify C315 mm con front fans/sin radiador; F08/F13 | incompatible por R04.largo; exceso14 mm |
| D01-S10-omitted-length | Copia derivada de S10 con largo omitido intencionalmente, otras mediciones intactas | requiere_verificacion, sin fail; no tercera PC real |

En S08 falta entrada geométrica, en S10 falta ruta adaptada resuelta; se emiten
unknown, no se inventa esa evidencia. D01 tiene ambas subreglas unknown. Cada ejemplo
mantiene **12 comprobaciones necesarias y 10 not_implemented**, cobertura incompleta.
Pendientes: R01/R02/R03/R05/R07/R08/R09/R10 y resto explícito de R04/R06. Fuente750 W,
ATX/EPS, altura/espesor/slots/cable/interferencias no se aprueban por estas subreglas.

R04 requiere mm/eje longitudinal y límite efectivo con montaje/condiciones aplicables;
menor/igual solo aprueba largo. R06 soporta dos entradas PCIe8 independientes con
inventario completo/asignación explícita. Ocupados no se cuentan; topología desconocida
no es lista vacía; no se duplica conector. Déficit sin exclusión documentada de otras
rutas es unknown, no incompatibilidad global fabricada. Capacidad existente con una
asignación incompleta/no independiente queda unknown, sin resolver otra automáticamente.
Ruta nativa/otros requisitos no soportados son pendientes, no fallos por nombre/modelo.
Conflictos no resueltos y evidencia vacía nunca generan pass/fail.

## Verificaciones reales desde backend/

Comprobado `$LASTEXITCODE` inmediatamente tras cada ejecutable; sin continuar como
si un fallo hubiera pasado. No se arrancó ningún servidor HTTP: salud se prueba con
TestClient en proceso y el runner en subprocess, sin conexiones externas.

| Comando | Resultado final |
|---|---|
| `.venv/Scripts/python.exe -m pytest -q` | código0; 66 passed |
| `.venv/Scripts/ruff.exe check .` | código0; All checks passed |
| `.venv/Scripts/ruff.exe format --check .` | código0; 14 files already formatted |
| `.venv/Scripts/python.exe -m upgradejusto.compatibility.demo` | código0; JSON de tres casos, veredictos comprobados |
| `uv sync --check --locked --group dev --python 3.12.13 --no-python-downloads` | código0; Would make no changes; 24 distribuciones comprobadas |

Python3.12.13/uv0.11.16 y dependencias de etapa27 reutilizados, sin reinstalar ni
actualizar. SHA256 uv.lock idéntico antes/después:
`667F8CB5FD211CD8D934BCD63601B2BF29D0ECF8E75A7A85850A3BEE92FFCFCC`.
Salida completa de demo local en `tmp/etapa28-demo.json`, ignorado; no publicar
salidas temporales. Esto no demuestra reproducibilidad en otra máquina ni PCs físicas medidas.

## Registro Git y límites

Selección por nombre únicamente de los archivos de este incremento; revisión de
estado/nuevos, contenido, diff preparado completo/stat/check, enlaces y secretos
antes del commit local `feat: iniciar motor CU05 con cobertura y reglas GPU`.
El hash se entrega después del commit, no dentro del mismo registro que lo genera.
Los dos commits anteriores y cuatro documentos locales permanecen preservados.
Sin remotos, push/publicación, cambios de permisos/agentes ni otras integraciones.

Próximo incremento del motor requiere definición separada de datos/regla/aceptación.
Los positivos completos siguen abiertos; R05/potencia y envolventes/interferencias
no se resolvieron. No se acepta toda política R10/selección hardware ni se declara
CU05 terminado o demo final lista. Mantenimiento Python antes de exposición/despliegue
sigue pendiente de etapa27. Se conservan diez CU y seis módulos.
