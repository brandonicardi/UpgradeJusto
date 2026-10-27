# HISTÓRICO — inspección previa a la instalación local27/10

No describe el entorno actual ni autoriza reintentos. Estado vigente: `../IA_LOCAL38.md`.

## Resultado comprobado

Inspección local de solo lectura, sin instalar, descargar modelos, iniciar servicios
ni modificar proveedores:

- CPU: AMD Ryzen7 9800X3D,8 núcleos/16 hilos.
- RAM:31.6GiB utilizables;15.2GiB libres en la observación, no reserva garantizada.
- GPU: AMD Radeon RX6800. `Win32_VideoController.AdapterRAM` devuelve un entero
  limitado a32bits: **no usar ese valor como VRAM real**. VRAM disponible no medida.
- Ollama no encontrado en PATH, instalación habitual de usuario, registro de
  aplicaciones instaladas ni procesos. No existen manifiestos de modelos en la
  ubicación habitual; tampoco variables `OLLAMA_MODELS`/`OLLAMA_HOST` de proceso,
  usuario o máquina. No respondió `127.0.0.1:11434/api/tags`; sin listener observado.
- Esto no descarta un ejecutable portable en otra carpeta no declarada. No se
  recorrieron discos ni carpetas privadas para buscarlo.

**No hay runtime/modelo local disponible identificado para una prueba de inferencia.**
Latencia, tokens/s, consumo y calidad con las siete herramientas: **no medidos**.
No se presenta un benchmark de documentación como resultado de esta máquina.

## Viabilidad y recomendación

La máquina justifica evaluar inferencia local, pero no reemplazar Groq a ciegas.
La documentación oficial Ollama consultada incluye RX6800 en ROCm/Linux, **no**
en su lista ROCm/Windows. Documenta Vulkan como alternativa para Windows/Linux;
su funcionamiento con el driver y VRAM de este equipo sigue sin comprobarse.
No se instalaron drivers, WSL ni overrides para aparentar soporte.

Ollama documenta herramientas y streaming con modelos adecuados, por ejemplo Qwen3;
no todos los modelos soportan llamadas de herramientas ni todo JSON Schema.
Como propuesta, evaluar primero una variante pequeña cuantizada con soporte tools,
no descargar un modelo20B por imitar el nombre de Groq. Tamaño, versión, licencia,
memoria de contexto y descarga se deben acordar antes de instalar.

**Recomendación actual:** conservar Groq sin cambios y registrar local como alternativa
condicionada a runtime/modelo disponible y un gate real. No hay evidencia para afirmar
que local sea más rápido o resuelva el chat. `assistant/provider.py` sigue usando
ChatGroq y `GROQ_MODEL`; todavía **no existe selector Ollama integrado/configurable**.
No confundir la intención de conservar ambas opciones con implementación terminada.

## Causa del fallo Groq: límite de lo probado

El diagnóstico existente observó `get_pc` completado y fallo en la segunda generación
SDK, antes de `evaluate_pc` o texto visible: `APIError`, código `tool_use_failed`, tipo
`invalid_request_error`, HTTPstatus no disponible. No demuestra413/429/cuota ni fallo
del motor. No se imprimieron cuerpo privado, failed_generation ni credenciales.

Se encontró y corrigió una contradicción real en el esquema anunciado de `simulate_pc`:
antes admitía selector legacy con cuerpo torre, rechazado luego por el validador.
Trece pruebas puras aprobaron la reparación; revisión independiente la aceptó localmente.
El gate ampliado MCP/PG pasó1caso en4.62s: esquema recibido por stdio real, selección
legacy omitida/1 y torre2, rechazo cruzado y conversión pura de la expresión del grafo.
Una ampliación posterior pasó1caso en4.04s con `ChatGroq.bind_tools()` real y
`bound.kwargs["tools"]`: clave sintética, transportes HTTP bloqueados y cero intentos
de red; conserva el esquema y rechazo cruzado. No ejecuta modelo ni streaming.
**Causalidad respecto del fallo Groq y
aceptación integral del `oneOf` por el proveedor siguen sin demostrar.**

Después de cerrar transporte y binding se ejecutó **un único turno LIVE** sintético
postreparación, sin cambio de modelo, cuenta o reintentos: FAIL4.39s. Un POST admitido,
dos streams; `get_pc` completó y su validación local pasó. Segundo stream conserva
`tool_use_failed / invalid_request_error`, sin statusHTTP ni evidencia413/429,
sin inicio de `evaluate_pc` y sin texto final. Historialfailed y cleanup_complete=true.
El prompt sintético nuevo pidió explícitamente leer/evaluar schema2; no es reproducción
literal del mensaje UI anterior ni experimento causal controlado. **La reparación no
basta para resolver el chat**. La primera generación recibió el contrato y produjo
una llamada válida; eso no prueba todas sus ramas. No más reintentos por este resultado.

## Única prueba local propuesta cuando exista un modelo

Sin cambiar `.env`, defaults, cuenta, proveedor global ni red pública:

1. Confirmar versión/modelos/capacidad tools con APIs locales de metadatos; comprobar
   acelerador efectivo y memoria, sin descargar automáticamente.
2. Proceso TEST aislado en loopback, datos sintéticos y mismo esquema real de siete
   herramientas. Un turno acotado: lectura autorizada, resultado y respuesta final.
   Conservar motor, permisos, validación, proyección y límite de rondas.
3. Medir tiempo hasta primer texto, turno completo, carga y generación; registrar
   solo métricas/estados, sin contenido privado. La respuesta final aporta duraciones
   y contadores; tokens/s no sustituye latencia total ni corrección de herramientas.
4. Fallar si faltan herramientas válidas, respuesta final, aislamiento o tiempo límite.
   Detener solo proceso propio; ninguna promoción automática a proveedor del producto.

Prueba **no ejecutada**: falta runtime/modelo identificado. No se creó adaptador
especulativo. El único turno Groq posterior a la corrección se registra arriba;
sin reanudación automática ni rotación de proveedor por el fallo.

## Fuentes oficiales consultadas

- https://docs.ollama.com/gpu — listas Windows/Linux y alternativa Vulkan.
- https://github.com/ollama/ollama/blob/main/docs/capabilities/tool-calling.mdx
- https://github.com/ollama/ollama/blob/main/docs/api.md — chat/herramientas/métricas.
- https://github.com/ollama/ollama/blob/main/docs/api/openai-compatibility.mdx

Consulta actual vía Context7 y documentación oficial. Son documentación de capacidades,
no prueba de instalación ni de compatibilidad del contrato de UpgradeJusto.
