# Spec Delta

## ADDED Requirements

### Requirement: Acceso con pestañas y composición de ingreso
El sistema SHALL presentar en `/account` sin sesión una introducción y una tarjeta con las pestañas Entrar y Crear cuenta, según `PantallaIngreso`, con un solo formulario activo.

#### Scenario: Acceso en escritorio y móvil
- **WHEN** se abre `/account` sin sesión a 1440 o 390 píxeles de ancho
- **THEN** introducción y formulario aparecen en dos columnas o apilados respectivamente, sin desborde horizontal ni campos ocultos

#### Scenario: Cambio de pestaña con teclado
- **WHEN** se elige Crear cuenta mediante teclado
- **THEN** se identifica la pestaña activa, el formulario conserva etiquetas visibles y la ayuda indica la política vigente de 12 a 128 caracteres

### Requirement: Respuesta visible del acceso
El sistema SHALL distinguir validaciones de campo, errores generales y estado de operación en la tarjeta de acceso.

#### Scenario: Credenciales rechazadas
- **WHEN** el servidor rechaza el ingreso por credenciales inválidas
- **THEN** aparece un aviso general accesible sin atribuir el rechazo a un correo existente o a un campo que el servidor no identificó

#### Scenario: Registro completado
- **WHEN** el registro termina correctamente
- **THEN** la pantalla muestra Entrar y un aviso de cuenta creada, sin mostrar la vista de sesión autenticada

### Requirement: Cuenta autenticada de solo lectura
El sistema SHALL presentar los datos públicos disponibles, los accesos a recursos guardados y Cerrar sesión con la jerarquía de `PantallaCuenta`, sin ofrecer mutaciones de cuenta inexistentes.

#### Scenario: Cuenta local o Google
- **WHEN** la sesión autenticada devuelve email y opcionalmente nombre/proveedor
- **THEN** se muestran solo esos datos, los enlaces a PCs, planes y armado y el cierre de sesión; no aparecen campos editables de perfil, cambio de contraseña ni borrado de cuenta

### Requirement: Acceso Google según disponibilidad
El sistema SHALL conservar el control Google real dentro de la tarjeta de acceso y su disponibilidad configurada.

#### Scenario: Intento Google activo
- **WHEN** se inicia un intento Google
- **THEN** el acceso local queda bloqueado mientras corresponde y el estado del intento permanece visible, sin reemplazar el flujo por un botón de demostración
