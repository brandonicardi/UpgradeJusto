# IA local — estado comprobado27/10/2026

## Resultado: chat bloqueado

Ollama está instalado e integrado, pero **CU08 no supera el gate de herramientas**.
Texto e historial `completed` no equivalen a una respuesta fundada.

- Runtime portable oficial Ollama0.40.11, Qwen3:4B Q4_K_M, loopback11434.
- RX6800/Vulkan observado; aproximadamente5.1GB VRAM en la prueba. Sin instalar
  drivers, WSL, servicios globales ni overrides. No reinstalar ni descargar otra vez.
- Selector `UJ_CHAT_PROVIDER=groq|ollama`; extracción CU02 conserva Groq. Sin fallback
  silencioso. Local: contexto16384, salida1024, reasoningFalse, timeout30s, límite
  global90s y rondas/herramientas existentes conservados.
- Runtime SHA256 `bda4a493ba8a7c24d57263cd843cd68cee84f44aed4299eeed532acad7eda12a`.
- Modelo digest `359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7`.

## Reparación y verificación focal

El SDK perdía referencias y uniones de tipos al serializar herramientas. El adaptador
`backend/upgradejusto/assistant/ollama_schema.py` expande referencias locales y restaura
sólo `tools` en transportes públicos HTTPX, aislados por binding y stream. Mantiene
parsing SDK y validación MCP autoritativa. No todas las restricciones JSON Schema son
representables por el servidor nativo; no se afirma equivalencia completa.

**35 pruebas focales PASS**, Ruff check/formato limpios. Una consulta focal Astra,
disponibilidad verificada en el mismo proveedor, respaldó la vía y sus gates; no
certificó el recorrido real. Esa consulta autorizada ya fue utilizada.

| Turno real local | get_pc | evaluate_pc | Primer texto | Total | Resultado |
|---|---:|---:|---:|---:|---|
| Antes de reparar | 0 | 0 |28.2s|39.1s|FAIL|
| Después de reparar/revisar |0|0|21.014s|31.987s|FAIL|

En el segundo hubo un stream, texto e historial completed y limpieza completa, sin
herramientas ejecutadas. No se probó la repregunta porque falló el primer criterio.
La pérdida de esquema **no era explicación suficiente**. No hay evidencia para
atribuirlo únicamente al modelo, prompt, cuota o hardware.

**Bloque detenido e informado al supervisor.** Sin más llamadas, consultas, rotación
de proveedores o descargas automáticas. Próximo intento requiere hipótesis concreta
y nueva autorización; no prometer chat operativo. Groq también conserva su bloqueo
histórico `tool_use_failed` después de get_pc; no se repitió para esta entrega.

## Operación

El launcher normal acepta `-ChatProvider ollama -OllamaModel qwen3:4b`; seleccionar
un proveedor no lo convierte en aceptado. Ver [guía local](PROBAR38_LOCAL.md) y
[estado vigente](CONTINUAR.md) para procesos/URL. Ollama tiene manifiesto propio:
`.local/ollama/processes/5dc5b89fe3104739b153f69f21bc8991/owned-process.json`.
No terminar un PID sin comprobar identidad ni confundir el Stop web/API con Ollama.

La inspección anterior a la instalación y el diagnóstico Groq están preservados como
[histórico](ai-log/2026-10-27-ia-local-inspeccion-historica.md), no instrucciones vigentes.
