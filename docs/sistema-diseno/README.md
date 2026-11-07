# Sistema de diseño de UpgradeJusto

> **Referencia visual adoptada.** Se implementa por etapas mediante cambios de OpenSpec
> (`openspec/changes/`), empezando por `tokens-y-fuentes`.

## Qué hay en esta carpeta

- `README.md`: principios, voz, color, tipografía, íconos y pantallas clave.
- `tokens.json`: la fuente de verdad de colores (tema claro y oscuro), tipografía, espacios, radios y sombras.
- `estilos/tokens.css`: los mismos tokens como variables CSS. Si cambia uno, hay que cambiar el otro.
- `estilos/componentes.css`: clases `uj-*` de referencia. Muestran el resultado esperado, no son código de producción.
- `componentes/<Nombre>/`: `README.md` con el uso y `preview.html` con el ejemplo vivo. Los `Pantalla*` son pantallas completas con datos de ejemplo.
- `index.html`: abrilo con doble clic para recorrer todo en el navegador.

Vista navegable original: https://claude.ai/artifact/FjHT57N1MhtD2eRNJkcyQA (requiere acceso). La fuente de verdad son los archivos de esta carpeta.

Los precios, tiendas y piezas de las vistas previas son de ejemplo. No son datos reales.

---

UpgradeJusto ayuda a cualquier persona a decidir **qué mejorarle a su PC, cuánto gastar y en qué orden**, sin tener que saber de hardware. El sistema está pensado como un amigo que sabe de computadoras: cálido, claro, honesto con lo que no sabe. Lo técnico existe, pero va en segundo plano y siempre detrás de una explicación simple.

## Principios

1. **Primero la respuesta, después el detalle.** Cada pantalla abre con lo que la persona quiere saber («Sí, esta placa encaja en tu PC») y deja los datos técnicos para quien los pida, debajo o en un desplegable.
2. **Palabras de todos los días.** «Placa de video», no «GPU»; «Encaja», no «compatible». El término técnico aparece en `chico` y `tinta-suave` debajo del nombre simple, para quien quiera buscarlo.
3. **Honestos con lo que falta.** Si nos falta un dato, lo decimos con «Falta un dato» y explicamos cómo conseguirlo. Nunca mostramos «Encaja» si no lo comprobamos todo.
4. **Una decisión por vez.** Un botón principal por pantalla. El resto es secundario o quieto.
5. **La plata, clara.** Todo precio lleva moneda, fecha y de dónde lo sacamos.

## Cómo escribimos

- Tuteo rioplatense con voseo: «Elegí», «Contanos», «Mirá». Frases cortas, de una idea.
- Hablamos de lo que la persona quiere hacer, no del componente: «Para jugar en alta calidad te conviene cambiar la placa de video».
- Mayúscula sólo al inicio de la frase y en nombres propios. Nada de MAYÚSCULAS para títulos ni etiquetas.
- Sin emojis en la interfaz. Sin signos de exclamación salvo para celebrar algo concreto («¡Listo, guardamos tu PC!»).
- Los números se escriben como en Argentina: `$ 389.900`, `16 GB`, `28/10/2026`.
- Nunca inventamos FPS, precios ni datos del fabricante. Si no lo tenemos, decimos «No tenemos ese dato todavía».

| En vez de… | Decimos… |
| --- | --- |
| Compatible | Encaja |
| Requiere verificación | Falta un dato |
| Incompatible | No encaja |
| GPU / CPU / PSU | Placa de video / Procesador / Fuente |
| Configuración evaluada | Tu PC con este cambio |
| Recomendación | Lo que te conviene |
| Plan de upgrades por etapas | Tu plan, paso a paso |
| Extracción / propuesta editable | Lo que entendimos de tu lista (podés corregirlo) |

## Color

La paleta es cálida y de papel, para que la app se sienta tranquila y no como un panel técnico.

- Fondo de página: `papel`. Tarjetas y paneles: `papel-alto`. Zonas de apoyo y ranuras vacías: `papel-hundido`.
- Texto: `tinta` para todo lo principal; `tinta-suave` para ayudas, fechas y nombres técnicos. Ambos se leen sobre los tres papeles en los dos temas.
- **`pino` es la marca y la acción.** Úsalo en el botón principal, enlaces y lo seleccionado. El texto encima va en `sobre-pino`. `pino-suave` marca lo elegido sin gritar.
- **`lima` es la chispa.** Sólo para destacar una buena noticia: lo que ganás con un cambio, la etapa en la que estás, el progreso. Nunca como color de texto; encima siempre `sobre-lima`. Máximo un elemento lima por vista.
- **Veredictos**: cada uno tiene color, ícono y palabra, siempre los tres juntos.
  - `encaja` sobre `encaja-fondo` con ícono de tilde — compatible.
  - `revisar` sobre `revisar-fondo` con ícono de pregunta — requiere verificación.
  - `no-encaja` sobre `no-encaja-fondo` con ícono de cruz — incompatible.
  «Encaja» es azul y no verde a propósito: así no depende de distinguir verde de rojo.
- Bordes: `linea` para separar contenido; `linea-fuerte` para el borde de cualquier control (campo, casilla, botón secundario).
- Foco de teclado: anillo sólido de 2px en `foco`, separado 2px. Nunca lo quites.

## Tipografía

Dos familias, ambas de Google Fonts: **Bricolage Grotesque** para titulares (cercana, con carácter) y **Figtree** para todo el texto (redonda y muy legible).

- `titular-xl` una sola vez por pantalla, para la pregunta o la promesa. En móvil baja a `titular-l`.
- `titular-m` para títulos de tarjeta y de paso.
- `cuerpo` es el mínimo para párrafos (16px). `cuerpo-l` para la bajada y las respuestas del asistente.
- `chico` para ayudas, procedencia de precios y el nombre técnico de una pieza.
- `etiqueta` para veredictos, chips y contadores.
- `precio` para montos, con cifras tabulares.

## Espacio, forma y profundidad

- Escala de 4px: `space-1` a `space-8`. Relleno de tarjeta `space-5`; entre tarjetas `space-4`; entre secciones `space-7`. Margen lateral: `space-4` en móvil, `space-7` en escritorio.
- Formas blandas: campos `radius-sm`, tarjetas y avisos `radius-md`, bloques grandes `radius-lg`, botones, chips y veredictos `radius-pill`.
- Sombras casi invisibles: `sombra-1` en tarjetas que se pueden tocar y `sombra-2` sólo en la sugerencia principal o un diálogo. Lo demás se separa con color de fondo, no con bordes ni sombras.
- Todo lo tocable mide al menos 48px de alto (40px en la variante chica).
- Movimiento mínimo: transiciones de color de 150ms. Se apagan con «reducir movimiento».

## Íconos

- Íconos de línea de [Lucide](https://lucide.dev): trazo de 1.75, puntas redondeadas, 20px (16px dentro de etiquetas). Toman el color del texto que acompañan.
- Cada categoría de pieza tiene su ícono fijo: procesador `cpu`, placa madre `circuit-board`, memoria `memory-stick`, placa de video `monitor`, fuente `plug-zap`, gabinete `box`, almacenamiento `hard-drive`, cooler `fan`, ventiladores `wind`.
- Veredictos: `check` (encaja), `help-circle` (falta un dato), `x` (no encaja).
- Un ícono nunca va solo si cambia el significado: siempre con su palabra.

## Pantallas clave

1. **Inicio**: «¿Qué querés que tu PC haga mejor?» con `GoalPicker` y `BudgetSlider`. Un único botón principal: «Ver qué me conviene».
2. **Tu PC**: `PcSlots` con las nueve piezas. Las vacías invitan a completarlas; las dudosas se marcan con «Falta un dato».
3. **Lo que te conviene**: una `UpgradeCard` principal arriba y alternativas como `PartCard` debajo.
4. **Tu plan**: `PlanSteps` con el costo de cada compra y el veredicto de la PC resultante.
5. **Preguntale al asistente**: `ChatBubble` con sugerencias rápidas para no arrancar de cero. En el resto de las pantallas está a mano como `AsistenteFlotante`, abajo a la derecha.
6. **Ingreso y registro**: dos pestañas en un mismo lugar; errores en criollo debajo de cada campo.
7. **Agregar PC**: pegar la lista, revisar lo que entendimos y confirmar antes de guardar.
8. **Catálogo** y **Pieza**: buscar por lo que necesitás; al lado de cada pieza, si encaja en tu PC y su precio con fecha y tienda.
9. **Armar una PC**: objetivo y presupuesto; si no alcanza, se dice en lugar de proponer algo que no entra.
10. **Compartir** y **Plan compartido**: un enlace por persona, que se apaga cuando quieras; quien lo abre solo puede mirar.
11. **Tu cuenta**: datos, contraseña, lo que guardaste y borrar la cuenta con confirmación escrita.
12. **Administración**: datos faltantes y precios viejos; un precio sin fuente o sin fecha no se publica.

## Logo

Todavía no hay logo. Escribí el nombre «UpgradeJusto» en `titular-m` con la familia `display`, en `tinta`, sin ícono.
