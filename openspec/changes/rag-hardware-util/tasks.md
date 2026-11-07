# Tasks

Para Claude: planificación solicitada por Brandon, todavía sin implementar. Coordinar con el dueño de `chat-groq` antes de editar `assistant/`; un escritor por carpeta. Los nombres de pruebas nuevos indicados abajo son entregables, no pruebas ya existentes ni ejecutadas.

## 1. Corpus y casos de aceptación (infra/documentador, secuencial)

- [x] 1.1 Seleccionar tres PDFs oficiales relevantes para PCs de demostración o alternativas del catálogo, con modelo/alcance, URL, derechos, hash, tamaño y páginas. Verificar descarga real y texto extraíble; registrar inventario en `tools/public-corpus.json`, sin publicar PDFs sin permiso.
- [x] 1.2 Completar al menos seis fuentes y cuatro categorías, priorizando placas madre, GPU, fuentes y memoria/gabinetes según disponibilidad real. Verificar inventario, procedencia oficial y vínculo con catálogo; Kingston puede contar una vez, el documento generado no.
- [x] 1.3 Definir doce preguntas en español y sus fuentes/localizadores esperados antes de ajustar recuperación (8 respondibles, 2 variantes, 2 sin evidencia). Entregar fixture `backend/tests/fixtures/rag_hardware_cases.json`; verificar manualmente cada respuesta esperada contra el PDF. Coordinar su escritura con asistente-ia.

## 2. Manifiesto e ingesta (asistente-ia)

- [ ] 2.1 Reemplazar singleton y constantes específicas de Kingston en `rag.py` por validación multifuente, metadatos de identidad y normalización del manifiesto antiguo. Verificar duplicados, hashes por fuente, límites y regresión antigua con `tests/test_assistant_rag_manifest.py`.
- [ ] 2.2 Ajustar límites explícitos de páginas/fragmentos/tamaño total a los manuales seleccionados, manteniendo rechazo de archivos alterados, cifrados o sin texto útil. Verificar límites y extracción con `tests/test_assistant_rag_ingest.py`; documentar valores elegidos en `docs/RAG.md`.
- [ ] 2.3 Verificar ingesta multifuente idempotente y fallo de documento sin publicación parcial de ese archivo en `tests/test_assistant_rag_postgres.py`, con PostgreSQL de test y encoder real. Conservar la fuente general y registrar recuentos por fuente/revisión.

## 3. Recuperación y MCP (asistente-ia)

- [ ] 3.1 Consultar todos los pares fuente/revisión activos y excluir retirados/reemplazados; conservar el documento general vigente. Verificar con casos PostgreSQL de alta, reemplazo, retiro y reingesta en `tests/test_assistant_rag_postgres.py`.
- [ ] 3.2 Incorporar resolución de modelo/aliases curados y separar alcance exacto, familia y general; no usar substring como prueba de identidad. Verificar modelo parecido, sufijos distintos y consulta general en `tests/test_assistant_rag_identity.py`.
- [ ] 3.3 Conservar campos de citas y transportar alcance en `search_public_docs` y su proyección. Adaptar validación de publicación solo donde sea necesario para citas multifuente. Verificar MCP, citas e historial y regresiones de grounding: fuente general no concede veredicto ni precio.
- [ ] 3.4 Ejecutar los doce casos con embeddings reales y PostgreSQL; ajustar recuperación sin rebajar umbrales ni cambiar silenciosamente respuestas esperadas. Entregar prueba `tests/test_assistant_rag_quality_postgres.py` y resultado por pregunta: al menos 7/8 positivas con evidencia esperada top-5 y 4/4 negativas sin atribución falsa; registrar latencia.

## 4. Preparación reproducible y documentación (infra/documentador, secuencial)

- [ ] 4.1 Documentar y comprobar en `docs/RAG.md` preparación desde metadatos versionados: obtener encoder fijado, descargar documentos autorizados, generar manifiesto con rutas locales, ingerir y ejecutar evaluación. Repetir contra base de prueba limpia; no depender de un manifiesto privado preexistente ni modificar PCs reales.
- [ ] 4.2 Actualizar README y `docs/MCP.md` con cobertura real, preguntas de ejemplo, limitaciones y forma de ampliar corpus. Verificar enlaces y correspondencia con inventario; indicar que Docker sigue sin habilitación RAG y que llama.cpp no se configura en este cambio.

## 5. Aceptación integrada y revisión

- [ ] 5.1 Con el proveedor configurado, ejecutar un recorrido real de tres preguntas: modelo documentado con cita correcta, variante no cubierta con límite explícito y consulta de compatibilidad resuelta por motor. Verificar SSE/historial y ausencia de cambios en PC; registrar proveedor y latencia. Groq requiere autorización para cuota; si no hay proveedor disponible, dejar pendiente, no sustituir por mocks.
- [ ] 5.2 Correr pruebas backend sin base y las de PostgreSQL afectadas, `ruff check .` y `ruff format --check .`; registrar resultados actuales y fallas preexistentes sin marcarlas como aprobadas. Frontend no requiere cambios: comprobar que las citas mantienen su contrato.
- [ ] 5.3 Revisor independiente: contrastar spec, inventario, doce preguntas, revisión activa, modelos confundibles, permisos y evidencia de ingesta real. Verificar que no se declaró completo con solo fixtures ni se tocaron datos personales.

## Workflow follow-up

- Implementar mediante `/opsx-apply rag-hardware-util` después de revisión humana del plan.
- Docker+RAG y conexión Docker→llama.cpp requieren su propio cambio; no habilitarlos como efecto colateral.
- Archivar y commitear únicamente con aprobación explícita de Brandon.
