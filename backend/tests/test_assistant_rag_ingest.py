"""Extraction limits and tamper rejection (no database, no encoder)."""

import hashlib
import io
from types import SimpleNamespace

import pytest
from pypdf import PdfWriter

from upgradejusto.assistant import ingest as ingest_module
from upgradejusto.assistant.ingest import extract


def source_for(data, pages=1):
    return SimpleNamespace(
        source_id="s",
        revision="r",
        url="https://example.com/a.pdf",
        title="t",
        byte_length=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
        page_count=pages,
    )


def blank(encrypt=False, pages=1):
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(100, 100)
    if encrypt:
        writer.encrypt("secret")
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def test_altered_file_is_rejected():
    data = blank()
    source = source_for(data)
    with pytest.raises(ValueError, match="hash mismatch"):
        extract(source, data + b" ")


def test_encrypted_pdf_is_rejected():
    data = blank(encrypt=True)
    with pytest.raises(ValueError, match="encryption"):
        extract(source_for(data), data)


def test_pdf_without_useful_text_is_rejected():
    data = blank()
    with pytest.raises(ValueError, match="chunk limit"):
        extract(source_for(data), data)


def test_page_count_must_match_the_manifest():
    data = blank(pages=2)
    with pytest.raises(ValueError, match="page"):
        extract(source_for(data, pages=1), data)


def test_chunk_limit_is_explicit(monkeypatch):
    class Page:
        def extract_text(self):
            return "x" * 5000

    class Reader:
        is_encrypted = False
        pages = [Page()]

        def __init__(self, *_a, **_k):
            pass

    monkeypatch.setattr(ingest_module, "PdfReader", Reader)
    monkeypatch.setattr(ingest_module, "MAX_CHUNKS_PER_SOURCE", 3)
    data = b"%PDF-fake"
    with pytest.raises(ValueError, match="chunk limit"):
        extract(source_for(data), data)
