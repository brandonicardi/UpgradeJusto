"""Multi-source manifest validation (no database, no encoder)."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from upgradejusto.assistant.rag import (
    CORPUS_HASH,
    LEGACY_SOURCE_ID,
    MAX_TOTAL_BYTES,
    config,
    manifest_from_corpus,
)

ROOT = Path(__file__).resolve().parents[2]


def build(tmp_path, mutate=None):
    manifest = json.loads(manifest_from_corpus(ROOT, 0.5, tmp_path).model_dump_json())
    if mutate:
        mutate(manifest)
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(manifest), encoding="utf-8")
    return path


def test_corpus_manifest_has_nine_sources(tmp_path):
    result = config(build(tmp_path))
    assert len(result.sources) == 9
    assert len({s.sha256 for s in result.sources}) == 9


def test_duplicate_identities_are_rejected(tmp_path):
    def same_id(m):
        m["sources"][1]["source_id"] = m["sources"][0]["source_id"]

    def same_model(m):
        m["sources"][1]["models"] = list(m["sources"][0]["models"])

    for mutate in (same_id, same_model):
        with pytest.raises(ValueError, match="Duplicate"):
            config(build(tmp_path, mutate))


def test_per_source_hash_and_limits(tmp_path):
    def bad_hash(m):
        m["sources"][0]["sha256"] = "zz"

    def too_many_pages(m):
        m["sources"][0]["page_count"] = 10000

    for mutate in (bad_hash, too_many_pages):
        with pytest.raises(ValidationError):
            config(build(tmp_path, mutate))

    def too_big(m):
        for source in m["sources"]:
            source["byte_length"] = MAX_TOTAL_BYTES // 8

    with pytest.raises(ValueError, match="size limit"):
        config(build(tmp_path, too_big))


def test_specific_source_needs_model_identity(tmp_path):
    def no_models(m):
        m["sources"][0]["models"] = []

    with pytest.raises(ValueError, match="model identity"):
        config(build(tmp_path, no_models))


def test_legacy_kingston_manifest_is_normalized(tmp_path):
    def legacy(m):
        m["sources"] = [
            {
                k: v
                for k, v in m["sources"][0].items()
                if k not in ("category", "scope_type", "models", "aliases")
            }
        ]
        assert m["sources"][0]["source_id"] == LEGACY_SOURCE_ID
        assert m["sources"][0]["sha256"] == CORPUS_HASH

    result = config(build(tmp_path, legacy))
    assert result.sources[0].models == ["KVR32N22S8/8"]
    assert result.sources[0].scope_type == "exact"
