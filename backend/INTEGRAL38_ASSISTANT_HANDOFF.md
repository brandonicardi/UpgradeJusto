# Assistant38 — seven read-tool/context increment READY for Build gates

Contract accepted/spec CU08 applied by Build before code. NO checks executed here.
No Groq/live success claim, no full38/CU08 closure. get_plan TORRE implementado con
interfaz real recibida después; fixture PG propio preparado con helper aprobado. Exactly
seven registered names remain, no save/apply/share/extract-confirm tool introduced.

## Files

New: assistant/tower_{context,inputs,tools,projection,plans,plan_projection}.py.
Changed existing: assistant/{models,tool_inputs,tool_projection,mcp_server,graph,
repository,service}.py. service change ONLY exposes the fixed, whitelisted full-API
overflow error code; four runner arguments, timeouts and cleanup remain unchanged.
New tests: tests/test_tower38_assistant_pure.py,
tests/test_tower38_assistant_plan_projection.py, tests/test_mcp38_tower_pg.py,
tests/test_mcp38_tower_plans_pg.py.
Documents: INTEGRAL38_ASSISTANT_CONTRACT.md (accepted state), this handoff.
No provider/auth/quota/deadline/main/PC/compatibility/retail/plan/extraction changes.

## Interfaces and transport

- MessageCreate adds optional TurnContext: context_version2, configuration_schema1/2,
  pc_id,expected_pc_revision,objective/budget_ars/price_condition/workload. Closed,
  no client snapshot/notes/owner/URL/proof. Budget reuses Decimal validator and
  workload must apply to productivity. Absent context preserves legacy request flow.
- Repository.begin checks conversation ownership and duplicate request, then
  load_context(engine,server_owner,request) BEFORE pending rows/provider reservation.
  Per-turn TurnHistory(list) carries sanitized context_snapshot attribute only.
  Text remains original; DB history is still plain role/content,20 completed rows.
  No new columns, saved selection or reinterpretation of pasted JSON/history.
- load_context reads owned TowerRepository, checks actual origin_schema/revision;
  legacy is serialized through PCService, tower through Tower DTO. It removes notes,
  includes selected component names from FULL pinned PG catalog (not691-name dump),
  publication/objective metadata and applies24000-byte context cap. The graph adds
  context as versioned HumanMessage DATA, never SystemMessage/authorization. Current
  tool accesses always revalidate owner/revision, not historical contextual authority.
- validate_call keeps seven names. Legacy config tools default configuration_schema1;
  tower requires explicit2. Discriminated closed data uses existing EvaluateRequest,
  TowerSimulationDTO/TowerPreviewRequest without accepting evidence/disabled checks.
  MCP additionally rejects nonempty materials: LLM confirmed:true is NOT a verified
  user availability confirmation. Explicit material confirmation stays in web flow.
- TowerReadTools(engine,catalog,pcs) binds existing TowerService,
  TowerCompatibilityService(TowerEvaluationRepository), and
  TowerRecommendationService(TowerRecommendationRepository). Same server owner,
  expected revision and complete catalog flow as web services. Schema mismatch
  rejects before legacy truncation. Simulation/preview never write PCs or plans.
- get_pc/evaluate_pc/simulate_pc/preview_recommendations tower outputs use
  {configuration_schema:2,data:existingDTO}; project_tower validates typed wrapper,
  preserves ALL lines/rules/facts/missing/coverage/scope/versions and emits
  projection_version2. Notes are removed from each evaluated configuration including
  preview alternatives. Overflow reports full API required, not partial success.
- catalog_search adds page/default1,page_size1..20/default12 with full total; raw
  basic_stock_v1/tower_stock_v1 strings are omitted from its MODEL projection, not
  from service/domain data. Display attributes, sources, image/evidence and dated
  prices/offers retained. search_public_docs retrieval is unchanged, not SQL/fetch.
  Legacy projections remain version1; old plan quotes are not recotized.
- MCP private session/conversation capture/pop/allowlist and per-call auth.current +
  conversation ownership checks unchanged; no provider key inherited or logs added.

Unchanged budgets: projection24KB/input2MB/depth24/nodes50k; graph4 rounds/8calls,
recursion14; service90s/queue64/output32k/close2s/persist3s and all stricter37 controls.
No TLS/provider/quota workaround; extraction691-name TPM413 fix belongs to B3.

## Build-only verification

Ownership released at READY for checks. Seventeen Python paths are scoped above
(the original twelve plus the four plan-branch paths and service.py listed below).
Ruff format/check must use PATCH correction, not shell formatter modifying checkout;
no claimed format approval. Check separately (no pipes):

1. `.venv/Scripts/ruff.exe check upgradejusto/assistant/models.py upgradejusto/assistant/tool_inputs.py upgradejusto/assistant/tool_projection.py upgradejusto/assistant/mcp_server.py upgradejusto/assistant/graph.py upgradejusto/assistant/repository.py upgradejusto/assistant/tower_context.py upgradejusto/assistant/tower_inputs.py upgradejusto/assistant/tower_tools.py upgradejusto/assistant/tower_projection.py tests/test_tower38_assistant_pure.py tests/test_mcp38_tower_pg.py`
2. `.venv/Scripts/ruff.exe format --check` with those SAME twelve paths; report residual
   mechanical delta to sole writer, no semantic relaxation of gates.
3. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_assistant_pure.py`
4. Authorized TEST wrapper: `.venv/Scripts/python.exe -m pytest -q tests/test_mcp38_tower_pg.py`

Pure tests: seven input names; closed identity/proof rejection; explicit2 vs legacy1,
strict bounds; complete12-rule three-state projection/fail+missing; unknown/absent,
UUID/counts; nested notes/privacy; quotes preserved; raw catalog envelope filtering,
paging beyond50 and explicit overflow; ephemeral context not inferred from user text.
PG test: actual SDK stdio listing7 and A/B conversation/PC isolation, live revocation,
actual web-created tower selected from beyond50, read/evaluate equals authoritative
service, simulation/preview no PC write, revision/schema mismatch, catalog page4,
legacy projection1. Context PG admission tests foreign/stale rejection before any
message/provider admission, valid reservation with per-turn snapshot, duplicate409,
interrupted cleanup/release and original text/history unchanged. No mocked PG proof.

No routine repeat of all approved suites requested. Build may select affected legacy
MCP/cancellation regression if diagnostics justify; actual Groq/web gate remains
separate and unverified, with known TLS/TPM issues not fixed by this block.

## Seventh tower branch — real interface received

read_owned_plan(engine,catalog,server_owner,identity) uses real
TowerPlanService(TowerPlanRepository(engine)).get(owner,identity,revision=None), and
TowerPlanRead validation. Legacy read remains real PlanService. Only404 is treated
as absent format; other errors fail closed. Both own live formats sameUUID =>409.
No get recompute/clock/write. MCP shared catalog bootstrap remains as before; tower
plan service itself receives neither catalog nor clock. Projections retain quotes
as stored even if current time/catalog differ; no fresh-price promotion on GET.

tower_plan_projection uses explicit outer/snapshot/stage/version allowlists and
typed Tower/TowerEvaluationResponse, preserving all stages and all coverage. Removes
base.context.notes,stage.evaluated_configuration.context.notes,stage.evaluation.
evaluated_configuration.context.notes and nested allowed context notes. Unknown future
normalized_input/private stage fields are not copied. Pure synthetic tests cover
three poison paths, frozen past dates/status/versions and explicit stage overflow.

Additional Python paths for Ruff/check: assistant/tower_plans.py,
assistant/tower_plan_projection.py, tests/test_tower38_assistant_plan_projection.py.
Pure command: `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_assistant_plan_projection.py`.
Creation interface/helper subsequently received and used, not guessed:
TowerPlanCreate + svc.save(owner,request)->(raw,replayed), plan_context/body from
test_tower38_plan_pg. New test_mcp38_tower_plans_pg.py prepares actual PG/SDK gates:
fresh own A/B towers via TowerService, real unknown plan generation, legacy reads,
owned historical INSERT fixture with >50 other own records, expired synthetic quote
preserved byte-for-byte, all three notes paths/unknown input filtered, no truncation
on live identical UUID across formats, foreign/forged-owner/deleted/revoked rejection,
history1 preserved and absent history404. Only own fixture headers/legacy/conversations
are cleaned; current691 catalog/resources untouched, no UPDATE frozen revisions.
Existing test_mcp38_tower_pg.py covers six-tool/context gates; no test execution or
seventh PG approval claimed here. No write/save/share tool introduced.

Additional Ruff path: tests/test_mcp38_tower_plans_pg.py. New PG command via TEST wrapper:
`.venv/Scripts/python.exe -m pytest -q tests/test_mcp38_tower_plans_pg.py`.
All creation/read interfaces now supplied; no interface blocker remains. READY here
means complete source/test preparation, not passed gates, deployed routing or live
provider success. Relevant precondition for beyond50 MCP fixture is the preserved
published TEST catalog (>60 records, currently691); no automatic reset/import.
Include assistant/service.py in Ruff paths too. Its pure stream test verifies
overflow emits the explicit safe code with failed (not completed) lifecycle; unit
repository is NOT an authentication/PG substitute. No timeout/cleanup values changed.
B3 review/physical policy remain; no real-hardware positive from imports/tests.

## Style-only closure checkpoint — results communicated by Build

Build reports18 pure PASS/exit0 and5 real TEST PG/MCP + mounted-plan PASS/exit0.
Groq real extraction gate already PASS according to Build; not rerun by this child.
That extraction gate does NOT verify this increment's assistant/MCP live LLM/SSE
and history journey. These are reported results, not executions here or MCP approval.

Delta now ONLY imports/wrapping in ten paths: assistant/{graph,tool_projection,
tower_inputs,tower_plan_projection,tower_plans,tower_tools}.py and tests/
{test_mcp38_tower_pg,test_mcp38_tower_plans_pg,test_tower38_assistant_plan_projection,
test_tower38_assistant_pure}.py. No changes to algorithms, values or assertions;
three-path privacy, frozen quotes, ephemeral context and seven-tool inventory intact.
I001 import groups corrected in tower_plan_projection and test_mcp38_tower_pg.
No shell/runners/format executions here; final lint/format confirmation pending Build.
Do not repeat functional/PG/provider gates for this style-only delta. Next step:
focused lint/format, then independent MCP review; no full38 closure or commit/push.

## Subsequent Build verification and independent reviews

Build Ruff check17 files0; initial format left four files with wrapping residuals.
Mechanical PATCH only, then format17 files0 and lint changed4 files0. No algorithms,
values or assertions changed;18 pure/4 PG MCP were not rerun for formatting. The
fifth combined PG test belongs to mounted private plans, not an extra MCP test.
Independent functional and security reviews accepted this increment LOCALLY without
verified blockers. Live assistant→MCP→incremental response→history remains pending;
context selection is per-turn, not durably persisted. No full38 or hardware approval.

Privacy boundary: internal MCP transport still carries full private DTOs. Notes are
removed in project_tool_result BEFORE delivery to the LLM, including base context
and both stage configuration paths. Do not expose this transport as a public API
or bypass projection. Future CU09 requires a separate public allowlist and gates.
