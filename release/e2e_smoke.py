#!/usr/bin/env python3
"""End-to-end release smoke over REAL HTTP, on a fresh and on a migrated database.

This is the executable release matrix. It starts its own Adapt API (and optionally
the built Next.js web server), drives the public surface with a cookie jar, and
records the status of every step. It never manufactures a proposal: if the app
has not observed enough to propose a change, the report says so and the check is
that the pending endpoint answered honestly.

Run::

    .venv/bin/python release/e2e_smoke.py --web --out release/evidence/e2e-smoke.json
    .venv/bin/python release/migration_smoke.py --out release/evidence/migration-smoke.json

No AI key is needed or read; the deterministic local path is what is exercised and
the report labels it. Provider and backend outages are measured by
``release/stress_check.py``; this file focuses on the learner-facing journey.
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations

import argparse
import contextlib
import http.cookiejar
import json
import os
import pathlib
import platform
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
ADAPT = ROOT / "Adapt-main"
sys.path.insert(0, str(ROOT))
from integration.contract.validate import validate_response  # noqa: E402

from release.stress_check import Server, _request  # noqa: E402

VALID = json.loads((ROOT / "integration/contract/fixtures/valid_request.json").read_text())
STANDARD = json.loads((ROOT / "integration/contract/fixtures/standard_content_fallback.json").read_text())


class Journey:
    def __init__(self, base: str) -> None:
        self.base = base
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = ""
        self.student_id = ""
        self.steps: list[dict[str, Any]] = []

    def call(self, method: str, path: str, body: Any = None, *, timeout: float = 40):
        headers = {"x-csrf-token": self.csrf} if self.csrf else {}
        status, payload, response_headers, ms = _request(
            method, self.base + path, body=body, headers=headers, opener=self.opener, timeout=timeout,
        )
        return status, payload, response_headers, ms

    def step(self, name: str, method: str, path: str, body: Any = None, *, expect=(200,),
             note: str = "", timeout: float = 40) -> tuple[int, Any]:
        status, payload, _headers, ms = self.call(method, path, body, timeout=timeout)
        self.steps.append({
            "name": name, "method": method, "path": path, "status": status,
            "elapsed_ms": ms, "expected": list(expect), "ok": status in expect,
            "note": note,
        })
        if "csrf_token" in (payload or {}) if isinstance(payload, dict) else False:
            self.csrf = payload["csrf_token"]
        if isinstance(payload, dict) and payload.get("student_id"):
            self.student_id = payload["student_id"]
        print(f"  {'ok  ' if status in expect else 'FAIL'}  {name:38s} {status:3d} {ms:8.1f} ms")
        return status, payload


def _free_port() -> int:
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


class WebServer:
    def __init__(self, api_base: str):
        self.port = _free_port()
        self.api_base = api_base
        self.proc: subprocess.Popen | None = None
        self.base = f"http://127.0.0.1:{self.port}"

    def start(self, timeout_s: float = 40) -> None:
        if not (ADAPT / "frontend" / ".next" / "BUILD_ID").exists():
            raise RuntimeError("no frontend production build (.next/BUILD_ID); run: cd Adapt-main/frontend && npm run build")
        env = {**os.environ, "ADAPT_API": self.api_base, "HOST": "127.0.0.1",
               "PORT": str(self.port), "NODE_ENV": "production"}
        self.proc = subprocess.Popen(
            ["node", "server.mjs"], cwd=str(ADAPT / "frontend"), env=env,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True,
        )
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            try:
                with urllib.request.urlopen(self.base + "/", timeout=2) as response:
                    if response.status == 200:
                        return
            except Exception:
                pass
            time.sleep(0.3)
        raise RuntimeError("Next.js production server did not start")

    def stop(self) -> None:
        if self.proc and self.proc.poll() is None:
            try:
                os.killpg(os.getpgid(self.proc.pid), signal.SIGTERM)
                self.proc.wait(timeout=8)
            except Exception:
                with contextlib.suppress(Exception):
                    os.killpg(os.getpgid(self.proc.pid), signal.SIGKILL)


def run_learner_journey(base: str) -> tuple[Journey, dict[str, Any]]:
    j = Journey(base)
    email = f"release-{int(time.time())}@example-invalid.test"
    password = "a long release password"

    _status, created = j.step("sign_up_with_consent_off", "POST", "/api/v1/students", {
        "display_name": "Release Learner", "email": email, "password": password,
        "age_band": "16-18", "consent_analytics": False, "consent_share_with_llm": False,
    })
    consent_at_signup = created.get("consent_analytics") if isinstance(created, dict) else None

    j.step("logout", "POST", "/api/v1/logout")
    after_logout = j.step("me_after_logout_is_401", "GET", "/api/v1/me", expect=(401,))[0]
    _status, _logged_in = j.step("login", "POST", "/api/v1/login", {"email": email, "password": password})
    _me_status, _me = j.step("me_after_login", "GET", "/api/v1/me")

    j.step("choose_consent_on", "POST", "/api/v1/me/onboarding", {
        "preferences": {}, "consent_analytics": True, "consent_share_with_llm": False,
        "voice_enabled": False,
    })
    _consent_status, consent_me = j.step("consent_is_read_back", "GET", "/api/v1/me")
    consent_after = consent_me.get("consent_analytics") if isinstance(consent_me, dict) else None

    baseline_status, _baseline = j.step("learner_baseline_start", "POST", "/api/v1/baseline")
    snapshot_status, _snapshot = j.step("learner_baseline_snapshot", "GET", "/api/v1/baseline/snapshot")

    lesson_status, lesson = j.step("lesson_plan", "POST", "/api/v1/lesson-plan", {
        "concept": "fractions_add", "title": "Adding fractions",
        "content_pack": {"explanation": "To add fractions the parts must be the same size. "
                                        "Rename one fraction so both denominators match, then add the numerators.",
                         "questions": [{"question": "What is 1/4 + 1/8?", "format": "numeric"}]},
    })
    lesson_plan = (lesson or {}).get("plan") if isinstance(lesson, dict) else None
    lesson_blocks = len((lesson_plan or {}).get("blocks", [])) if isinstance(lesson_plan, dict) else 0

    _session_status, session = j.step("practice_session", "POST", "/api/v1/sessions", {"mode": "practice"})
    _practice_status, practice = j.step("practice_items", "GET", "/api/v1/practice?count=2")
    items = (practice or {}).get("items", []) if isinstance(practice, dict) else []
    first = items[0] if items else {}
    # /practice returns {item: {...}, topic_id, presentation}: using items[0]["id"]
    # silently sent item_id=null and made the 422 look like a grading failure.
    item_id = (first.get("item") or {}).get("id")
    topic_id = first.get("topic_id")
    wrong_status, wrong_body = None, None
    if item_id:
        wrong_status, wrong_body = j.step("wrong_answer_is_marked", "POST", "/api/v1/attempts", {
            "session_id": (session or {}).get("session_id"),
            "item_id": item_id,
            "answer": "definitely-not-the-answer",
        }, expect=(200,), note="a wrong answer must be graded, not refused")
    else:
        j.steps.append({"name": "wrong_answer_is_marked", "status": None, "ok": False,
                        "note": "practice returned no usable item", "expected": [200], "elapsed_ms": 0,
                        "method": "POST", "path": "/api/v1/attempts"})

    concept_status, concepts = j.step("lesson_concepts_for_the_topic", "GET",
                                      f"/api/v1/lesson/concepts?topic={topic_id or ''}",
                                      expect=(200, 422, 404))
    concept_id = ((concepts or {}).get("concepts") or [{}])[0].get("id") if isinstance(concepts, dict) else None
    reteach_status, reteach = j.step("reteach_after_wrong_answer", "POST", "/api/v1/lesson/reteach",
                                     {"topic": topic_id or "fractions", "concept_id": concept_id or "task"},
                                     expect=(200,),
                                     note="deterministic re-teach on a real authored topic")
    explain_status, _explain = j.step("no_key_teaching_answer", "POST", "/api/v1/explain",
                                      {"question": "Why do denominators have to match?",
                                       "topic_id": "fractions_add"}, expect=(200, 429))

    _pending_status, pending = j.step("proposal_gate_pending", "GET", "/api/v1/adaptations/pending")
    proposals = (pending or {}).get("proposals", []) if isinstance(pending, dict) else []
    decision_status = None
    if proposals:
        decision_status, _decision = j.step("proposal_refusal_recorded", "POST",
                                            f"/api/v1/adaptations/{proposals[0]['id']}/decision",
                                            {"decision": "reject", "note": "release smoke: explicit no"},
                                            expect=(200, 403, 409))
    else:
        j.steps.append({"name": "proposal_refusal_recorded", "status": None, "ok": True,
                        "note": "no proposal was generated from this short run; the gate was not faked",
                        "expected": [], "elapsed_ms": 0, "method": "POST",
                        "path": "/api/v1/adaptations/{id}/decision"})

    j.step("progress_method_report", "GET", "/api/v1/methods/report")
    j.step("progress_journey", "GET", "/api/v1/journey")
    export_status, export, _h, _ms = j.call("GET", "/api/v1/me/export")
    j.steps.append({"name": "data_export", "method": "GET", "path": "/api/v1/me/export",
                    "status": export_status, "elapsed_ms": _ms, "expected": [200],
                    "ok": export_status == 200, "note": f"export keys: {sorted(export)[:8]}" if isinstance(export, dict) else ""})
    print(f"  {'ok  ' if export_status == 200 else 'FAIL'}  {'data_export':38s} {export_status:3d} {_ms:8.1f} ms")

    delete_status, _deleted = j.step("data_deletion", "DELETE", "/api/v1/me")
    after_delete = j.step("me_after_deletion_is_401", "GET", "/api/v1/me", expect=(401,))[0]

    integration_status, integration, _ih, integration_ms = _request(
        "POST", base + "/api/v1/integration/adapt", body=VALID, timeout=30,
    )
    integration_ok = integration_status == 200
    if integration_ok:
        try:
            validate_response(integration)
        except Exception:
            integration_ok = False
    j.steps.append({"name": "genlink_integration_request", "method": "POST",
                    "path": "/api/v1/integration/adapt", "status": integration_status,
                    "elapsed_ms": integration_ms, "expected": [200], "ok": integration_ok,
                    "note": "stateless, model-free contract response validated"})
    print(f"  {'ok  ' if integration_ok else 'FAIL'}  {'genlink_integration_request':38s} {integration_status:3d} {integration_ms:8.1f} ms")

    resource_status, _resources, _rh, _rms = _request(
        "POST", base + "/api/v1/resources/search",
        body={"query": "adding fractions", "limit": 3}, headers={"x-csrf-token": j.csrf},
        opener=j.opener, timeout=40,
    )
    j.steps.append({"name": "provider_outage_is_reported", "method": "POST",
                    "path": "/api/v1/resources/search", "status": resource_status,
                    "elapsed_ms": _rms, "expected": [200, 401, 429],
                    "ok": resource_status in (200, 401, 429),
                    "note": "external providers disabled in this run; a signed-out 401 after deletion is expected"})
    print(f"  {'ok  ' if resource_status in (200, 401, 429) else 'FAIL'}  {'provider_outage_is_reported':38s} {resource_status:3d} {_rms:8.1f} ms")

    summary = {
        "student_id": j.student_id,
        "consent_at_signup": consent_at_signup,
        "consent_after_opt_in": consent_after,
        "me_after_logout_status": after_logout,
        "me_after_deletion_status": after_delete,
        "baseline_run_status": baseline_status,
        "baseline_snapshot_status": snapshot_status,
        "lesson_status": lesson_status, "lesson_blocks": lesson_blocks,
        "wrong_answer_status": wrong_status,
        "wrong_answer_correct_field": wrong_body.get("correct") if isinstance(wrong_body, dict) else None,
        "practice_item_id": item_id, "topic_id": topic_id, "concept_status": concept_status,
        "reteach_status": reteach_status,
        "reteach_blocks": len(((reteach or {}).get("explanation") or {}).get("blocks") or [])
        if isinstance(reteach, dict) else 0,
        "no_key_teaching_status": explain_status,
        "pending_proposals": len(proposals),
        "proposal_decision_status": decision_status,
        "export_status": export_status,
        "delete_status": delete_status,
        "integration_status": integration_status,
        "provider_outage_status": resource_status,
        "adapt_credits_enforced": False,
        "exhausted_credit_case": "not testable: no server-side credit ledger or debit route",
    }
    return j, summary


def run_login_cookie_immediate_use(base: str, attempts: int = 12) -> dict[str, Any]:
    """Monitoring test: a cookie handed out by sign-up/login must work on the NEXT request.

    One early release-gate run saw 401 twice immediately after a 200 login and then
    a 200 on the following read. A suspected commit/response race was NOT reproducible:
    72 immediate-use checks with the unmodified backend produced zero failures, so no
    backend change was kept on that hypothesis. This loop stays in the gate as a
    measured watch on the flake; the single observation is recorded as an unresolved
    finding in RELEASE_READINESS.md rather than being claimed as fixed.
    """
    rows: list[dict[str, Any]] = []
    for index in range(attempts):
        jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        email = f"race-{int(time.time())}-{index}@example-invalid.test"
        password = "a long release password"
        signup, created, _h, signup_ms = _request(
            "POST", base + "/api/v1/students",
            body={"display_name": f"Race {index}", "email": email, "password": password,
                  "consent_analytics": False}, opener=opener, timeout=30,
        )
        csrf = created.get("csrf_token", "") if isinstance(created, dict) else ""
        immediate_after_signup = _request("GET", base + "/api/v1/me", opener=opener, timeout=10)[0]
        _request("POST", base + "/api/v1/logout", headers={"x-csrf-token": csrf},
                 opener=opener, timeout=10)
        login, _logged_in, _h2, login_ms = _request(
            "POST", base + "/api/v1/login", body={"email": email, "password": password},
            opener=opener, timeout=30,
        )
        immediate_after_login = _request("GET", base + "/api/v1/me", opener=opener, timeout=10)[0]
        rows.append({
            "iteration": index, "signup": signup, "signup_ms": signup_ms,
            "me_immediately_after_signup": immediate_after_signup,
            "login": login, "login_ms": login_ms,
            "me_immediately_after_login": immediate_after_login,
        })
    bad = [r for r in rows if r["me_immediately_after_signup"] != 200
           or r["me_immediately_after_login"] != 200]
    summary = {
        "attempts": attempts,
        "unexpected_401_after_signup": sum(1 for r in rows if r["me_immediately_after_signup"] != 200),
        "unexpected_401_after_login": sum(1 for r in rows if r["me_immediately_after_login"] != 200),
        "rows": rows,
    }
    print(f"  {'ok  ' if not bad else 'FAIL'}  login_cookie_immediate_use{' ' * 12} "
          f"{attempts} attempts, {len(bad)} immediate-use failures")
    return summary


def run_demo_script(base: str) -> dict[str, Any]:
    """The repo's own HTTP demo walker: the loop over the real public surface."""
    proc = subprocess.run(
        ["node", "scripts/demo.mjs", "--quiet", "--json"], cwd=str(ADAPT),
        env={**os.environ, "ADAPT_API": base}, capture_output=True, text=True, timeout=300,
    )
    return {
        "exit_code": proc.returncode,
        "stdout_tail": proc.stdout[-1200:],
        "stderr_tail": proc.stderr[-600:],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--web", action="store_true", help="also start the built Next.js server and check /engine")
    parser.add_argument("--demo-script", action="store_true", help="also run scripts/demo.mjs against the API")
    parser.add_argument("--race-attempts", type=int, default=12,
                        help="immediate post-login cookie-use checks (default 12)")
    parser.add_argument("--out", default="release/evidence/e2e-smoke.json")
    args = parser.parse_args()

    tmp = pathlib.Path(tempfile.mkdtemp(prefix="adapt-release-e2e-"))
    data = tmp / "fresh"
    data.mkdir(parents=True, exist_ok=True)
    # Guest creation is 6/min at multiplier 1; the immediate-use loop needs 12 accounts.
    server = Server(data, rate_multiplier=10)
    web: WebServer | None = None
    report: dict[str, Any] = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "python": platform.python_version(),
        "ai_credentials_used": False,
        "database": "fresh scratch directory",
        "steps": [], "checks": [], "notes": [],
    }
    try:
        server.start()
        journey, summary = run_learner_journey(server.base)
        report["steps"] = journey.steps
        report["learner_journey"] = summary
        report["login_cookie_immediate_use"] = run_login_cookie_immediate_use(
            server.base, attempts=args.race_attempts)
        race = report["login_cookie_immediate_use"]
        report["checks"].append({
            "name": "a_session_cookie_is_usable_on_the_immediately_following_request",
            "ok": race["unexpected_401_after_signup"] == 0 and race["unexpected_401_after_login"] == 0,
            "detail": f"signup={race['unexpected_401_after_signup']} login={race['unexpected_401_after_login']} of {race['attempts']}",
        })
        report["checks"].append({
            "name": "every_smoke_step_met_its_expected_status",
            "ok": all(s.get("ok") for s in journey.steps),
            "failed": [s["name"] for s in journey.steps if not s.get("ok")],
        })
        report["checks"].append({
            "name": "consent_defaults_off_then_opt_in_is_persisted",
            "ok": summary["consent_at_signup"] is False and summary["consent_after_opt_in"] is True,
            "detail": f"{summary['consent_at_signup']} -> {summary['consent_after_opt_in']}",
        })
        report["checks"].append({
            "name": "wrong_answer_is_graded_false_and_reteach_returns_blocks",
            "ok": summary["wrong_answer_status"] == 200
                  and summary["wrong_answer_correct_field"] is False
                  and summary["reteach_status"] == 200 and summary["reteach_blocks"] > 0,
            "detail": f"wrong={summary['wrong_answer_status']}/{summary['wrong_answer_correct_field']} "
                      f"reteach={summary['reteach_status']}/{summary['reteach_blocks']} blocks",
        })
        report["checks"].append({
            "name": "lesson_plan_returns_blocks",
            "ok": summary["lesson_status"] == 200 and summary["lesson_blocks"] > 0,
            "detail": f"{summary['lesson_status']}/{summary['lesson_blocks']} blocks",
        })
        report["checks"].append({
            "name": "logout_and_deletion_revoke_the_session",
            "ok": summary["me_after_logout_status"] == 401 and summary["me_after_deletion_status"] == 401,
        })
        if args.demo_script:
            report["demo_script"] = run_demo_script(server.base)
            report["checks"].append({
                "name": "repo_demo_http_walker_exits_zero",
                "ok": report["demo_script"]["exit_code"] == 0,
                "detail": report["demo_script"]["stderr_tail"][:300],
            })
        if args.web:
            web = WebServer(server.base)
            web.start()
            status, _body, _headers, ms = _request("GET", web.base + "/engine", timeout=20)
            # _request parses JSON; for HTML it records non_json_body_bytes. Re-read raw
            # for the visible-copy check so the honesty labels are actually verified.
            with urllib.request.urlopen(web.base + "/engine", timeout=20) as response:
                html = response.read().decode("utf-8", "replace")
            lower = html.lower()
            has_sample_label = any(word in lower for word in ("sample", "prototype", "illustrative", "presentation"))
            has_not_wired = ("not wired" in lower or "not connected" in lower or "no live" in lower)
            report["engine_console"] = {
                "status": status, "elapsed_ms": ms, "html_bytes": len(html),
                "contains_sample_label": has_sample_label,
                "contains_no_live_connection_label": has_not_wired,
            }
            report["checks"].append({
                "name": "engine_console_renders_and_labels_its_numbers_as_samples",
                "ok": status == 200 and has_sample_label and has_not_wired,
                "detail": json.dumps(report["engine_console"]),
            })
    except Exception as exc:  # environmental: report, do not pretend a pass
        report["notes"].append(f"harness error: {type(exc).__name__}: {exc}")
        report["checks"].append({"name": "harness_completed", "ok": False, "detail": str(exc)})
    finally:
        if web:
            web.stop()
        server.stop()
        shutil.rmtree(tmp, ignore_errors=True)

    failed = [c for c in report["checks"] if not c["ok"]]
    report["outcome"] = "PASS" if not failed else "FAIL"
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {out.relative_to(ROOT)} — {report['outcome']} ({len(report['checks'])} checks, {len(failed)} failed)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
