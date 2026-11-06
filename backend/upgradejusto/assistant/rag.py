"""Public-only pgvector retrieval; encoder pin/config must be supplied by Build.

UJ_ASSISTANT_RAG_CONFIG points to a server-curated normalized JSON manifest.
It is deliberately not inferred from inaccessible Build manifests. No lexical,
random, remote-model or unpinned fallback. Threshold needs recorded calibration.
"""

import hashlib
import math
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Annotated
from urllib.parse import urlsplit

import sqlalchemy as sa
from fastembed import TextEmbedding
from pydantic import BaseModel, ConfigDict, Field

from .tables import chunks

# A small encoder blurs "B550" and "LGA1200": a named part ranks its own text first.
HARDWARE_TERM = re.compile(
    r"\b(?:[ABHXZ]\d{3}E?|(?:RTX|GTX) ?\d{3,4}(?: ?Ti)?|RX ?\d{3,4}(?: ?XTX?)?"
    r"|AM[45]|LGA ?\d{4}|DDR[345])\b",
    re.IGNORECASE,
)
REVISION = "faf4aa4225822f3bc6376869cb1164e8e3feedd0"
CORPUS_HASH = "b2a2357e5f8d805aa5a2113fbdf9f0d28b97e6a23238b05b57990a988b8345b1"


class Closed(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Encoder(Closed):
    model_name: str
    revision: str
    model_path: str
    files_sha256: dict[str, str]


class Source(Closed):
    source_id: str
    url: str
    title: str
    scope: str
    accessed_at: str
    terms: str
    sha256: str
    byte_length: Annotated[int, Field(ge=1, le=10000000)]
    page_count: Annotated[int, Field(ge=1, le=20)]
    local_pdf: str


class Manifest(Closed):
    encoder: Encoder
    sources: Annotated[list[Source], Field(min_length=1, max_length=1)]
    max_cosine_distance: Annotated[float, Field(ge=0, le=2)]
    calibration_evidence: Annotated[str, Field(min_length=1)]


def config(path=None):
    name = path or os.environ.get("UJ_ASSISTANT_RAG_CONFIG")
    if not name:
        raise ValueError("RAG manifest integration pending")
    raw = Path(name).read_bytes()
    if len(raw) > 100000:
        raise ValueError("Manifest exceeds limit")
    result = Manifest.model_validate_json(raw)
    if result.encoder.revision != REVISION or not result.encoder.files_sha256:
        raise ValueError("Unverified encoder revision")
    for source in result.sources:
        parsed = urlsplit(source.url)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.fragment
        ):
            raise ValueError("Invalid canonical URL")
        if (
            source.sha256 != CORPUS_HASH
            or source.byte_length != 149893
            or source.page_count != 2
        ):
            raise ValueError("Corpus revision not authorized")
        if not all(
            (
                source.source_id,
                source.title,
                source.scope,
                source.accessed_at,
                source.terms,
            )
        ):
            raise ValueError("Missing public provenance")
    return result


@lru_cache(maxsize=1)
def load_encoder(serialized):
    pin = Encoder.model_validate_json(serialized)
    root = Path(pin.model_path).resolve(strict=True)
    for relative, digest in pin.files_sha256.items():
        file = (root / relative).resolve(strict=True)
        if not file.is_relative_to(root) or not file.is_file():
            raise ValueError("Unsafe encoder file")
        if hashlib.sha256(file.read_bytes()).hexdigest() != digest:
            raise ValueError("Encoder hash mismatch")
    return TextEmbedding(
        model_name=pin.model_name,
        specific_model_path=str(root),
        local_files_only=True,
        threads=2,
    )


def embed(manifest, texts):
    encoder = load_encoder(manifest.encoder.model_dump_json())
    vectors = [list(map(float, vector)) for vector in encoder.embed(texts)]
    if len(vectors) != len(texts) or any(
        len(v) != 384 or not all(math.isfinite(x) for x in v) or not any(v)
        for v in vectors
    ):
        raise ValueError("Invalid real encoder output")
    return vectors


def exact_first(query):
    terms = dict.fromkeys(match.upper() for match in HARDWARE_TERM.findall(query))
    if not terms:
        return sa.literal(0)
    named = sa.or_(*(chunks.c.content.ilike(f"%{term}%") for term in terms))
    return sa.case((named, 0), else_=1)


def search(engine, query, top_k=3):
    if (
        not isinstance(query, str)
        or not 1 <= len(query.strip()) <= 500
        or not 1 <= top_k <= 5
    ):
        raise ValueError("Invalid search")
    manifest = config()
    vector = embed(manifest, [query])[0]
    distance = chunks.c.embedding.cosine_distance(vector)
    source = manifest.sources[0]
    # Imported here: reference_doc needs this module to embed its own rows.
    from .reference_doc import SOURCE_ID, revision

    with engine.connect() as conn:
        rows = (
            conn.execute(
                sa.select(chunks)
                .where(
                    sa.or_(
                        sa.and_(
                            chunks.c.revision == source.sha256,
                            chunks.c.source_id == source.source_id,
                        ),
                        sa.and_(
                            chunks.c.revision == revision(),
                            chunks.c.source_id == SOURCE_ID,
                        ),
                    ),
                    chunks.c.encoder_revision == manifest.encoder.revision,
                    distance <= manifest.max_cosine_distance,
                )
                .order_by(exact_first(query), distance, chunks.c.id)
                .limit(top_k)
            )
            .mappings()
            .all()
        )
    return [
        {
            "source_id": r["source_id"],
            "url": r["url"],
            "title": r["title"],
            "locator": r["locator"],
            "excerpt": r["content"],
            "revision": r["revision"],
        }
        for r in rows
    ]
