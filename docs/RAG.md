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

## Preparación

Los PDFs no van en Git: `tools/public-corpus.json` guarda URL, hash, tamaño y páginas, y cada
archivo vive en `.local/rag-corpus/<id>/source.pdf`.

```powershell
. scripts/local-env.ps1
backend/.venv/Scripts/python.exe scripts/activar-rag.py
. scripts/local-env.ps1   # toma el manifiesto recién creado
Set-Location backend
.venv/Scripts/python.exe -m upgradejusto.assistant.ingest --config $env:UJ_ASSISTANT_RAG_CONFIG --download
```

Para sumar una fuente: agregala al inventario con URL oficial, hash y modelos exactos, sumá casos
en `backend/tests/fixtures/rag_hardware_cases.json` y corré
`test_assistant_rag_quality_postgres.py`. El criterio es 7 de 8 positivas con la evidencia
esperada entre las 5 primeras y 4 de 4 negativas sin atribución falsa.

## Cobertura y límites

Nueve documentos oficiales de cinco categorías: memoria Kingston, placas ASRock B550, tabla de
fuentes de ASUS, manual de fuentes Corsair, gabinete Fractal Pop 2 Air y una ficha MSI RTX 4060.

- Resultado real con embeddings y PostgreSQL: 7/8 positivas y 4/4 negativas. Falla la pregunta de
  red de la Steel Legend, que no recupera su página 10.
- La consulta suma un glosario español-inglés fijo, calibrado con estos mismos casos: sin él da 5/8.
- La ficha MSI RTX 4060 es referencia de familia, no del modelo ASUS del catálogo.
- Docker sigue sin RAG, y conectar Docker con llama.cpp necesita su propio cambio.
