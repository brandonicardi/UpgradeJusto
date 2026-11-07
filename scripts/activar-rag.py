"""Build the multi-source manifest from versioned metadata and leave it for ingestion.

Uso: python scripts/activar-rag.py, luego
python -m upgradejusto.assistant.ingest --config .local/assistant-rag.json
"""

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from upgradejusto.assistant.rag import manifest_from_corpus  # noqa: E402

THRESHOLD = 0.55


def main():
    target = ROOT / ".local/assistant-rag.json"
    manifest = manifest_from_corpus(ROOT, THRESHOLD)
    if target.exists():
        shutil.copy(target, target.with_suffix(".json.antes"))
    target.write_text(manifest.model_dump_json(), encoding="utf-8")
    print(f"sources={len(manifest.sources)}")


if __name__ == "__main__":
    main()
