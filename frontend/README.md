# Frontend de UpgradeJusto

Next.js 16 + React 19 + Tailwind 4. Reglas: [AGENTS.md](AGENTS.md). Sistema de
diseño: [`../docs/sistema-diseno/`](../docs/sistema-diseno/README.md).

## Levantar
La forma recomendada es Docker Compose desde la raíz del repo (ver README principal).

Sin Docker (necesita el backend en `127.0.0.1:8000`):
```powershell
npm ci
npm run dev        # http://localhost:3000
```

## Pruebas
```powershell
npm test ; npm run typecheck ; npm run lint
npx playwright test     # punta a punta, con la app levantada
```

Las ilustraciones de `public/illustrations/` son propias del proyecto: diagramas
genéricos por categoría, no fotos de productos.
