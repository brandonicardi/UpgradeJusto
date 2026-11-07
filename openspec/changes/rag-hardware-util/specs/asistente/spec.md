# Spec Delta

## ADDED Requirements

### Requirement: Corpus público multifuente curado
El sistema SHALL aceptar un manifiesto con múltiples documentos oficiales autorizados, cada uno con identidad, alcance, URL canónica, fecha de consulta, revisión verificable y condiciones de uso. Agregar una fuente válida MUST NOT requerir cambiar el código para reconocer su hash particular.

#### Scenario: Incorporar otra ficha
- **WHEN** se agrega una segunda fuente válida al manifiesto y se ingiere
- **THEN** ambas quedan disponibles para búsqueda sin sustituir la primera ni duplicarla al repetir la ingesta

#### Scenario: Documento alterado
- **WHEN** un archivo no coincide con la revisión declarada
- **THEN** su ingesta falla explícitamente y no publica fragmentos de ese archivo

### Requirement: Cobertura inicial útil del corpus
La entrega del corpus SHALL incluir al menos seis documentos oficiales distintos que cubran cuatro categorías de hardware del catálogo. Cada documento SHALL justificar su relación con una PC de demostración o una alternativa disponible en el catálogo. El documento general generado no cuenta para ese mínimo.

#### Scenario: Inventario de entrega
- **WHEN** se revisa el corpus preparado
- **THEN** se pueden identificar las seis fuentes, las cuatro categorías, los modelos o familias cubiertos y preguntas que cada fuente permite responder

### Requirement: Identidad y alcance documental explícitos
El sistema SHALL distinguir evidencia de modelo exacto, familia y guía general. Una consulta por modelo exacto MUST NOT recibir como evidencia específica datos exclusivos de otro modelo o variante; el conocimiento general recuperado SHALL conservar su alcance explícito.

#### Scenario: Variante parecida
- **WHEN** se consulta un modelo y solo existe una ficha de otra variante
- **THEN** no se presenta esa ficha como respaldo de las características del modelo consultado

#### Scenario: Modelo sin ficha propia
- **WHEN** solo hay documentación general aplicable
- **THEN** se identifica como explicación general y se informa que falta documentación específica para confirmar el dato solicitado

### Requirement: Revisiones documentales activas
El sistema SHALL recuperar únicamente las revisiones activas declaradas en el manifiesto, además de la revisión vigente del documento general generado. Retirar una fuente o reemplazar su revisión SHALL excluir sus fragmentos antiguos de las búsquedas nuevas.

#### Scenario: Actualizar o retirar una fuente
- **WHEN** cambia el manifiesto activo conservando fragmentos históricos en la base
- **THEN** una consulta nueva no devuelve citas de fuentes retiradas ni de revisiones reemplazadas

### Requirement: Evaluación reproducible de utilidad documental
La entrega SHALL incluir doce preguntas en español: ocho respondibles repartidas entre las cuatro categorías, dos sobre variantes confundibles y dos sin evidencia suficiente. Al menos siete de las ocho respondibles SHALL recuperar un fragmento esperado entre los primeros cinco; los cuatro controles negativos MUST NOT producir evidencia específica falsa.

#### Scenario: Evaluar con embeddings reales
- **WHEN** se ejecuta la batería sobre el corpus ingerido con el encoder configurado
- **THEN** se registra por pregunta la fuente y localizador esperados, resultados, revisión del corpus y cumplimiento de los umbrales, sin sustituir embeddings por dobles

## MODIFIED Requirements

### Requirement: Citas documentales verificables
El sistema SHALL citar solo fragmentos devueltos por `search_public_docs`, provenientes de fuentes y revisiones activas del corpus público curado o del documento general vigente.

#### Scenario: Recuperación con o sin coincidencia
- **WHEN** la consulta se resuelve contra el corpus público
- **THEN** devuelve hasta 5 fragmentos con `source_id`, `url`, `title`, `locator` y `excerpt`, o ninguna cita y sin afirmar fuentes si nada supera el umbral

#### Scenario: Atribución comprobable
- **WHEN** la respuesta usa una cita recuperada
- **THEN** el fragmento existe en el documento y localizador indicados, conserva su alcance y no se transforma por sí solo en veredicto de compatibilidad
