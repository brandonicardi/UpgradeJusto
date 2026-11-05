# Spec Delta

## REMOVED Requirements

### Requirement: Sin cambios visibles al adoptar los tokens
**Reason**: Valía mientras se cargaban los tokens; este cambio migra la apariencia a propósito.
**Migration**: La apariencia pasa a regirse por «Tema claro en toda la app».

## ADDED Requirements

### Requirement: Tema claro en toda la app
El sistema SHALL mostrar todas las pantallas sobre `papel`, con texto `tinta` y contraste AA,
incluidas las que todavía no se rediseñaron.

#### Scenario: Pantalla sin rediseñar
- **WHEN** se abre una pantalla que todavía usa clases viejas
- **THEN** su fondo y sus textos salen de los tokens y su texto cumple contraste AA

#### Scenario: Sin colores oscuros fijos
- **WHEN** se revisan `globals.css` y `v0-workbench.css`
- **THEN** no quedan colores hexadecimales ni `rgba` fuera de las definiciones de tokens

### Requirement: Navegación del sistema de diseño
El sistema SHALL ofrecer Mi PC, Mi plan, Asistente, Catálogo y el acceso a la cuenta, con salto
al contenido, menú usable en 390 px y foco visible.

#### Scenario: Persona administradora
- **WHEN** el servidor confirma el rol de administración
- **THEN** aparece el enlace de Administración; en otro caso no aparece

#### Scenario: Plan compartido
- **WHEN** se abre `/shared-tower-plans/...`
- **THEN** se muestra sin la navegación de la app
