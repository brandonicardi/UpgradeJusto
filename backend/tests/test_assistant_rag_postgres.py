"""Real fixed encoder → PG vectors → reproducible public citations.

Build must provide the normalized manifest and real migration before this gate.
Missing manifest is a failed gate, not a lexical or mocked substitute.
"""

from pathlib import Path
from types import SimpleNamespace

import pytest
import sqlalchemy as sa

from upgradejusto.assistant import reference_doc
from upgradejusto.assistant.ingest import extract, ingest
from upgradejusto.assistant.rag import CORPUS_HASH, config, manifest_from_corpus, search
from upgradejusto.assistant.tables import chunks


def test_real_ingestion_idempotence_and_vector_citation(pg_engine):
    manifest = config()
    processed = ingest(pg_engine, manifest)
    source = manifest.sources[0]
    condition = sa.and_(
        chunks.c.source_id == source.source_id, chunks.c.revision == source.sha256
    )
    with pg_engine.connect() as conn:
        first = conn.scalar(
            sa.select(sa.func.count()).select_from(chunks).where(condition)
        )
        dimensions = conn.scalars(
            sa.select(sa.func.vector_dims(chunks.c.embedding)).where(condition)
        ).all()
    assert processed == first and first > 0
    assert set(dimensions) == {384}
    assert ingest(pg_engine, manifest) == processed
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(sa.select(sa.func.count()).select_from(chunks).where(condition))
            == first
        )
    found = search(pg_engine, "Kingston DDR4 KVR32N22S8/8 memory specifications", 5)
    assert 1 <= len(found) <= 5
    assert found[0]["source_id"] == source.source_id
    for citation in found:
        if citation["source_id"] == source.source_id:
            assert citation["url"] == source.url
            assert citation["revision"] == source.sha256
            assert citation["scope"] == "exact"
            assert citation["locator"].startswith("page:")
        else:  # the generated general document may share the table
            assert citation["scope"] == "general"
        assert citation["excerpt"]
    with pytest.raises(ValueError):
        search(pg_engine, "x", 6)


def test_hash_change_aborts_before_embedding_or_pg():
    source = SimpleNamespace(byte_length=149893, sha256=CORPUS_HASH)
    with pytest.raises(ValueError, match="hash mismatch"):
        extract(source, b"%PDF-not-the-approved-revision")


def _activate(monkeypatch, tmp_path, manifest):
    path = tmp_path / "manifest.json"
    path.write_text(manifest.model_dump_json(), encoding="utf-8")
    monkeypatch.setenv("UJ_ASSISTANT_RAG_CONFIG", str(path))


def test_active_pairs_add_retire_replace_and_reingest(pg_engine, tmp_path, monkeypatch):
    root = Path(__file__).resolve().parents[2]
    full = manifest_from_corpus(root, 0.55)
    both = full.model_copy(update={"sources": full.sources[:2]})
    one = full.model_copy(update={"sources": full.sources[:1]})
    replaced = full.model_copy(
        update={
            "sources": [
                full.sources[0],
                full.sources[1].model_copy(update={"sha256": "0" * 64}),
            ]
        }
    )
    ask = "Kingston KVR32N22D8/16 memory specifications"
    first = ingest(pg_engine, both)
    assert ingest(pg_engine, both) == first  # reingestion stays idempotent
    reference_doc.ingest(pg_engine, both)

    _activate(monkeypatch, tmp_path, both)
    sources = {c["source_id"] for c in search(pg_engine, ask, 5)}
    assert "kingston-kvr32n22d8-16" in sources
    other = {c["source_id"] for c in search(pg_engine, "KVR32N22S8/8 voltage", 5)}
    assert (
        "kingston-kvr32n22s8-8" in other
    )  # adding a source does not replace the first

    for manifest in (one, replaced):  # retired, then replaced by another revision
        _activate(monkeypatch, tmp_path, manifest)
        found = search(pg_engine, ask, 5)
        assert "kingston-kvr32n22d8-16" not in {c["source_id"] for c in found}
        assert {c["scope"] for c in found} <= {"general"}
    general = search(pg_engine, "¿Cómo saber si la memoria sirve en la placa?", 3)
    assert general and {c["source_id"] for c in general} == {"conocimiento-hardware"}
