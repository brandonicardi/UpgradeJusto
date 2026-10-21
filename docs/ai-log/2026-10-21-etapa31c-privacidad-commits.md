# Etapa31c — privacidad y conservación local

Fecha:2026-10-21. Build; alcance exclusivo proyecto/Git local, sin32. Informe técnico
saneado, no exportación de conversaciones ni auditoría integral de seguridad.

## Criterio y situación inicial

Conservar29/30/31b mediante commits coherentes después de revisar todos los candidatos,
índice, exclusiones y objetos alcanzables. Raíz: repositorio del proyecto; rama
`codex/base-backend`, HEAD inicial `ee7248e71b9e27523e6452b31bf7bf6194b8e8b6`.
Tres commits alcanzables previos:388818d/c25ff31/ee7248e; índice vacío, sin remotos,
siete seguidos modificados más archivos nuevos. No escritor CLI del proyecto ni
listeners3000/8000 identificados antes de comprobar. No se detuvo una web ajena.

Identidad Git existente contrastada y conservación expresamente autorizada por el
usuario. No se imprime su valor aquí ni se cambia configuración/autoría histórica.
Nombre/correo seguirán formando parte de los commits; saneamiento de archivos no
anonimiza metadatos. La intención futura de GitHub no autoriza push/remoto.

## Inventario y clasificación

Triage inicial:78 candidatos (seguidos y untracked),31 blobs y3 mensajes de commits
alcanzables desde ramas/tags. Complementado por lectura contextual de documentación,
fuentes nuevas, tests, scripts, configuración y estructura completa de lockfiles.
Motor/hardware/specCU05/pin previos contrastados sin diff; no se reabrió su alcance.

| Clasificación | Archivos/categorías | Acción |
|---|---|---|
| Incluir | API/catálogo/dataset/tests; preparación persistence/Alembic/tests; frontend fuentes/tests/config; pyproject/uv.lock/package-lock; scripts; .env.example | Revisados; variables PG vacías, fuentes públicas y fixtures técnicos, sin secretos reales detectados |
| Incluir tras saneamiento | AGENTES/ENTORNO/MCP/PERMISOS/ORQUESTACION, CONTINUAR/SPRINT31B, bitácoras25/27/28/29/30/31b, README/specCU04 y Playwright | Rutas portables, sin IDs runtime/memoria o checkpoints superados; conservar hechos/resultados/fechas |
| Incluir | AGENTS/.gitignore y ejemplo documental de handoff | Estado coherente31b, exclusiones y contrato técnico sin activar configuración |
| Local/ignorado | .env reales, .local/.tools/.opencode/opencode.json, material-privado/tmp/output, entornos/dependencias/cachés/resultados; next-env.d.ts | No staging, sin force-add; next-env generado se añadió a ignore |
| Decisión pendiente | Rutas locales en blobs históricos25/27/28 | No reescribir historia; no declarar publicación lista |

Los14 originales documentales/config concretos que requerían saneamiento se copiaron
a un respaldo local ignorado antes de editar. No copia global de privados. El ejemplo
handoff es Markdown revisado, no un perfil/config ejecutado ni una integración validada.
Los perfiles reales, revisor-proyecto y configuración local no se editaron en31c.

Lockfiles:33 entradas uv con registro PyPI;509 entradas npm con registro público npm,
sin enlaces locales o credenciales de URL detectados. Se examinaron valores completos
por patrones y estructura, no solo diff de seguidos. Pins/locks no se actualizaron.
La procedencia pública de fabricantes/ofertas se conserva; no se relabeló dataset.

## Hallazgos y límites de privacidad

- Candidatos iniciales: rutas de equipo/perfil en documentación/config Playwright,
  IDs de runtime y referencias numéricas de memoria en docs/bitácoras. Retirados o
  convertidos a instrucciones portables/resúmenes técnicos. No conservar transcript.
- Historial previo:3 blobs de bitácoras25/27/28 contienen raíces de proyecto y
  ascendientes locales. Clasificación contextual, no credenciales detectadas ni
  rutas de perfil personal encontradas en esos hallazgos históricos.
- No coincidencias de tokens/claves privadas/URL con credenciales/enlaces privados
  en el triage de contenidos. Esto **no certifica ausencia de secretos**. Autoría
  Git fue revisada separadamente y autorizada, no borrada ni ocultada.
- Sanear HEAD no elimina blobs anteriores. No hubo rebase/amend/reescritura,
  revocación o rotación; no se identificó secreto concreto que rotar. Antes de publicar
  se requiere revisar/decidir la exposición histórica y acordar destino/visibilidad.
- No chats, cuentas, correo, adjuntos, Engram, bases de sesiones, reflogs u objetos
  inalcanzables consultados en31c. Solo proyecto y evidencia nueva local ignorada.

## Verificación nueva31c

Inspeccionados scripts/check.ps1, dev.ps1, package scripts y Playwright antes de ejecutar.
Sin instalación ni PG. Puertos libres; Playwright con reuseExistingServer:false
inició servidores loopback propios, no se reutilizó/detuvo un servidor ajeno.

| Comando/ámbito | Resultado nuevo31c |
|---|---|
| check.ps1: pytest | 118 aprobadas, código0; warning caché local sin permiso de escritura |
| check.ps1: Ruff check | Sin hallazgos, código0 |
| check.ps1: Ruff format --check | 28 formateados, código0 |
| check.ps1 con captura redirigida | Interrumpido en stderr informativo de uv por NativeCommandError PowerShell5.1; no afirmar script completo aprobado |
| uv sync --check --locked --group dev --python 3.12.13 --no-python-downloads, separado | Código0;33 resueltos/31 comprobados, sin cambios |
| npm run typecheck / npm run lint | Código0 cada uno |
| npm run test | 12 Vitest, código0 |
| npm run build | Código0 |
| npm run test:e2e | 2 Playwright contra API real, código0 |
| Parseo dev.ps1/check.ps1 | Sin errores de sintaxis; dev.ps1 no reejecutado en31c |

No se repitieron los checks backend ya aprobados por la incidencia de captura;
solo se completaron los restantes con códigos individuales. El warning pytest no
es fallo de dominio ni autorización para cambiar permisos/caché ajena. Evidencia
detallada nueva en directorio local de revisión ignorado, sin publicar matching lines.
Los118/12/2 de la bitácora31b siguen rotulados históricos, no sustituyen esta ejecución.

## Plan de conservación

1. Snapshot integrado saneado29/30/31b: documentación/ejemplo, catálogo API/web,
   scripts y preparación PG con dependencias exactas. Agrupación evita dividir
   imports seed→catálogo, locks, contratos y estado documentado en commits rotos.
2. Cierre documental31c: registrar hash previo y comprobaciones/exclusiones finales.
   No incluir hash del mismo commit ni generar bucles de commits.

Staging por rutas literales explícitas; revisión completa del índice, nombres/stat/check,
contenido, privacidad y exclusiones antes de cada commit. Sin saltar hooks.
## Commits y comprobaciones de conservación

Primer commit creado: `347a87a6f5f8f0641b4dbeec8df2b14bf32b16c2`,
`feat: conservar avances 29-31b saneados y catalogo web; PG solo preparado`.
64 archivos seleccionados por nombre literal; selección cotejada con todos los
cambios revisados. Se examinaron name-status/stat/check y contenido del índice:
comparación íntegra de64 blobs con el texto de trabajo revisado, patrones sobre
todos sus bytes y recorrido estructural de valores de ambos locks. Sin categorías
de privacidad coincidentes en el contenido actual. No solo escaneo de diff.

El primer gate local de locks fue demasiado restrictivo al tratar URLs públicas de
funding como registros: se clasificaron como metadatos públicos (no resolución de
paquetes), manteniendo allowlist estricta de registros y rechazo de credenciales.
No fue hallazgo de secreto ni cambio del lock. El gate corregido pasó antes de commit.

Después del primer commit: índice/árbol versionable limpios,79 archivos seguidos;
ningún candidato no ignorado quedó sin clasificar.14 rutas representativas de
exclusión comprobadas individualmente con check-ignore; ninguna categoría excluida
seguida.72 enlaces Markdown relativos sin destinos faltantes; ejemplo de handoff
revisado como documentación, no configuración ejecutada. Motor/hardware/specCU05 y
pin Python sin diff frente HEAD inicial. Sin cambios rutinarios de dependencias.

El segundo commit solo modifica CONTINUAR y esta bitácora para el cierre justificado.
Se revisa su índice completo y se comprueban estado/log/rango final tras crearlo;
el hash definitivo se entrega fuera de este archivo, sin autorreferencia ni bucles.
No hubo remoto/push; los3 blobs históricos con rutas siguen alcanzables y requieren
decisión específica antes de publicar. Ninguna revisión31c de memoria o material privado.
Los originales/escáneres/manifest local permanecen ignorados, no se agregaron al Git.

## Pendientes y límite de salida

CU04 usable; CU01 solo preparación PG, CU03/CU05 web/R01 pendientes, motor parcial.
PG/auth/chatbot no probados. Requisito futuro: PG exclusivo dev+test y pruebas reales.
Mantenimiento Python/ESLint pendiente, sin actualizaciones31c. Conservar locales
ignorados deliberados; un árbol limpio no significa ausencia de archivos locales.
Sin remotos/push/publicación;32 no se ejecuta. Futuro push exige revisión nueva con
el usuario de commits/archivos/destino/visibilidad y de la exposición histórica.
