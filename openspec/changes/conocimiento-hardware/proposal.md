# Proposal

## Why

Una PC real trae piezas con nombre («Ryzen 5 5600», «RTX 3060», «B550») y casi nunca con la ficha
técnica completa a mano. Sin conocimiento general, el motor responde «Falta un dato» en la mayoría de
los casos, el recomendador no tiene con qué ordenar y el chat no tiene una fuente para explicar. Hace
falta un conocimiento general de hardware con fuente por cada dato, que complete solo lo que el
fabricante no dio, y que nunca decida un veredicto por sí mismo.

## What Changes

- **Tablas con fuente** en `backend/upgradejusto/compatibility/conocimiento/`: `plataformas.json`
  (zócalo, chipset y generaciones), `gpus.json` (potencia recomendada de fuente, consumo e índice de
  rendimiento) y `cpus.json` (consumo e índice de rendimiento). Cada fila cita una fuente y cada tabla
  tiene fecha de consulta.
- **Identificación por nombre** (`compatibility/reference_knowledge.py`). Prioridad: dato del fabricante
  > referencia > desconocido. Un nombre ambiguo o contradictorio no aporta ningún hecho.
- **Rotulado y avisos.** Lo que sale de una referencia se rotula «según datos de referencia». Lo que varía
  por modelo (conectores, espacio en gabinete, lugar para discos, ranuras) queda como aviso «Chequeá…»:
  no bloquea. Una incompatibilidad real domina.
- **Recomendador por valor** (`recommendations/tower_service.py`). Dentro de cada estado ordena por
  ganancia ponderada por la parte del presupuesto que usa. Sin precio vigente no propone nada. Si ninguna
  alternativa entra en el presupuesto, muestra la mejora real más cercana.
- **Documento de referencia para el chat.** `assistant/reference_doc.py` genera
  `docs/conocimiento-hardware.md` desde las mismas tablas y lo ingiere en pgvector. La búsqueda prioriza
  términos exactos (B550, RTX 3060).
- **IA local opcional.** llama.cpp con Vulkan en `.tools/`, levantado por `scripts/llama-local.ps1` en
  127.0.0.1:8081. `UJ_LOCAL_ADVISOR=1` activa la elección del recomendador entre propuestas ya verificadas.
  `UJ_CHAT_PROVIDER=llamacpp` usa el mismo modelo en el chat. Groq sigue siendo el proveedor por defecto.
- **Primera PC.** `recommendations/first_build.py` y `GET /api/catalog/components/first-build` proponen
  un armado completo validado por el motor; se abre como borrador editable en `/build`.
- **Ajustes de interfaz.** Chat que nace con el primer mensaje, «Tu cuenta» igual al menú, encabezado
  estable, presupuesto con deslizador hasta $5.000.000 (sin tope al escribir) e Inicio con «Mejorar la PC
  que tengo» y «Armar mi primera PC».

## Capabilities

### New Capabilities

Ninguna. El conocimiento general vive dentro de las capacidades existentes.

### Modified Capabilities

- `compatibilidad`: agrega la identificación de piezas por nombre con fuente y el rotulado de los datos
  de referencia.
- `recomendaciones`: agrega el orden por valor, la regla sin precio y la primera PC.
- `asistente`: agrega el documento de referencia con búsqueda exacta y el proveedor local.
- `sistema-diseno`: agrega las pantallas de inicio, el presupuesto y el rotulado de referencia.

## Impact

- **Backend:** `compatibility/` (tablas, `reference_knowledge.py`), `recommendations/` (`tower_service.py`,
  `advisor.py`, `first_build.py`), `assistant/` (`reference_doc.py`, `provider.py`, `rag.py`), `api/catalog.py`.
- **Frontend:** pantallas de inicio, chat, cuenta, presupuesto y `/build`, que consume la ruta de primera PC.
- **Documentación:** `docs/conocimiento-hardware.md` (generado), README, `docs/ARQUITECTURA.md`,
  `docs/MCP.md`, `.env.example`, `AGENTS.md`.
- **Operación:** la IA local es opcional. En Docker el RAG no está activo, porque necesita el modelo de
  embeddings local.

## Fuera de alcance

- No se publican FPS: los índices son relativos (PassMark para GPU, Blender Open Data para CPU).
- No se publican precios ni datos de fabricante que no estén en las tablas.
- No se evalúan BIOS, refrigeración ni velocidades de memoria (ver `tower-essential-policy-2`).
- El modelo local no decide compatibilidad ni agrega opciones al recomendador.
