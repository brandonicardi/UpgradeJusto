"""Pinned public CPU encoder; no Groq key, private corpus or global cache."""

import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    manifest = json.loads((ROOT / "tools/embeddings-model.json").read_text())
    target = ROOT / ".local/models" / manifest["revision"]
    target.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for name, expected in manifest["files"].items():
        destination = target / name
        if not destination.is_file():
            url = (
                f"https://huggingface.co/{manifest['repository']}/resolve/"
                f"{manifest['revision']}/{name}"
            )
            partial = destination.with_suffix(destination.suffix + ".partial")
            total = 0
            try:
                with urllib.request.urlopen(url, timeout=60) as response:
                    with partial.open("wb") as output:
                        while chunk := response.read(1024 * 1024):
                            total += len(chunk)
                            if total > 260_000_000:
                                raise ValueError("Encoder file exceeds download limit")
                            output.write(chunk)
                with partial.open("rb") as stream:
                    downloaded = hashlib.file_digest(stream, "sha256").hexdigest()
                if expected and downloaded != expected:
                    raise ValueError(f"Public encoder checksum mismatch: {name}")
                partial.replace(destination)
            finally:
                partial.unlink(missing_ok=True)
        with destination.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        if expected and digest != expected:
            raise ValueError(f"Public encoder checksum mismatch: {name}")
        hashes[name] = digest
    from fastembed import TextEmbedding

    model = TextEmbedding(
        model_name=manifest["model"],
        specific_model_path=str(target),
        local_files_only=True,
        providers=["CPUExecutionProvider"],
        threads=2,
    )
    vectors = list(model.embed(["Memoria DDR4 y compatibilidad de placa base"]))
    dimension = len(vectors[0])
    if dimension != manifest["dimension"]:
        raise ValueError("Encoder dimension mismatch")
    report = {
        **manifest,
        "file_sha256": hashes,
        "measured_dimension": dimension,
        "finite": bool(__import__("numpy").isfinite(vectors[0]).all()),
        "provider": "CPUExecutionProvider",
    }
    evidence = ROOT / ".local/evidence/sprint32/encoder.json"
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not report["finite"]:
        raise ValueError("Encoder produced nonfinite values")
    print("Pinned public encoder verified: dimension=384, CPU, finite; hashes local")


if __name__ == "__main__":
    main()
