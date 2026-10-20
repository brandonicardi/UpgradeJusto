# Continuar — base backend de etapa 27

2026-10-20. Base mínima FastAPI instalada y verificada: `/health` responde HTTP 200 con JSON exacto `{"status":"ok"}`; importación, un test pytest y Ruff lint/formato aprobados, entorno sincronizado con `uv.lock`. Servidor propio de verificación detenido. No hay motor, frontend, BD ni IA; salud no declara esas conexiones. Se conservaron Python 3.12.13, uv 0.11.16, `.venv` y el pin.

- [Arranque y comandos](../backend/README.md), siempre desde `backend/`, con códigos de salida comprobados.
- [Registro etapa 27](ai-log/2026-10-20-etapa27-base-backend.md): resolución, verificaciones y Git local. Sin publicación.
- Aceptación acotada: backend de salud, FastAPI/Pydantic/Uvicorn, pytest/Ruff/httpx2 y lockfile. No acepta el resto del stack ni las políticas de hardware. Python 3.12.15 requiere resolver mantenimiento antes de exposición/despliegue.
- Próximo incremento del motor: **pendiente de definición y aceptación**. No implementarlo por esta nota. Mantener dominio independiente de HTTP/BD/LLM y los diez CU/seis módulos.

## Estado documental conservado de etapa 25

La selección técnica sigue parcial; los siguientes faltantes no fueron resueltos ni re-investigados al preparar el backend.

- [Hardware](HARDWARE_DEMO.md): piezas P01–P18, fuentes F01–F25, conectores, precios históricos y visuales.
- [CU05](specs/CU05-compatibilidad.md): contrato/reglas propuestos y escenarios S01–S18 con estado exacto.
- [Registro](ai-log/2026-10-20-etapa25-curacion-hardware.md): correcciones, comprobaciones y límites.

Aceptado previamente: cobertura/veredictos explícitos, RAM completa y evaluaciones versionadas. Las bases/piezas, P18 como reemplazo del candidato P17, prioridad editorial RM750e y políticas nuevas **siguen propuestas**, no stack aceptado ni implementación.

## Pendientes de hardware antes de cerrar motor/demo

Cerrar solo los faltantes que impiden positivos, o sustituir candidatos con evidencia mejor:

1. R05: cota de demanda DC por salida/total y reserva/transitorios justificados para conjuntos resultantes; los314,32/474,32 W quedan excluidos. Revisar prioridad del manual RPS0215 sin inventar confirmación del fabricante.
2. R04/R06/R07: H GPU/cable de Meshify, cuerpo/offset/tramo/curvatura de P15 en Pop2, colisiones/shroud y espacio/ruta efectiva de cables de fuente. Siete slots y largos nominales no cierran envolventes.
3. R08/R10: interferencias P12 con P03/P18/RAM, evidencia térmica P01 y encaje P14. Noctua devolvió429; no se obtuvo veredicto cooler/placa. Completar también evidencia R03 de negociación aplicable.
4. S06 gabinete: elegir candidato que conserve dos USB-A, reset y audio/mic de B o documentar dependencias reales. Pop2+CP14-E no conserva todo; no aprobarlo silenciosamente.

Sustentados documentalmente: fallo CX550/adaptador P15 por un solo ramal, largo TUF329>315, requisito BIOS P2.30 y faltante al omitirlo, orden inverso bloqueado, costos históricos. S06 falla conservación funcional bajo R10 propuesto; su sustituto positivo sigue abierto. **S01–S05/S07/S09/S15 continúan abiertos**; todavía no hay dos bases ni seis sustituciones positivas cerradas. No declarar válida la etapa fuente→GPU solo porque el orden elimina un fallo.

Revisión futura R10/S06: separar restricciones físicas/eléctricas de la política propuesta de conservar funciones. Perder un puerto/reset no demuestra por sí solo imposibilidad de montaje; no ocultar la pérdida ni aceptar esa política globalmente. No se modificaron HARDWARE_DEMO ni CU05 en etapa 27. Resolver evidencia con condiciones de validez, sin exigir mediciones físicas universales ni dar por conocidas cotas ausentes.

Puede avanzar en paralelo con futura base técnica acordada: permisos/selección de imágenes, cotizaciones faltantes de pasta/P14/P18/gabinete. Visuales no bloquean backend; precio incompleto sí impide afirmar presupuesto de una alternativa. Mantener ofertas del24 y agregar nuevas observaciones, nunca reescribirlas.

No iniciar implementación por esta lista. Primero revisar propuestas y acordar el siguiente incremento verificable; sin repetir auditoría general, instalaciones o preparación de integraciones.
