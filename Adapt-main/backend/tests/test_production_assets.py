"""Static checks for the shipped single-host production deployment examples."""

from __future__ import annotations

from pathlib import Path

from adapt.config import Settings

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / "deploy"


def _env(path: Path) -> dict[str, str]:
    values = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        name, separator, value = line.partition("=")
        assert separator, line
        values[name] = value
    return values


def test_production_api_template_is_valid_and_web_gets_no_provider_credentials():
    api = _env(DEPLOY / "api.env.example")
    web = _env(DEPLOY / "web.env.example")
    settings = Settings(
        _env_file=None,
        **{name.removeprefix("ADAPT_").lower(): value for name, value in api.items()},
    )
    assert settings.mode == "production"
    assert settings.require_https is True
    assert settings.frontend_origin.startswith("https://")
    assert settings.db_encryption == "sqlcipher"
    assert settings.data_dir.is_absolute() and settings.db_file.is_absolute()
    assert settings.demo_mode is False and settings.debug is False

    forbidden = ("KEY", "PASSPHRASE", "SECRET", "DB_PATH", "DATA_DIR")
    assert not [name for name in web if any(marker in name for marker in forbidden)]
    assert "ADAPT_GEMINI_API_KEY" not in api  # the real credential line stays commented
    assert web["ADAPT_API"] == "http://127.0.0.1:8000"
    assert web["HOST"] == "127.0.0.1"
    assert web["ADAPT_ALLOWED_HOSTS"] == api["ADAPT_EXTRA_ALLOWED_HOSTS"]
    assert api["ADAPT_TRUSTED_PROXIES"] == web["ADAPT_TRUSTED_PROXIES"]


def test_services_are_non_root_bounded_and_use_separate_environment_files():
    api = (DEPLOY / "adapt-api.service").read_text(encoding="utf-8")
    web = (DEPLOY / "adapt-web.service").read_text(encoding="utf-8")
    for unit in (api, web):
        assert "User=adapt" in unit and "Group=adapt" in unit
        assert "NoNewPrivileges=true" in unit
        assert "MemoryMax=" in unit and "TasksMax=" in unit
        assert "TimeoutStopSec=" in unit and "KillSignal=SIGTERM" in unit
        assert "CapabilityBoundingSet=\n" in unit
        assert "UMask=0077" in unit
    assert "EnvironmentFile=/etc/adapt/api.env" in api
    assert "EnvironmentFile=/etc/adapt/web.env" in web
    assert "EnvironmentFile=/etc/adapt/web.env" not in api
    assert "EnvironmentFile=/etc/adapt/api.env" not in web
    assert "--workers" not in api  # SQLite writer and in-memory limiter stay single-process


def test_tls_proxy_forwards_scheme_and_upgrades_websockets():
    nginx = (DEPLOY / "nginx-adapt.conf").read_text(encoding="utf-8")
    assert "ssl_protocols TLSv1.2 TLSv1.3;" in nginx
    assert "proxy_pass http://127.0.0.1:3000;" in nginx
    assert "proxy_set_header X-Forwarded-Proto $scheme;" in nginx
    assert "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;" in nginx
    assert "location /ws/" in nginx and "proxy_set_header Upgrade $http_upgrade;" in nginx
    assert "client_max_body_size 8m;" in nginx
    assert "https://learn.example.com$request_uri" in nginx
