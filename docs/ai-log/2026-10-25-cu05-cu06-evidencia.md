# CU05/CU06 después del cierre33 —25/10

## Autorización y límites

Completar CU05/06, revisión independiente y recorrido final de diez CU, incluido
asistente. No reconfigurar entorno, instalar, hacer staging/commit/push ni repetir
aprobados por rutina. Se elimina el corte anterior por cuota/50%; no se estima uso.
El usuario confirmó que A/B son **escenarios de demo**, sin hardware físico disponible.

Coordinadora: contratos/SPRINT33/CONTINUAR; backend único: motor/servicios/tests;
frontend único: consumidores/pruebas web; revisor solo lectura; Build: comandos y
registro. Los cuatro perfiles conservan frontmatter idéntico tras respaldo local;
solo se sincronizó el texto de alcance que todavía prohibía CU05/06. Sin cambios
de permisos, modelo, modo, steps, proveedor, cuenta o configuración del entorno.
Dos primeras delegaciones toparon ese texto histórico; ninguna escribió producto.
Otros rechazos de lectura de directorios se corrigieron indicando archivos exactos
ya autorizados, sin abrir permisos ni usar shell como evasión.

## Evidencia externa acotada

Una pasada sobre fuentes identificadas, referencias y localizadores en
[HARDWARE_DEMO §10](../HARDWARE_DEMO.md). Persiste conflicto Corsair62,5/54,2A,
faltan máximos DC/salidas/transitorios y envolventes de montaje; Noctua respondió429.
Ni TDP, CPU package, consumo de pared ni potencia recomendada ASUS cierran R05.
No nueva sustitución F26 aceptada ni medidas inventadas. Dos ofertas reconsultadas:
RAM383.208,99/unidad y PSU175.898 ARS.16→32GB sustenta capacidad, no FPS/aceleración.

## Incremento plataforma: comprobaciones realizadas por Build

- `.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider --tb=short`
  con `test_platform_rules.py test_compatibility_d.py test_recommendations.py`
  `test_plans.py test_shares.py`: **78 passed/0,26s, exit0**.
- Helper TEST y mismo pytest sobre `test_platform_postgres.py` y
  `test_compatibility_api.py::test_evaluate_and_simulate_are_ephemeral_and_replace_all_ram`:
  **3 passed/3,12s, exit0**. Incluye invalidación de curación ante atributos/fuentes
  publicados y conservación de snapshots anteriores. No sumarlos como suite completa.
- La primera lectura PG falló por timeout; `postgres.ps1 -Action status` confirmó
  clúster detenido. `-Action start` inició el existente en loopback55433, exit0;
  sin setup/provision/reinstalación. Baseline de snapshots existentes TEST guardada
  después como hashes locales, sin datos privados en salida.
- Ruff detectó cuatro imports sin ordenar; Build corrigió únicamente imports y
  formato. Un espacio de separación residual se corrigió después. Check final pendiente.
- Frontend tipos/lint exit0; build exit0. El intento de filtrar unitarios con
  `npm test -- --run ...` conservó el prefijo `tests/unit` del alias y ejecutó
  **77 unitarios/13 archivos, exit0**. No repetir; para futuros filtros usar binario
  local directamente, sin instalar. No presentarlo como selección focal lograda.
- Revisión estática incremental R02/R07 favorable, sin bloqueantes en lo leído;
  observó cobertura adicional posible de nueva publicación/proyección y que beneficio
  público permanece `unknown` conservador. No aprueba CU05/06 globales.

## Segundo incremento: recursos y recorrido web

Versión preparada `cu05-25-resources.1`, extracto `resource-evidence-25.1`, HTTP
sin campos nuevos. Predicados R03, R06-otros, R09 y R10; instalación desconocida
permanece desconocida. R04-resto/R05/R08 siguen sin implementar; no positivo global.

- Dominio nuevo y consumidores: **86 passed/0,26s, exit0**, sobre
  `test_resource_rules.py test_compatibility_d.py test_recommendations.py`
  `test_plans.py test_shares.py`.
- PostgreSQL/API/MCP: **40 passed/16,96s, exit0**, sobre
  `test_platform_postgres.py test_compatibility_api.py test_recommendations_api.py`
  `test_plans_postgres.py test_shares_postgres.py test_assistant_mcp_contract.py`.
- La revisión independiente detectó dos fallos internos: reutilización de un
  conector SATA-power entre discos y ocupaciones contradictorias entre familias.
  El mismo backend corrigió exclusividad, vínculo eléctrico y coherencia global;
  ambigüedad se rechaza como entrada interna inválida, no como fallo de hardware.
  Nuevo focal `test_resource_rules.py test_platform_rules.py`:
  **66 passed/0,21s, exit0**. No sumar como conjuntos disjuntos.
- `npm run test:e2e -- ...` delega en `scripts/test-browser.ps1`, que no reenvió
  los filtros; ejecutó build y **9 E2E normales/19,6s, exit0**, más PG posterior0.
  Se registra el alcance real, no siete. No repetir para conseguir el filtro.
- Curación positiva seleccionada con `--grep 'CU10 PG real'`:
  **1 passed/4,0s,8,2s total, exit0**. Groq+PG reales para CU02 y CU10;
  no se repitió la cancelación histórica con fixture.

## Asistente: fallo real aislado, corrección en curso

Nuevo LIVE `CU08 final` obtuvo `evaluate_pc` running/completed reales, pero no
continuación del LLM. Primer intento esperó un DOM incremental efímero y agotó100s;
se corrigió solo el observador para comprobar terminal/counters antes del DOM.
Segundo intento,2,9s: `generation_failed`, cero deltas, herramienta completada.
No se leyó `error-context.md` ni se copiaron mensajes del usuario/proveedor.

Un diagnóstico acotado, mismo proveedor y runner real, confirmó **HTTP413**,
`rate_limit_exceeded`, por tamaño de solicitud. No es medición de cuota semanal.
`graph.py` enviaba la representación MCP completa, con texto y contenido estructurado
redundantes; se prepara una proyección determinística acotada, preservando veredicto,
cobertura, faltantes, versiones y procedencia. Sin cambiar cuenta/modelo/proveedor.
Escritor adicional exclusivamente en `assistant/graph.py`, nuevo helper de proyección
y su test; no se solapa con el escritor de los cuatro archivos de recursos.

La limpieza del diagnóstico encontró FK de sesión al eliminar la cuenta sintética;
transacción revertida. La excepción mostró un ID de ese actor sintético: no se
transcribe ni se incorpora a memoria/documentos; sin credenciales. Se corrigió
el manejo de errores a clase estática y eliminando primero sus sesiones y luego sus datos
propios, verificación0 sin identificadores en salida. No borrar usuarios por heurística
general ni repetir el diagnóstico para compensar ese fallo de limpieza.

## Corrección del asistente y comprobación posterior

El primer intento de comando incluyó un nombre de test inexistente: cero tests,
exit1; se corrigió la selección mediante listado de archivos. El siguiente produjo
7 fallos/3 pass y2 errores de setup: validación de dict JSON contra tuplas estrictas,
fixture MCP antigua y helper TEST omitido en el comando. No era un fallo del servidor
PG ni se relajaron los tipos: se usa `model_validate_json` para transporte JSON,
fixture `CallToolResult` realista y helper TEST existente.

- Pytest `test_assistant_tool_projection.py test_assistant_graph.py`
  `test_assistant_mcp_contract.py`: **20 passed/5,45s, exit0**.
- Ruff lint0; formato detectó un archivo, aplicado y check final **4 archivos0**.
  Plataforma/recursos check final **42 archivos0**. No se volvió a ejecutar pytest
  solo por cambios mecánicos de formato.
- `playwright.cmd test --config=playwright.live.config.ts --grep 'CU08 final'`,
  helper TEST/TLS system/opt-in real: **1 passed/6,8s,11,0s total, exit0**.
  MCP `evaluate_pc` real completado, delta recibido antes de done, historial de dos
  mensajes persistido/recargado, aislamiento y PC intacta. Sin fallback/mocks ni otro
  turno de cancelación. Citas opcionales: no acredita nuevas citas RAG por este test.
- Mismo revisor aprobó estáticamente los dos fixes de recursos y el helper del
  asistente, con sus pruebas. Sin bloqueantes restantes identificados del incremento.
  El límite de24k bytes por resultado no garantiza evitar413 con historial arbitrario.
- Frontend tipos/lint finales exit0. No repetir los77 unitarios ni el build aprobado
  cuando solo cambió la observación del test LIVE.

## Resultado final y límites

PG posterior exit0: hashes de **todos** los snapshots existentes al inicio conservados,
activa publicada y14 componentes consistentes; precios/fuentes restaurados iguales al
seed mediante revisión nueva. Verificación final tras LIVE mantiene los hashes.
Privacidad252 candidatos modificados/no seguidos sin literales de credenciales reales
locales/proveedor. Sin artefactos privados seguidos, índice vacío, HEADc1ced9e y cinco
commits preservados. No staging/commit/push, migraciones, seed, instalación ni cambios
de modelo/proveedor. Los hashsets permanecen solo locales; no se copian snapshots.

Recorrido de diez flujos realizado, **no diez CU completos**: ocho funcionales y05/06
parciales. Web unknown/incompatible y coste/beneficio reales aprobados; compatible
global y recommended no acreditados. Faltan R04-resto/R05/R08, contexto instalado y
evidencia eléctrica/geométrica aplicable. No solicitar medidas de una demo inexistente,
no presentar cambio de gabinete como solución universal ni inventar máximos DC.
La proyección pública del beneficio permanece unknown conservadora por contrato.

No hay positivo global CU05 ni alternativa `recommended` acreditada. Faltan tanto
implementaciones como evidencia; no atribuir el cierre pendiente solo al hardware.
