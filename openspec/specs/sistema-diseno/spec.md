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

### Requirement: Tema claro en toda la app
El sistema SHALL mostrar todas las pantallas sobre `papel`, con texto `tinta` y contraste AA,
incluidas las que todavía no se rediseñaron.

#### Scenario: Pantalla sin rediseñar
- **WHEN** se abre una pantalla que todavía usa clases viejas
- **THEN** su fondo y sus textos salen de los tokens y su texto cumple contraste AA

#### Scenario: Sin colores oscuros fijos
- **WHEN** se revisan `globals.css` y `v0-workbench.css`
- **THEN** no quedan colores hexadecimales ni `rgba` fuera de las definiciones de tokens

### Requirement: Navegación del sistema de diseño
El sistema SHALL ofrecer Mi PC, Mi plan, Asistente, Catálogo y el acceso a la cuenta, con salto
al contenido, menú usable en 390 px y foco visible.

#### Scenario: Persona administradora
- **WHEN** el servidor confirma el rol de administración
- **THEN** aparece el enlace de Administración; en otro caso no aparece

#### Scenario: Plan compartido
- **WHEN** se abre `/shared-tower-plans/...`
- **THEN** se muestra sin la navegación de la app

### Requirement: Nueve casilleros de la PC
El sistema SHALL mostrar las nueve categorías siempre en el mismo orden, con estado cargada, en
duda o vacía, sin guardar nada por mostrarlas.

#### Scenario: Pieza en duda
- **WHEN** una categoría tiene una pieza con un dato faltante
- **THEN** su casillero dice qué falta, por ejemplo «16 GB · falta la velocidad»

#### Scenario: Categoría ausente
- **WHEN** `PcSlots` no recibe datos de una categoría
- **THEN** la muestra vacía con el enlace «Agregar», nunca la omite

### Requirement: Sugerencia sin cálculos en la interfaz
El sistema SHALL mostrar en `UpgradeCard` el precio, la diferencia con el presupuesto y el
veredicto que recibe por props, sin calcularlos.

#### Scenario: Falta plata
- **WHEN** la diferencia recibida es negativa
- **THEN** dice «Te faltan» con el monto en `tinta`, sin resaltar

#### Scenario: Acción principal
- **WHEN** se muestra una sugerencia
- **THEN** el botón principal dice «Sumar a mi plan», no «Aplicar»

### Requirement: Etapas con veredicto acumulado
El sistema SHALL mostrar en `PlanSteps` el costo y el veredicto que recibe para cada etapa.

#### Scenario: Etapa sin veredicto
- **WHEN** una etapa no trae veredicto
- **THEN** muestra «Falta un dato», nunca «Encaja»

### Requirement: Presupuesto accesible
El sistema SHALL permitir elegir el presupuesto con el control deslizante, los atajos o
escribiendo el monto.

#### Scenario: Monto escrito
- **WHEN** la persona escribe un monto dentro del rango
- **THEN** el control refleja ese valor y avisa el cambio a quien lo usa

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

### Requirement: Inicio organizado por caminos existentes
El sistema SHALL presentar en `/` la promesa principal y los caminos de ayuda, carga manual, lista y armado desde cero con la jerarquía de `PantallaInicio`.

#### Scenario: Elección de camino
- **WHEN** se recorre inicio con teclado
- **THEN** se puede abrir la guía con foco en su contenido, ir a `/pcs`, `/pcs/import` o `/build`, sin crear una PC ni enviar una extracción

#### Scenario: Sin catálogo disponible
- **WHEN** no se puede cargar la pieza real destacada
- **THEN** su zona muestra el estado sin datos y acceso al catálogo, mientras los caminos de entrada siguen disponibles

### Requirement: Criterios del armado manual
El sistema SHALL mostrar los criterios existentes de `/build` como bloque previo a las piezas, distinguiendo objetivo, presupuesto opcional y condición de precio.

#### Scenario: Opciones soportadas
- **WHEN** se elige un objetivo de armado
- **THEN** se conserva la elección entre uso general, juegos y productividad; productividad mantiene el selector de trabajo existente y no aparece una cuarta capacidad de edición audiovisual

#### Scenario: Monto preciso
- **WHEN** se ingresa un presupuesto decimal admitido o se deja vacío
- **THEN** se conserva ese valor sin redondearlo ni sustituirlo por un atajo de la maqueta

### Requirement: Inventario del armado propuesto
El sistema SHALL ordenar las nueve categorías de `/build` en una lista de compras seleccionables con resumen lateral según `PantallaArmar`, identificando la selección como manual y por comprar.

#### Scenario: Armado vacío
- **WHEN** se abre `/build` sin elegir piezas
- **THEN** las nueve categorías muestran su estado sin elegir y no aparece una PC automática, un total de armado confirmado ni compatibilidad evaluada

#### Scenario: Modificar selección
- **WHEN** se agrega o quita una compra
- **THEN** siguen visibles la cantidad explícita, cotización elegida o pendiente y el consentimiento de guardado vuelve a requerirse

### Requirement: Composición adaptable de inicio y armado
El sistema SHALL apilar los bloques de inicio y armado en móvil conservando el acceso a sus controles y ayudas.

#### Scenario: Dos tamaños de pantalla
- **WHEN** se recorren `/` y `/build` a 1440 y 390 píxeles
- **THEN** a 1440 el armado tiene inventario y resumen en columnas y a 390 ambos quedan apilados sin recortar nombres, procedencia de cotizaciones ni confirmación
