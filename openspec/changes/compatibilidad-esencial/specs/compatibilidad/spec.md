## MODIFIED Requirements

### Requirement: Inventario fijo de comprobaciones y cobertura

El sistema SHALL evaluar toda torre nueva con la política esencial versionada, que comprende T01–T08 y T11, y publicar una cobertura que enumere las comprobaciones necesarias, implementadas, evaluadas, aprobadas, fallidas, desconocidas, no aplicables y pendientes de implementación.

#### Scenario: Cobertura completa del inventario
- **WHEN** se evalúa cualquier torre
- **THEN** la cobertura enumera las nueve comprobaciones esenciales y cada resultado tiene estado, evidencia, condiciones y faltantes

#### Scenario: Cobertura sin comprobaciones omitidas
- **WHEN** una comprobación esencial falla o queda desconocida
- **THEN** sigue enumerada en la cobertura y no se reemplaza por no aplicable

## ADDED Requirements

### Requirement: Alcance esencial declarado

El sistema SHALL declarar en cada evaluación nueva que la BIOS, la refrigeración, los ventiladores, las velocidades de memoria y ECC quedan fuera del alcance, y MUST NOT presentarlos como aprobados.

#### Scenario: Encaja sin refrigeración ni BIOS evaluadas
- **WHEN** una torre pasa las comprobaciones esenciales
- **THEN** el veredicto es `compatible` y la evaluación informa que la refrigeración y la BIOS no se evaluaron

#### Scenario: Cooler sin datos
- **WHEN** una torre tiene un cooler sin datos o su presencia es desconocida
- **THEN** eso no agrega faltantes ni cambia el veredicto

### Requirement: Soporte de CPU por modelo

El sistema SHALL exigir socket igual y soporte documentado del modelo exacto de CPU en el modelo exacto de placa, sin consultar la versión de BIOS.

#### Scenario: Sockets distintos
- **WHEN** el socket documentado de la CPU difiere del de la placa
- **THEN** T01 falla aunque no exista fila de soporte

#### Scenario: Mismo socket sin fila de soporte
- **WHEN** los sockets coinciden y no hay fila exacta de soporte
- **THEN** T01 queda desconocida; el chipset o la familia no alcanzan

#### Scenario: BIOS ausente o anterior
- **WHEN** hay fila exacta de soporte y la BIOS no está declarada o es anterior a la mínima documentada
- **THEN** T01 no cambia por la BIOS: la ausencia no agrega faltantes y la anterior no falla

### Requirement: BIOS fuera del alcance

El sistema MUST NOT pedir la versión de BIOS para evaluar una torre ni usar la versión declarada para aprobar, fallar o dejar desconocida una comprobación nueva. La versión guardada SHALL conservarse como dato y la interfaz SHALL aclarar que la BIOS no se evalúa, sin afirmar que esté validada.

#### Scenario: Evaluación nueva sin BIOS
- **WHEN** se evalúa una torre nueva con la política esencial 2
- **THEN** ninguna comprobación ni faltante menciona la BIOS

#### Scenario: Plan viejo con BIOS
- **WHEN** se abre un plan o enlace calculado con la política esencial 1
- **THEN** conserva su versión, sus comprobaciones y el tratamiento histórico de la BIOS, sin recalcular

### Requirement: Potencia contra recomendación publicada

El sistema SHALL comparar la potencia continua de la fuente con la mayor recomendación publicada para el sistema, en cualquier plataforma, sin estimar consumo.

#### Scenario: Fuente insuficiente
- **WHEN** la potencia continua es menor que la mayor recomendación publicada
- **THEN** T05 falla

#### Scenario: Sin recomendación publicada
- **WHEN** no hay ninguna recomendación publicada para la placa de video
- **THEN** T05 queda desconocida; nunca se toma como cero

### Requirement: Almacenamiento por interfaz

El sistema SHALL asignar cada unidad a un puerto compatible por interfaz y forma, respetando exclusiones documentadas, y exigir bahía y alimentación solo para unidades SATA.

#### Scenario: Unidad M.2
- **WHEN** una unidad es M.2 y hay un puerto compatible
- **THEN** T08 pasa sin dato de alimentación SATA

#### Scenario: Puertos que se excluyen
- **WHEN** el fabricante documenta que dos puertos no funcionan a la vez y la torre necesita ambos
- **THEN** T08 falla

### Requirement: Evaluaciones históricas intactas

El sistema SHALL conservar cada evaluación guardada con la versión con la que se calculó.

#### Scenario: Enlace viejo
- **WHEN** se abre un plan o enlace calculado con la política anterior
- **THEN** se muestra con sus doce comprobaciones y su versión, sin recalcular
