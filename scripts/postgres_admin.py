"""Administración exclusiva del clúster local; nunca cargado por HTTP."""

import json
import os
import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path

import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / ".local" / "postgresql"
DATA = LOCAL / "data"
BIN = ROOT / ".tools" / "postgresql" / "18.6-5" / "pgsql" / "bin"
PORT = 55433
ADMIN = "upgradejusto_bootstrap"
ROLES = {
    "upgradejusto_dev": "upgradejusto_dev_app",
    "upgradejusto_test": "upgradejusto_test_app",
}


def run(*args, allowed=(0,)):
    command = [str(x) for x in args]
    if Path(command[0]).name == "pg_ctl.exe" and "start" in command:
        # Windows daemon can inherit PIPE handles: communicate() would never EOF.
        # Wait only for pg_ctl; bounded timeout, daemon output already goes to -l.
        with (LOCAL / "pgctl-start.log").open("a", encoding="utf-8") as output:
            startup = subprocess.STARTUPINFO()
            startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startup.wShowWindow = 0
            result = subprocess.run(
                command,
                stdout=output,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                text=True,
                timeout=45,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                | subprocess.CREATE_NEW_CONSOLE,
                startupinfo=startup,
            )
    else:
        result = subprocess.run(command, capture_output=True, text=True, timeout=45)
    if result.returncode not in allowed:
        # No SQL, URL, credenciales o salida de inicialización a la consola.
        print(
            f"Local PostgreSQL command failed: {Path(args[0]).name}, exit={result.returncode}"
        )
        raise RuntimeError("Inspect local prerequisites; no credentials printed")
    return result


def read(name):
    return json.loads((LOCAL / name).read_text(encoding="utf-8"))


def checked_runtime():
    from sqlalchemy.engine import make_url

    runtime = read("runtime.json")
    for key, database in [
        ("DATABASE_URL", "upgradejusto_dev"),
        ("TEST_DATABASE_URL", "upgradejusto_test"),
    ]:
        url = make_url(runtime[key])
        if (url.drivername, url.host, url.port, url.database, url.username) != (
            "postgresql+psycopg",
            "127.0.0.1",
            PORT,
            database,
            ROLES[database],
        ) or url.query:
            raise RuntimeError(
                "Refuse non-exclusive runtime target or connection options"
            )
    return runtime


def save(name, value):
    path = LOCAL / name
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream)


def known_cluster():
    manifest = read("cluster.json")
    if manifest != {"version": "18", "port": PORT, "project": "upgradejusto"}:
        raise RuntimeError("Unexpected cluster identity")
    if (DATA / "PG_VERSION").read_text().strip() != "18":
        raise RuntimeError("Unexpected cluster version")


def status():
    known_cluster()
    return run(BIN / "pg_ctl.exe", "-D", DATA, "status", allowed=(0, 3)).returncode


def start():
    if status() == 0:
        if run(
            BIN / "pg_isready.exe",
            "-h",
            "127.0.0.1",
            "-p",
            str(PORT),
            "-t",
            "3",
            allowed=(0, 1, 2),
        ).returncode:
            raise RuntimeError(
                "Project postmaster exists but is not accepting connections"
            )
        print("Project PostgreSQL already running")
        return
    with socket.socket() as sock:
        if sock.connect_ex(("127.0.0.1", PORT)) == 0:
            raise RuntimeError("Project port occupied; no other process stopped")
    logfile = LOCAL / f"server-{time.time_ns()}.log"
    (LOCAL / "last-start.json").write_text(
        json.dumps({"log": logfile.name}), encoding="utf-8"
    )
    run(
        BIN / "pg_ctl.exe",
        "-D",
        DATA,
        "-l",
        logfile,
        "-w",
        "-t",
        "30",
        "-o",
        "-c shared_buffers=32MB -c max_connections=20",
        "start",
    )
    print("Project PostgreSQL started on loopback port55433")


def stop():
    if status() == 3:
        print("Project PostgreSQL already stopped")
        return
    run(BIN / "pg_ctl.exe", "-D", DATA, "-m", "fast", "-w", "-t", "30", "stop")
    print("Project PostgreSQL stopped with pg_ctl")


def admin_connection(database="postgres"):
    secret = read("bootstrap.json")
    return psycopg.connect(
        host="127.0.0.1",
        port=PORT,
        dbname=database,
        user=ADMIN,
        password=secret["password"],
        connect_timeout=5,
        autocommit=True,
    )


def setup():
    if LOCAL.exists():
        raise RuntimeError(
            "Local cluster directory exists; never reinitialize or overwrite"
        )
    if not (BIN / "initdb.exe").is_file():
        raise RuntimeError("Install pinned project-local PostgreSQL binaries first")
    LOCAL.mkdir(parents=True)
    sid = (
        run("whoami.exe", "/user", "/fo", "csv", "/nh")
        .stdout.split(",")[-1]
        .strip()
        .strip('"')
    )
    if not sid.startswith("S-1-5-"):
        raise RuntimeError("Cannot determine current Windows security identity")
    run(
        "icacls.exe",
        LOCAL,
        "/inheritance:r",
        "/grant:r",
        f"*{sid}:(OI)(CI)F",
        "*S-1-5-18:(OI)(CI)F",
    )
    password = secrets.token_hex(32)
    save("bootstrap.json", {"password": password})
    pwfile = LOCAL / "init-password.txt"
    pwfile.write_text(password, encoding="ascii")
    try:
        run(
            BIN / "initdb.exe",
            "-D",
            DATA,
            "-U",
            ADMIN,
            "--encoding=UTF8",
            "--locale=C",
            "--auth=scram-sha-256",
            f"--pwfile={pwfile}",
        )
    finally:
        pwfile.unlink(missing_ok=True)
    # Local-only settings applied before first startup; no secret statement logging.
    with (DATA / "postgresql.conf").open("a", encoding="utf-8") as stream:
        stream.write(
            "\nlisten_addresses='127.0.0.1'\nport=55433\npassword_encryption='scram-sha-256'\n"
        )
        stream.write(
            "log_statement='none'\nlog_min_error_statement='panic'\nlog_parameter_max_length=0\nlog_parameter_max_length_on_error=0\n"
        )
    (DATA / "pg_hba.conf").write_text(
        "host all upgradejusto_bootstrap 127.0.0.1/32 scram-sha-256\n"
        "host upgradejusto_dev upgradejusto_dev_app 127.0.0.1/32 scram-sha-256\n"
        "host upgradejusto_test upgradejusto_test_app 127.0.0.1/32 scram-sha-256\n"
        "host all all 127.0.0.1/32 reject\n",
        encoding="ascii",
    )
    save("cluster.json", {"version": "18", "port": PORT, "project": "upgradejusto"})
    start()
    provision()


def provision():
    """Resume a known initialized cluster, never reinitialize or replace data."""
    known_cluster()
    if (LOCAL / "runtime.json").exists():
        verify()
        return
    plan_path = LOCAL / "provisioning.json"
    if not plan_path.exists():
        with admin_connection() as connection:
            existing_roles = connection.execute(
                "SELECT rolname FROM pg_roles WHERE rolname = ANY(%s)",
                (list(ROLES.values()),),
            ).fetchall()
            existing_databases = connection.execute(
                "SELECT datname FROM pg_database WHERE datname = ANY(%s)",
                (list(ROLES),),
            ).fetchall()
            if existing_roles or existing_databases:
                raise RuntimeError(
                    "Existing project objects without provisioning manifest; inspect ownership first"
                )
        save(
            "provisioning.json", {database: secrets.token_hex(32) for database in ROLES}
        )
    credentials = read("provisioning.json")
    if set(credentials) != set(ROLES):
        raise RuntimeError("Unexpected provisioning manifest")
    runtime = {}
    with admin_connection() as connection:
        connection.execute("REVOKE CONNECT ON DATABASE postgres FROM PUBLIC")
        connection.execute("REVOKE CONNECT ON DATABASE template1 FROM PUBLIC")
        for database, role in ROLES.items():
            password = credentials[database]
            existing_role = connection.execute(
                "SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication FROM pg_roles WHERE rolname=%s",
                (role,),
            ).fetchone()
            if existing_role is None:
                connection.execute(
                    sql.SQL(
                        "CREATE ROLE {} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD {}"
                    ).format(sql.Identifier(role), sql.Literal(password))
                )
            elif any(existing_role):
                raise RuntimeError("Unexpected elevated runtime role; never repurpose")
            existing_db = connection.execute(
                "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=%s",
                (database,),
            ).fetchone()
            if existing_db is None:
                connection.execute(
                    sql.SQL(
                        "CREATE DATABASE {} OWNER {} ENCODING 'UTF8' TEMPLATE template0"
                    ).format(sql.Identifier(database), sql.Identifier(role))
                )
            elif existing_db[0] != role:
                raise RuntimeError("Database belongs to another role; never repurpose")
            connection.execute(
                sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(
                    sql.Identifier(database)
                )
            )
            connection.execute(
                sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                    sql.Identifier(database), sql.Identifier(role)
                )
            )
            key = "DATABASE_URL" if database.endswith("_dev") else "TEST_DATABASE_URL"
            runtime[key] = (
                f"postgresql+psycopg://{role}:{password}@127.0.0.1:{PORT}/{database}"
            )
    for database in ROLES:
        with admin_connection(database) as connection:
            connection.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
    save("runtime.json", runtime)
    ensure_proxy_key()
    print(
        "Two databases and distinct restricted runtime roles created; bootstrap separate"
    )


def ensure_proxy_key():
    known_cluster()
    runtime = checked_runtime()
    if runtime.get("UJ_PROXY_SECRET"):
        if len(runtime["UJ_PROXY_SECRET"]) < 64:
            raise RuntimeError("Existing proxy secret is not valid; do not overwrite")
        print("Server-only proxy key already configured")
        return
    runtime["UJ_PROXY_SECRET"] = secrets.token_hex(32)
    temporary = LOCAL / "runtime-proxy-key.json.tmp"
    with temporary.open("x", encoding="utf-8") as output:
        json.dump(runtime, output)
    os.replace(temporary, LOCAL / "runtime.json")
    print("Server-only proxy key generated in protected runtime; value omitted")


def verify():
    from sqlalchemy import create_engine, text

    config = checked_runtime()
    for key, expected in [
        ("DATABASE_URL", "upgradejusto_dev"),
        ("TEST_DATABASE_URL", "upgradejusto_test"),
    ]:
        engine = create_engine(
            config[key], hide_parameters=True, connect_args={"connect_timeout": 5}
        )
        try:
            with engine.connect() as connection:
                row = connection.execute(
                    text(
                        "SELECT current_database(), current_user, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user"
                    )
                ).one()
                assert (
                    row[0] == expected
                    and row[1] == ROLES[expected]
                    and not any(row[2:])
                )
                assert (
                    connection.execute(text("SHOW listen_addresses")).scalar_one()
                    == "127.0.0.1"
                )
            # Cross-database authentication must fail with its original role.
            other = (
                "upgradejusto_test" if expected.endswith("_dev") else "upgradejusto_dev"
            )
            cross = create_engine(
                engine.url.set(database=other),
                hide_parameters=True,
                connect_args={"connect_timeout": 5},
            )
            try:
                try:
                    with cross.connect():
                        raise AssertionError(
                            "Cross-database access unexpectedly allowed"
                        )
                except Exception as error:
                    from sqlalchemy.exc import OperationalError

                    if not isinstance(error, OperationalError):
                        raise
                    # libpq connection failures may omit SQLSTATE; accept only the
                    # explicit HBA/authorization diagnostic, never generic timeout.
                    authorization_rejected = any(
                        phrase in str(error.orig).lower()
                        for phrase in (
                            "pg_hba.conf rejects connection",
                            "permission denied for database",
                        )
                    )
                    if (
                        getattr(error.orig, "sqlstate", None) not in {"28000", "42501"}
                        and not authorization_rejected
                    ):
                        raise RuntimeError(
                            "Cross-access failed for an unrelated connection reason"
                        ) from None
            finally:
                cross.dispose()
        finally:
            engine.dispose()
    print(
        "Real connections verified: separate dev/test, non-superusers, cross-access rejected"
    )


def enable_vector():
    known_cluster()
    for database in ROLES:
        with admin_connection(database) as connection:
            connection.execute("CREATE EXTENSION IF NOT EXISTS vector")
            version = connection.execute(
                "SELECT extversion FROM pg_extension WHERE extname='vector'"
            ).fetchone()[0]
            print(f"Local vector extension verified: {database}, version={version}")


def verify_vector():
    from sqlalchemy import create_engine, text

    config = checked_runtime()
    for key, database in [
        ("DATABASE_URL", "upgradejusto_dev"),
        ("TEST_DATABASE_URL", "upgradejusto_test"),
    ]:
        engine = create_engine(
            config[key], hide_parameters=True, connect_args={"connect_timeout": 5}
        )
        try:
            with engine.begin() as connection:
                assert (
                    connection.execute(text("SELECT current_database()")).scalar_one()
                    == database
                )
                assert (
                    connection.execute(
                        text(
                            "SELECT extversion FROM pg_extension WHERE extname='vector'"
                        )
                    ).scalar_one()
                    == "0.8.7"
                )
                connection.execute(
                    text(
                        "CREATE TEMP TABLE uj_vector_probe (id integer, embedding vector(3)) ON COMMIT DROP"
                    )
                )
                connection.execute(
                    text(
                        "INSERT INTO uj_vector_probe VALUES (1,'[1,0,0]'), (2,'[0,1,0]')"
                    )
                )
                assert (
                    connection.execute(
                        text(
                            "SELECT id FROM uj_vector_probe ORDER BY embedding <=> '[1,0,0]'::vector, id LIMIT 1"
                        )
                    ).scalar_one()
                    == 1
                )
                assert (
                    connection.execute(
                        text("SELECT '[1,0,0]'::vector <=> '[0,1,0]'::vector")
                    ).scalar_one()
                    == 1.0
                )
            print(
                f"{database}: vector0.8.7 SQL cosine search verified with synthetic temporary vectors; not RAG acceptance"
            )
        finally:
            engine.dispose()


if __name__ == "__main__":
    try:
        action = sys.argv[1]
        if action == "status":
            print(
                "Project PostgreSQL running"
                if status() == 0
                else "Project PostgreSQL stopped"
            )
        else:
            {
                "setup": setup,
                "provision": provision,
                "start": start,
                "stop": stop,
                "verify": verify,
                "enable-vector": enable_vector,
                "verify-vector": verify_vector,
                "ensure-proxy-key": ensure_proxy_key,
            }[action]()
    except Exception as error:
        print(
            f"Local PostgreSQL operation failed ({type(error).__name__}); values omitted"
        )
        message = str(error).lower()
        categories = [
            part
            for part in (
                "password authentication failed",
                "connection refused",
                "timeout",
                "server closed",
                "shared memory",
                "no pg_hba.conf entry",
            )
            if part in message
        ]
        print(
            "Diagnostic categories:",
            categories,
            "SQLSTATE:",
            getattr(error, "sqlstate", None),
        )
        sys.exit(1)
