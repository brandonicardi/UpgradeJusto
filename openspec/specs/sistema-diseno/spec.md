# sistema-diseno Specification

## Purpose
Base visual compartida del frontend: los tokens del sistema de diseño (colores en tema claro
y oscuro, tipografías, espacios, radios y sombras) disponibles para todas las pantallas.

## Requirements

### Requirement: Tokens de color en ambos temas
El sistema SHALL definir como variables CSS cada token de color de
`docs/sistema-diseno/tokens.json` con su valor claro en `:root` y su valor oscuro
aplicado por preferencia del sistema o por `data-theme="oscuro"`.

#### Scenario: Tema claro por defecto
- **WHEN** el documento no tiene `data-theme` y el sistema prefiere claro
- **THEN** `--papel` vale `#f6f2ea` y `--pino` vale `#1f4d3a`

#### Scenario: Tema oscuro forzado
- **WHEN** `<html>` tiene `data-theme="oscuro"`
- **THEN** `--papel` vale `#16150f` y `--pino` vale `#8fd6b0`

#### Scenario: Claro forzado con sistema oscuro
- **WHEN** el sistema prefiere oscuro y `<html>` tiene `data-theme="claro"`
- **THEN** se usan los valores del tema claro

### Requirement: Tema claro fijo durante la migración
El sistema SHALL mostrar el tema claro aunque el sistema operativo prefiera oscuro,
mientras existan pantallas sin migrar al sistema de diseño.

#### Scenario: Sistema operativo en modo oscuro
- **WHEN** la persona tiene el sistema en modo oscuro y abre la app
- **THEN** `<html>` tiene `data-theme="claro"` y se usan los valores del tema claro

### Requirement: Utilidades de Tailwind
El sistema SHALL exponer los tokens en el `@theme` de Tailwind 4 para que se usen como
clases (`bg-papel`, `text-tinta`, `border-linea-fuerte`, `font-display`, `rounded-pill`,
`shadow-sombra-1`, `p-space-5`) sin escribir valores hexadecimales en los componentes.

#### Scenario: Clase de color
- **WHEN** un componente usa `bg-pino text-sobre-pino`
- **THEN** toma los colores del tema activo

### Requirement: Tipografías del sistema
El sistema SHALL cargar Bricolage Grotesque (titulares) y Figtree (texto) servidas desde el
propio sitio, y SHALL definir los estilos `titular-xl`, `titular-l`, `titular-m`, `cuerpo-l`,
`cuerpo`, `cuerpo-fuerte`, `chico`, `etiqueta` y `precio` con los tamaños, interlineados y
pesos de `tokens.json`.

#### Scenario: Fuente sin pedido a Google
- **WHEN** la persona abre cualquier página
- **THEN** el navegador no pide fuentes a `fonts.googleapis.com`

### Requirement: Sin cambios visibles al adoptar los tokens
El sistema SHALL mantener idéntica la apariencia de todas las pantallas existentes al
incorporar los tokens.

#### Scenario: Pantalla existente
- **WHEN** se abre el catálogo después de aplicar este cambio
- **THEN** se ve igual que antes (mismos colores de fondo, texto y fuente)

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
