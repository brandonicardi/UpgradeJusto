# Design

## Degradar en vez de fallar
Una observación dudosa del modelo no es una falla del proveedor. Si la ausencia no es literal o la
categoría es incierta, se deja `unknown` para que la persona la revise. Sigue dando 502 lo que no se
puede sostener: un extracto que no está en el texto, un candidato inexistente o una identidad de
catálogo sin coincidencia exacta.

## Gramática de rótulos
`whole_label` reconoce el marco alrededor del rótulo, no variantes de modelo. Se amplían separadores
y prefijos, pero prefijo y rótulo siguen cubriendo todo el segmento. Así, «quiero comprar una RTX 3060»,
«sin RTX 3060» y un prefijo de variante desconocido no se aceptan. Los prefijos son una lista propia:
`NEGATIVE_NAMES` define ausencias y no se amplía.

## Salida del proveedor
Se probó el esquema estricto y `openai/gpt-oss-20b` no lo cumple, así que se usa el modo JSON. No se
agregan reintentos: cada llamada consume cuota y la persona puede volver a intentar.

## Cantidad en categorías de una sola unidad
CPU, placa madre, placa de video, fuente, gabinete y cooler admiten una sola pieza, así que un modelo
literal sin cantidad vale 1: es estructura de la torre, no una inferencia. RAM, discos y ventiladores
siguen exigiendo cantidad explícita.
