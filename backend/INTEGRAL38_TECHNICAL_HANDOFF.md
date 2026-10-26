# Technical38 — implementation READY, not runtime integration

Contract2 accepted/specs applied by Build26/10/2026 before code. Thermal bool steering
was added to the contract before those keys were implemented. Only synthetic fixtures
in tests; no manufacturer facts imported, no code executed by this child.

## Modules and signatures for B3

- `retail.technical_parser.load_technical_envelope(raw: str) -> TechnicalEnvelope`
  rejects duplicate JSON keys, nonfinite constants, closed-schema/category/type errors,
  byte/ref overflow and structural conflicts. Raises ValueError (including Pydantic
  ValidationError). Pure, no HTTP/DB/provider dependency. Does not itself prove source
  registration: use revision binding below before treating facts as published evidence.
- `retail.technical_models`: TechnicalEnvelope dataclass with version, identity,
  data, fields, conflicts, import_digest. identity: TechnicalIdentity; fields values
  are tuples of SourceRef(source_id,url,consulted_on,locator); conflicts values tuples
  of ConflictObservation(value,source_refs). `envelope.references()` lists all refs.
  data resource arrays contain typed NominalResource; shared_limits typed SharedLimit;
  ordinary arrays remain lists; scalars strict ints/bools/exact tokens. Models support
  model_dump(mode="json") for adaptation; no domain evaluator classes imported here.
- `retail.technical_validation.validate_technical_binding(raw, component_id,
  component, source_rows) -> TechnicalEnvelope`: component is JSON-style dict with
  category,name,attributes,sources; source_rows are registered revision SourceData
  dicts with ISO consulted_on strings. Checks exact identity and source metadata,
  component sources, nonoverride of overlapping basic facts. Raises ValueError.
- `preserve_retail_resource(resource, previous, component) -> bool`: internal CU10
  predicate; component dicts include id. Supports exact-source or validated technical
  superset only. Raises ValueError on documented technical/retail MPN disagreement;
  requires deterministic vendor ID/category/origin/variant binding, copies payload
  unchanged. Caller must have run materialize first. No retail reconciliation.

CU10 write validates envelope structure and category. Materialize validates row ID,
name/category binding, every reference ID/URL/date/locator and component membership.
Publication checks preservation under existing fresh PG role/atomic transaction.
No new endpoints/migrations, no edits to engine, scopes or limits37. Legacy attributes
retain their2000-character bound; only tower_stock_v1 gets24000 UTF8 bytes.

## Consumer constraints

B3 must adapt resolved publication evidence in a separately authorized change and
include envelope digest/revision in evaluation. Do not merge conflicting fields over
basic facts: missing/conflicts stay unknown and known failures keep dominance.
No substring/casefold normalization of nominal tokens. Connector tokens3pin/4pin,
header kind fan. Typed resource objects are publication models, not preapproved passes.
No runtime resolver was modified here; publishing this attribute alone cannot turn
an evaluation green.

Thermal bools only cooler or CPU with documented stock cooler included:true. Missing
is unknown; included describes NEW packaging, never remaining user material. No
universal remount requirement or default inclusion. AG400 facts are not supplied.
Global fan current policy, expanded-load stock applicability, physical dimensions,
header allocations and actual manufacturer evidence remain separate unresolved gates.
Integer-mm schema does not round fractional dimensions into observations.

## Build-only checks, separate commands from backend/

Ownership is released at READY for mechanical formatting/check execution of this
increment only. No code/exit-code claim from this child.

1. `.venv/Scripts/ruff.exe format upgradejusto/retail/technical_models.py upgradejusto/retail/technical_parser.py upgradejusto/retail/technical_validation.py upgradejusto/administration/models.py upgradejusto/administration/validation.py upgradejusto/administration/repository.py tests/test_tower38_technical_models.py tests/test_tower38_technical_postgres.py`
2. `.venv/Scripts/ruff.exe check` with those SAME eight explicit paths.
3. `.venv/Scripts/ruff.exe format --check` with those SAME eight explicit paths.
4. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_technical_models.py`
5. Existing authorized TEST wrapper: `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_technical_postgres.py` (real PG only, existing guards, no DEV).

Tests cover strict types/closed JSON/duplicate keys/unknowns,501 refs independently
of byte cap,UTF8 bounds,basic conflict preservation,exact source and identity binding;
PG source mutations422/atomic pointer,role revocation,technical superset preserving
photos/quotes/history,retail refresh preserving technical curation and source removal
dropping resources. No routine rerun of previously accepted tower gates implied.

Next: Build focal checks, one diagnosed correction if needed, independent delta
review; only then B3 resolver integration and separately supplied actual source facts.

## Runtime resolver — new authorized increment after043eb78

Previous publication block accepted locally by security:34 pure/9 real TEST PG,
lint/format eight files0, per Build communication. This appendix supersedes the
earlier "no runtime resolver modified" statement ONLY for the following new delta:

- compatibility/tower_technical_resolver.py (new)
- compatibility/tower_evidence.py (only existing code edited)
- tests/test_tower38_technical_resolver.py (new)

`resolve_published_technical(component, catalog, basic: BasicSpecs)
-> ResolvedTechnicalSpecs(specs: BasicSpecs, revision_token: str|None)`.
Consumes the SAME full pinned ResolvedCatalog/source_rows as basic resolution.
Reuses validate_technical_binding before any merge; SourceRef becomes frozen domain
EvidenceRef. Publication resource/limit models convert through strict JSON validation
to domain NominalResource/SharedLimit (arrays -> required tuples, exact tokens).
No namespace/category/source inference, fetch, PG writes or rules imported/changed.

Known technical values with valid provenance add fields. Existing basic conflicts
cannot be cleared. Differing independently known values conflict rather than win
by order. Explicit validated conflicts remove that fact, retain combined references,
and mark BasicSpecs.conflicts, including overlapping basic facts. Other basic facts
and failures remain untouched. False and zero stay explicit observed values, not
missing. No electrical budgets, stock assumptions, splitters, hubs or thermal
defaults are manufactured.

No envelope => identical BasicSpecs object and no revision token; legacy revision
string/adapter version remain exactly unchanged. Valid envelopes contribute sorted
resolver-version/status/SHA256 tokens to tower data_revision, alongside publication
ID and original basic digests. Hash includes component ID, complete valid envelope
(thus technical digest/field/reference content), and raw length. Invalid envelopes
contribute bounded invalid tokens only, no raw source URLs/errors or field values.
Oversized invalid strings fingerprint a bounded prefix+length, not an unbounded
diagnostic; they never grant facts. Invalid/rejected evidence leaves basic untouched;
it cannot erase an independent known failure. Technical-only facts stay absent and
produce ordinary engine missing fields where required, not a global disable flag.

Tests use accepted synthetic motor fixture for complete-positive adapter proof,
explicitly NOT real hardware or manufacturer evidence. A synthetic basic resolver
seam supplies its pre-existing basic observations; all technical observations still
pass real parser/binding/domain adaptation. Additional tests: invalid sources/date/
locator/identity/category and malformed JSON; fail dominance plus missing; distinct
source conflict clearing only affected field; exact legacy no-envelope revision/
verdict; fractional basic dimensions preserved; thermal False/CPU inclusion guard;
digest changes with field/provenance/publication; full snapshot selected ID beyond50;
typed shared limits and old conflicts not cleared. No PG mock as integration proof.

Build-only, separate commands from backend (no own executions/results for this delta):

1. `.venv/Scripts/ruff.exe check upgradejusto/compatibility/tower_evidence.py upgradejusto/compatibility/tower_technical_resolver.py tests/test_tower38_technical_resolver.py`
2. `.venv/Scripts/ruff.exe format --check upgradejusto/compatibility/tower_evidence.py upgradejusto/compatibility/tower_technical_resolver.py tests/test_tower38_technical_resolver.py`
3. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_technical_resolver.py`

If needed, Build selects affected TEST PG integration separately, not routine suites.
No engine, HTTP, quotas, recommendation consumer, extraction, persistence, scopes or
policies edited. No actual manufacturer facts published. B3 must review integration
before any real-hardware positive claim. Global fan-budget necessity, expanded PSU
loads, physical measurements and evidence acquisition remain unresolved by this
representation/resolver block. Used/new thermal-package distinction stays with the
existing CU06 consumer; forwarding a bool does not authorize unlimited reused paste.

## Resultado posterior — atribución Build/revisión

Build:34 puros PASS0;9 PG TEST PASS0; Ruff check8 archivos0. Tras ajuste de estilo
del autor y wrapping residual mecánico Build, format8 archivos0. Ningún runner del
autor ni hechos de fabricante publicados. Revisora independiente aceptó LOCALMENTE
representación/publicación, sin hallazgo bloqueante comprobado. Metadatos de fuente
no certifican verdad técnica; resolver y política aplicable requieren gates propios.

## Resultado posterior del resolver — Build y revisiones independientes

17 pruebas puras PASS0; lint/formato3 archivos0 tras wrapping mecánico Build.
Con composición READY, prueba nueva de recomendaciones sobre main y2 nodos PG del
delta extracción pasaron juntos3 PASS0. No atribuir ese gate a hechos de fabricante.
Revisiones funcional y seguridad aceptaron LOCALMENTE el resolver; no hallazgos
bloqueantes comprobados. El binding runtime es identidad ID/categoría/nombre y fuentes;
no repetir como propio el control MPN retail realizado durante publicación.
Faltan hechos reales publicados y decisión explícita sobre globalfanbudget **T10**;
T12 no es el guard universal de ese campo. No cambió política por esta integración.
