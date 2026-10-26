"""Bounded local TEST publisher, never a downloader or model authorization tool."""

import argparse
import os
from pathlib import Path
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.database import build_engine, validate_database_url
from upgradejusto.retail.models import VendorBatch
from upgradejusto.retail.service import RetailService

MAX_BYTES = 16 * 1024 * 1024


def test_engine():
    value = os.environ.get("DATABASE_URL", "")
    if (
        os.environ.get("UJ_ENV") != "test"
        or os.environ.get("UJ_TEST_POSTGRES") != "1"
        or not value
        or value != os.environ.get("TEST_DATABASE_URL")
    ):
        raise ValueError("Explicit TEST database required")
    url = validate_database_url(value)
    if (
        url.host != "127.0.0.1"
        or url.port != 55433
        or url.database != "upgradejusto_test"
        or url.username != "upgradejusto_test_app"
        or url.query
    ):
        raise ValueError("Unauthorized TEST target")
    return build_engine(value)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch", required=True, type=Path)
    parser.add_argument("--admin-id", required=True, type=UUID)
    parser.add_argument("--expected-active", required=True)
    args = parser.parse_args()
    engine = None
    try:
        # No environment/credentials are printed, including on failures.
        engine = test_engine()
        with args.batch.open("rb") as stream:
            payload = stream.read(MAX_BYTES + 1)
        if len(payload) > MAX_BYTES:
            raise ValueError("Batch too large")
        batch = VendorBatch.model_validate_json(payload)
        result = RetailService(engine).publish(
            args.admin_id, batch, args.expected_active
        )
        print(
            f"Retail published: {result['dataset_version']}; "
            f"idempotent={result['idempotent']}; quarantined={len(result['quarantine'])}"
        )
        return 0
    except PCError:
        print(
            "Retail publication rejected: administrator, revision or acquisition conflict"
        )
        return 1
    except (OSError, ValueError, ValidationError, SQLAlchemyError):
        print(
            "Retail publication failed: check TEST target, migration and bounded batch locally"
        )
        return 2
    finally:
        if engine is not None:
            engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
