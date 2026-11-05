"""Manifiesto de datos de demostración; sin base de datos ni Docker."""

import json
from pathlib import Path

import pytest

from upgradejusto.demo_seed import (
    DEFAULT_DATA_DIR,
    DemoSeedError,
    load_manifest,
    resolve_manifest_entry,
)


def write_manifest(tmp_path: Path, files: list[str]) -> Path:
    lotes = tmp_path / "lotes"
    lotes.mkdir(parents=True, exist_ok=True)
    (lotes / "manifest.json").write_text(json.dumps({"files": files}), encoding="utf-8")
    return tmp_path


def test_manifest_resolves_eleven_files_inside_data_dir():
    paths = load_manifest(DEFAULT_DATA_DIR)

    assert len(paths) == 11
    root = DEFAULT_DATA_DIR.resolve()
    assert all(path.is_relative_to(root) for path in paths)
    assert len({path.name for path in paths}) == 11
    assert all(path.is_file() for path in paths)


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
