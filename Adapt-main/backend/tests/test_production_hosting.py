"""Production hosting boundaries: configuration, HTTPS, readiness and failure shape."""

from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from types import SimpleNamespace

import pytest
from sqlalchemy.exc import OperationalError
from starlette.requests import Request

from adapt.config import Settings
from adapt.security.middleware import client_ip, host_allowed, is_secure_request


def _production(**updates) -> Settings:
    values = {
        "_env_file": None,
        "mode": "production",
        "frontend_origin": "https://learn.example.test",
        "require_https": True,
        "trusted_proxies": ["127.0.0.1"],
        "db_encryption": "field-only",
    }
    values.update(updates)
    return Settings(**values)


def _request(peer: str, *, forwarded: str | None = None, protocol: str | None = None) -> Request:
    headers = []
    if forwarded is not None:
        headers.append((b"x-forwarded-for", forwarded.encode()))
    if protocol is not None:
        headers.append((b"x-forwarded-proto", protocol.encode()))
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "scheme": "http",
            "client": (peer, 12345),
            "headers": headers,
        }
    )


def test_production_accepts_an_explicit_https_proxy_configuration():
    settings = _production()
    assert settings.mode == "production"
    assert settings.frontend_origin == "https://learn.example.test"


@pytest.mark.parametrize(
    "updates",
    [
        {"frontend_origin": "http://learn.example.test", "require_https": False},
        {"frontend_origin": "https://learn.example.test", "require_https": False},
        {"require_https": True, "trusted_proxies": []},
        {"debug": True},
        {"demo_mode": True},
        {"db_encryption": "off"},
    ],
)
def test_production_refuses_ambiguous_or_insecure_configuration(updates):
    with pytest.raises(ValueError):
        _production(**updates)


@pytest.mark.parametrize(
    "field,value",
    [
        ("frontend_origin", "*"),
        ("frontend_origin", "https://user:password@example.test"),
        ("allowed_origins", ["*"]),
        ("allowed_origins", ["https://example.test/path"]),
        ("extra_allowed_hosts", ["*.example.test"]),
        ("extra_allowed_hosts", ["https://example.test"]),
        ("trusted_proxies", ["0.0.0.0/0"]),
        ("trusted_proxies", ["::/0"]),
    ],
)
def test_wildcards_and_credential_bearing_network_settings_are_rejected(field, value):
    with pytest.raises(ValueError):
        Settings(_env_file=None, **{field: value})


def test_production_does_not_inherit_public_tunnel_host_patterns():
    settings = _production()
    assert not host_allowed("anything.trycloudflare.com", settings)
    assert not host_allowed("anything.loca.lt", settings)
    assert host_allowed("learn.example.test", settings)
    assert host_allowed("learn.example.test:443", settings)


def test_production_api_index_does_not_advertise_disabled_openapi(monkeypatch):
    import adapt.api.app as app_module

    settings = _production()
    monkeypatch.setattr(app_module, "get_settings", lambda: settings)
    application = app_module.create_app()
    assert application.openapi_url is None
    index = next(route for route in application.routes if getattr(route, "path", None) == "/api")
    assert index.endpoint()["docs"] is None


def test_https_is_required_even_when_a_direct_client_spoofs_forwarding():
    settings = _production(trusted_proxies=["192.0.2.10"])
    assert not is_secure_request(_request("198.51.100.20"), settings=settings)
    assert not is_secure_request(
        _request("198.51.100.20", protocol="https"), settings=settings
    )
    assert not is_secure_request(_request("192.0.2.10"), settings=settings)
    assert is_secure_request(_request("192.0.2.10", protocol="https"), settings=settings)
    assert not is_secure_request(
        _request("192.0.2.10", protocol="https, http"), settings=settings
    )


def test_trusted_proxy_accepts_a_scoped_container_network():
    settings = _production(trusted_proxies=["192.0.2.0/24"])
    request = _request("192.0.2.10", forwarded="198.51.100.20")
    assert client_ip(request, settings=settings) == "198.51.100.20"
    assert client_ip(_request("198.51.100.30", forwarded="203.0.113.40"), settings=settings) == "198.51.100.30"


def test_readiness_is_a_real_write_check_and_liveness_stays_separate(client):
    live = client.get("/healthz")
    ready = client.get("/readyz")
    assert live.status_code == 200
    assert ready.status_code == 200, ready.text
    assert ready.json() == {
        "ok": True,
        "checks": {"database": "ok", "database_writable": True},
    }


def test_readiness_returns_503_without_driver_details(client, monkeypatch):
    from adapt.api.routes import system

    class BrokenEngine:
        def connect(self):
            raise RuntimeError("readonly /private/learner-path/adapt.db")

    broken = SimpleNamespace(db=SimpleNamespace(engine=BrokenEngine()))
    monkeypatch.setattr(system, "current", lambda: broken)
    response = client.get("/readyz")
    assert response.status_code == 503
    assert response.json()["ok"] is False
    assert response.json()["checks"]["database_writable"] is False
    assert "learner-path" not in response.text and "readonly" not in response.text


def test_readiness_detects_an_actual_read_only_sqlite_file(tmp_path):
    # Isolate the process-wide cipher and settings from the rest of the test suite.
    script = r'''
import json, os
from types import SimpleNamespace
from adapt.db.engine import Database
from adapt.api.routes import system

db = Database()
db.upgrade_schema()
db.dispose()
os.chmod(db.db_file, 0o444)
try:
    system.current = lambda: SimpleNamespace(db=db)
    response = system.readiness_response()
    assert response.status_code == 503, response.body
    payload = json.loads(response.body)
    assert payload["checks"]["database_writable"] is False
    assert b"readonly" not in response.body.lower()
finally:
    os.chmod(db.db_file, 0o600)
    db.dispose()
'''
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith("ADAPT_")
    }
    env.update(ADAPT_DATA_DIR=str(tmp_path), ADAPT_DB_ENCRYPTION="field-only")
    result = subprocess.run(
        [sys.executable, "-c", script],
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_database_failure_is_a_safe_retryable_response(client, monkeypatch):
    from adapt.api.routes import auth as auth_routes

    def unavailable(*args, **kwargs):
        raise OperationalError(
            "INSERT INTO students ...",
            {},
            sqlite3.OperationalError("attempt to write a readonly database at /private/path"),
        )

    monkeypatch.setattr(auth_routes.S, "get_or_create_student", unavailable)
    response = client.post("/api/v1/students", json={"as_guest": True})
    assert response.status_code == 503, response.text
    assert response.json()["error"] == "database_unavailable"
    assert response.headers["x-request-id"] == response.json()["request_id"]
    assert "readonly" not in response.text and "/private/path" not in response.text
