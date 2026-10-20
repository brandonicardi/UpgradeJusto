"""Ejemplos documentales reales separados de los límites sintéticos."""

import json
import subprocess
import sys

from upgradejusto.compatibility.evaluation import evaluate
from upgradejusto.compatibility.examples import demo_examples


def test_real_s08_and_s10_and_explicit_derived_omission():
    s08, s10, derived = demo_examples()
    cable = evaluate(s08.configuration)
    length = evaluate(s10.configuration)
    omitted = evaluate(derived.configuration)
    assert (s08.example_id, s10.example_id) == ("S08", "S10")
    assert cable.verdict == length.verdict == "incompatible"
    assert cable.coverage.failed == ("R06.ramales_adaptador",)
    assert length.coverage.failed == ("R04.largo",)
    rule = next(r for r in length.rule_results if r.rule_id == "R04.largo")
    assert {f.name: f.value for f in rule.facts}["excess_mm"] == 14
    assert {r.source_id for r in rule.evidence} == {"F08", "F13"}
    cable_rule = next(
        r for r in cable.rule_results if r.rule_id == "R06.ramales_adaptador"
    )
    assert {r.source_id for r in cable_rule.evidence} == {"F07", "F09", "F19"}
    assert derived.kind == "derived_omission"
    assert omitted.verdict == "requiere_verificacion"
    assert not omitted.coverage.failed
    assert "gpu_length.gpu_length.value" in omitted.missing_fields
    for output in (cable, length, omitted):
        assert not output.coverage.complete
        assert "R05" in output.coverage.not_implemented
        assert output.data_revision == "hardware-demo-25.1/extract-28.1"


def test_demo_runner_emits_json_using_the_public_evaluator():
    run = subprocess.run(
        [sys.executable, "-m", "upgradejusto.compatibility.demo"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=15,
    )
    payload = json.loads(run.stdout)
    assert len(payload) == 3
    for emitted, example in zip(payload, demo_examples(), strict=True):
        assert emitted["example_id"] == example.example_id
        assert emitted["kind"] == example.kind
        assert emitted["evaluation"] == evaluate(example.configuration).model_dump(
            mode="json"
        )
