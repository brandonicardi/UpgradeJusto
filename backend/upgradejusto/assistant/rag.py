"""Public-only pgvector retrieval; encoder pin/config must be supplied by Build.

UJ_ASSISTANT_RAG_CONFIG points to a server-curated normalized JSON manifest.
It is deliberately not inferred from inaccessible Build manifests. No lexical,
random, remote-model or unpinned fallback. Threshold needs recorded calibration.
"""

import hashlib
import json
import math
import os
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal
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
# Legacy single-source manifest (Kingston KVR32N22S8/8) is normalized explicitly.
CORPUS_HASH = "b2a2357e5f8d805aa5a2113fbdf9f0d28b97e6a23238b05b57990a988b8345b1"
LEGACY_SOURCE_ID = "kingston-kvr32n22s8-8"
# Explicit ingestion limits, sized for the selected manuals (largest: 94 pages,
# ~145k chars); a file or manifest beyond these is rejected, never truncated.
MAX_PAGES = 150
MAX_CHUNKS_PER_SOURCE = 400
MAX_SOURCE_BYTES = 10_000_000
MAX_TOTAL_BYTES = 40_000_000
MAX_SOURCES = 20
SCOPE_TYPES = ("exact", "family", "general")


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
    sha256: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]
    byte_length: Annotated[int, Field(ge=1, le=MAX_SOURCE_BYTES)]
    page_count: Annotated[int, Field(ge=1, le=MAX_PAGES)]
    local_pdf: str
    category: str = ""
    scope_type: Literal["exact", "family", "general"] = "exact"
    models: list[str] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)


class Manifest(Closed):
    encoder: Encoder
    sources: Annotated[list[Source], Field(min_length=1, max_length=MAX_SOURCES)]
    max_cosine_distance: Annotated[float, Field(ge=0, le=2)]
    calibration_evidence: Annotated[str, Field(min_length=1)]


def normalize(raw):
    """Old manifests carried no identity metadata: Kingston gets it explicitly."""
    for source in raw.get("sources", ()) if isinstance(raw, dict) else ():
        if (
            isinstance(source, dict)
            and source.get("source_id") == LEGACY_SOURCE_ID
            and "models" not in source
        ):
            source["models"] = ["KVR32N22S8/8"]
            source.setdefault("category", "memory")
            source.setdefault("scope_type", "exact")
    return raw


def config(path=None):
    name = path or os.environ.get("UJ_ASSISTANT_RAG_CONFIG")
    if not name:
        raise ValueError("RAG manifest integration pending")
    raw = Path(name).read_bytes()
    if len(raw) > 200000:
        raise ValueError("Manifest exceeds limit")
    result = Manifest.model_validate(normalize(json.loads(raw)))
    return validate(result)


def validate(result):
    if result.encoder.revision != REVISION or not result.encoder.files_sha256:
        raise ValueError("Unverified encoder revision")
    if sum(s.byte_length for s in result.sources) > MAX_TOTAL_BYTES:
        raise ValueError("Manifest total size limit")
    ids = [s.source_id for s in result.sources]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate source identity")
    urls = [s.url for s in result.sources]
    if len(set(urls)) != len(urls):
        raise ValueError("Duplicate source URL")
    seen = {}
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
        if source.scope_type != "general" and not source.models:
            raise ValueError("Specific source needs model identity")
        if source.scope_type == "exact":
            for name in source.models:
                key = tuple(tokens(name))
                if (
                    not key
                    or seen.setdefault(key, source.source_id) != source.source_id
                ):
                    raise ValueError("Duplicate model identity")
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


BRANDS = {
    "asrock", "msi", "nvidia", "geforce", "kingston", "valueram", "asus",
    "corsair", "fractal", "amd",
}  # fmt: skip
# A token right after a model name that makes it a different variant ("Pro4 SE").
VARIANT_SUFFIXES = {
    "se", "ti", "super", "xt", "xtx", "plus", "lite", "wifi", "ax", "ac", "oc",
}  # fmt: skip
# Manufacturer documents are not sources of prices or game performance.
OUT_OF_SCOPE = re.compile(
    r"\b(?:precios?|cuesta|cuestan|costo|pesos|d[oó]lares|ars|usd|fps|benchmarks?"
    r"|cuadros por segundo)\b",
    re.IGNORECASE,
)
NEGATED = re.compile(
    r"\([^)]*\bno\b[^)]*\)|,\s*no\s+(?:es\s+)?(?:el|la|los|las)\b[^?.;]*",
    re.IGNORECASE,
)


# Curated Spanish -> English hardware terms: the manuals are English and the small
# multilingual encoder aligns them weakly. Added to the embedded text only.
GLOSSARY = {
    "red": "network LAN ethernet",
    "garantia": "warranty",
    "video": "video display graphics output",
    "pantalla": "display output",
    "salidas": "outputs ports",
    "puertos": "ports connectors",
    "velocidad": "speed",
    "controlador": "controller",
    "memoria": "memory",
    "capacidad": "capacity",
    "maxima": "maximum",
    "maximo": "maximum",
    "consumo": "power consumption",
    "longitud": "length",
    "gabinete": "case",
    "grafica": "graphics card GPU",
    "fuente": "power supply PSU",
    "recomendada": "recommended",
    "latencia": "latency CL",
    "voltaje": "voltage",
    "ranuras": "slots",
    "almacenamiento": "storage",
    "procesador": "CPU processor",
    "placa": "motherboard",
}


def expand(query):
    extra = dict.fromkeys(GLOSSARY[word] for word in tokens(query) if word in GLOSSARY)
    return " ".join([query, *extra])


def tokens(text):
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.findall(r"[a-z0-9]+", plain.lower())


def names(source):
    """Curated identities only: manifest models and aliases, never model output."""
    for name in (*source.models, *source.aliases):
        words = tokens(name)
        yield words
        while len(words) > 2 and words[0] in BRANDS:
            words = words[1:]
            yield words


def mentions(words, name):
    """Positions where `name` appears as whole tokens, never as a substring."""
    size = len(name)
    return [
        i
        for i in range(len(words) - size + 1)
        if words[i : i + size] == name and i + size <= len(words)
    ]


def resolve(manifest, query):
    """Return (identified source ids, near-miss source ids) for the asked model."""
    words = tokens(NEGATED.sub(" ", query))
    identified, near = set(), set()
    for source in manifest.sources:
        if source.scope_type == "general":
            continue
        for name in names(source):
            for start in mentions(words, name):
                after = start + len(name)
                if after < len(words) and words[after] in VARIANT_SUFFIXES:
                    near.add(source.source_id)
                else:
                    identified.add(source.source_id)
    return identified - near, near


def search(engine, query, top_k=3):
    if (
        not isinstance(query, str)
        or not 1 <= len(query.strip()) <= 500
        or not 1 <= top_k <= 5
    ):
        raise ValueError("Invalid search")
    manifest = config()
    vector = embed(manifest, [expand(query)])[0]
    distance = chunks.c.embedding.cosine_distance(vector)
    identified, _near = resolve(manifest, query)
    by_id = {s.source_id: s for s in manifest.sources}
    # Imported here: reference_doc needs this module to embed its own rows.
    from .reference_doc import SOURCE_ID, revision

    refused = bool(OUT_OF_SCOPE.search(query))
    # Only active source/revision pairs: retired or replaced ones stay in the table.
    # A specific document is searched only for the model the query names.
    pairs = [
        sa.and_(chunks.c.source_id == s.source_id, chunks.c.revision == s.sha256)
        for s in manifest.sources
        if s.scope_type == "general" or (s.source_id in identified and not refused)
    ]
    pairs.append(
        sa.and_(chunks.c.source_id == SOURCE_ID, chunks.c.revision == revision())
    )
    with engine.connect() as conn:
        rows = (
            conn.execute(
                sa.select(chunks)
                .where(
                    sa.or_(*pairs),
                    chunks.c.encoder_revision == manifest.encoder.revision,
                    distance <= manifest.max_cosine_distance,
                )
                .order_by(distance, chunks.c.id)
                .limit(100)
            )
            .mappings()
            .all()
        )
    ranked = []
    for r in rows:
        source = by_id.get(r["source_id"])
        if source is None or source.scope_type == "general":
            scope, bucket = "general", 1 if source else 2
        elif source.source_id in identified and not refused:
            scope, bucket = source.scope_type, 0
        else:
            # A specific document backs only the model the query names.
            continue
        ranked.append((bucket, scope, r))
    ranked.sort(key=lambda item: item[0])  # stable: distance order inside a bucket
    return [
        {
            "source_id": r["source_id"],
            "url": r["url"],
            "title": r["title"],
            "locator": r["locator"],
            "excerpt": r["content"],
            "revision": r["revision"],
            "scope": scope,
        }
        for _bucket, scope, r in ranked[:top_k]
    ]


def manifest_from_corpus(root, threshold, pdf_dir=None):
    """Build a validated multi-source manifest from versioned metadata.

    `tools/public-corpus.json` + `tools/embeddings-model.json` are the inputs; the
    PDFs stay local (`.local/rag-corpus/<id>/source.pdf`) and are never committed.
    """
    root = Path(root)
    pin = json.loads((root / "tools/embeddings-model.json").read_text("utf-8"))
    corpus = json.loads((root / "tools/public-corpus.json").read_text("utf-8"))
    pdfs = Path(pdf_dir) if pdf_dir else root / ".local/rag-corpus"
    return validate(
        Manifest.model_validate(
            {
                "encoder": {
                    "model_name": pin["model"],
                    "revision": pin["revision"],
                    "model_path": str(root / ".local/models" / pin["revision"]),
                    "files_sha256": pin["files"],
                },
                "sources": [
                    {
                        "source_id": d["id"],
                        "url": d["url"],
                        "title": d["title"],
                        "scope": d["scope"],
                        "accessed_at": d["consulted_date"],
                        "terms": d["rights"],
                        "sha256": d["sha256"],
                        "byte_length": d["byte_length"],
                        "page_count": d["page_count"],
                        "local_pdf": str(pdfs / d["id"] / "source.pdf"),
                        "category": d["category"],
                        "scope_type": d["scope_type"],
                        "models": d["models"],
                        "aliases": d["aliases"],
                    }
                    for d in corpus["documents"]
                ],
                "max_cosine_distance": threshold,
                "calibration_evidence": "multi-source calibration in tests/test_assistant_rag_quality_postgres.py",
            }
        )
    )
