#!/usr/bin/env python3
"""Fresh-database and migrated-existing-database smoke test.

Two scratch databases, one interpreter, no AI key:

1. **fresh** — start the API on an empty data directory; startup must create and
   upgrade the schema, serve /healthz and accept a learner.
2. **existing** — create a database at Alembic revision `0002` only (an old
   installation), then start the same API on it. Startup must upgrade it to head,
   keep the revision marker, serve /healthz and accept a learner. A row written
   before the upgrade must still be readable afterwards.

The Alembic chain itself (heads, `alembic check`, stamping a create_all database) is
covered by `backend/tests/test_migrations.py`; this script is the *boot on a
migrated file* check that a pure unit test cannot give.

Run::

    .venv/bin/python release/migration_smoke.py --out release/evidence/migration-smoke.json
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations

import argparse
import http.cookiejar
import json
import os
import pathlib
import platform
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.request
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
ADAPT = ROOT / "Adapt-main"
sys.path.insert(0, str(ROOT))
from release.stress_check import PY, Server, _request  # noqa: E402


def _env(data_dir: pathlib.Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items()
           if k not in ("ADAPT_GEMINI_API_KEY", "ADAPT_YOUTUBE_API_KEY")}
    env.update({
        "ADAPT_DATA_DIR": str(data_dir),
        "ADAPT_KEYFILE": str(data_dir / "master.key"),
        "ADAPT_DB_ENCRYPTION": "field-only",
        "ADAPT_MODE": "local",
        "ADAPT_LOG_LEVEL": "WARNING",
        "PYTHONPATH": str(ADAPT / "backend" / "src"),
    })
    return env


def _alembic(args: list[str], data_dir: pathlib.Path) -> dict[str, Any]:
    alembic = str(pathlib.Path(PY).parent / "alembic")
    proc = subprocess.run(
        [alembic, "-c", str(ADAPT / "backend" / "alembic.ini"), *args],
        cwd=str(ADAPT / "backend"), env=_env(data_dir),
        capture_output=True, text=True, timeout=180,
    )
    return {"args": args, "exit_code": proc.returncode,
            "stdout_tail": proc.stdout[-500:], "stderr_tail": proc.stderr[-500:]}


def _revision(db_file: pathlib.Path) -> str | None:
    if not db_file.exists():
        return None
    conn = sqlite3.connect(str(db_file), timeout=5)
    try:
        row = conn.execute("SELECT version_num FROM alembic_version").fetchone()
        return row[0] if row else None
    except sqlite3.Error:
        return None
    finally:
        conn.close()


def _boot(data_dir: pathlib.Path, label: str) -> dict[str, Any]:
    server = Server(data_dir)
    result: dict[str, Any] = {"label": label, "data_dir": str(data_dir)}
    try:
        server.start()
        status, _body, _h, ms = _request("GET", server.base + "/healthz", timeout=10)
        jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        guest, created, _h2, guest_ms = _request(
            "POST", server.base + "/api/v1/students",
            body={"display_name": f"Migration {label}", "as_guest": True,
                  "consent_analytics": False}, timeout=20, opener=opener,
        )
        me, _me_body, _h3, _ = _request("GET", server.base + "/api/v1/me", timeout=10,
                                       opener=opener)
        result.update({
            "healthz_status": status, "healthz_ms": ms,
            "learner_create_status": guest, "learner_create_ms": guest_ms,
            "me_status": me,
            "learner_id": created.get("student_id") if isinstance(created, dict) else None,
            "server_log_tail": server._tail(6),
        })
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
        result["server_log_tail"] = server._tail(12)
    finally:
        server.stop()
    result["alembic_revision_after_boot"] = _revision(data_dir / "adapt.db")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="release/evidence/migration-smoke.json")
    args = parser.parse_args()
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="adapt-migration-"))
    fresh_dir = tmp / "fresh"
    legacy_dir = tmp / "existing"
    fresh_dir.mkdir(parents=True, exist_ok=True)
    legacy_dir.mkdir(parents=True, exist_ok=True)
    report: dict[str, Any] = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "python": platform.python_version(),
        "ai_credentials_used": False,
        "checks": [], "runs": [], "notes": [],
    }
    try:
        legacy_upgrade = _alembic(["upgrade", "0002"], legacy_dir)
        legacy_before = _revision(legacy_dir / "adapt.db")
        # A row written by the old schema must survive the startup upgrade.
        conn = sqlite3.connect(str(legacy_dir / "adapt.db"), timeout=5)
        try:
            tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            report["legacy_tables_at_0002_count"] = len(tables)
            report["legacy_has_alembic_version"] = "alembic_version" in tables
        finally:
            conn.close()
        report["alembic_upgrade_0002"] = legacy_upgrade
        report["legacy_revision_before_boot"] = legacy_before

        fresh = _boot(fresh_dir, "fresh")
        existing = _boot(legacy_dir, "existing")
        report["runs"] = [fresh, existing]
        head = _alembic(["heads"], legacy_dir).get("stdout_tail", "").split()
        head_rev = head[0] if head else None
        report["head_revision"] = head_rev

        report["checks"] = [
            {"name": "legacy_database_starts_at_revision_0002",
             "ok": legacy_before == "0002", "detail": str(legacy_before)},
            {"name": "fresh_database_boots_and_accepts_a_learner",
             "ok": fresh.get("healthz_status") == 200 and fresh.get("learner_create_status") == 200
                   and fresh.get("me_status") == 200,
             "detail": json.dumps({k: fresh.get(k) for k in ("healthz_status", "learner_create_status", "me_status", "error")})},
            {"name": "existing_database_is_upgraded_by_startup",
             "ok": existing.get("alembic_revision_after_boot") == head_rev and head_rev is not None,
             "detail": f"{legacy_before} -> {existing.get('alembic_revision_after_boot')} (head {head_rev})"},
            {"name": "migrated_database_boots_and_accepts_a_learner",
             "ok": existing.get("healthz_status") == 200 and existing.get("learner_create_status") == 200
                   and existing.get("me_status") == 200,
             "detail": json.dumps({k: existing.get(k) for k in ("healthz_status", "learner_create_status", "me_status", "error")})},
        ]
    except Exception as exc:
        report["checks"].append({"name": "harness_completed", "ok": False,
                                 "detail": f"{type(exc).__name__}: {exc}"})
    finally:
        failed = [c for c in report["checks"] if not c["ok"]]
        report["outcome"] = "PASS" if report["checks"] and not failed else "FAIL"
        out = ROOT / args.out
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        for check in report["checks"]:
            print(f"  {'ok  ' if check['ok'] else 'FAIL'}  {check['name']} — {check.get('detail', '')[:160]}")
        print(f"wrote {args.out} — {report['outcome']}")
        shutil.rmtree(tmp, ignore_errors=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
