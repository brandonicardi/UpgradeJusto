"""Exact bootstrap target guard; fake engines must never connect on refusal."""

from types import SimpleNamespace

import pytest
from sqlalchemy.engine import URL

from upgradejusto.administration.bootstrap import grant


class NoConnectionEngine:
    dialect = SimpleNamespace(name="postgresql", driver="psycopg")

    def __init__(self, url):
        self.url = url
        self.connected = False

    def begin(self):
        self.connected = True
        raise AssertionError("Target guard must refuse before connection")


def project_url(mode="test", **changes):
    return URL.create(
        **{
            "drivername": "postgresql+psycopg",
            "host": "127.0.0.1",
            "port": 55433,
            "database": f"upgradejusto_{mode}",
            "username": f"upgradejusto_{mode}_app",
            **changes,
        }
    )


@pytest.mark.parametrize(
    "changes",
    [
        {"host": "198.51.100.1"},
        {"host": "localhost"},
        {"host": "::1"},
        {"host": "127.0.0.2"},
        {"port": 5432},
        {"port": None},
        {"database": "another_local_project"},
        {"database": "upgradejusto_dev"},
        {"username": "postgres"},
        {"username": "upgradejusto_dev_app"},
        {"drivername": "postgresql+asyncpg"},
        {"query": {"host": "198.51.100.1"}},
        {"query": {"options": "-c search_path=other_project"}},
        {"query": {"service": "another-project"}},
    ],
)
def test_grant_unsafe_target_never_connects(monkeypatch, changes):
    monkeypatch.setenv("UJ_ENV", "test")
    engine = NoConnectionEngine(project_url(**changes))
    with pytest.raises(ValueError):
        grant(engine, "explicit-new-project-account@example.test", True)
    assert not engine.connected


@pytest.mark.parametrize("mode", ["dev", "test"])
def test_exact_project_mode_is_only_target_reaching_connection(monkeypatch, mode):
    monkeypatch.setenv("UJ_ENV", mode)
    engine = NoConnectionEngine(project_url(mode))
    with pytest.raises(AssertionError, match="Target guard"):
        grant(engine, "explicit-new-project-account@example.test", True)
    assert engine.connected  # Guard test only, NOT a successful PG grant.


@pytest.mark.parametrize("mode", ["production", "", "TEST"])
def test_grant_invalid_environment_never_connects(monkeypatch, mode):
    monkeypatch.setenv("UJ_ENV", mode)
    engine = NoConnectionEngine(project_url())
    with pytest.raises(ValueError):
        grant(engine, "explicit-new-project-account@example.test", True)
    assert not engine.connected
