# Proposal

## Why
Las superficies de publicación necesitan una composición consistente con `PantallaCompartir`, `PantallaPlanCompartido` y `PantallaAdmin`. El objetivo pequeño es su presentación: tarjetas, estados y lectura de la información existente.

## What Changes
- Gestión de enlaces y copia pública con jerarquía de título, estado, etapas y ayuda lateral.
- En administración, aplicar tokens y jerarquía a listado, editor JSON y confirmaciones existentes. No convertirlo en otro producto de curación.
- Fuera de alcance: etiquetas por destinatario, recuperar tokens, compras completadas, tablero de pendientes/precios viejos, métricas de PCs afectadas, USD y publicación directa de un precio. Esas capacidades de maqueta requieren propuestas funcionales separadas.

## Capabilities
### New Capabilities
Ninguna.

### Modified Capabilities
- `sistema-diseno`: presentación de gestión de enlaces, copia pública y editor administrativo existente.

## Impact
`frontend/components/tower-share-manager.tsx`, `public-tower-share-view.tsx`, `app/shared-tower-plans/[token]/not-found.tsx` y `app/admin/page.tsx`. No cambiar DTOs, proyección pública, proxies ni backend.

Regresión: unit `tower-shares38.test.tsx`, `share-server-boundary.test.ts`, `curation.test.ts`, `route-test-admin.test.ts`; e2e `tower-shares38.spec.ts` y `tests/curation/curation.spec.ts`.

Mantener el nombre conjunto únicamente para esta capa visual; ampliar el editor o construir un tablero exige dividir en cambios nuevos, no crecer este alcance. Revisión humana previa; orquestador, escritor frontend secuencial y revisor independiente después de liberar el cambio activo. No es aprobación para implementar.
