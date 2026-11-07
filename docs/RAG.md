# RAG público de hardware

Fuentes: `tools/public-corpus.json` (9 PDFs oficiales; los archivos completos quedan en
`.local/rag-corpus/<id>/source.pdf`, sin publicarse) más el documento general generado
(`assistant/reference_doc.py`). El RAG explica y cita; no decide compatibilidad ni precios.

## Límites de ingesta (`assistant/rag.py`)

| Límite | Valor | Motivo |
|---|---|---|
| Páginas por PDF | 150 | el manual más largo tiene 94 |
| Fragmentos por PDF | 400 | el más grande genera 179 |
| Tamaño por PDF | 10 MB | el mayor pesa 5,9 MB |
| Tamaño total del manifiesto | 40 MB | los 9 PDFs suman unos 20 MB |
| Fuentes por manifiesto | 20 | |

Se rechaza (sin publicar fragmentos de ese archivo) un PDF con hash o tamaño distinto
del declarado, cifrado, con otra cantidad de páginas o sin texto útil.

## Identidad y alcance

Cada cita lleva `scope`: `exact` (modelo exacto nombrado en la consulta), `family` o
`general`. Un documento específico solo se busca si la consulta nombra su modelo o alias
curado como palabras completas (nunca como subcadena); `B550M Pro4 SE` no habilita la
ficha de `B550M Pro4`. Las consultas de precio o FPS no devuelven fichas de fabricante.
Se buscan solo los pares fuente/revisión del manifiesto activo y el documento general vigente.
