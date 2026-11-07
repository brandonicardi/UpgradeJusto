# UpgradeJusto

Web para mejorar una PC existente o armar una desde cero, según compatibilidad,
objetivo de uso y presupuesto. Trabajo final del curso de Arquitectura de Agentes (UNLa).

**Principio del producto:** el modelo de IA interpreta, resume y explica; la
compatibilidad la decide un motor determinístico y reproducible. Una incompatibilidad
domina sobre cualquier otro resultado y un dato desconocido jamás se trata como
falso, cero o compatible.

---

## Cómo levantar el proyecto

**Requisitos:** Docker Desktop (en Windows, con el backend de WSL 2 activo). No hace
falta instalar Python, Node ni la base: todo corre en contenedores.

**Pasos:**

```powershell
git clone <este-repo>
cd UpgradeJusto-CursoIA
Copy-Item .env.example .env    # en Linux/Mac: cp .env.example .env
docker compose up --build
```

**Qué completar en `.env`:**

| Variable | Para qué |
|---|---|
| `POSTGRES_ADMIN_PASSWORD` y `UJ_DB_APP_PASSWORD` | **Obligatorias.** Poné cualquier clave (sin espacios ni `@ : /`). No hay valores por defecto: si faltan, Docker se detiene y avisa cuál. La base no se publica fuera de Docker. |
| `GROQ_API_KEY` | Opcional: habilita el chat (CU08). Se obtiene gratis en https://console.groq.com. Sin clave, el asistente avisa que no está disponible y todo lo demás funciona. |
| `GROQ_MODEL` | Modelo del chat; el valor por defecto (`openai/gpt-oss-20b`) no hace falta cambiarlo. |
| Resto | Pueden quedar como vienen en `.env.example`. |

**Primera carga:** el contenedor del backend aplica las migraciones de Alembic, carga
los datos técnicos del catálogo y publica los 11 lotes de ofertas de demostración de
`data/catalogo/` (680 registros con `product_id`; el manifiesto excluye 3, quedan 677
productos de CompraGamer y Venex). Por el seed inicial, la primera vez puede tardar
varios minutos en responder.

**Uso:** abrir http://localhost:3000. La base PostgreSQL no expone puertos: solo es
alcanzable desde la red interna de Compose (ver `docker-compose.yml`).

**Apagar y reiniciar:**

```powershell
docker compose down        # apaga y conserva los datos
docker compose down -v     # apaga y borra los datos (volumen pgdata + secretos)
```

---

## Casos de uso

Cada uno tiene su especificación en [`openspec/specs/`](openspec/specs/), con los
requisitos, escenarios y reglas que el sistema debe cumplir.

| ID | Caso de uso | Qué resuelve | Spec |
|---|---|---|---|
| CU01 | Registro e inicio de sesión | Crear cuenta y entrar; opcionalmente con Google. | [`cuentas`](openspec/specs/cuentas/) |
| CU02 | Registrar una PC desde sus especificaciones | Pegar texto libre o salida de CPU-Z y obtener una propuesta editable de la PC; nada se guarda sin confirmar. | [`extraccion-pc`](openspec/specs/extraccion-pc/) |
| CU03 | Gestionar PCs | Cargar varias PCs por cuenta; cada persona solo ve y edita las suyas. | [`pcs`](openspec/specs/pcs/) |
| CU04 | Explorar el catálogo | Buscar componentes con filtros, precios con moneda, fecha y fuente. | [`catalogo`](openspec/specs/catalogo/) |
| CU05 | Verificar compatibilidad | Veredicto `compatible`, `incompatible` o `requiere verificación`, con el detalle de cada regla. | [`compatibilidad`](openspec/specs/compatibilidad/) |
| CU06 | Recomendar mejoras | Sugerencias por objetivo de uso y presupuesto, con comparaciones simuladas. | [`recomendaciones`](openspec/specs/recomendaciones/) |
| CU07 | Planificar mejoras por etapas | Partir una actualización grande en etapas posibles de comprar. | [`planes`](openspec/specs/planes/) |
| CU08 | Consultar al asistente | Chat con LangChain + LangGraph que usa herramientas vía MCP para leer datos reales. | [`asistente`](openspec/specs/asistente/) |
| CU09 | Compartir un plan | Publicar un enlace público de solo lectura para un plan, revocable. | [`compartir-planes`](openspec/specs/compartir-planes/) |
| CU10 | Administrar catálogo y reglas | Con rol admin: curar componentes y reglas de compatibilidad. | [`administracion`](openspec/specs/administracion/) |

---

## Arquitectura

```
Navegador ──► Next.js (frontend, :3000, proxy con sesión + CSRF)
                  ▼
              FastAPI (backend, :8000) ── monolito modular
                  │
    auth  pcs  catalog  compatibility  recommendations  plans  shares  administration
                  │                 ▲
                  │                 │ (MCP stdio, solo lectura, verifica propiedad)
              assistant ── LangGraph ──► Groq / Ollama / llama.cpp (LLM)
                                         PostgreSQL 18 + pgvector (datos y RAG)
```

Dentro del motor, `compatibility/` decide con las reglas y completa datos desde las tablas de
conocimiento general (`compatibility/conocimiento/`). `recommendations/` ordena las propuestas y
arma la primera PC; el modelo local, si está activo, solo elige entre propuestas ya verificadas.

| Capa | Stack |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind 4 (App Router; `app/api/**` hace de proxy, el navegador nunca habla directo con FastAPI) |
| Backend | FastAPI + SQLAlchemy + Alembic, Python 3.12 con `uv`; capas router → servicio → repositorio, dominio puro sin HTTP ni BD |
| Base de datos | PostgreSQL 18 con `pgvector` (datos y embeddings para RAG) |
| Asistente | LangChain + LangGraph; proveedor Groq por defecto; Ollama o llama.cpp (local) opcionales |
| Infraestructura | Docker Compose (base, backend y frontend en un solo comando) |

El detalle de cada decisión está en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## El asistente (CU08)

- Es un grafo LangGraph donde el modelo alterna entre *pensar* y *llamar herramientas*:
  no inventa datos, los pide por el protocolo MCP.
- Las herramientas viven en un servidor MCP propio
  (`backend/upgradejusto/assistant/mcp_server.py`) que se abre por `stdio` como
  subproceso de un solo uso por turno; no expone HTTP ni recibe la clave del LLM.
- Herramientas registradas (todas de solo lectura): `catalog_search`, `get_pc`,
  `evaluate_pc`, `simulate_pc` (sustitución efímera, no guarda la PC),
  `preview_recommendations`, `get_plan` y `search_public_docs` (búsqueda documental
  con citas).
- La identidad se resuelve en el servidor: cada llamada valida la sesión del dueño.
  El modelo no puede pedir la PC de otra persona.
- El veredicto de compatibilidad siempre lo calcula el motor determinístico; el
  modelo solo lo interpreta y lo explica.

## Conocimiento de hardware

Cuando una pieza llega con nombre pero sin ficha completa (por ejemplo «Ryzen 5 5600» o
«RTX 3060»), el motor completa solo lo que falta, con una fuente por cada dato.

- Tablas en `backend/upgradejusto/compatibility/conocimiento/`: `plataformas.json` (zócalos,
  chipsets y generaciones), `gpus.json` (potencia recomendada de fuente, consumo e índice de
  rendimiento) y `cpus.json` (consumo e índice de rendimiento). Las fuentes son AMD, NVIDIA,
  PassMark (GPU) y Blender Open Data (CPU).
- Orden de confianza: dato del fabricante, luego referencia, y si no hay nada, desconocido. Un
  nombre ambiguo o contradictorio no aporta datos.
- Lo que sale de una referencia se rotula «según datos de referencia». Lo que varía por modelo
  (conectores, espacio en el gabinete, lugar para discos, ranuras) aparece como aviso «Chequeá…»
  y no bloquea. Una incompatibilidad real domina.
- Los índices de rendimiento son relativos: la app no publica FPS.
- El documento que lee el chat se genera desde las mismas tablas, con el manifiesto del RAG:

```powershell
cd backend
.\.venv\Scripts\python.exe -m upgradejusto.assistant.reference_doc --config <manifiesto-rag> --write-doc ..\docs\conocimiento-hardware.md
```

  En Docker el RAG no está activo, porque necesita el modelo de embeddings local.

## IA local (opcional)

La app funciona sin IA local: sin ella, el chat usa Groq y el recomendador usa su orden
determinístico. Para usar llama.cpp con Vulkan:

1. Binario en `.tools/llama.cpp/` y modelo en `.tools/models/` (las dos carpetas están
   ignoradas por Git). El modelo de referencia es `Qwen3.5-27B-UD-IQ3_XXS.gguf`.
2. Levantarlo con `scripts\llama-local.ps1`. Escucha solo en `127.0.0.1:8081`.
3. Activar lo que quieras en `.env`:
   - `UJ_LOCAL_ADVISOR=1`: el recomendador le pide elegir una opción entre propuestas ya
     verificadas. Una clave fuera de la lista, un número inventado, un timeout o el modelo
     apagado dejan el orden determinístico.
   - `UJ_CHAT_PROVIDER=llamacpp`: el chat usa el modelo local. El valor por defecto es `groq`;
     `ollama` también es válido.
   - `UJ_EXTRACTION_PROVIDER=llamacpp`: pegar una lista usa el modelo local. Tarda unos 50 s y
     si el modelo está apagado da error, sin pasar a Groq. Lo que no pueda comprobar queda
     para que lo revises antes de guardar.

Para activar todo junto: `scripts\demo-local.ps1` levanta el modelo y la app.

Medido en una RX 9070 XT: ~35 tok/s, ~2 s por elección y tool calling correcto.

---

## AI Engineering

Este proyecto no usa IA solo en el producto (asistente, extracción): todo el
**desarrollo también fue dirigido por agentes de IA**.

### a) Entorno de desarrollo con agentes

Trabajamos con OpenCode y 7 agentes especialistas, cada uno con su modelo:

| Agente | Rol | Modelo |
|---|---|---|
| `orquestador` | Coordina el cambio de OpenSpec, delega tareas, corre pruebas, reporta | DeepSeek V4.1 Flash |
| `backend` | Implementa `backend/` salvo el asistente | DeepSeek V4.1 Flash |
| `asistente-ia` | Solo `assistant/`: LangChain, LangGraph, MCP, RAG | Kimi K2.7 Code |
| `frontend` | Implementa `frontend/` fiel al sistema de diseño | Claude Sonnet |
| `infra` | Docker, Compose, scripts, `.env.example`, datos | Qwen3.8 Flash |
| `documentador` | `README.md` y `docs/` | GLM-5.3 Flash |
| `revisor` | Solo lectura: compara el diff contra la spec y las reglas | GPT-6 Luna |

Por qué un modelo por rol: cada tarea se asigna al modelo más barato que rinde para
ese trabajo. El revisor usa una familia distinta de los implementadores a propósito:
independencia de criterios, para que no «herede los prejuicios» de quien escribió el código.

### b) Reglas de contexto

- Un `AGENTS.md` en la raíz con las **reglas de producto no negociables** (motor
  determinístico, tres veredictos, identidad en el servidor, nada se guarda sin
  confirmar, no inventar precios ni datos, sin SQL generado).
- Un `AGENTS.md` corto por capa (`backend/`, `frontend/`) con estructura, reglas y
  comandos de prueba, dirigido a la IA y no a lectores humanos.
- Los instructores pidieron reducirlos: se reemplazaron documentos largos con la
  historia del proyecto por esos archivos acotados. El detalle histórico vive en las
  specs de OpenSpec, no en el contexto.

### c) Metodología: OpenSpec (spec-driven)

Todo cambio sigue el ciclo: **propuesta → revisión humana → `apply` (el orquestador
delega en especialistas) → pruebas → revisor → aprobación humana → `archive` → commit**.

Cada cambio crea una carpeta en `openspec/changes/` con:

| Artefacto | Qué es |
|---|---|
| `proposal.md` | Por qué se hace el cambio y qué va a cambiar. |
| `specs/` | Delta de especificación: requisitos y escenarios nuevos o modificados. |
| `design.md` | Decisiones técnicas tomadas antes de codear. |
| `tasks.md` | Tareas pequeñas, cada una con su comando de verificación. |

Al archivar (con OK explícito humano), el cambio queda en
[`openspec/changes/archive/`](openspec/changes/archive/) y sus requisitos se suman a
las specs de [`openspec/specs/`](openspec/specs/): la especificación vigente siempre
está ahí, no en la memoria de nadie.

### d) Loops de autocorrección

- **Prueba primero:** se escriben las expectativas y se ven fallar antes de la
  implementación (asistente, motor de compatibilidad).
- **Nada está hecho sin su prueba:** una tarea solo se marca `[x]` cuando su comando
  de verificación pasa.
- **El revisor genera trabajo, no solo informe:** compara el diff contra la spec y
  sus hallazgos vuelven como tareas nuevas del mismo cambio. Ejemplo real: en el
  cambio `docker-compose`, la revisión detectó un error de sintaxis SQL en
  `scripts/docker/db-init.sql` (identificadores citados como literales) y se corrigió
  en la tarea 5.1.
- **Evidencia visual, no promesas:** en `tokens-y-fuentes` se capturaron pantallas
  antes y después, y la comparación dio 3 pantallas idénticas, probando que aplicar
  los tokens de diseño no cambió nada visible todavía.

### e) Prompts clave

Cada etapa del proyecto se impulsó con un prompt chico, con una sola comprobación,
criterio de aceptación explícito y punto de detención al final. En
[`docs/PROMPTS.md`](docs/PROMPTS.md) está la tabla completa por etapa (entorno,
agentes, MCP, specs, backend, motor, web, asistente, revisión de seguridad,
rediseño visual) y cinco prompts abreviados de referencia.

---

## Qué valida el chat antes de responder

El texto del modelo queda en un borrador privado. `assistant/grounding.py` revisa cada párrafo contra lo que las herramientas devolvieron en ese turno: un veredicto tiene que venir del motor, un precio de una oferta real con tienda y fecha, y un dato técnico de una fuente citada. Lo que no se puede comprobar tiene una sola reescritura; si sigue sin respaldo, no se muestra y se avisa. Por eso la respuesta aparece completa al final y no palabra por palabra. Es una validación por reglas, no una garantía semántica.

## Setup de IA del proyecto

Los agentes desarrollan el proyecto; el producto no depende de ellos. Lo que hace falta para
reproducir el entorno:

- **OpenSpec:** `openspec/` tiene las specs vigentes (`specs/`) y los cambios (`changes/`). El ciclo
  se dispara con los comandos `/opsx-propose`, `/opsx-apply` y `/opsx-archive` (`.opencode/commands/`).
  Node y el CLI de `openspec` deben estar en el PATH.
- **Agentes:** `.opencode/agents/*.md`, uno por rol. Cada archivo declara su modelo en el encabezado;
  la tabla de la sección «AI Engineering» muestra cuál usa cada uno. El revisor es de otra familia
  de modelos a propósito.
- **Skills:** `.opencode/skills/` (flujo de OpenSpec y diseño de frontend).
- **MCP:** `.mcp.json` en la raíz tiene los servidores del proyecto (upgradejusto, Context7 y
  GitHub). `opencode.json` (ignorado por Git) agrega Engram. Detalle en [`docs/MCP.md`](docs/MCP.md).
- **Un modelo por tarea:** cada agente usa el modelo más barato que rinde para su trabajo. Un solo
  agente escribe en cada carpeta a la vez.

---

## Servidores MCP (Model Context Protocol)

El entorno usa 4 servidores MCP (detalle en [`docs/MCP.md`](docs/MCP.md)):

| Servidor | Tipo | Configuración | Rol |
|---|---|---|---|
| **Context7** | Externo (remoto) | `.mcp.json` (y `opencode.json`) → `https://mcp.context7.com/mcp` | Documentación vigente de FastAPI, LangChain, Next.js, OpenSpec, `uv`, etc., antes de escribir código. |
| **GitHub** | Externo (local) | `.mcp.json` → `.opencode/scripts/github-mcp.ps1` | Consultar el repositorio, PRs y Actions con el token de `gh`. |
| **Engram** | Local | `opencode.json` | Memoria persistente de decisiones entre sesiones de agentes. |
| **upgrade-mcp** | Propio (producto) | `.mcp.json` → `backend/upgradejusto/assistant/mcp_server.py` | Herramientas de solo lectura del chat (CU08). |

La configuración de desarrollo va en `.mcp.json` (versionado, sin rutas personales). `opencode.json`
es local y está **ignorado por Git** (ver `.gitignore`) porque tiene rutas propias de cada máquina.
Estructura de ejemplo de ese archivo, con placeholders en lugar de rutas personales:

```json
{
  "mcp": {
    "servers": {
      "context7": { "type": "remote", "url": "https://mcp.context7.com/mcp" },
      "github": {
        "type": "local",
        "command": ["pwsh", "-File", "<ruta-del-repo>/.opencode/scripts/github-mcp.ps1"]
      },
      "engram": {
        "type": "local",
        "command": ["<binario-engram>", "mcp", "--tools=agent"],
        "environment": { "ENGRAM_DATA_DIR": "<carpeta-local-de-datos>" }
      }
    }
  }
}
```

Ninguno guarda secretos: el token de GitHub sale de `gh auth token` en el momento y
la clave de Groq vive solo en `.env` (también ignorado). Distinguimos siempre
«configurado» de «consultado»: no se da por usado un servidor hasta que hay evidencia
de una consulta real.

---

## Pruebas

```powershell
# Backend (desde backend/)
$env:UJ_TEST_POSTGRES="0"; .\.venv\Scripts\python.exe -m pytest -q   # sin base
.\.venv\Scripts\ruff.exe check . ; .\.venv\Scripts\ruff.exe format --check .

# Frontend (desde frontend/)
npm test ; npm run typecheck ; npm run lint
```

Las pruebas de integración con PostgreSQL usan la base de Docker levantada
(`UJ_TEST_POSTGRES=1` y `UJ_ENV=test`; ver `scripts/test-backend.ps1`).

## Estructura del repo

| Carpeta | Qué contiene |
|---|---|
| `backend/` | FastAPI, motor de compatibilidad, asistente, migraciones y pruebas (ver `backend/AGENTS.md`). |
| `frontend/` | Next.js 16, sistema de diseño y pruebas unitarias/E2E (ver `frontend/AGENTS.md`). |
| `docs/` | Documentación: arquitectura, MCP, prompts, sistema de diseño y `conocimiento-hardware.md` (generado desde las tablas). |
| `data/` | Lotes de ofertas de demostración (CompraGamer y Venex) con su manifiesto. |
| `openspec/` | Specs vigentes (`specs/`) e histórico de cambios (`changes/archive/`). |
| `scripts/` | Arranque en Docker (`docker/`), utilidades de desarrollo y carga de datos. |
| `.opencode/` | Agentes, comandos, skills y scripts de OpenCode (se versiona). |
| `.mcp.json` | Servidores MCP del proyecto (raíz, se versiona). |
| `material-privado/`, `.local/`, `.tools/` | Carpetas privadas, ignoradas por Git; nunca se publican. |

## Entregables

- **Video demo:** (enlace pendiente)
- **Propuesta de casos de uso:** entregada en el campus.
