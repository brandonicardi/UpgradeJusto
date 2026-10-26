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

## Resultado posterior — atribución Build/revisión

Build:34 puros PASS0;9 PG TEST PASS0; Ruff check8 archivos0. Tras ajuste de estilo
del autor y wrapping residual mecánico Build, format8 archivos0. Ningún runner del
autor ni hechos de fabricante publicados. Revisora independiente aceptó LOCALMENTE
representación/publicación, sin hallazgo bloqueante comprobado. Metadatos de fuente
no certifican verdad técnica; resolver y política aplicable requieren gates propios.
