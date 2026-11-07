"""Twelve Spanish questions against the real corpus, real encoder and PostgreSQL.

Criterion (spec): at least 7/8 answerable questions retrieve the expected
source+page in the top 5, and 4/4 negative controls attribute nothing specific.
Needs `.local/rag-corpus/` PDFs and the pinned encoder; a missing input fails.
"""

import json
import time
from pathlib import Path

import pytest

from upgradejusto.assistant import reference_doc
from upgradejusto.assistant.ingest import ingest
from upgradejusto.assistant.rag import manifest_from_corpus, search

ROOT = Path(__file__).resolve().parents[2]
CASES = json.loads(
    (Path(__file__).parent / "fixtures/rag_hardware_cases.json").read_text("utf-8")
)["cases"]
# Fixed before evaluating: best positive chunk distance observed was 0.40.
THRESHOLD = 0.55


@pytest.fixture(scope="module")
def corpus(pg_engine, tmp_path_factory):
    manifest = manifest_from_corpus(ROOT, THRESHOLD)
    path = tmp_path_factory.mktemp("rag") / "manifest.json"
    path.write_text(manifest.model_dump_json(), encoding="utf-8")
    mp = pytest.MonkeyPatch()
    mp.setenv("UJ_ASSISTANT_RAG_CONFIG", str(path))
    ingest(pg_engine, manifest)
    reference_doc.ingest(pg_engine, manifest)
    yield manifest
    mp.undo()


def test_twelve_cases(pg_engine, corpus, capsys):
    positives = hits = negatives = clean = 0
    report = []
    for case in CASES:
        expected = case["expected"]
        started = time.perf_counter()
        found = search(pg_engine, case["question"], 5)
        millis = round((time.perf_counter() - started) * 1000)
        if case["kind"] == "answerable":
            positives += 1
            wanted = {
                (s["source_id"], f"page:{s['page']};") for s in expected["sources"]
            }
            ok = any(
                (c["source_id"], c["locator"].split("chars")[0]) in wanted
                for c in found
            )
            hits += ok
        else:
            negatives += 1
            tempting = set(case["expected"].get("tempting_source_ids", ()))
            tempting |= {c["source_id"] for c in found if c["scope"] != "general"}
            ok = not tempting & {c["source_id"] for c in found}
            clean += ok
        report.append(
            f"{case['id']:32} {case['kind']:10} ok={ok} {millis}ms "
            + ",".join(f"{c['source_id']}:{c['locator'].split(';')[0]}" for c in found)
        )
    with capsys.disabled():
        print("\n" + "\n".join(report))
        print(f"positives {hits}/{positives}, negatives {clean}/{negatives}")
    assert (positives, negatives) == (8, 4)
    assert hits >= 7
    assert clean == 4
