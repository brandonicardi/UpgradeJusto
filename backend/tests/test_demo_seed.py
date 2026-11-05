"""Manifiesto de datos de demostración; sin base de datos ni Docker."""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import pytest

from upgradejusto import demo_seed
from upgradejusto.demo_seed import (
    DEFAULT_DATA_DIR,
    MANIFEST_NAME,
    DemoSeedError,
    load_manifest,
    publish_batches,
    resolve_manifest_entry,
)
from upgradejusto.retail.models import OfferInput, VendorBatch, VendorRecord


def write_manifest(tmp_path: Path, files: list[str]) -> Path:
    lotes = tmp_path / "lotes"
    lotes.mkdir(parents=True, exist_ok=True)
    (lotes / "manifest.json").write_text(json.dumps({"files": files}), encoding="utf-8")
    return tmp_path


BATCH_NAME = re.compile(r"(compragamer|venex)-[0-9a-f]{64}\.json")


def declared_manifest_files() -> list[str]:
    manifest = DEFAULT_DATA_DIR / "lotes" / MANIFEST_NAME
    payload = json.loads(manifest.read_text(encoding="utf-8"))
    return payload["files"]


def test_manifest_resolves_declared_files_inside_data_dir():
    declared = declared_manifest_files()
    paths = load_manifest(DEFAULT_DATA_DIR)

    assert len(paths) == len(declared)
    root = DEFAULT_DATA_DIR.resolve()
    assert all(path.is_relative_to(root) for path in paths)
    assert len({path.name for path in paths}) == len(declared)
    assert all(path.is_file() for path in paths)

    names = [Path(entry).name for entry in declared]
    assert all(BATCH_NAME.fullmatch(name) for name in names), names
    assert {"compragamer", "venex"} <= {name.split("-", 1)[0] for name in names}


def test_manifest_strips_project_prefix_and_resolves_inside(tmp_path):
    target = tmp_path / "lotes" / "lote.json"
    target.parent.mkdir(parents=True)
    target.write_text("{}", encoding="utf-8")
    data_dir = write_manifest(tmp_path, ["data/catalogo/lotes/lote.json"])

    assert load_manifest(data_dir) == (target.resolve(),)
    assert resolve_manifest_entry(data_dir, "lotes/lote.json") == target.resolve()


@pytest.mark.parametrize(
    "entry",
    [
        "../fuera.json",
        "data/catalogo/../../fuera.json",
        "lotes/../../fuera.json",
    ],
)
def test_manifest_rejects_parent_traversal(tmp_path, entry):
    data_dir = write_manifest(tmp_path, [entry])

    with pytest.raises(DemoSeedError):
        load_manifest(data_dir)


def test_manifest_rejects_absolute_path(tmp_path):
    outside = tmp_path.parent / "fuera.json"
    outside.write_text("{}", encoding="utf-8")
    data_dir = write_manifest(tmp_path / "catalogo", [str(outside)])

    with pytest.raises(DemoSeedError):
        load_manifest(data_dir)


def test_manifest_rejects_symlink_escape(tmp_path):
    data_dir = tmp_path / "catalogo"
    lotes = data_dir / "lotes"
    lotes.mkdir(parents=True)
    outside = tmp_path / "fuera.json"
    outside.write_text("{}", encoding="utf-8")
    link = lotes / "enlace.json"
    try:
        link.symlink_to(outside)
    except (OSError, NotImplementedError):
        pytest.skip("El sistema no permite crear symlinks de prueba")
    (lotes / "manifest.json").write_text(
        json.dumps({"files": ["data/catalogo/lotes/enlace.json"]}),
        encoding="utf-8",
    )

    with pytest.raises(DemoSeedError):
        load_manifest(data_dir)


def make_batch(source_version: str) -> VendorBatch:
    return VendorBatch(
        store="compragamer",
        source_version=source_version,
        raw_sha256="0" * 64,
        observed_at=datetime.now(timezone.utc),
        partial_batch=False,
        pagination_complete=True,
        records=(
            VendorRecord(
                product_id="1",
                category="cpu",
                name="CPU demo",
                source_url="https://www.compragamer.com/producto/1",
                variant_key="unica",
                identity_verified=True,
                rights_note="demo",
                offers=(
                    OfferInput(
                        condition="list",
                        amount="100.00",
                        availability="in_stock",
                        condition_verified=True,
                    ),
                ),
            ),
        ),
    )


def test_publish_batches_ignores_stale_version_of_idempotent_batch(
    tmp_path, monkeypatch
):
    lotes = tmp_path / "lotes"
    lotes.mkdir()
    for source_version in ("old", "new"):
        (lotes / f"{source_version}.json").write_text(
            make_batch(source_version).model_dump_json(), encoding="utf-8"
        )
    data_dir = write_manifest(tmp_path, ["lotes/old.json", "lotes/new.json"])

    calls: list[tuple[str, str]] = []

    class FakeRetailService:
        def __init__(self, engine):
            pass

        def publish(self, admin_id, batch, expected_active):
            calls.append((batch.source_version, expected_active))
            if batch.source_version == "old":
                return {
                    "dataset_version": "retail-old",
                    "idempotent": True,
                    "quarantine": [],
                }
            return {
                "dataset_version": "retail-new",
                "idempotent": False,
                "quarantine": [],
            }

    monkeypatch.setattr(demo_seed, "RetailService", FakeRetailService)
    monkeypatch.setattr(demo_seed, "AdministrationService", lambda engine: None)
    monkeypatch.setattr(demo_seed, "AdministrationRepository", lambda engine: None)
    monkeypatch.setattr(
        demo_seed, "active_snapshot", lambda service, owner: ("tech-active", {}, ())
    )

    results, products = publish_batches(None, uuid4(), data_dir)

    assert calls == [("old", "tech-active"), ("new", "tech-active")]
    assert [result["idempotent"] for result in results] == [True, False]
    assert products == 2
