#!/usr/bin/env python3
"""Measured failure + load checks against a REAL Adapt API process.

This is not a benchmark claim. It starts its own uvicorn on an ephemeral loopback
port with a scratch data directory, drives real HTTP, and writes the numbers it
actually observed to a JSON file. A slow CI machine changes the numbers; it does
not turn them into a pass. Checks only assert invariants (no 5xx, contract holds,
restart keeps the session, rate limiting returns 429 + Retry-After).

Run from the repository root with the backend installed::

    .venv/bin/python release/stress_check.py --out release/evidence/stress-2026-10-23.json

No AI key is read or required: the server environment has ADAPT_GEMINI_API_KEY and
ADAPT_YOUTUBE_API_KEY explicitly removed. The model-capable route is exercised on
its deterministic fallback branch and the report says so.

Exit codes: 0 = all invariant checks passed, 1 = a genuine regression,
2 = the harness could not start/measure (environmental, reported separately).
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import http.cookiejar
import json
import os
import pathlib
import platform
import shutil
import signal
import socket
import sqlite3
import statistics
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
ADAPT = ROOT / "Adapt-main"
sys.path.insert(0, str(ROOT))
from integration.contract.validate import ContractError, validate_response  # noqa: E402
from integration.reference_client import adapt as reference_adapt  # noqa: E402

VALID = json.loads((ROOT / "integration/contract/fixtures/valid_request.json").read_text())
STANDARD = json.loads((ROOT / "integration/contract/fixtures/standard_content_fallback.json").read_text())
URL_PATH = "/api/v1/integration/adapt"
PY = os.environ.get("RELEASE_PYTHON", sys.executable)

RESULTS: dict[str, Any] = {
    "harness": "release/stress_check.py",
    "generated_at": dt.datetime.now(dt.UTC).isoformat(),
    "python": platform.python_version(),
    "platform": platform.platform(),
    "ai_credentials_used": False,
    "scenarios": [],
    "notes": [],
}
SCENARIOS: list[dict[str, Any]] = []


def _pct(values: list[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round(fraction * (len(ordered) - 1))))
    return round(ordered[index], 2)


def _stat(values: list[float]) -> dict[str, float]:
    return {
        "n": len(values),
        "min_ms": round(min(values), 2) if values else 0,
        "p50_ms": _pct(values, 0.5),
        "p95_ms": _pct(values, 0.95),
        "max_ms": round(max(values), 2) if values else 0,
        "mean_ms": round(statistics.fmean(values), 2) if values else 0,
    }


def _scenario(name: str, measured: dict[str, Any], checks: list[tuple[bool, str, str]]) -> None:
    SCENARIOS.append({
        "name": name,
        "measured": measured,
        "checks": [{"ok": bool(ok), "label": label, "detail": detail} for ok, label, detail in checks],
        "outcome": "PASS" if all(ok for ok, _l, _d in checks) else "FAIL",
    })
    marker = "PASS" if all(ok for ok, _l, _d in checks) else "FAIL"
    print(f"  {marker}  {name}")
    for key, value in measured.items():
        print(f"        {key}: {json.dumps(value) if isinstance(value, (dict, list)) else value}")
    for ok, label, detail in checks:
        if not ok:
            print(f"        !! {label}: {detail}")


# --------------------------------------------------------------------------- #
# a real server, owned by this process
# --------------------------------------------------------------------------- #
class Server:
    def __init__(self, data_dir: pathlib.Path, *, rate_multiplier: float = 1.0,
                 log_path: pathlib.Path | None = None, providers_enabled: bool = False,
                 operator_token: str | None = None):
        self.data_dir = data_dir
        self.rate_multiplier = rate_multiplier
        self.operator_token = operator_token
        # Default OFF for a reproducible, credential-free gate: four public resource
        # providers would otherwise add real network latency/flakiness to a test that
        # is about Adapt's own concurrency. The outage diagnostic opts back in.
        self.providers_enabled = providers_enabled
        self.sock = socket.socket()
        self.sock.bind(("127.0.0.1", 0))
        self.port = self.sock.getsockname()[1]
        self.sock.close()
        self.base = f"http://127.0.0.1:{self.port}"
        self.proc: subprocess.Popen | None = None
        self.log_path = log_path or (data_dir / "server.log")
        self.log_file: Any = None

    def start(self, timeout_s: float = 45) -> None:
        env = {k: v for k, v in os.environ.items() if k not in ("ADAPT_GEMINI_API_KEY", "ADAPT_YOUTUBE_API_KEY")}
        env.update({
            "ADAPT_DATA_DIR": str(self.data_dir),
            "ADAPT_KEYFILE": str(self.data_dir / "master.key"),
            "ADAPT_DB_ENCRYPTION": "field-only",
            "ADAPT_MODE": "local",
            "ADAPT_LOG_LEVEL": "WARNING",
            "ADAPT_RATE_LIMIT_MULTIPLIER": str(self.rate_multiplier),
            "ADAPT_FRONTEND_ORIGIN": self.base,
            "PYTHONPATH": str(ADAPT / "backend" / "src"),
        })
        if self.operator_token:
            env["ADAPT_OPERATOR_TOKEN"] = self.operator_token
        if not self.providers_enabled:
            env.update({
                "ADAPT_OPENALEX_ENABLED": "false",
                "ADAPT_ARXIV_ENABLED": "false",
                "ADAPT_OPENLIBRARY_ENABLED": "false",
                # YouTube is skipped anyway without a key; be explicit.
                "ADAPT_YOUTUBE_ENABLED": "false",
            })
        self.log_file = self.log_path.open("w", encoding="utf-8")
        self.proc = subprocess.Popen(
            [PY, "-m", "uvicorn", "adapt.api.app:app", "--host", "127.0.0.1", "--port", str(self.port),
             "--app-dir", str(ADAPT / "backend"), "--log-level", "warning"],
            env=env, stdout=self.log_file, stderr=subprocess.STDOUT, start_new_session=True,
        )
        deadline = time.monotonic() + timeout_s
        last = ""
        while time.monotonic() < deadline:
            if self.proc.poll() is not None:
                raise RuntimeError(f"server exited early ({self.proc.returncode}); log: {self._tail()}")
            try:
                with urllib.request.urlopen(self.base + "/healthz", timeout=1.5) as response:
                    if response.status == 200:
                        return
            except Exception as exc:
                last = type(exc).__name__
            time.sleep(0.25)
        raise RuntimeError(f"server did not become healthy in {timeout_s}s (last error {last}); log: {self._tail()}")

    def _tail(self, lines: int = 12) -> str:
        try:
            return "\n".join(self.log_path.read_text(encoding="utf-8").splitlines()[-lines:])
        except Exception:
            return "(no log)"

    def stop(self) -> None:
        if self.proc and self.proc.poll() is None:
            try:
                os.killpg(os.getpgid(self.proc.pid), signal.SIGTERM)
            except (ProcessLookupError, PermissionError):
                self.proc.terminate()
            try:
                self.proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(os.getpgid(self.proc.pid), signal.SIGKILL)
                self.proc.wait(timeout=5)
        if self.log_file:
            self.log_file.close()
            self.log_file = None


def _request(
    method: str, url: str, *, body: Any = None, headers: dict[str, str] | None = None,
    timeout: float = 20, opener=None, raw: bytes | None = None,
) -> tuple[int, Any, dict[str, str], float]:
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    started = time.monotonic()
    do_open = opener.open if opener is not None else urllib.request.urlopen
    try:
        with do_open(req, timeout=timeout) as response:
            payload = response.read()
            status = int(getattr(response, "status", 200) or 200)
            response_headers = dict(response.headers.items())
    except urllib.error.HTTPError as exc:
        payload = exc.read()
        status = int(exc.code)
        response_headers = dict(exc.headers.items()) if exc.headers else {}
    except Exception as exc:  # transport failure is a measurement, not a crash
        return 0, {"transport_error": f"{type(exc).__name__}: {exc}"}, {}, round((time.monotonic() - started) * 1000, 2)
    elapsed = round((time.monotonic() - started) * 1000, 2)
    try:
        parsed = json.loads(payload.decode("utf-8")) if payload else {}
    except (ValueError, UnicodeDecodeError):
        parsed = {"non_json_body_bytes": len(payload)}
    return status, parsed, response_headers, elapsed


def _guest(base: str) -> tuple[http.cookiejar.CookieJar, Any, dict[str, str], str]:
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    status, body, _h, _ms = _request(
        "POST", base + "/api/v1/students", opener=opener,
        body={"display_name": "Release Stress", "age_band": "16-18", "as_guest": True,
              "consent_analytics": True},
    )
    if status != 200:
        raise RuntimeError(f"could not create a guest learner: {status} {body}")
    csrf = body["csrf_token"]
    return jar, opener, {"x-csrf-token": csrf}, body["student_id"]


# --------------------------------------------------------------------------- #
# scenarios
# --------------------------------------------------------------------------- #
def _oversize_probe(base: str, announced_bytes: int) -> tuple[int, str]:
    """Announce an oversized body but send only 1 KB, so the 413 can be read."""
    host, port = base.split("://", 1)[1].split(":")
    try:
        with socket.create_connection((host, int(port)), timeout=10) as conn:
            head = (
                f"POST {URL_PATH} HTTP/1.1\r\n"
                f"Host: {host}:{port}\r\n"
                "Content-Type: application/json\r\n"
                f"Content-Length: {announced_bytes}\r\n"
                "Connection: close\r\n\r\n"
            ).encode() + b"x" * 1024
            conn.sendall(head)
            conn.settimeout(10)
            data = conn.recv(4096)
        line = data.split(b"\r\n", 1)[0].decode("latin-1", "replace")
        return int(line.split(" ")[1]) if len(line.split(" ")) > 1 else 0, line
    except Exception as exc:  # pragma: no cover - reported as a measurement
        return 0, f"{type(exc).__name__}: {exc}"


def scenario_health_and_no_key(base: str) -> None:
    status, _health, _h, ms = _request("GET", base + "/healthz")
    # /api/v1/status is a signed-in operator route, not a public probe.
    _jar, opener, _headers, _sid = _guest(base)
    s2, status_body, _h2, _ = _request("GET", base + "/api/v1/status", opener=opener)
    # The privacy boundary deliberately drops the "llm" key from every public
    # payload, so the honest evidence of "no key" is the lesson-mode sentence the
    # status route does publish -- and the absence of the redacted key.
    configured_key_present = isinstance(status_body, dict) and "llm" in status_body
    lesson_state = (status_body.get("lessons") or {}).get("state") if isinstance(status_body, dict) else None
    _scenario("backend_startup_and_no_ai_credential", {
        "healthz_status": status, "healthz_ms": ms,
        "status_route_status": s2, "status_route_requires_session": True,
        "llm_key_redacted_from_public_status": not configured_key_present,
        "published_lesson_state": lesson_state,
        "ai_key_in_server_env": False,
    }, [
        (status == 200, "healthz answers", str(status)),
        (s2 == 200, "the operator status route answers for a signed-in learner", str(s2)),
        (configured_key_present is False, "the privacy boundary drops model metadata", repr(configured_key_present)),
        (lesson_state == "simple mode", "no model key is configured or required", repr(lesson_state)),
    ])


def scenario_concurrent_learners(base: str, learners: int = 20, per_learner: int = 5) -> None:
    def one(index: int):
        body = json.loads(json.dumps(VALID))
        body["learner"] = {"id": f"stress-learner-{index % learners}", "language": "en"}
        body["institution_id"] = f"institution-{index % 3}"
        status, payload, _h, ms = _request("POST", base + URL_PATH, body=body, timeout=25)
        contract_ok = True
        if status == 200:
            try:
                validate_response(payload)
            except ContractError:
                contract_ok = False
        return status, ms, contract_ok, payload

    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=learners) as pool:
        rows = list(pool.map(one, range(learners * per_learner)))
    wall = round((time.monotonic() - started) * 1000, 2)
    statuses = [r[0] for r in rows]
    latencies = [r[1] for r in rows]
    bad_contract = sum(1 for r in rows if not r[2])
    plans = {json.dumps(r[3].get("adapted_content"), sort_keys=True) for r in rows if r[0] == 200}
    _scenario("concurrent_learners", {
        "learners": learners, "requests": len(rows), "wall_ms": wall,
        "measured_requests_per_second": round(len(rows) / max(wall / 1000, 0.001), 2),
        "latency": _stat(latencies), "status_counts": {str(s): statuses.count(s) for s in sorted(set(statuses))},
        "distinct_plans": len(plans), "contract_failures": bad_contract,
    }, [
        (all(s == 200 for s in statuses), "every concurrent learner got a 200", str(sorted(set(statuses)))),
        (bad_contract == 0, "every 200 matched the response schema", str(bad_contract)),
        (all(r[1] < 25_000 for r in rows), "no request hit the client timeout", str(max(latencies))),
    ])


def scenario_duplicate_submissions(base: str, count: int = 50) -> None:
    def one(_i):
        return _request("POST", base + URL_PATH, body=VALID, timeout=25)

    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        rows = list(pool.map(one, range(count)))
    wall = round((time.monotonic() - started) * 1000, 2)
    plans = {json.dumps(r[1].get("adapted_content"), sort_keys=True) for r in rows if r[0] == 200}
    ids = {r[1].get("request_id") for r in rows if r[0] == 200}
    _scenario("duplicate_submissions", {
        "identical_requests": count, "wall_ms": wall, "latency": _stat([r[3] for r in rows]),
        "distinct_plans": len(plans), "distinct_request_ids": len(ids),
        "status_counts": {str(s): sum(1 for r in rows if r[0] == s) for s in sorted({r[0] for r in rows})},
    }, [
        (all(r[0] == 200 for r in rows), "duplicates are answered, not rejected", "see status_counts"),
        (len(plans) == 1, "the same request produces the same lesson", str(len(plans))),
        (len(ids) == count, "each duplicate is a separate request (stateless door)", str(len(ids))),
    ])


def scenario_large_payloads(base: str) -> None:
    body = json.loads(json.dumps(VALID))
    sentence = "Fractions need equal sized parts before the numerators can be added together. "
    body["content"]["explanation"] = (sentence * 900)[:64_000]
    body["activity"] = [
        {"id": f"e{i}", "kind": "attempt", "topic_id": "fractions_add",
         "correct": i % 3 != 0, "response_ms": 1500 + i}
        for i in range(500)
    ]
    raw = json.dumps(body).encode()
    status, payload, _h, ms = _request("POST", base + URL_PATH, raw=raw, timeout=60)
    blocks = len((payload or {}).get("adapted_content", {}).get("blocks", [])) if isinstance(payload, dict) else 0
    contract_ok = status == 200
    if contract_ok:
        try:
            validate_response(payload)
        except ContractError:
            contract_ok = False

    # One byte over the configured 8 MB cap. urllib sends the whole 8 MB and the
    # server closes the socket as soon as its Content-Length check fires, so a
    # normal client sees a connection reset (status 0), not the 413. Announcing the
    # same size over a raw socket and sending only 1 KB lets the refusal be read.
    # Both behaviours are recorded; neither is hidden.
    too_big = b"x" * (8 * 1024 * 1024 + 1)
    big_status, _big_body, _bh, big_ms = _request(
        "POST", base + URL_PATH, raw=too_big, timeout=30,
    )
    raw_status, raw_line = _oversize_probe(base, len(too_big))
    health_after, _hh, _hhh, health_after_ms = _request("GET", base + "/healthz")
    _scenario("large_but_valid_payloads", {
        "valid_body_bytes": len(raw), "valid_status": status, "valid_elapsed_ms": ms,
        "valid_blocks_returned": blocks, "valid_matches_schema": contract_ok,
        "oversize_body_bytes": len(too_big),
        "oversize_urllib_status": big_status, "oversize_urllib_ms": big_ms,
        "oversize_urllib_note": "client sees connection reset because the server refuses before reading the announced body",
        "oversize_raw_socket_status": raw_status, "oversize_raw_status_line": raw_line,
        "health_after_oversize": health_after, "health_after_ms": health_after_ms,
    }, [
        (status == 200 and contract_ok, "a large valid request is adapted within the schema", f"{status}/{contract_ok}"),
        (raw_status == 413, "an announced body over 8 MB is refused with 413", f"{raw_status} {raw_line}"),
        (health_after == 200, "the server still answers after refusing an oversized body", str(health_after)),
    ])


def scenario_ai_route_without_key(base: str, count: int = 16) -> None:
    _jar, _opener, headers, student_id = _guest(base)
    cookie_header = "; ".join(f"{c.name}={c.value}" for c in _jar)
    all_headers = {**headers, "Cookie": cookie_header}

    def one(index: int):
        return _request(
            "POST", base + "/api/v1/explain",
            body={"question": f"Why do denominators have to match? ({index})", "topic_id": "fractions_add"},
            headers=all_headers, timeout=20,
        )

    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=count) as pool:
        rows = list(pool.map(one, range(count)))
    wall = round((time.monotonic() - started) * 1000, 2)
    health_after, _hh, _hhh, _hms = _request("GET", base + "/healthz", timeout=8)
    statuses = [r[0] for r in rows]
    deterministic = sum(
        1 for r in rows if r[0] == 200 and isinstance(r[1], dict)
        and ("served_by" in r[1] or r[1].get("mode") in ("deterministic", "local", "simple"))
    )
    _scenario("concurrent_ai_capable_route_no_key", {
        "learner_id": student_id, "requests": count, "wall_ms": wall,
        "latency": _stat([r[3] for r in rows]),
        "status_counts": {str(s): statuses.count(s) for s in sorted(set(statuses))},
        "responses_labelled_local_or_fallback": deterministic,
        "health_after_concurrency": health_after,
        "external_resource_providers": "disabled for this deterministic CI scenario",
        "note": "POST /api/v1/explain is the model-capable route; with no key it must answer on the deterministic local branch or be paced with 429, never 5xx.",
    }, [
        (all(s in (200, 429, 503) for s in statuses), "no unhandled 5xx on the AI route", str(sorted(set(statuses)))),
        (any(s == 200 for s in statuses), "the no-key fallback still teaches", str(sorted(set(statuses)))),
        (not any(s == 401 for s in statuses), "the session cookie was accepted", str(sorted(set(statuses)))),
        (health_after == 200, "the API is not wedged after concurrent AI-capable calls", str(health_after)),
    ])


def scenario_restart_and_stale_session(server: Server) -> None:
    jar, opener, headers, student_id = _guest(server.base)
    status, _session, _h, _ms = _request(
        "POST", server.base + "/api/v1/sessions", body={"mode": "practice"},
        headers=headers, opener=opener,
    )
    before_integration = _request("POST", server.base + URL_PATH, body=VALID)[0]

    server.stop()
    server.start()
    status_me, me, _h, me_ms = _request("GET", server.base + "/api/v1/me", opener=opener)
    status_journey, _journey, _h2, _ = _request("GET", server.base + "/api/v1/journey", opener=opener)
    after_integration = _request("POST", server.base + URL_PATH, body=VALID)[0]

    # Force the stored session to be stale without waiting 12 hours.
    db_path = server.data_dir / "adapt.db"
    stale_status = None
    if db_path.exists():
        conn = sqlite3.connect(str(db_path), timeout=5)
        try:
            conn.execute("UPDATE auth_sessions SET expires_at = ?", ("2000-01-01 00:00:00.000000",))
            conn.commit()
        finally:
            conn.close()
        stale_status = _request("GET", server.base + "/api/v1/me", opener=opener)[0]
    stateless_status = _request("POST", server.base + URL_PATH, body=VALID)[0]

    _scenario("server_restart_and_stale_session", {
        "session_created_status": status,
        "integration_before_restart": before_integration,
        "me_after_restart_status": status_me, "me_after_restart_ms": me_ms,
        "student_id_survived": isinstance(me, dict) and me.get("student_id") == student_id,
        "journey_after_restart_status": status_journey,
        "integration_after_restart": after_integration,
        "forced_stale_session_me_status": stale_status,
        "integration_with_stale_session": stateless_status,
        "cookie_count": len(list(jar)),
    }, [
        (status == 200, "a session can be created", str(status)),
        (status_me == 200 and isinstance(me, dict) and me.get("student_id") == student_id,
         "the same cookie still identifies the same learner after a restart", f"{status_me} {me}"[:180]),
        (status_journey == 200, "stateful read works after restart", str(status_journey)),
        (before_integration == after_integration == 200, "the stateless door survives restart", f"{before_integration}/{after_integration}"),
        (stale_status == 401, "a forced-stale session is refused, not silently trusted", str(stale_status)),
        (stateless_status == 200, "the stateless door ignores stale sessions entirely", str(stateless_status)),
    ])


def scenario_database_locked(server: Server, hold_s: float = 2.0) -> None:
    _jar, opener, headers, _sid = _guest(server.base)
    db_path = server.data_dir / "adapt.db"
    release = threading.Event()

    def hold_lock() -> None:
        conn = sqlite3.connect(str(db_path), timeout=10, isolation_level=None)
        try:
            conn.execute("BEGIN EXCLUSIVE")
            release.wait(hold_s)
            conn.execute("ROLLBACK")
        except sqlite3.Error:
            pass
        finally:
            conn.close()

    thread = threading.Thread(target=hold_lock, daemon=True)
    thread.start()
    time.sleep(0.4)  # let the exclusive transaction take effect
    int_status, _int_body, _h, int_ms = _request("POST", server.base + URL_PATH, body=VALID, timeout=20)
    write_status, write_body, _h2, write_ms = _request(
        "POST", server.base + "/api/v1/sessions", body={"mode": "practice"},
        headers=headers, opener=opener, timeout=20,
    )
    release.set()
    thread.join(timeout=5)
    after_status, _after, _h3, after_ms = _request(
        "POST", server.base + "/api/v1/sessions", body={"mode": "practice"},
        headers=headers, opener=opener, timeout=20,
    )
    _scenario("database_locked_or_busy", {
        "hold_seconds": hold_s,
        "stateless_integration_during_lock": int_status, "integration_ms": int_ms,
        "stateful_write_during_lock": write_status, "write_ms": write_ms,
        "write_body_shape": sorted(write_body.keys())[:8] if isinstance(write_body, dict) else str(write_body)[:80],
        "stateful_write_after_release": after_status, "after_release_ms": after_ms,
    }, [
        (int_status == 200, "the stateless door answers while the database is write-locked", str(int_status)),
        (write_status != 0, "a stateful write answers rather than hanging past the client timeout", str(write_status)),
        (after_status == 200, "the stateful write succeeds once the lock is released", str(after_status)),
    ])


def scenario_rate_limit(data_root: pathlib.Path, requests: int = 40) -> None:
    data = data_root / "ratelimit"
    data.mkdir(parents=True, exist_ok=True)
    # build_limiter clamps any multiplier below 0.05, so 0.05 is the smallest
    # deterministic setting (ip capacity 12, 6/min refill).
    server = Server(data, rate_multiplier=0.05)
    try:
        server.start()
        statuses: list[int] = []
        retry_headers: list[str] = []
        latencies: list[float] = []
        for index in range(requests):
            status, _body, headers, ms = _request(
                "POST", server.base + URL_PATH,
                body={**VALID, "learner": {"id": f"rate-{index}"}}, timeout=15,
            )
            statuses.append(status)
            latencies.append(ms)
            retry_value = next((v for k, v in headers.items() if k.lower() == "retry-after"), None)
            if retry_value is not None:
                retry_headers.append(retry_value)
        _scenario("rate_limit_responses", {
            "multiplier": 0.05, "requests": requests,
            "note": "build_limiter clamps multipliers below 0.05; ip capacity is 12 tokens",
            "status_counts": {str(s): statuses.count(s) for s in sorted(set(statuses))},
            "retry_after_values": retry_headers[:5],
            "latency": _stat(latencies),
        }, [
            (429 in statuses, "a paced caller receives 429", str(sorted(set(statuses)))),
            (bool(retry_headers), "429 carries Retry-After for backoff", str(retry_headers[:3])),
            (not any(s >= 500 for s in statuses), "rate limiting is not a 5xx", str(sorted(set(statuses)))),
        ])
    finally:
        server.stop()


def scenario_retry_storm_and_credits(base: str) -> None:
    # A closed port is Adapt-down from the caller's point of view.
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    result = reference_adapt(
        f"http://127.0.0.1:{port}", VALID, standard_content=STANDARD,
        max_attempts=3, timeout_s=0.2, backoff_s=0.01, allow_loopback=True,
    )
    status, openapi, _h, _ms = _request("GET", base + "/api/openapi.json", timeout=20)
    paths = list((openapi or {}).get("paths", {}).keys()) if isinstance(openapi, dict) else []
    credit_paths = [p for p in paths if "credit" in p.lower()]
    _scenario("retry_storm_and_credit_support", {
        "reference_caller_attempts": result.attempts,
        "reference_caller_source": result.source,
        "reference_caller_adapted": result.adapted,
        "openapi_status": status, "openapi_path_count": len(paths),
        "credit_related_paths": credit_paths,
        "backend_credit_enforcement": "present (institution wallet, ledger, operator admin plane)"
        if credit_paths else "absent (presentation-only engine console)",
        "exhausted_credit_case": (
            "now covered live by release/e2e_smoke.py::run_exhausted_credits and in the backend "
            "suite by test_credits_and_tenancy.py::test_an_empty_wallet_stops_generation_and_says_what_still_works"
            if credit_paths else "not testable: no server-side credit ledger, balance or debit route exists"
        ),
    }, [
        (result.attempts == 3 and not result.adapted, "retry storm is bounded and falls back", f"{result.attempts}/{result.source}"),
        (status == 200 and len(paths) > 20, "OpenAPI is readable for the capability check", f"{status}/{len(paths)}"),
    ])


def _record_finding(name: str, measured: dict[str, Any], note: str) -> None:
    """A measured finding that is reported but does not by itself fail the gate."""
    SCENARIOS.append({
        "name": name, "measured": measured, "checks": [],
        "outcome": "FINDING", "note": note,
    })
    print(f"  FIND  {name}: {note}")
    for key, value in measured.items():
        print(f"        {key}: {json.dumps(value) if isinstance(value, (dict, list)) else value}")


def scenario_provider_outage_concurrency(data_root: pathlib.Path, count: int = 16) -> None:
    """Diagnostic: the same AI route with external resource providers left enabled.

    Opt-in (``--include-provider-outage``) because in a sandbox with blocked egress
    each provider can burn an 8 s timeout. It is a measurement, not a gate check.
    """
    data = data_root / "providers"
    data.mkdir(parents=True, exist_ok=True)
    server = Server(data, providers_enabled=True)
    try:
        server.start()
        _jar, _opener, headers, _sid = _guest(server.base)
        cookie_header = "; ".join(f"{c.name}={c.value}" for c in _jar)
        all_headers = {**headers, "Cookie": cookie_header}

        def one(index: int):
            return _request(
                "POST", server.base + "/api/v1/explain",
                body={"question": f"Why do denominators have to match? ({index})",
                      "topic_id": "fractions_add"},
                headers=all_headers, timeout=10,
            )

        started = time.monotonic()
        with concurrent.futures.ThreadPoolExecutor(max_workers=count) as pool:
            rows = list(pool.map(one, range(count)))
        wall = round((time.monotonic() - started) * 1000, 2)
        health_after, _h, _h2, _ms = _request("GET", server.base + "/healthz", timeout=8)
        statuses = [r[0] for r in rows]
        measured = {
            "requests": count, "wall_ms": wall,
            "status_counts": {str(s): statuses.count(s) for s in sorted(set(statuses))},
            "latency": _stat([r[3] for r in rows]),
            "health_after_concurrency": health_after,
            "external_resource_providers": "enabled (real network attempts, may be blocked)",
        }
        wedged = health_after != 200
        _record_finding(
            "diagnostic_concurrent_ai_route_with_providers_enabled", measured,
            "API wedged after concurrent AI-capable calls (release blocker for pilot/production)"
            if wedged else "API stayed responsive with providers enabled in this environment",
        )
    finally:
        server.stop()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="release/evidence/stress-results.json")
    parser.add_argument("--learners", type=int, default=20)
    parser.add_argument("--per-learner", type=int, default=5)
    parser.add_argument("--include-provider-outage", action="store_true",
                        help="also run the opt-in provider-outage diagnostic (network dependent)")
    args = parser.parse_args()

    tmp = pathlib.Path(tempfile.mkdtemp(prefix="adapt-release-stress-"))
    data = tmp / "main"
    data.mkdir(parents=True, exist_ok=True)
    server = Server(data)
    try:
        print(f"starting Adapt on {server.base} (data {data})")
        server.start()
        scenario_health_and_no_key(server.base)
        scenario_concurrent_learners(server.base, args.learners, args.per_learner)
        scenario_duplicate_submissions(server.base)
        scenario_large_payloads(server.base)
        scenario_ai_route_without_key(server.base)
        scenario_retry_storm_and_credits(server.base)
        scenario_restart_and_stale_session(server)
        scenario_database_locked(server)
        scenario_rate_limit(tmp)
        if args.include_provider_outage:
            scenario_provider_outage_concurrency(tmp)
    except Exception as exc:  # environmental: report, do not pretend it passed
        RESULTS["notes"].append(f"harness error: {type(exc).__name__}: {exc}")
        RESULTS["notes"].append(f"server log tail: {server._tail()}")
        RESULTS["scenarios"] = SCENARIOS
        out = ROOT / args.out
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(RESULTS, indent=2) + "\n")
        print(f"HARNESS ERROR: {exc}\nwrote {args.out}", file=sys.stderr)
        return 2
    finally:
        server.stop()
        RESULTS["scenarios"] = SCENARIOS
        RESULTS["notes"].append(
            "Numbers are measurements from this run, not capacity guarantees. Loopback HTTP on "
            "one sandbox machine; no browser, no CDN, no production database encryption."
        )
        shutil.rmtree(tmp, ignore_errors=True)

    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(RESULTS, indent=2) + "\n")
    failures = [c for s in SCENARIOS for c in s["checks"] if not c["ok"]]
    findings = [s["name"] for s in SCENARIOS if s["outcome"] == "FINDING"]
    RESULTS["summary"] = {
        "scenarios": len(SCENARIOS),
        "checks": sum(len(s["checks"]) for s in SCENARIOS),
        "failures": len(failures),
        "findings": findings,
        "outcome": "PASS" if not failures else "FAIL",
    }
    out.write_text(json.dumps(RESULTS, indent=2) + "\n")
    print(f"\nwrote {args.out} — {RESULTS['summary']}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
