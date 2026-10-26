"""Idempotent public PDF ingestion: python -m ...assistant.ingest --config PATH.

Build supplies normalized manifest per rag.Manifest, without credentials.
--download fetches only its exact curated URL, no redirects; never model input.
"""

import argparse
import hashlib
import io
from pathlib import Path

import httpx
from pypdf import PdfReader
from sqlalchemy.dialects.postgresql import insert

from upgradejusto.persistence.runtime import runtime_engine

from .provider import tls_context
from .rag import config, embed
from .tables import chunks


def extract(source, data):
    if (
        len(data) != source.byte_length
        or hashlib.sha256(data).hexdigest() != source.sha256
    ):
        raise ValueError("Public PDF revision/hash mismatch")
    if not data.startswith(b"%PDF-"):
        raise ValueError("Not PDF")
    pdf = PdfReader(io.BytesIO(data), strict=True)
    if pdf.is_encrypted or len(pdf.pages) != source.page_count:
        raise ValueError("PDF page/encryption limit")
    result = []
    for page_number, page in enumerate(pdf.pages, 1):
        text = " ".join((page.extract_text() or "").split())
        if len(text) > 100000:
            raise ValueError("PDF text limit")
        for start in range(0, len(text), 900):
            locator = f"page:{page_number};chars:{start}-{min(start + 1000, len(text))}"
            content = text[start : start + 1000]
            key = hashlib.sha256(
                f"{source.source_id}:{source.sha256}:{locator}".encode()
            ).hexdigest()
            result.append(
                dict(
                    id=key,
                    source_id=source.source_id,
                    revision=source.sha256,
                    url=source.url,
                    title=source.title,
                    locator=locator,
                    content=content,
                )
            )
    if not result or len(result) > 200:
        raise ValueError("PDF chunk limit")
    return result


def download(source):
    with httpx.Client(
        verify=tls_context(), timeout=30, follow_redirects=False, trust_env=False
    ) as client:
        with client.stream("GET", source.url) as response:
            response.raise_for_status()
            data = bytearray()
            for part in response.iter_bytes():
                data.extend(part)
                if len(data) > source.byte_length:
                    raise ValueError("Download byte limit")
    return bytes(data)


def ingest(engine, manifest, fetch=False):
    count = 0
    for source in manifest.sources:
        if fetch:
            data = download(source)
        else:
            with Path(source.local_pdf).open("rb") as handle:
                data = handle.read(source.byte_length + 1)
        rows = extract(source, data)
        vectors = embed(manifest, [r["content"] for r in rows])
        with engine.begin() as conn:
            for row, vector in zip(rows, vectors, strict=True):
                # A same revision reingestion does not duplicate or overwrite.
                conn.execute(
                    insert(chunks)
                    .values(
                        **row,
                        encoder_revision=manifest.encoder.revision,
                        embedding=vector,
                    )
                    .on_conflict_do_nothing(index_elements=[chunks.c.id])
                )
        count += len(rows)
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    count = ingest(runtime_engine(), config(args.config), args.download)
    print(f"public_chunks_processed={count}")


if __name__ == "__main__":
    main()
