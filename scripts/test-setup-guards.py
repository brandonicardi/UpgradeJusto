"""Comprobaciones puras de destino local: sin conectar ni modificar configuración."""

import runpy
from pathlib import Path

from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]


def main():
    module = runpy.run_path(str(ROOT / "scripts/postgres_admin.py"))
    guard = module["checked_runtime"]
    original = guard()
    namespace = guard.__globals__
    read = namespace["read"]
    target = make_url(original["TEST_DATABASE_URL"])
    variants = [
        target.set(database="upgradejusto_dev"),
        target.set(username="upgradejusto_bootstrap"),
        target.set(host="example.invalid"),
        target.set(port=55432),
        target.set(drivername="postgresql"),
        target.set(query={"options": "-c search_path=private"}),
    ]
    try:
        for variant in variants:
            config = {
                **original,
                "TEST_DATABASE_URL": variant.render_as_string(hide_password=False),
            }
            namespace["read"] = lambda _name, config=config: config
            try:
                guard()
            except RuntimeError:
                pass
            else:
                raise AssertionError("Unsafe test target was not rejected")
    finally:
        namespace["read"] = read
    print(
        "Setup guards: valid exclusive config accepted; six unsafe destination/options variants rejected; no connections or file changes"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Setup guard check failed ({type(error).__name__}); values omitted")
        raise SystemExit(1)
