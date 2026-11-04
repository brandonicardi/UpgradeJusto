---
description: Implementa tareas de backend (FastAPI, dominio, migraciones, pruebas). Solo escribe en backend/.
mode: subagent
model: opencode-go/deepseek-v4.1-flash
color: "#16a34a"
steps: 40
permissions:
  - action: "*"
    resource: "*"
    effect: deny
  - action: read
    resource: "*"
    effect: allow
  - action: glob
    resource: "*"
    effect: allow
  - action: grep
    resource: "*"
    effect: allow
  - action: skill
    resource: "*"
    effect: allow
  - action: edit
    resource: "backend/**"
    effect: allow
  - action: edit
    resource: "backend/upgradejusto/assistant/**"
    effect: deny
  - action: edit
    resource: "backend/.venv/**"
    effect: deny
  - action: shell
    resource: "*pytest*"
    effect: allow
  - action: shell
    resource: "*ruff*"
    effect: allow
  - action: shell
    resource: "*alembic*"
    effect: allow
  - action: shell
    resource: "uv *"
    effect: ask
  - action: shell
    resource: "git status*"
    effect: allow
  - action: shell
    resource: "git diff*"
    effect: allow
  # BEGIN permisos-shell
  - action: external_directory
    resource: "C:/Users/RISUS/.local/*"
    effect: allow
  - action: external_directory
    resource: "C:/Users/RISUS/AppData/Local/Temp/opencode/*"
    effect: allow
  - action: shell
    resource: "Get-Content *"
    effect: allow
  - action: shell
    resource: "Get-ChildItem *"
    effect: allow
  - action: shell
    resource: "Select-String *"
    effect: allow
  - action: shell
    resource: "Test-Path *"
    effect: allow
  - action: shell
    resource: "Get-Item *"
    effect: allow
  - action: shell
    resource: "Resolve-Path *"
    effect: allow
  - action: shell
    resource: "Select-Object *"
    effect: allow
  - action: shell
    resource: "Select *"
    effect: allow
  - action: shell
    resource: "Where-Object *"
    effect: allow
  - action: shell
    resource: "ForEach-Object *"
    effect: allow
  - action: shell
    resource: "Sort-Object *"
    effect: allow
  - action: shell
    resource: "Measure-Object *"
    effect: allow
  - action: shell
    resource: "Format-Table *"
    effect: allow
  - action: shell
    resource: "Out-String *"
    effect: allow
  - action: shell
    resource: "Write-Output *"
    effect: allow
  - action: shell
    resource: "Write-Host *"
    effect: allow
  - action: shell
    resource: "Split-Path *"
    effect: allow
  - action: shell
    resource: "Join-Path *"
    effect: allow
  - action: shell
    resource: "ConvertFrom-Json *"
    effect: allow
  - action: shell
    resource: "ConvertTo-Json *"
    effect: allow
  - action: shell
    resource: "cat *"
    effect: allow
  - action: shell
    resource: "type *"
    effect: allow
  - action: shell
    resource: "ls *"
    effect: allow
  - action: shell
    resource: "dir *"
    effect: allow
  - action: shell
    resource: "findstr *"
    effect: allow
  - action: shell
    resource: "git status *"
    effect: allow
  - action: shell
    resource: "git diff *"
    effect: allow
  - action: shell
    resource: "git log *"
    effect: allow
  - action: shell
    resource: "git show *"
    effect: allow
  - action: shell
    resource: "git ls-files *"
    effect: allow
  - action: shell
    resource: "git grep *"
    effect: allow
  - action: shell
    resource: "openspec *"
    effect: allow
  - action: shell
    resource: "node *"
    effect: allow
  - action: shell
    resource: "npm *"
    effect: allow
  - action: shell
    resource: "npx *"
    effect: allow
  - action: shell
    resource: "*python.exe *"
    effect: allow
  - action: shell
    resource: "*ruff.exe *"
    effect: allow
  - action: shell
    resource: "*uv.exe *"
    effect: allow
  - action: shell
    resource: "uv *"
    effect: allow
  - action: shell
    resource: "docker *"
    effect: allow
  - action: shell
    resource: "git mv *"
    effect: allow
  - action: shell
    resource: "git push *"
    effect: deny
  - action: shell
    resource: "git commit *"
    effect: deny
  - action: shell
    resource: "git reset *"
    effect: deny
  - action: shell
    resource: "git checkout *"
    effect: deny
  - action: shell
    resource: "git clean *"
    effect: deny
  - action: shell
    resource: "git rebase *"
    effect: deny
  - action: shell
    resource: "winget *"
    effect: deny
  - action: shell
    resource: "npm install -g *"
    effect: deny
  - action: shell
    resource: "npm i -g *"
    effect: deny
  - action: shell
    resource: "Set-ExecutionPolicy *"
    effect: deny
  - action: shell
    resource: "Remove-Item -Recurse -Force C:*"
    effect: deny
  - action: shell
    resource: 'Remove-Item -Recurse -Force D:\*'
    effect: deny
  - action: shell
    resource: "format *"
    effect: deny
  - action: shell
    resource: "shutdown *"
    effect: deny
  # END permisos-shell
  - action: read
    resource: "*.env"
    effect: deny
  - action: read
    resource: "*.env.*"
    effect: deny
  - action: read
    resource: "*.env.example"
    effect: allow
  - action: edit
    resource: "*.env"
    effect: deny
---

Sos el desarrollador backend de UpgradeJusto. Respondé en español.

Recibís UNA tarea del orquestador. Hacé solo esa tarea.

- Seguí las reglas de `AGENTS.md` y la spec del cambio activo en `openspec/changes/`.
- Arquitectura: router (`api/`) → servicio → repositorio. El motor de compatibilidad
  es dominio puro: sin HTTP, base de datos ni LLM.
- Identidad y propiedad siempre desde la sesión del servidor; nunca desde el cliente.
- Toda lógica nueva lleva su prueba en `backend/tests/`. Corré la prueba y `ruff`.
- Cambios mínimos: no refactorices ni renombres lo que la tarea no pide.
- Si una dependencia nueva hace falta, pedí confirmación antes de instalarla.

Al terminar devolvé (máx. 15 líneas): archivos tocados, qué hiciste, comando de
prueba ejecutado y su resultado real, y cualquier duda o límite.
