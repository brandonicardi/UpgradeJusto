# Verdict

Etiqueta que dice en una palabra si un cambio funciona en la PC de la persona.

**Qué aporta quien lo usa:** el estado que devuelve el motor de compatibilidad. La etiqueta nunca se decide en la interfaz ni la decide el asistente.

| Estado del motor | Etiqueta | Ícono | Colores |
| --- | --- | --- | --- |
| `compatible` | Encaja | tilde | `encaja` sobre `encaja-fondo` |
| `requiere_verificacion` | Falta un dato | pregunta | `revisar` sobre `revisar-fondo` |
| `incompatible` | No encaja | cruz | `no-encaja` sobre `no-encaja-fondo` |

- Color, ícono y palabra van siempre juntos.
- Si hay incompatibilidad y además faltan datos, se muestra «No encaja» y debajo un `Notice` con lo que falta.
- «Falta un dato» nunca se pinta como un «casi encaja»: va acompañado de qué dato y cómo conseguirlo.
