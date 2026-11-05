# Design

## Qué hay hoy

| Fuente | API pública | Qué encontramos (5/11) | Decisión |
|---|---|---|---|
| CompraGamer | No documentada | `scripts/fetch-store-catalog.py` ya lee `static.compragamer.com/productos` | Usar |
| Venex | No | `robots.txt` permite `/` y frena búsqueda y filtros; `scripts/fetch-venex-offers.py` ya respeta eso | Usar |
| HardGamers | No | `robots.txt` pide 5 s entre pedidos y responde 410 a bots conocidos en `/search` | No leer |
| BestGaming | Privada, a pedido | Hay que solicitar acceso; datos ilustrativos en su página | Opción futura |

No revisamos los términos de uso de cada sitio: `robots.txt` no reemplaza esa lectura.

## Por qué HardGamers no

Es un comparador: sus datos ya son una recopilación de terceros, y su `robots.txt` deja claro que no
quiere bots en la búsqueda. Sumaría una fuente indirecta justo donde el producto promete decir de
dónde sale cada precio. Si hacen falta más tiendas, conviene sumar la tienda misma (FullH4rd, Maximus,
Mexx) con un lector propio, después de revisar sus reglas.

## Regla del producto

Precio con moneda, fecha y fuente; sin alguno de esos datos, «Sin precio». Nada de promedios ni
estimaciones. Un lote viejo conserva su fecha: leer de caché no lo vuelve fresco.

## Enlaces

Brandon prefiere no poner enlaces de forma destacada. La tienda se nombra como fuente; el enlace puede
quedar discreto o quitarse sin perder la regla de la fuente.

## Límites de cada corrida

Lectores acotados y explícitos, sin login, sin JavaScript y sin URLs arbitrarias. Ritmo bajo, con
pausa entre pedidos y corte por tiempo, como ya hacen los dos scripts.
