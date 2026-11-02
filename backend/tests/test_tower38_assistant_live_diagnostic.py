"""Opt-in ONE admitted live turn; only closed metadata crosses diagnostics.

No SDK/tool/auth substitutes in the live case. Pure cases below test observation
wrappers only. Never print exception text, inputs, chunks, IDs, context or bodies.
"""

import asyncio
import json
import logging
import os
from uuid import UUID, uuid4

import pytest
from test_assistant_postgres import assistant_actors as assistant_actors
from test_pcs_postgres import actors as actors

from upgradejusto.api import assistant as assistant_api
from upgradejusto.assistant import graph
from upgradejusto.assistant.repository import Repository
from upgradejusto.assistant.service import AssistantService
from upgradejusto.catalog.models import Category
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.main import app
from upgradejusto.pcs.tower_models import TowerCreate
from upgradejusto.pcs.tower_repository import TowerRepository
from upgradejusto.pcs.tower_service import TowerService

TOOLS = frozenset(
    {
        "catalog_search",
        "get_pc",
        "evaluate_pc",
        "simulate_pc",
        "preview_recommendations",
        "get_plan",
        "search_public_docs",
    }
)
EXCEPTIONS = frozenset(
    {
        "ValidationError",
        "ValueError",
        "TypeError",
        "ToolFailure",
        "RoundLimit",
        "APIError",
        "APIStatusError",
        "APIConnectionError",
        "APITimeoutError",
        "BadRequestError",
        "RateLimitError",
        "AuthenticationError",
        "PermissionDeniedError",
        "NotFoundError",
        "UnprocessableEntityError",
        "InternalServerError",
        "HTTPStatusError",
        "ConnectError",
        "ReadTimeout",
        "TimeoutError",
        "CancelledError",
        "ExceptionGroup",
        "BaseExceptionGroup",
        "HTTPException",
        "OutputParserException",
        "JSONDecodeError",
        "ConnectTimeout",
        "ReadError",
        "WriteError",
        "PoolTimeout",
        "ClosedResourceError",
        "BrokenResourceError",
        "BrokenPipeError",
        "PCError",
        "DiagnosticGuardError",
        "RuntimeError",
        "OSError",
        "ConnectionError",
        "FileNotFoundError",
        "KeyError",
        "AttributeError",
        "McpError",
        "ToolError",
        "RemoteProtocolError",
    }
)
TOOL_CODES = frozenset(
    {
        "unknown_tool",
        "invalid_tool_input",
        "tool_failed",
        "empty_provider_response",
        "invalid_tool_output",
        "tool_output_limit_full_api_required",
    }
)
SSE_CODES = frozenset(
    {
        "generation_failed",
        "round_limit",
        "history_unavailable",
        "tool_output_limit_full_api_required",
    }
)
LOG_PREFIXES = ("groq", "httpx", "httpcore", "langchain", "mcp", "upgradejusto")
PROVIDER_CODES = frozenset(
    {
        "tool_use_failed",
        "json_validate_failed",
        "invalid_request_error",
        "rate_limit_exceeded",
        "context_length_exceeded",
        "server_error",
        "insufficient_quota",
        "invalid_api_key",
    }
)
PROVIDER_TYPES = frozenset(
    {"invalid_request_error", "server_error", "tokens", "capacity_error", "requests"}
)


def safe_provider_body(exc):
    try:
        body = getattr(exc, "body", None)
    except Exception:
        return {
            "body_type_known": "other",
            "provider_error_code": None,
            "provider_error_type": None,
        }
    if body is None:
        kind = "none"
    elif type(body) is dict:
        kind = "dict"
    elif type(body) is list:
        kind = "list"
    elif type(body) is str:
        kind = "str"
    else:
        kind = "other"
    code, error_type = None, None
    if type(body) is dict:
        # Only root or its one known error object. Never inspect message,
        # failed_generation, requests, operator arguments or arbitrary children.
        nested = body.get("error")
        fields = nested if type(nested) is dict else body
        value = fields.get("code")
        if type(value) is str:
            code = value if value in PROVIDER_CODES else "other_error_code"
        value = fields.get("type")
        if type(value) is str:
            error_type = value if value in PROVIDER_TYPES else "other_error_type"
    return {
        "body_type_known": kind,
        "provider_error_code": code,
        "provider_error_type": error_type,
    }


def safe_exception(exc):
    name = type(exc).__name__
    try:
        status = getattr(exc, "status_code", None)
    except Exception:
        status = None
    status = status if type(status) is int and 100 <= status <= 599 else None
    return {
        "exception_class": name if name in EXCEPTIONS else "other_exception",
        "http_status": status,
        "http_413": status == 413,
        "http_429": status == 429,
        **safe_provider_body(exc),
    }


def safe_tool(name):
    return name if type(name) is str and name in TOOLS else "other_tool"


def uuid_syntax(value):
    if isinstance(value, UUID):
        return True
    if type(value) is not str:
        return False
    try:
        UUID(value)
    except ValueError:
        return False
    return True


def append_bounded(items, value):
    if len(items) == 16:
        del items[0]
    items.append(value)


def new_report():
    return {
        "diagnostic_version": 2,
        "message_posts": 0,
        "http_response_status": None,
        "model_streams": 0,
        "provider_errors": [],
        "validations": [],
        "runner": None,
        "runner_state": "not_started",
        "events": {
            "start": 0,
            "nonempty_delta": 0,
            "delta_before_done": 0,
            "done": 0,
            "terminal_completed": 0,
            "error": 0,
            "invalid": 0,
        },
        "tools": {
            name: {"running": 0, "completed": 0, "failed": 0} for name in sorted(TOOLS)
        },
        "error_enum": None,
        "history_status": "not_observed",
        "cleanup_complete": False,
    }


def observe_validator(original, report):
    def validate(name, arguments):
        arguments_object = type(arguments) is dict
        arguments_view = arguments if arguments_object else {}
        data = arguments_view.get("data")
        data_object = type(data) is dict
        data_view = data if data_object else {}
        schema = arguments_view.get("configuration_schema")
        schema_present = "configuration_schema" in arguments_view
        revision = data_view.get("expected_pc_revision")
        record = {
            "phase": "validate_call",
            "tool": safe_tool(name),
            "arguments_object": arguments_object,
            "configuration_schema_present": schema_present,
            "configuration_schema_valid": not schema_present
            or (type(schema) is int and schema in (1, 2)),
            "configuration_schema_explicit_2": type(schema) is int and schema == 2,
            "pc_id_present": "pc_id" in arguments_view,
            "pc_id_valid_uuid": uuid_syntax(arguments_view.get("pc_id")),
            "data_object": data_object,
            "revision_present": "expected_pc_revision" in data_view,
            "revision_valid_integer": type(revision) is int and revision >= 1,
            "passed": False,
            "exception_class": None,
        }
        try:
            value = original(name, arguments)
        except Exception as exc:
            record["exception_class"] = safe_exception(exc)["exception_class"]
            append_bounded(report["validations"], record)
            raise
        record["passed"] = True
        append_bounded(report["validations"], record)
        return value

    return validate


class ObservedBound:
    def __init__(self, original, report):
        self.original, self.report = original, report

    async def astream(self, *args, **kwargs):
        self.report["model_streams"] += 1
        ordinal = self.report["model_streams"]
        try:
            async for chunk in self.original.astream(*args, **kwargs):
                yield chunk
        except BaseException as exc:
            if isinstance(exc, (KeyboardInterrupt, SystemExit)):
                raise
            append_bounded(
                self.report["provider_errors"],
                {
                    "phase": "provider_astream",
                    "stream_ordinal": ordinal,
                    **safe_exception(exc),
                },
            )
            raise


class ObservedModel:
    def __init__(self, original, report):
        self.original, self.report = original, report

    def bind_tools(self, *args, **kwargs):
        try:
            bound = self.original.bind_tools(*args, **kwargs)
        except Exception as exc:
            append_bounded(
                self.report["provider_errors"],
                {"phase": "provider_bind_tools", **safe_exception(exc)},
            )
            raise
        return ObservedBound(bound, self.report)


def observe_factory(original, report, guard=None):
    def factory(*args, **kwargs):
        try:
            value = original(*args, **kwargs)
            if guard is not None:
                guard(value)
        except Exception as exc:
            append_bounded(
                report["provider_errors"],
                {"phase": "provider_factory", **safe_exception(exc)},
            )
            raise
        return ObservedModel(value, report)

    return factory


def observe_runner(original, report):
    async def run(*args, **kwargs):
        report["runner_state"] = "running"
        try:
            value = await original(*args, **kwargs)
        except BaseException as exc:
            if isinstance(exc, (KeyboardInterrupt, SystemExit)):
                raise
            record = {"phase": "runner", **safe_exception(exc), "tool_code": None}
            if isinstance(exc, graph.ToolFailure):
                code = exc.args[0] if exc.args else None
                record["tool_code"] = (
                    code
                    if type(code) is str and code in TOOL_CODES
                    else "other_tool_failure"
                )
            elif isinstance(exc, graph.RoundLimit):
                record["tool_code"] = "round_limit"
            report["runner"] = record
            report["runner_state"] = "failed"
            raise
        report["runner_state"] = "completed"
        return value

    return run


def count_sse(text, report):
    done_seen = False
    for frame in text.replace("\r\n", "\n").split("\n\n"):
        if not frame.strip() or frame.startswith(":"):
            continue
        kind, data_lines = None, []
        for line in frame.splitlines():
            if line.startswith("event:"):
                kind = line[6:].strip()
            elif line.startswith("data:"):
                data_lines.append(line[5:].lstrip())
        try:
            data = json.loads("\n".join(data_lines))
        except (ValueError, TypeError):
            report["events"]["invalid"] += 1
            continue
        if type(data) is not dict:
            report["events"]["invalid"] += 1
            continue
        events = report["events"]
        if kind == "start":
            events["start"] += 1
        elif kind == "delta":
            if type(data.get("text")) is str and bool(data["text"].strip()):
                events["nonempty_delta"] += 1
                events["delta_before_done"] += int(not done_seen)
        elif kind == "tool_status":
            name, status = data.get("name"), data.get("status")
            if safe_tool(name) != "other_tool" and status in (
                "running",
                "completed",
                "failed",
            ):
                report["tools"][name][status] += 1
            else:
                events["invalid"] += 1
        elif kind == "done":
            done_seen = True
            events["done"] += 1
            events["terminal_completed"] += int(data.get("status") == "completed")
        elif kind == "error":
            events["error"] += 1
            code = data.get("code")
            report["error_enum"] = (
                code if type(code) is str and code in SSE_CODES else "other_error"
            )
        elif kind != "citation":
            events["invalid"] += 1


def complete(report):
    events = report["events"]
    return (
        report["http_response_status"] == 200
        and events["start"] == 1
        and events["done"] == 1
        and events["terminal_completed"] == 1
        and events["error"] == 0
        and events["invalid"] == 0
        and events["nonempty_delta"] > 0
        and events["delta_before_done"] > 0
        and report["tools"]["get_pc"]["completed"] > 0
        and report["tools"]["evaluate_pc"]["completed"] > 0
        and report["history_status"] == "completed"
        and report["cleanup_complete"]
    )


def classify(report):
    if any(not item["passed"] for item in report["validations"]):
        return "tool_input_rejected"
    if report["provider_errors"]:
        return report["provider_errors"][-1]["phase"]
    if report["runner"] is not None:
        return "runner_failure"
    if "test_boundary_error" in report:
        return "test_boundary_failure"
    if "cleanup_error" in report:
        return "cleanup_failure"
    if report["http_response_status"] != 200:
        return "http_admission_or_transport_failure"
    if report["events"]["error"]:
        if report["runner_state"] == "completed":
            return "post_runner_persistence_or_stream_failure"
        return "unclassified_terminal_error"
    return "completed" if complete(report) else "completion_or_required_tool_missing"


def logging_safe():
    for name, logger in logging.Logger.manager.loggerDict.items():
        if isinstance(logger, logging.Logger) and name.startswith(LOG_PREFIXES):
            if logger.getEffectiveLevel() < logging.WARNING:
                return False
    return logging.getLogger().getEffectiveLevel() >= logging.WARNING


class DiagnosticGuardError(Exception):
    pass


def live_factory_guard(value):
    # Do not reconfigure SDK/logging. Refuse verbose model emission before streaming.
    if not logging_safe() or getattr(value, "verbose", False) is True:
        raise DiagnosticGuardError()


@pytest.fixture
def diagnostic_actors(request):
    if any(
        os.environ.get(key) != "1"
        for key in ("UJ_TEST_ASSISTANT_LIVE", "UJ_TEST_ASSISTANT_DIAGNOSTIC")
    ):
        pytest.fail(
            "diagnostic_requires_both_explicit_opt_ins_no_request_sent", pytrace=False
        )
    if request.config.getoption("showlocals", default=False) or not logging_safe():
        pytest.fail(
            "diagnostic_requires_no_locals_or_verbose_logging_no_request_sent",
            pytrace=False,
        )
    if any(
        os.environ.get(key, "").strip().lower() in {"1", "true", "yes", "on"}
        for key in ("LANGCHAIN_TRACING", "LANGCHAIN_TRACING_V2", "LANGSMITH_TRACING")
    ):
        pytest.fail("diagnostic_requires_tracing_off_no_request_sent", pytrace=False)
    message = os.environ.get("UJ_TEST_ASSISTANT_DIAGNOSTIC_MESSAGE", "")
    if not message.strip() or len(message) > 8000:
        pytest.fail(
            "diagnostic_requires_exact_ui_message_no_request_sent", pytrace=False
        )
    # Resolve real PG/session fixtures ONLY after non-billable opt-in guards.
    return request.getfixturevalue("assistant_actors")


def execute_live(actor, engine, monkeypatch, report):
    repository, tower_service = Repository(engine), None
    cid, tower_id = None, None
    phase = "setup"
    try:
        catalog = CatalogService(PostgresCatalogRepository(engine))
        tower_service = TowerService(
            TowerRepository(engine, catalog.repository.dataset_version), catalog
        )
        states = {category.value: "unknown" for category in Category}
        states["cpu"] = "present"
        tower = tower_service.create(
            actor[2],
            TowerCreate.model_validate(
                {
                    "schema_version": 2,
                    "name": "SYNTHETIC live diagnostic",
                    "category_status": states,
                    "lines": [
                        {"category": "cpu", "component_id": "P01", "quantity": 1}
                    ],
                    "context": {"bios_version": None, "notes": None},
                }
            ),
        )
        tower_id = tower.id
        cid = repository.create(actor[2], "SYNTHETIC one-turn diagnostic")["id"]
        real_model, real_validate, real_run = (
            graph.model,
            graph.validate_call,
            graph.run_turn,
        )
        monkeypatch.setattr(
            graph, "model", observe_factory(real_model, report, live_factory_guard)
        )
        monkeypatch.setattr(
            graph, "validate_call", observe_validator(real_validate, report)
        )
        observed = AssistantService(repository, runner=observe_runner(real_run, report))
        monkeypatch.setitem(
            app.dependency_overrides, assistant_api.service, lambda: observed
        )
        phase = "http_post"
        # No retry and no direct runner call: real cookie/CSRF/owner + PG admission.
        report["message_posts"] += 1
        response = actor[0].post(
            f"/api/conversations/{cid}/messages",
            headers=actor[1],
            json={
                "content": os.environ["UJ_TEST_ASSISTANT_DIAGNOSTIC_MESSAGE"],
                "client_request_id": str(uuid4()),
                "context": {
                    "context_version": 2,
                    "configuration_schema": 2,
                    "pc_id": str(tower.id),
                    "expected_pc_revision": tower.revision,
                },
            },
        )
        report["http_response_status"] = response.status_code
        if response.status_code == 200:
            phase = "sse_parse"
            count_sse(response.text, report)
        phase = "history_read"
        history = repository.page(actor[2], 1, 20, cid)
        for row in history["items"]:
            if row["role"] == "assistant":
                status = row["status"]
                report["history_status"] = (
                    status
                    if status in {"completed", "failed", "interrupted", "pending"}
                    else "other_status"
                )
    except BaseException as exc:
        if isinstance(exc, (KeyboardInterrupt, SystemExit)):
            raise
        report["test_boundary_error"] = {"phase": phase, **safe_exception(exc)}
    finally:
        try:
            if cid is not None:
                for row in repository.page(actor[2], 1, 20, cid)["items"]:
                    if row["role"] == "assistant":
                        if row["status"] == "pending":
                            repository.interrupt_pending(
                                actor[2],
                                cid,
                                row["id"],
                                row["content"],
                                row["citations"],
                            )
                        repository.release_provider(actor[2], row["id"])
                repository.delete(actor[2], cid)
            if tower_id is not None:
                tower_service.delete(actor[2], tower_id)
            report["cleanup_complete"] = True
        except Exception as exc:
            report["cleanup_error"] = safe_exception(exc)


def test_live_tower_assistant_one_admitted_diagnostic(
    diagnostic_actors, pg_engine, monkeypatch, caplog
):
    report = new_report()
    execute_live(diagnostic_actors[0], pg_engine, monkeypatch, report)
    report["classification"] = classify(report)
    # Helpers returned: no response, arguments, SDK exception or IDs in fail locals.
    caplog.clear()
    safe = json.dumps(report, sort_keys=True, allow_nan=False)
    print("ASSISTANT_LIVE_DIAGNOSTIC " + safe)
    if not complete(report):
        pytest.fail(safe, pytrace=False)


def test_validator_observer_preserves_result_and_records_only_closed_metadata():
    report = new_report()
    original = graph.validate_call
    wrapped = observe_validator(original, report)
    arguments = {
        "pc_id": str(UUID(int=1)),
        "configuration_schema": 2,
        "data": {"expected_pc_revision": 1},
    }
    assert wrapped("evaluate_pc", arguments) == original("evaluate_pc", arguments)
    with pytest.raises(ValueError):
        wrapped("evaluate_pc", {**arguments, "configuration_schema": "PRIVATE-SCHEMA"})
    encoded = json.dumps(report)
    if "PRIVATE" in encoded or arguments["pc_id"] in encoded:
        pytest.fail("diagnostic_wrapper_leaked_synthetic_marker", pytrace=False)
    assert report["validations"][0]["passed"]
    assert not report["validations"][1]["passed"]
    assert classify(report) == "tool_input_rejected"


def test_model_observer_forwards_schemas_messages_chunks_and_safe_http_status():
    report, schemas, messages, chunk = new_report(), object(), object(), object()

    class SyntheticStatusError(Exception):
        status_code = 413

        def __str__(self):
            raise AssertionError("Observer must not read exception text")

    class PureBound:
        async def astream(self, received):
            assert received is messages
            yield chunk
            raise SyntheticStatusError()

    class PureModel:
        def bind_tools(self, received):
            assert received is schemas
            return PureBound()

    async def probe():
        bound = observe_factory(lambda: PureModel(), report)().bind_tools(schemas)
        seen = []
        with pytest.raises(SyntheticStatusError):
            async for item in bound.astream(messages):
                seen.append(item)
        assert seen == [chunk]

    asyncio.run(probe())
    assert report["model_streams"] == 1
    assert report["provider_errors"] == [
        {
            "phase": "provider_astream",
            "stream_ordinal": 1,
            "exception_class": "other_exception",
            "http_status": 413,
            "http_413": True,
            "http_429": False,
            "body_type_known": "none",
            "provider_error_code": None,
            "provider_error_type": None,
        }
    ]


def test_runner_and_sse_diagnostics_never_echo_private_message_ids_or_errors():
    report = new_report()

    async def fail(*args):
        raise graph.ToolFailure("PRIVATE-ERROR-MESSAGE")

    async def probe():
        with pytest.raises(graph.ToolFailure):
            await observe_runner(fail, report)()

    asyncio.run(probe())
    count_sse(
        'event: start\ndata: {"message_id":"PRIVATE-ID"}\n\n'
        'event: delta\ndata: {"text":"PRIVATE-CONTENT"}\n\n'
        'event: error\ndata: {"code":"generation_failed","message":"PRIVATE"}\n\n',
        report,
    )
    if "PRIVATE" in json.dumps(report):
        pytest.fail("diagnostic_wrapper_leaked_synthetic_marker", pytrace=False)
    assert report["runner"]["tool_code"] == "other_tool_failure"
    assert report["events"]["nonempty_delta"] == 1
    assert report["error_enum"] == "generation_failed"


class SyntheticAPIError(Exception):
    def __init__(self, body):
        self.args = ()
        self.body = body

    @property
    def message(self):
        raise AssertionError("Diagnostic must not access message")

    def __str__(self):
        raise AssertionError("Diagnostic must not stringify SDK exception")

    def __repr__(self):
        raise AssertionError("Diagnostic must not represent SDK exception")


class PrivateOpaquePayload:
    def __str__(self):
        raise AssertionError("Diagnostic must not stringify opaque payload")

    def __repr__(self):
        raise AssertionError("Diagnostic must not represent opaque payload")


@pytest.mark.parametrize("nested", [False, True])
def test_stream_api_error_body_allowlists_without_messages_or_failed_generation(nested):
    private_id = str(UUID(int=1))
    fields = {
        "code": "tool_use_failed",
        "type": "invalid_request_error",
        "message": "PRIVATE-MESSAGE",
        "failed_generation": {
            "operator_arguments": {"pc_id": private_id, "prompt": "PRIVATE-PROMPT"},
            "opaque": PrivateOpaquePayload(),
        },
    }
    body = {"error": fields, "request_url": "PRIVATE-URL"} if nested else fields
    metadata = safe_exception(SyntheticAPIError(body))
    encoded = json.dumps(metadata, allow_nan=False)
    if "PRIVATE" in encoded or private_id in encoded:
        pytest.fail("diagnostic_wrapper_leaked_synthetic_marker", pytrace=False)
    assert metadata == {
        "exception_class": "other_exception",
        "http_status": None,
        "http_413": False,
        "http_429": False,
        "body_type_known": "dict",
        "provider_error_code": "tool_use_failed",
        "provider_error_type": "invalid_request_error",
    }


def test_unknown_provider_code_and_type_are_closed_not_echoed():
    metadata = safe_exception(
        SyntheticAPIError(
            {
                "error": {
                    "code": "PRIVATE-CODE",
                    "type": "PRIVATE-TYPE",
                    "message": "PRIVATE-MESSAGE",
                    "failed_generation": PrivateOpaquePayload(),
                    "error": {"code": "insufficient_quota"},
                },
                "code": "rate_limit_exceeded",
            }
        )
    )
    if "PRIVATE" in json.dumps(metadata, allow_nan=False):
        pytest.fail("diagnostic_wrapper_leaked_synthetic_marker", pytrace=False)
    assert metadata["provider_error_code"] == "other_error_code"
    assert metadata["provider_error_type"] == "other_error_type"
    assert metadata["http_status"] is None


@pytest.mark.parametrize("kind", ["none", "list", "str", "other"])
def test_unknown_body_shapes_never_parse_or_stringify(kind):
    bodies = {
        "none": None,
        "list": [PrivateOpaquePayload()],
        "str": 'PRIVATE {"code":"insufficient_quota"}',
        "other": PrivateOpaquePayload(),
    }
    metadata = safe_exception(SyntheticAPIError(bodies[kind]))
    if "PRIVATE" in json.dumps(metadata, allow_nan=False):
        pytest.fail("diagnostic_wrapper_leaked_synthetic_marker", pytrace=False)
    assert metadata["body_type_known"] == kind
    assert metadata["provider_error_code"] is None
    assert metadata["provider_error_type"] is None
    assert metadata["http_status"] is None
