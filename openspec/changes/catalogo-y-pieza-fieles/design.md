# Design

## Context

`/catalog` ya consume el contrato de lectura y `/simulate` (trabajo sin commitear). `/catalog/[id]`
conserva la presentación anterior. La API solo ordena por `retail_first` o `id`, y no expone una marca
de «el más bajo»: cada oferta llega con su estado de vigencia calculado en el servidor. Ver
`proposal.md` para el motivo.

## Goals / Non-Goals

**Goals:** misma estructura, orden, textos fijos y espaciado que `PantallaCatalogo` y `PantallaPieza`;
estado por pieza solo desde `/simulate`; acciones reales con confirmación; shell igual a la maqueta.

**Non-Goals:** etiqueta libre por destinatario; escrituras desde el chat; cálculos de precio o
compatibilidad en el cliente. El tablero de administración va en un cambio propio.

## Decisions

- **CSS por pantalla.** `app/catalog/catalog.css` para el catálogo y un CSS propio de la ficha. No se
  toca `globals.css` ni `v0-workbench.css`, para que tres especialistas no compartan archivo; solo se
  usan sus tokens.
- **Shell como la maqueta.** Logo a la izquierda, navegación a la derecha, ancho 1280 px y, en móvil,
  solo el enlace activo. Se resuelve en `shell.tsx` con la variante de catálogo existente y se congela
  al terminar la base; después solo lo usa el cambio del asistente.
- **Estado solo del servidor.** La grilla y la ficha llaman a `/simulate` con la PC elegida, abortan al
  cambiarla y descartan respuestas viejas. Sin sesión o sin PC no hay veredicto: se ofrece entrar o
  agregar una PC. Se muestra el veredicto recibido, sin estados propios: el motor solo devuelve
  `compatible` si no falta nada. Un error de pedido se informa como error, nunca como «Encaja».
- **Precios sin cálculo.** Se listan las ofertas que la API devuelve con estado vigente, importe,
  tienda y fecha; sin oferta usable, «Sin precio». El servidor expone `lowest_offer_id` y ordena por
  precio con la regla de la maqueta: contado y 7 días como máximo. El cliente no compara importes.
  «Más elegidas» no se muestra: no hay datos de elección y el orden por defecto no significa eso.
- **Acciones reales.** «Ver cómo quedaría mi PC» usa `/simulate` y no persiste. «Sumar a mi plan» abre
  un borrador donde la persona elige objetivo, presupuesto y etapas, y guarda solo con confirmación
  explícita mediante el alta de plan existente (con CSRF).
- **Detalle técnico accesible.** Atributos, fuentes y versión del catálogo van en desplegables; lo
  principal usa el vocabulario del sistema de diseño.

## Risks / Trade-offs

- [Ofertas de más de 7 días] → ninguna gana «el más bajo» y la pieza va al final del orden por precio,
  aunque siga mostrando su precio de referencia vigente.
- [Varias simulaciones por página] → tres pedidos en paralelo, aborto al cambiar de PC y estados
  parciales visibles.
- [Archivos compartidos entre pantallas] → un dueño por archivo, integración secuencial y suite
  completa una sola vez al cerrar la tanda.
