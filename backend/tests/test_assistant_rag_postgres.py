"""Real fixed encoder → PG vectors → reproducible public citations.

Build must provide the normalized manifest and real migration before this gate.
Missing manifest is a failed gate, not a lexical or mocked substitute.
"""

from types import SimpleNamespace

import pytest
import sqlalchemy as sa

from upgradejusto.assistant.ingest import extract, ingest
from upgradejusto.assistant.rag import CORPUS_HASH, config, search
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
    for citation in found:
        assert citation["url"] == source.url
        assert citation["revision"] == source.sha256
        assert citation["locator"].startswith("page:")
        assert citation["excerpt"]
    with pytest.raises(ValueError):
        search(pg_engine, "x", 6)


def test_hash_change_aborts_before_embedding_or_pg():
    source = SimpleNamespace(byte_length=149893, sha256=CORPUS_HASH)
    with pytest.raises(ValueError, match="hash mismatch"):
        extract(source, b"%PDF-not-the-approved-revision")
