"""Offline proposal CLI. Publication requires a trusted in-process server caller."""

import argparse
import hashlib
import json
from pathlib import Path

from .proposal import build_proposal, canonical


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument(
        "--sha256", required=True, help="Expected raw acquisition file checksum"
    )
    parser.add_argument(
        "--components",
        type=Path,
        required=True,
        help="Active CU10 component-row map JSON",
    )
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args()
    if args.publish:
        parser.error(
            "Use ImportExecutor with server-authenticated principal; no CLI credentials or owner IDs"
        )
    raw = args.input.read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.sha256:
        parser.error("Acquisition file checksum mismatch")
    proposal = build_proposal(
        json.loads(raw), json.loads(args.components.read_text(encoding="utf-8"))
    )
    print(canonical(proposal.as_dict()))


if __name__ == "__main__":
    main()
