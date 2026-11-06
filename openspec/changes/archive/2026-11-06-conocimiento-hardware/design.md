# Design

## Context

El motor de compatibilidad (`tower-essential-policy-2`) decide con datos de la PC propia. Muchas piezas
reales llegan con nombre y sin ficha completa. Hay que completar lo que falta sin inventar y sin
convertir una referencia general en un veredicto. El producto exige que el LLM no emita veredictos
(regla 1 de `AGENTS.md`) y que el desconocido nunca equivalga a cero, falso o compatible (regla 2).

## Goals / Non-Goals

**Goals:** completar datos faltantes con fuente, rotularlos, avisar lo que depende del modelo exacto y
usar el mismo conocimiento en el motor, el recomendador, el chat y la primera PC.

**Non-Goals:** reemplazar la ficha del fabricante; publicar FPS; publicar precios; decidir compatibilidad
con el modelo de lenguaje; evaluar BIOS, refrigeración o velocidades de memoria.

## Decisions

- **Prioridad de fuentes.** Dato del fabricante > referencia por familia > desconocido. La referencia
  solo rellena campos que el fabricante dejó vacíos; un campo en conflicto queda en conflicto
  (`merge_reference`).
- **Identificación por nombre, no por búsqueda.** `reference_knowledge.py` reconoce la familia con
  expresiones regulares sobre el nombre publicado. Si el nombre es ambiguo (más de un chipset, zócalo
  declarado distinto del de la tabla, memoria nombrada que la placa no admite) no da hechos.
- **Una referencia por familia con fuente.** Por ejemplo, una fila de fuente por serie de GPU. Cuenta como
  evidencia y se rotula «según datos de referencia», para que el lector sepa que no es la ficha del modelo
  exacto. Lo que varía por modelo (conectores T06, espacio T04/T07, lugar para discos T08, ranuras) se avisa
  como «Chequeá…» y no bloquea.
- **Índices relativos.** PassMark (GPU) y Blender Open Data (CPU) se guardan como valor crudo con su
  fuente. Son comparables entre filas de la misma tabla, nunca se traducen a FPS.
- **Recomendador por valor.** `value_score` = ganancia / raíz de (precio / presupuesto). Premia la mejora
  que entra con poca parte del presupuesto. Dentro de cada estado (recomendado, a verificar, descartado)
  ordena por ese valor. Sin precio vigente no propone: la regla 5 de `AGENTS.md` lo exige. Si nada entra,
  se muestran las descartadas, primero las que encajan con la PC pero cuestan un poco más de lo permitido.
- **IA local solo elige.** `advisor.py` recibe hasta cinco propuestas ya verificadas y devuelve una clave
  y una explicación. Una clave fuera de la lista, un número inventado, un timeout o un modelo apagado dejan
  el orden determinístico. No ve a la persona ni agrega opciones.
- **Chat local opcional.** `UJ_CHAT_PROVIDER=llamacpp` apunta a 127.0.0.1:8081. Groq sigue por defecto y no
  hay fallback silencioso entre proveedores.
- **Documento de referencia generado.** `reference_doc.py` produce `docs/conocimiento-hardware.md` desde las
  mismas tablas, así el chat no puede contradecir al motor. La búsqueda prioriza términos exactos (B550,
  RTX 3060) porque un codificador pequeño confunde zócalos parecidos.
- **Primera PC validada.** `first_build.py` arma una propuesta completa y la pasa por el motor antes de
  mostrarla. Se entrega como borrador editable en `/build`; nada se guarda sin confirmar.

## Risks / Trade-offs

- Las tablas envejecen. Cada tabla tiene `consulted_on`; actualizarla es un cambio aparte.
- La identificación por nombre cubre familias, no modelos exactos: por eso el aviso «Chequeá…».
- En Docker el RAG está apagado (sin modelo de embeddings), así que el chat no cita ese documento allí.
- La IA local depende de una GPU con Vulkan y del modelo descargado en `.tools/`; sin eso, Groq o el orden
  determinístico siguen funcionando. La medición (~35 tok/s, ~2 s por elección) es de una RX 9070 XT.

## Verificación

Pruebas puras del conocimiento, la primera PC, el documento de referencia y el asesor local; la
identificación y el rotulado se revisan en `tasks.md`. Lo que requiere PostgreSQL o el navegador se marca
como no re-corrido cuando no se corrió en la revisión.
