"""Carga idempotente de datos de demostración; herramienta de arranque, nunca HTTP.

Aplica las migraciones Alembic, verifica el seed curado, publica los datos
técnicos del catálogo y los lotes minoristas de ``data/catalogo``. Pensado para
el entrypoint de Docker y para ejecutarse con ``python -m upgradejusto.demo_seed``.

No reutiliza ``administration.bootstrap.grant`` porque ese comando exige un
objetivo PostgreSQL local fijo (``127.0.0.1:55433`` y base
``upgradejusto_<env>``), mientras que dentro de Docker el host es ``db`` y el
puerto ``5432``. Por eso la identidad administradora de la demo se crea acá de
forma idempotente y explícita: email ``demo-admin@example.test`` con una
contraseña aleatoria generada con ``HASHER`` que nunca se imprime, más la fila
``admin`` en ``administration_roles``. Si la cuenta ya existe no se sobrescribe.
"""

import json
import os
import secrets
from dataclasses import replace
from pathlib import Path
from uuid import UUID, uuid4

import sqlalchemy as sa
from alembic.config import Config
from sqlalchemy.dialects.postgresql import insert

from alembic import command
from upgradejusto.administration.repository import AdministrationRepository
from upgradejusto.administration.service import AdministrationService
from upgradejusto.administration.tables import roles
from upgradejusto.auth.security import HASHER
from upgradejusto.catalog_import.executor import ImportExecutor, active_snapshot
from upgradejusto.catalog_import.manufacturer import build_manufacturer_proposal
from upgradejusto.catalog_import.proposal import build_proposal, digest
from upgradejusto.compatibility.basic_manufacturer import SUPPLEMENTAL_SOURCES
from upgradejusto.persistence.runtime import runtime_engine
from upgradejusto.persistence.schema import users
from upgradejusto.persistence.seed import seed_catalog
from upgradejusto.retail.models import VendorBatch
from upgradejusto.retail.service import RetailService
from upgradejusto.retail.tables import resources

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = BACKEND_DIR.parent / "data" / "catalogo"
TECHNICAL_SAMPLE = BACKEND_DIR / "data" / "hardware-import" / "raw-sample.json"
MANIFEST_NAME = "manifest.json"
MANUFACTURER_FACTS = Path("tecnicos") / "fabricante.json"
DATA_PREFIX = ("data", "catalogo")
DEMO_ADMIN_EMAIL = "demo-admin@example.test"
ADMIN_ROLE = "admin"
MAX_BATCH_BYTES = 16 * 1024 * 1024


class DemoSeedError(RuntimeError):
    """Entrada inválida o estado inesperado; abortar antes de escribir."""


def configured_data_dir() -> Path:
    """Directorio de datos; ``UJ_DEMO_DATA_DIR`` relativo se ancla en backend."""
    configured = os.environ.get("UJ_DEMO_DATA_DIR")
    if not configured:
        return DEFAULT_DATA_DIR
    path = Path(configured).expanduser()
    return path if path.is_absolute() else BACKEND_DIR / path


def resolve_manifest_entry(data_dir: Path, entry: str) -> Path:
    """Resuelve una entrada del manifiesto Y la confina al directorio de datos."""
    if not isinstance(entry, str) or not entry.strip():
        raise DemoSeedError("La entrada del manifiesto debe ser una ruta no vacía")
    candidate = Path(entry)
    if candidate.is_absolute() or candidate.drive or ".." in candidate.parts:
        raise DemoSeedError("La entrada del manifiesto escapa del directorio de datos")
    relative = candidate.parts
    if relative[:2] == DATA_PREFIX:
        relative = relative[2:]
    if not relative:
        raise DemoSeedError("La entrada del manifiesto no apunta a un archivo")
    root = data_dir.resolve()
    resolved = (root / Path(*relative)).resolve()
    if not resolved.is_relative_to(root):
        raise DemoSeedError("La entrada del manifiesto escapa del directorio de datos")
    return resolved


def load_manifest(data_dir: Path) -> tuple[Path, ...]:
    """Lee ``lotes/manifest.json`` y devuelve sus archivos ya resueltos."""
    manifest = data_dir / "lotes" / MANIFEST_NAME
    try:
        payload = json.loads(manifest.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise DemoSeedError("No se pudo leer el manifiesto del catálogo") from error
    files = payload.get("files") if isinstance(payload, dict) else None
    if not isinstance(files, list) or not files:
        raise DemoSeedError("El manifiesto debe declarar una lista de archivos")
    resolved = tuple(resolve_manifest_entry(data_dir, entry) for entry in files)
    if len(set(resolved)) != len(resolved):
        raise DemoSeedError("El manifiesto contiene archivos duplicados")
    for path in resolved:
        if not path.is_file():
            raise DemoSeedError("Falta un archivo declarado en el manifiesto")
    return resolved


def apply_migrations() -> None:
    """Alembic programático con la configuración resuelta desde este archivo."""
    command.upgrade(Config(str(BACKEND_DIR / "alembic.ini")), "head")


def ensure_demo_admin(engine) -> UUID:
    """Crea o recupera el admin de la demo; nunca imprime la contraseña."""
    with engine.begin() as conn:
        identity = conn.scalar(
            sa.select(users.c.id).where(users.c.email == DEMO_ADMIN_EMAIL)
        )
        if identity is None:
            identity = uuid4()
            encoded = HASHER.hash(secrets.token_urlsafe(48))
            conn.execute(
                insert(users)
                .values(
                    id=identity,
                    email=DEMO_ADMIN_EMAIL,
                    password_hash=encoded,
                )
                .on_conflict_do_nothing(index_elements=[users.c.email])
            )
            identity = conn.scalar(
                sa.select(users.c.id).where(users.c.email == DEMO_ADMIN_EMAIL)
            )
        if identity is None:
            raise DemoSeedError("No se pudo preparar la identidad de demostración")
        conn.execute(
            insert(roles)
            .values(user_id=identity, role=ADMIN_ROLE)
            .on_conflict_do_nothing()
        )
    return identity


def publish_technical(engine, admin_id: UUID) -> dict:
    """Publica los datos técnicos curados; ``unchanged`` si ya estaban."""
    service = AdministrationService(AdministrationRepository(engine))
    version, components, _ = active_snapshot(service, admin_id)
    sample = json.loads(TECHNICAL_SAMPLE.read_text(encoding="utf-8"))
    proposal = build_proposal(sample, components, expected_sample_sha256=digest(sample))
    proposal = replace(proposal, sources=proposal.sources + tuple(SUPPLEMENTAL_SOURCES))
    return ImportExecutor(service).publish(admin_id, version, proposal)


def publish_batches(engine, admin_id: UUID, data_dir: Path) -> tuple[list[dict], int]:
    """Publica los lotes del manifiesto conservando el puntero activo vigente."""
    service = RetailService(engine)
    administration = AdministrationService(AdministrationRepository(engine))
    expected_active, _, _ = active_snapshot(administration, admin_id)
    results, products = [], 0
    for path in load_manifest(data_dir):
        with path.open("rb") as stream:
            payload = stream.read(MAX_BATCH_BYTES + 1)
        if len(payload) > MAX_BATCH_BYTES:
            raise DemoSeedError("Un lote minorista excede el tamaño permitido")
        batch = VendorBatch.model_validate_json(payload)
        result = service.publish(admin_id, batch, expected_active)
        # Un lote idempotente devuelve la versión de SU publicación, no la vigente.
        if not result["idempotent"]:
            expected_active = result["dataset_version"]
        results.append(result)
        products += len(batch.records)
    return results, products


def publish_manufacturer_facts(engine, admin_id: UUID, data_dir: Path) -> str:
    """Publica hechos de fabricante; un error no tumba los lotes ya cargados."""
    service = AdministrationService(AdministrationRepository(engine))
    version, components, _ = active_snapshot(service, admin_id)
    with engine.connect() as conn:
        mpns = {
            row.component_id: row.identity.get("mpn")
            for row in conn.execute(
                sa.select(resources.c.component_id, resources.c.identity).where(
                    resources.c.dataset_version == version
                )
            )
        }
    try:
        document = json.loads(
            (data_dir / MANUFACTURER_FACTS).read_text(encoding="utf-8")
        )
        proposal = build_manufacturer_proposal(document, components, mpns)
        result = ImportExecutor(service).publish(admin_id, version, proposal)
    except (OSError, KeyError, TypeError, ValueError) as error:
        return f"rechazado: {type(error).__name__}"
    return result.get("status", "published")


def run(data_dir: Path | None = None) -> dict:
    """Ejecuta la carga completa y devuelve un resumen sin secretos."""
    directory = data_dir or configured_data_dir()
    engine = runtime_engine()
    try:
        apply_migrations()
        seeded = seed_catalog(engine)
        admin_id = ensure_demo_admin(engine)
        technical = publish_technical(engine, admin_id)
        batches, products = publish_batches(engine, admin_id, directory)
        manufacturer = publish_manufacturer_facts(engine, admin_id, directory)
        return {
            "components": seeded,
            "technical_status": technical.get("status", "published"),
            "manufacturer_status": manufacturer,
            "batches": len(batches),
            "products": products,
            "published": sum(1 for result in batches if not result["idempotent"]),
            "unchanged": sum(1 for result in batches if result["idempotent"]),
            "quarantined": sum(len(result["quarantine"]) for result in batches),
        }
    finally:
        engine.dispose()


def main() -> int:
    try:
        summary = run()
    except Exception as error:
        print(
            f"Demo seed failed class={type(error).__name__}; no credentials displayed"
        )
        return 1
    print(
        "Demo seed ready: "
        f"components={summary['components']}; "
        f"technical={summary['technical_status']}; "
        f"manufacturer={summary['manufacturer_status']}; "
        f"batches={summary['batches']} products={summary['products']} "
        f"(published={summary['published']}, unchanged={summary['unchanged']}); "
        f"quarantined={summary['quarantined']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
