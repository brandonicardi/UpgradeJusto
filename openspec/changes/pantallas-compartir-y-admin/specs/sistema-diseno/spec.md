# Spec Delta

## ADDED Requirements

### Requirement: Gestión de enlaces con disponibilidad real
El sistema SHALL presentar creación y listado de enlaces según `PantallaCompartir`, diferenciando el enlace recién emitido de los metadatos de emisiones anteriores.

#### Scenario: Enlace recién creado
- **WHEN** se confirma la creación y el servidor devuelve el token
- **THEN** aparece el campo para copiar y el aviso de disponibilidad por única vez; el título público sigue limitado a las opciones existentes

#### Scenario: Volver a la gestión
- **WHEN** se vuelve a abrir `/tower-plans/[id]/shares`
- **THEN** se ven estados y fechas del listado, sin botones que prometan copiar o recuperar tokens anteriores

### Requirement: Confirmación de apagado vinculada al enlace
El sistema SHALL presentar la revocación como una confirmación de deshabilitar futuros accesos del enlace elegido.

#### Scenario: Cambiar el enlace a revocar
- **WHEN** se prepara la revocación de otro enlace
- **THEN** la confirmación anterior deja de valer, se identifica el nuevo enlace y Cancelar vuelve al listado sin revocar

### Requirement: Copia pública con jerarquía de plan compartido
El sistema SHALL presentar la copia pública con título autorizado, aviso de solo lectura, etapas y resumen según `PantallaPlanCompartido`, manteniendo sus reservas de evidencia.

#### Scenario: Copia con datos retenidos
- **WHEN** se abre una copia cuyo estado público requiere verificación aunque conserve un veredicto histórico compatible
- **THEN** se ve la reserva pública junto al estado principal y no se comunica compatibilidad completa ni etapas compradas

#### Scenario: Enlace no disponible
- **WHEN** la lectura pública responde no encontrado
- **THEN** se muestra una pantalla de enlace no disponible con acceso al inicio, sin recuperar datos mediante la sesión privada

### Requirement: Curación con presentación de datos existentes
El sistema SHALL presentar `/admin` con listado y editor de borrador en paneles basados en `PantallaAdmin`, conservando las cuatro colecciones y las confirmaciones actuales.

#### Scenario: Borrador y publicación
- **WHEN** se elige un borrador y se guarda una fila
- **THEN** se distingue Guardado en borrador de Publicado y sigue disponible la publicación explícita de la versión completa; no aparece Publicar precio como operación directa

#### Scenario: Datos de tablero ausentes
- **WHEN** se abre administración
- **THEN** no aparecen métricas de PCs afectadas ni contadores globales de faltantes/precios viejos sin datos que los respalden

### Requirement: Superficies de publicación adaptables
El sistema SHALL apilar paneles de compartir y administración a 390 píxeles conservando acciones y detalle.

#### Scenario: Tabla y confirmación en móvil
- **WHEN** se recorren gestión de enlaces, copia pública y editor administrativo a 1440 y 390 píxeles
- **THEN** se leen estados y fechas, las confirmaciones tienen foco visible y cualquier desplazamiento de tabla o JSON queda dentro de su panel, sin desbordar la página
