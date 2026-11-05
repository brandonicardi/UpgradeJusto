# Spec Delta

## ADDED Requirements

### Requirement: Disponibilidad del acceso flotante
El sistema SHALL mostrar «¿Dudas?» abajo a la derecha únicamente con sesión autenticada confirmada, fuera de `/chat`, `/admin` y rutas de planes compartidos.

#### Scenario: Rutas excluidas o sesión desconocida
- **WHEN** se abre ingreso sin sesión, `/chat`, `/admin`, una copia compartida o no se pudo confirmar sesión
- **THEN** no aparece el botón flotante ni se consultan conversaciones por montar el panel

### Requirement: Panel flotante controlable con teclado
El sistema SHALL abrir un panel identificado como Asistente, con cierre por botón, cruz o Escape y retorno de foco al disparador.

#### Scenario: Abrir y cerrar
- **WHEN** se abre el panel desde el teclado y luego se pulsa Escape
- **THEN** el foco entra al panel al abrir, vuelve a ¿Dudas? al cerrar y el disparador refleja su estado expandido

#### Scenario: Panel móvil
- **WHEN** se abre a 390 píxeles o a 1440 píxeles
- **THEN** ocupa respectivamente el ancho disponible con márgenes o un panel lateral compacto; el compositor queda alcanzable y no tapa la acción principal fija de la pantalla

### Requirement: Continuidad entre panel y vista completa
El sistema SHALL conservar la conversación seleccionada y el borrador al pasar entre el panel y `/chat`, con una sola instancia activa de generación.

#### Scenario: Expandir durante un turno
- **WHEN** se abre la misma charla en pantalla completa durante una respuesta
- **THEN** se sigue viendo el mismo turno y su estado, sin crear otra conversación ni reenviar el mensaje

#### Scenario: Cerrar y reabrir el panel
- **WHEN** se cierra el panel durante un turno y luego se vuelve a abrir
- **THEN** se conserva la charla y se ve el estado de ese turno; cerrar la vista no equivale a cancelarlo ni a confirmarlo como guardado

### Requirement: Sugerencias como borradores
El sistema SHALL ofrecer tres preguntas sugeridas por pantalla como texto editable previo al envío.

#### Scenario: Selección de sugerencia
- **WHEN** se elige una pregunta sugerida
- **THEN** se completa el compositor sin enviar un turno ni mostrar una respuesta prefabricada

### Requirement: Contexto explícito de la charla flotante
El sistema SHALL distinguir la etiqueta visual «Sobre: pantalla» de la selección explícita de PC y criterios para un turno.

#### Scenario: Abrir desde una ficha o un plan
- **WHEN** se abre el panel desde catálogo o un plan
- **THEN** se identifica la pantalla sin anunciar que el asistente ya recibió la pieza o el plan, y la PC del turno permanece sin elegir hasta una selección explícita

### Requirement: Presentación común de los mensajes
El sistema SHALL mostrar mensajes y compositor con la composición de `ChatBubble` y `PantallaAsistente`, distinguiendo respuesta provisional, interrumpida y guardada.

#### Scenario: Respuesta parcial con Markdown
- **WHEN** llega texto Markdown y el stream se interrumpe antes de confirmar el historial
- **THEN** se conserva el contenido renderizado y su estado parcial, con acceso a recuperar historial sin reenviar desde ambas vistas

### Requirement: Descarte de sesión visual al salir de la cuenta
El sistema SHALL limpiar la charla visible, borrador y contexto al cerrar o perder la sesión autenticada.

#### Scenario: Cambio de cuenta
- **WHEN** se cierra la sesión y luego ingresa otra cuenta
- **THEN** el panel no muestra mensajes, borrador ni selección de la cuenta anterior y carga solamente lo autorizado para la nueva sesión
