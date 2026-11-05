# Spec Delta

## ADDED Requirements

### Requirement: Catálogo en tarjetas filtrables
El sistema SHALL presentar `/catalog` con buscador, categorías y tarjetas según `PantallaCatalogo`, conservando los filtros y órdenes soportados.

#### Scenario: Búsqueda y paginación
- **WHEN** se combina nombre, categoría y orden y se pasa a otra página
- **THEN** se conservan esos parámetros y el total del servidor; no aparece un filtro «Encaja en mi PC» ni un orden por precio sin soporte

#### Scenario: Catálogo vacío o fallido
- **WHEN** la consulta no devuelve piezas o falla
- **THEN** se muestra el estado vacío o error correspondiente con opciones de recuperación, sin tarjetas de muestra

### Requirement: Inspección de la misma variante
El sistema SHALL conservar la inspección contextual del catálogo y el acceso a la ficha de la variante seleccionada.

#### Scenario: Cambiar selección
- **WHEN** se inspecciona otra tarjeta
- **THEN** nombre, imagen y ofertas del panel corresponden a esa misma pieza y el enlace abre su ficha completa

### Requirement: Ficha centrada en datos documentados
El sistema SHALL presentar `/catalog/[id]` con encabezado de pieza, imagen, atributos, fuentes y zona de ofertas siguiendo `PantallaPieza`.

#### Scenario: Evidencia incompleta
- **WHEN** faltan atributos, foto verificada o cotización completa
- **THEN** se muestran los faltantes en su sección, sin transformar el nombre comercial en prestaciones ni reemplazar la imagen por una variante parecida

### Requirement: Comprobación desde la ficha como navegación explícita
El sistema SHALL conservar «Comprobar con mi PC» como acceso al flujo de comprobación existente, sin afirmar que ya evaluó la pieza contra una PC.

#### Scenario: Ficha pública sin PC seleccionada
- **WHEN** se abre una ficha y se activa Comprobar con mi PC
- **THEN** se navega a `/pcs`, sin guardar una pieza, crear un plan ni mostrar veredicto personalizado previo

### Requirement: Procedencia legible en catálogo móvil
El sistema SHALL mantener moneda, condición, fecha y fuente de las ofertas legibles tanto a 1440 como a 390 píxeles.

#### Scenario: Oferta histórica a 390 píxeles
- **WHEN** se abre una ficha con varias ofertas y alguna vencida
- **THEN** sus fechas y fuentes siguen visibles en la composición móvil y la oferta vencida no se etiqueta como precio vigente o el más bajo reciente por una regla copiada de la maqueta
