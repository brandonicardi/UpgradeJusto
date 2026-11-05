<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend — reglas para agentes

Complementa el `AGENTS.md` de la raíz. Leé la spec del cambio activo en
`openspec/changes/` antes de tocar código.

## Estructura
- `app/`: rutas (App Router). `app/api/**`: proxies hacia el backend (FastAPI en
  `127.0.0.1:8000`); el navegador nunca llama al backend directo.
- `components/`: componentes reutilizables. `lib/`: clientes de API, tipos y
  funciones de presentación (texto para la persona usuaria).
- `app/globals.css`: variables de diseño (colores, tipografía, espacios).
- `tests/unit` (Vitest), `tests/e2e` (Playwright).

## Diseño y textos
- Sistema de diseño: `docs/sistema-diseno/` (leer su `README.md` y `tokens.json`).
- Las `preview.html` de `componentes/Pantalla*` son la especificación visual: cada pantalla debe
  verse igual, con la misma estructura, orden, componentes, textos fijos y espaciado. Solo cambian
  los datos de ejemplo, que salen de la API. Una pantalla se arma desde su maqueta, no retocando la
  vieja. Si la maqueta muestra algo que no existe, se construye; si no se puede, se avisa.
- Una pantalla no se cierra sin comparar su captura real con la maqueta, a 1440 y 390.
- Las pantallas sin maqueta siguen el mismo estilo.
- Colores, tipografía, espacios y radios solo desde los tokens de `globals.css`.
- Textos en español rioplatense con voseo, para gente común. Usar el vocabulario del
  sistema de diseño («Encaja», «Falta un dato», «No encaja», «Placa de video»).
  Prohibido mostrar jerga interna: "snapshot", "revisión N", "schema", "scope",
  "coverage", "PASS", IDs técnicos.
- Íconos: Lucide, con su palabra al lado si cambian el significado.
- Respuestas del chat renderizadas como Markdown (nunca asteriscos crudos).
- Accesible: etiquetas en formularios, foco visible, contraste AA, funciona en 390 px.

## Reglas
- La interfaz no decide compatibilidad ni calcula precios: muestra lo que devuelve la API.
- Nunca enviar `user_id`; la sesión va en cookie y las mutaciones con CSRF.
- Guardar una PC extraída solo después de que la persona confirme.

## Pruebas (desde `frontend/`)
```powershell
npm test ; npm run typecheck ; npm run lint
```
Toda lógica nueva lleva prueba en `tests/unit/`.
