# Spec Delta

## ADDED Requirements

### Requirement: Lectura de PC en nueve categorías
El sistema SHALL mostrar el nombre de la PC seleccionada y nueve categorías en tarjetas según `PantallaMiPC`, distinguiendo piezas presentes, ausencia declarada y datos por confirmar.

#### Scenario: Inventario heterogéneo
- **WHEN** se abre una PC con varios discos, grupos de memoria y categorías desconocidas o ausentes
- **THEN** se conservan todas las líneas y cantidades; memoria se expresa en módulos y «No sé» no se presenta como «No tengo» ni como una comprobación aprobada

#### Scenario: Sin PCs guardadas
- **WHEN** la lista está vacía
- **THEN** se muestran las acciones de crear manualmente o pegar una lista, sin una PC de ejemplo seleccionada

### Requirement: Edición vinculada a la categoría
El sistema SHALL permitir llegar desde una tarjeta a la sección correspondiente del editor existente, conservando cancelar y guardar como acciones explícitas.

#### Scenario: Completar una pieza
- **WHEN** se activa Completar o Cambiar en una categoría
- **THEN** el editor recibe foco en esa categoría y permite estado, identificación y cantidad; no ofrece modificar atributos de fabricante como lugares M.2 desde esa tarjeta

### Requirement: Lista revisable por pasos
El sistema SHALL presentar `/pcs/import` con los pasos pegar, revisar y confirmar de `PantallaAgregarPC`, mostrando el paso actual y conservando el texto al volver.

#### Scenario: Propuesta recibida
- **WHEN** termina la lectura de una lista
- **THEN** se muestra «Revisá lo que entendimos» con las nueve categorías editables y acceso a su evidencia, sin saltar directamente al estado guardado

#### Scenario: Corrección posterior al consentimiento
- **WHEN** se corrige una línea después de marcar la confirmación
- **THEN** la confirmación queda desmarcada y el botón de guardado explica que falta revisar y confirmar nuevamente

### Requirement: Incertidumbre visible en importación
El sistema SHALL conservar a la vista las acciones específicas para catálogo cambiado y resultado de guardado incierto dentro del paso de confirmación.

#### Scenario: Guardado sin resultado confirmado
- **WHEN** se informa resultado incierto
- **THEN** se ofrece revisar Mis PCs y decidir explícitamente otro envío, sin volver al botón normal habilitado ni mostrar éxito

### Requirement: PC e importación utilizables en móvil
El sistema SHALL adaptar las tarjetas y filas de revisión a una columna a 390 píxeles.

#### Scenario: Recorrido completo de edición
- **WHEN** se navega por teclado a 1440 y 390 píxeles por tarjetas, editor y confirmación
- **THEN** el foco permanece visible y cantidades, ayudas y botones no quedan recortados ni tapados por paneles laterales
