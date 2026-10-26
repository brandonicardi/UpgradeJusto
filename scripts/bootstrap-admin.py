"""Explicit local CU10 bootstrap entry point; never an HTTP endpoint."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))


def main():
    from upgradejusto.administration.bootstrap import main as bootstrap

    return bootstrap()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        print("Admin bootstrap failed; no credentials or account identifiers displayed")
        raise SystemExit(1) from None
