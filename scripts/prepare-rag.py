"""Normalize public manifests and calibrate a small, explicit real-vector test set.

Does not connect to PG or claim universal relevance. Full PDFs/model remain local.
"""

import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from upgradejusto.assistant.ingest import download, extract  # noqa: E402
from upgradejusto.assistant.rag import Manifest, embed  # noqa: E402


def main():
    pin = json.loads((ROOT / "tools/embeddings-model.json").read_text())
    source = json.loads((ROOT / "tools/public-corpus.json").read_text())["documents"][0]
    pdf = ROOT / ".local/corpus" / source["id"] / "source.pdf"
    normalized = {
        "encoder": {
            "model_name": pin["model"],
            "revision": pin["revision"],
            "model_path": str(ROOT / ".local/models" / pin["revision"]),
            "files_sha256": pin["files"],
        },
        "sources": [
            {
                "source_id": source["id"],
                "url": source["url"],
                "title": source["title"],
                "scope": source["scope"],
                "accessed_at": source["consulted_date"],
                "terms": source["rights"],
                "sha256": source["sha256"],
                "byte_length": 149893,
                "page_count": 2,
                "local_pdf": str(pdf),
            }
        ],
        "max_cosine_distance": 2.0,
        "calibration_evidence": "Preparation only; not used as retrieval threshold",
    }
    manifest = Manifest.model_validate(normalized)
    if not pdf.is_file():
        data = download(manifest.sources[0])
        # Hash and parse before persisting a public source.
        extract(manifest.sources[0], data)
        pdf.parent.mkdir(parents=True, exist_ok=True)
        pdf.write_bytes(data)
    rows = extract(manifest.sources[0], pdf.read_bytes())
    relevant = [
        "Kingston KVR32N22S8/8 memoria DDR4 capacidad y voltaje",
        "What voltage and capacity does KVR32N22S8/8 DDR4 memory have?",
        "DDR4 3200 CL22 8GB memoria especificaciones",
    ]
    irrelevant = [
        "Cómo cocinar una pizza con harina y tomate",
        "Pronóstico de lluvia para mañana en Buenos Aires",
        "Receta de pastel de chocolate para cumpleaños",
        "Fuente Corsair RM750e corriente máxima salida de 12 voltios",
        "Socket CPU AMD Ryzen 5 5600 BIOS ASRock B550M Pro4",
        "Fractal Define 7 Compact longitud máxima de tarjeta gráfica",
    ]
    docs = np.array(embed(manifest, [row["content"] for row in rows]))
    questions = np.array(embed(manifest, relevant + irrelevant))
    distances = 1 - questions @ docs.T / (
        np.linalg.norm(questions, axis=1)[:, None]
        * np.linalg.norm(docs, axis=1)[None, :]
    )
    nearest = distances.min(axis=1)
    high_relevant, low_irrelevant = (
        float(max(nearest[: len(relevant)])),
        float(min(nearest[len(relevant) :])),
    )
    if high_relevant >= low_irrelevant:
        raise ValueError("Calibration sets overlap; no threshold approved")
    threshold = (high_relevant + low_irrelevant) / 2
    report = {
        "encoder_revision": pin["revision"],
        "corpus_sha256": source["sha256"],
        "queries": [
            {
                "query": query,
                "expected_relevant": i < len(relevant),
                "nearest_cosine_distance": float(nearest[i]),
            }
            for i, query in enumerate(relevant + irrelevant)
        ],
        "threshold": threshold,
        "policy": "Midpoint separating this explicit small bilingual positive/negative set; not a guarantee for arbitrary queries",
        "chunks": len(rows),
        "dimension": int(docs.shape[1]),
    }
    evidence = ROOT / ".local/evidence/sprint32/rag-calibration.json"
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(json.dumps(report, indent=2), encoding="utf-8")
    normalized["max_cosine_distance"] = threshold
    normalized["calibration_evidence"] = (
        "sha256:" + hashlib.sha256(evidence.read_bytes()).hexdigest()
    )
    target = ROOT / ".local/assistant-rag.json"
    target.write_text(json.dumps(normalized, indent=2), encoding="utf-8")
    print(
        f"Real bilingual RAG calibration: chunks={len(rows)}, dimension=384, separated={len(relevant) + len(irrelevant)}/{len(relevant) + len(irrelevant)}; manifest local"
    )
    print(
        f"TLS trust mode: {os.environ.get('UJ_TLS_TRUST', 'certifi')}; no PG ingestion claimed"
    )


if __name__ == "__main__":
    main()
