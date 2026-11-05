# Design

Cambio de presentación de enlaces, copia pública y `/admin`. DTOs, proyección pública, proxies y
backend no cambian.

## Decisiones
- **Enlace recién creado:** el token solo existe en la respuesta de creación. El campo para copiar vive
  en estado local de esa operación y no se guarda en ningún almacenamiento. El listado muestra estados
  y fechas, sin copiar ni recuperar enlaces anteriores.
- **Título público:** sigue limitado a las opciones actuales. La etiqueta libre por destinatario de la
  maqueta no entra.
- **Revocación:** la confirmación guarda el identificador del enlace elegido. Preparar otro invalida
  la anterior; Cancelar vuelve sin efectos. El texto dice que se deshabilitan accesos futuros.
- **Copia pública:** la reserva de evidencia va junto al estado principal. Un veredicto histórico
  compatible no se presenta como compatibilidad actual ni hay etapas compradas.
- **Enlace no disponible:** `not-found.tsx` con acceso al inicio; nunca se consulta con la sesión
  privada.
- **Admin:** solo tokens y jerarquía sobre las cuatro colecciones, el listado, el editor JSON y sus
  confirmaciones. No hay tablero, métricas ni «Publicar precio». Guardado en borrador y Publicado se
  distinguen con texto, no solo con color.
- **JSON y tablas:** el desplazamiento queda dentro de su panel a 390.

## Alcance
Ampliar el editor o construir un tablero exige otro cambio.
