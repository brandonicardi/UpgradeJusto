# Etapa29/29b — resumen técnico histórico

Fecha:2026-10-20. Resumido en31c para retirar rutas, IDs de runtime/memoria y
transcripción operativa. Original documental concreto preservado localmente,
ignorado. No es una reejecución ni una nueva certificación del entorno.

## Alcance y resultados29

Build preparó perfiles nativos y Engram local; el coordinador dirigió contratos
de solo lectura: backend, análisis de contrato frontend (carpeta entonces ausente)
y revisión independiente posterior. Coordinador y tres hijos Sol medium contrastados
por metadatos. Sin implementar producto ni alterar motor28. La revisión no encontró
fallos demostrables de producto, sin certificar exhaustividad del diff histórico.

Desde backend/, códigos0 corroborados históricamente por Build:

| Comando | Resultado |
|---|---|
| `.venv/Scripts/python.exe -m pytest -q` | 66 aprobadas |
| `.venv/Scripts/ruff.exe check .` | Sin hallazgos |
| `.venv/Scripts/ruff.exe format --check .` | 14 archivos formateados |
| `.venv/Scripts/python.exe -m upgradejusto.compatibility.demo` | S08/S10 incompatibles, D01 requiere_verificacion |
| `uv sync --check --locked --group dev --python 3.12.13 --no-python-downloads` | Sin cambios |

Un intento compuesto de shell fue rechazado sin ejecutarse; no se ampliaron
permisos. Se corrigió permiso de listado de tests y una afirmación documental
prematura de recuperación. Se conserva como pendiente histórico de cobertura un
test específico de capacidad suficiente con asignación no independiente; no fue
fallo demostrado ni autorización para modificar producto29.

Demo: S08 falla R06 por ramales independientes insuficientes; S10 R04.largo por
14mm de exceso. D01 omite intencionalmente el largo. Cada uno conserva12 checks
necesarios y10 pendientes, cobertura incompleta: no CU05 completo.

Context7 se consultó realmente para Pydantic2.14.1: strict restringe coerción con
matices Python/JSON; frozen no vuelve recursivamente inmutables los contenidos.
No se cambiaron dependencias. Configuración y permisos se revisaron de forma
focalizada, sin afirmar sandbox del SO. Una recarga canceló una operación; no se
promete continuidad inocua de reload.

## Guardado y recuperación29b

El primer guardado Engram falló unknown_project pese a detectar identidad por cwd.
Tras bootstrap explícito con sesión real registrada se guardó una única observación
técnica, proyecto explícito y capture_prompt:false. No se inventó sesión ni se
exportaron conversaciones. Guardar no probaba aún recuperación.

En29b una primaria nueva Sol medium, sin importar historial ni recibir la respuesta,
consultó schemas/identidad, buscó por proyecto/marcador y leyó el resultado encontrado.
Build contrastó identidad, proyecto y contenido completo con el original. No hubo
lecturas de archivos, shell, delegación o escrituras de memoria en esa prueba.
CLI terminó0; el criterio fue búsqueda+lectura contrastadas, no outcome de sesión.
No se repitieron suites, instalación, Context7 o demo. No fue necesario reload.

La consulta de proyecto desconocido devolvió unknown_project: no prueba aislamiento
entre proyectos existentes. Obtener por ID tampoco prueba propiedad. Se acredita
memoria explícita entre sesiones, no captura automática o restauración de compactación.
Revisión documental final por el mismo revisor, sin nuevos hallazgos demostrables.

## Conservación y límites

Perfiles/configuración, binarios, datos y evidencia detallada permanecieron ignorados;
no hubo staging/commit/push en29/29b. HEAD de entonces ee7248e. Cambios documentales
conservaron aceptación acotada y motor intacto. Frontend ausente era estado29, no
estado actual31b. Los permisos de aquel momento no autorizaban cualquier CU futuro.
No se repite recuperación ni se abre memoria en31c.

Política actual: [ORQUESTACION](../ORQUESTACION.md). Estado: [CONTINUAR](../CONTINUAR.md).
