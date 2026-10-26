"""Replay the explicit calibrated positive/no-hit cases through real pgvector SQL."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from upgradejusto.assistant.rag import config, search  # noqa: E402
from upgradejusto.persistence.runtime import runtime_engine  # noqa: E402


def main():
    manifest = config()
    evidence = ROOT / ".local/evidence/sprint32/rag-calibration.json"
    if (
        manifest.calibration_evidence
        != "sha256:" + hashlib.sha256(evidence.read_bytes()).hexdigest()
    ):
        raise ValueError("Calibration evidence changed; prepare again explicitly")
    cases = json.loads(evidence.read_text(encoding="utf-8"))["queries"]
    for case in cases:
        found = search(runtime_engine(), case["query"], 5)
        if bool(found) != case["expected_relevant"]:
            raise ValueError("Calibrated pgvector positive/no-hit gate failed")
    print(
        f"Real pgvector SQL calibrated retrieval: {len(cases)}/{len(cases)}; limited explicit set only"
    )


if __name__ == "__main__":
    main()
