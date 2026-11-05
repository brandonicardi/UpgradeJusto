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
              assistant ── LangGraph ──► Groq / Ollama (LLM)
                                         PostgreSQL 18 + pgvector (datos y RAG)
```

| Capa | Stack |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind 4 (App Router; `app/api/**` hace de proxy, el navegador nunca habla directo con FastAPI) |
| Backend | FastAPI + SQLAlchemy + Alembic, Python 3.12 con `uv`; capas router → servicio → repositorio, dominio puro sin HTTP ni BD |
| Base de datos | PostgreSQL 18 con `pgvector` (datos y embeddings para RAG) |
| Asistente | LangChain + LangGraph; proveedor Groq por defecto, Ollama opcional |
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

## Servidores MCP (Model Context Protocol)

El entorno usa 4 servidores MCP (detalle en [`docs/MCP.md`](docs/MCP.md)):

| Servidor | Tipo | Configuración | Rol |
|---|---|---|---|
| **Context7** | Externo (remoto) | `opencode.json` → `https://mcp.context7.com/mcp` | Documentación vigente de FastAPI, LangChain, Next.js, OpenSpec, `uv`, etc., antes de escribir código. |
| **GitHub** | Externo (local) | `.opencode/scripts/github-mcp.ps1` | Consultar el repositorio, PRs y Actions con el token de `gh`. |
| **Engram** | Local | `opencode.json` | Memoria persistente de decisiones entre sesiones de agentes. |
| **upgrade-mcp** | Propio (producto) | `backend/upgradejusto/assistant/mcp_server.py` | Herramientas de solo lectura del chat (CU08). |

La configuración de desarrollo va en `opencode.json`, que está **ignorado por Git**
(ver `.gitignore`) porque tiene rutas propias de cada máquina. Estructura de ejemplo,
con placeholders en lugar de rutas personales:

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
| `docs/` | Documentación: arquitectura, MCP, prompts y sistema de diseño. |
| `data/` | Lotes de ofertas de demostración (CompraGamer y Venex) con su manifiesto. |
| `openspec/` | Specs vigentes (`specs/`) e histórico de cambios (`changes/archive/`). |
| `scripts/` | Arranque en Docker (`docker/`), utilidades de desarrollo y carga de datos. |
| `.opencode/` | Agentes, comandos, skills y scripts de OpenCode (se versiona). |
| `material-privado/`, `.local/`, `.tools/` | Carpetas privadas, ignoradas por Git; nunca se publican. |

## Entregables

- **Video demo:** (enlace pendiente)
- **Propuesta de casos de uso:** entregada en el campus.
