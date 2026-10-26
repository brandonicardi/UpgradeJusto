# Import handoff — proposed contract, 2026-10-25

Scope: importer only; no catalog/engine/administration edits. Sources are the local
acquired raw-sample.json, never executable upstream repositories. Publication is
local only: BuildCores CC-BY-NC-SA-4.0 attribution/NC/SA and docyx MIT preserved.

CORE contract requested: allow `basic_stock_v1` in ComponentData attributes for
all categories. Value is canonical compact JSON, <=2000 characters:
`{"conflicts":{},"data":{"socket":"AM4","tdp_w":65},"fields":{"socket":["hw-…"],"tdp_w":["hw-…"]},"import_digest":"…","version":1}`.
Keys: version, data, fields (field -> source IDs), conflicts (field -> observations),
import_digest. Unknown = null; numeric zero is preserved, never missing-by-truthiness.
No CPU support/BIOS rows, no prices imported. Existing attributes/prices retained;
overlap contradictions with existing curated attributes are reported, not overwritten.
SourceData remains unchanged: source_id, pinned raw URL, consulted_on, locator.
Locator is compact JSON recording revision, record hash, license, schema and transform.
Component.sources deduplicates by source ID and URL.

Proposal input has no user identity. Executor receives owner only from its trusted
server caller and reuses AdministrationService create/write/publish, including PG
authorization and optimistic active-version guard. No credentials, bootstrap or HTTP
endpoint. Same metadata/sources means no draft creation. Old snapshots are immutable.

## READY Build — implementation prepared, NOT executed

Files: `upgradejusto/catalog_import/{__init__,proposal,executor,__main__}.py`,
`tests/test_catalog_import.py`, `tests/test_catalog_import_pg.py`, this handoff.
No writes elsewhere. No shell, installation, credentials, network, migrations,
upstream execution or publication performed. No check exit codes available.

Canonical JSON keys exactly: `version`, `data`, `fields`, `conflicts`,
`import_digest`. `fields` lists source IDs including existing curated references
when involved in a conflict. Each conflict observation is `{value,source}`.
Numerical keys carry units in their names. `interface` normalizes e.g.
`PCIe 4.0 X8`; formats: `ATX`, `mATX`, `ITX`; connector counts retain zero and
null separately and MUST NOT be interpreted as independent cables. Empty upstream
format lists become null (not evidence of no supported formats). TDP != demand DC.
BIOS, cooler inclusion, power recommendations and ARS quotes are not fabricated.

Closed `data` keys by category (all unlisted fields stay outside this import):
- CPU: socket, cores, threads, tdp_w, ppt_w, memory_types.
- Motherboard: socket, form_factor, memory_type, dimm_slots, max_memory_gb.
- RAM: memory_type, module_type, capacity_per_module_gb, modules, voltage_v,
  ecc, buffering. `288-PIN DIMM` is not silently aliased to UDIMM.
- GPU: length_mm, vram_gb, interface, tdp_w, slots, power_connectors.
- PSU: continuous_power_w, length_mm, form_factor, psu_connectors.
- Case: board_formats, psu_formats, gpu_length_limit_mm,
  cooler_height_limit_mm, slots.

`build_proposal(sample, active_component_rows)` consumes the acquired data, preserves
legacy strings/null and all 14 existing IDs (untouched IDs are inherited from base
revision), imports no new components and creates no prices/support rows. Source pins,
record SHA256 and optional canonical envelope checksum fail closed. CLI additionally
requires raw-file SHA256. Digest is SHA256 over pinned canonical observations and
transform version, independent of record order/direct duplicate acquisition rows.

Trusted invocation:
`version, rows, sources = active_snapshot(service, authenticated_owner)`;
`proposal = build_proposal(sample, rows)`;
`ImportExecutor(service).publish(authenticated_owner, version, proposal)`.
No owner in DTO. CLI prints proposal only; `--publish` deliberately refuses until
a trusted server adapter supplies authenticated identity (no credential-file design).
CU10's existing publication is atomic; an interrupted staging operation can leave a
draft but cannot partially change active catalog. Same metadata/sources is a no-op;
no restoration of old pointers, mutation of old revisions or duplicate source rows.

Identity limits requiring coordinator decision: P08 is AR while acquired BC SKUs
are NA/EU/UK/AU; these are NOT accepted aliases. P15/P16 candidates without the
exact MPN stay unresolved. Meshify TG/null-panel docyx rows stay quarantined for
Solid; RM750e2023 never becomes2025; Pro4 never becomes ProSE. docyx contributes
actual CPU chip fields (not BOX/WOF cooler claims) and exact motherboard-model
fields only after BC exact identity evidence. Candidate targets never authorize a
match. Report has all14 targets, missing fields, source IDs, duplicate/conflict and
quarantined locators. Counts/results await execution, not claimed as PASS.

Build checks, individually, no routine suites:
1. `python -m pytest -q tests/test_catalog_import.py` (actual acquired sample).
2. Existing TEST wrapper: `python -m pytest -q tests/test_catalog_import_pg.py`.
   Requires CORE allowlist first; uses real `pg_engine`, synthetic local admin,
   PG savepoints + outer rollback; proves role denial, old snapshot preservation,
   new publication, no-op/revision-row counts and stale-active refusal.
3. Ruff check/format only these new files. Build owns execution/format/setup;
   no dependency additions. One diagnosed correction then escalate if needed.

CORE must adapt its evidence identity-envelope handling intentionally: adding
sources/metadata currently invalidates old curated baseline extracts. This importer
does NOT change that guard or label imported evidence compatible/recommended.

## Independent review correction — legacy conflict reimport

Diagnosed: both overlap branches assigned legacy observations to every accumulated
Component.sources reference, including imported BC/docyx sources on the second run.
Correction: legacy observations use only sorted/deduplicated non-import references.
`hw-` is the importer's reserved source-ID namespace. Before excluding one, verify
its complete ID+URL against sources derived from the checksum-validated pinned
acquisition records; edited/foreign import identities require explicit recuration
and fail closed. A conflicting legacy observation without non-import provenance
also fails closed; it is neither discarded nor reassigned to BC/docyx. Existing
legacy value/source edits are evaluated from the active snapshot, not overwritten
from previous metadata. No metadata/API/engine contract change.

READY regressions: consecutive proposals must be exactly equal (metadata, conflicts,
digests, references and reports) for socket AM5, unparsed edited socket and recognized
cores8 conflicts. No imported source may receive the foreign legacy observation.
Changed imported URL and loss of legacy provenance are rejected; an actual new
legacy edit changes the proposal instead of masquerading as a no-op. Real PG test
now parametrizes no edit / recognized cores8 / unparsed edited cores: first publish
the explicit CU10 legacy edit, publish import, rebuild, require identical proposal
and no-op with unchanged revision/row counts and preserved old snapshots. Socket
mutation stays unit-only because existing CPU-support rows independently require
the declared socket; this correction does not bypass that CU10 validation.

Execution evidence supplied by coordinator BEFORE this correction: 6 unit tests
exit0 (0.10s), 1 PG test exit0 (0.30s), 49 acquired records, 11 proposed components,
16 imported source rows. These results do NOT verify the correction. New focal
tests and Ruff formatting await Build; no shell/runners/dependencies used here.
