# Spec Delta

## ADDED Requirements

### Requirement: Edición de la cuenta
El sistema SHALL permitir que la persona autenticada cambie su nombre visible y, en cuentas locales, su contraseña indicando la actual. La identidad SHALL resolverse en el servidor.

#### Scenario: Contraseña actual incorrecta
- **WHEN** la persona pide cambiar la contraseña con una actual incorrecta
- **THEN** el sistema rechaza el pedido con un error general y la contraseña no cambia

#### Scenario: Cambio de contraseña
- **WHEN** la persona cambia su contraseña correctamente
- **THEN** la contraseña anterior deja de servir y se cierran sus otras sesiones

### Requirement: Baja de la cuenta
El sistema SHALL borrar la cuenta y todo lo que la persona guardó solo tras una confirmación explícita, sin afectar datos de otras personas.

#### Scenario: Sin confirmación
- **WHEN** el pedido no incluye la palabra de confirmación
- **THEN** el sistema no borra nada

#### Scenario: Borrado confirmado
- **WHEN** la persona confirma el borrado
- **THEN** sus PCs, planes, enlaces compartidos, conversaciones y sesiones dejan de existir
- **AND** los datos de otras personas no cambian
