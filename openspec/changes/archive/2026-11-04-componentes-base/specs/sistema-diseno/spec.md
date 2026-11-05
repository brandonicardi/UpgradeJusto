# Spec Delta

## ADDED Requirements

### Requirement: Veredicto con color, ícono y palabra
El sistema SHALL mostrar el resultado del motor con el componente `Verdict`, que combina color,
ícono y palabra, sin decidir compatibilidad en la interfaz.

#### Scenario: Estados del motor
- **WHEN** `Verdict` recibe `compatible`, `requiere_verificacion` o `incompatible`
- **THEN** muestra «Encaja», «Falta un dato» o «No encaja» con su ícono y sus colores

#### Scenario: Estado desconocido
- **WHEN** `Verdict` recibe un valor ausente o que no conoce
- **THEN** muestra «Falta un dato», nunca «Encaja»

### Requirement: Precio con procedencia
El sistema SHALL mostrar un monto solo junto con su moneda, fecha y tienda.

#### Scenario: Precio completo
- **WHEN** `PriceTag` recibe monto, moneda, fecha y tienda
- **THEN** muestra el monto con la moneda delante y debajo la fecha y la tienda con su enlace

#### Scenario: Dato incompleto
- **WHEN** falta el monto, la moneda, la fecha o la tienda
- **THEN** muestra «Sin precio», nunca `$ 0` ni un estimado

### Requirement: Imagen de pieza sin engaño
El sistema SHALL usar en `PartCard` la foto real de la pieza o, si no existe, el ícono de su
categoría.

#### Scenario: Pieza sin foto
- **WHEN** `PartCard` no recibe una foto real
- **THEN** muestra el ícono de la categoría sobre `papel-hundido`

### Requirement: Avisos accesibles
El sistema SHALL anunciar los avisos con el rol adecuado y etiquetar todos los campos.

#### Scenario: Tono del aviso
- **WHEN** `Notice` tiene tono `no`
- **THEN** usa `role="alert"`; con cualquier otro tono usa `role="status"`

#### Scenario: Campo con error
- **WHEN** `Field` recibe un mensaje de error
- **THEN** la etiqueta sigue visible y el mensaje queda asociado al campo con `aria-describedby`

### Requirement: Botón deshabilitado que explica
El sistema SHALL mostrar en un `Button` deshabilitado un texto que diga qué falta.

#### Scenario: Acción no disponible
- **WHEN** `Button` está deshabilitado y recibe `motivo`
- **THEN** muestra ese texto en lugar de la acción

### Requirement: Vitrina solo fuera de producción
El sistema SHALL ofrecer `/sistema-diseno` para comparar los componentes, sin publicarla en
producción.

#### Scenario: Producción
- **WHEN** `NODE_ENV` es `production`
- **THEN** `/sistema-diseno` responde «no encontrado»
