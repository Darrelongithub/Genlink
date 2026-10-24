"""Release-owned contract proof for ``POST /api/v1/integration/adapt``.

The existing ``test_integration_endpoint.py`` proves the adapter's behaviour. This file
proves the *cross-system contract* a second app (Genlink) would code against:

* the frozen JSON Schemas and captured fixtures in ``integration/contract/``;
* malformed requests and the optional shared-token refusal;
* duplicate/submitted-twice requests are deterministic and idempotent in effect;
* no learner row, session row or cookie is read or written by the door;
* one learner's stored data cannot appear in another learner's or another
  institution's response;
* a missing/retired/unreachable model cannot fail the call;
* Adapt being unreachable degrades to clearly-labelled standard content;
* a 200 that violates the schema is never trusted by a typed caller.

No AI credential is used, needed, or read. Every test runs on the shared TestClient
and the scratch database that ``conftest.py`` creates for the session.
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations

import copy
import json
import socket
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
CONTRACT = REPO_ROOT / "integration" / "contract"
FIXTURES = CONTRACT / "fixtures"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from integration.contract.validate import (  # noqa: E402
    ContractError,
    load_schema,
    validate_request,
    validate_response,
)
from integration.reference_client import adapt as reference_adapt  # noqa: E402
from integration.reference_client import idempotency_key  # noqa: E402

URL = "/api/v1/integration/adapt"
VALID = json.loads((FIXTURES / "valid_request.json").read_text(encoding="utf-8"))
CAPTURED = json.loads((FIXTURES / "captured_response.json").read_text(encoding="utf-8"))
STANDARD = json.loads((FIXTURES / "standard_content_fallback.json").read_text(encoding="utf-8"))
MALFORMED = json.loads((FIXTURES / "malformed_requests.json").read_text(encoding="utf-8"))


def _post(client, body, **kw):
    return client.post(URL, json=body, **kw)


def _volatile_stripped(body: dict) -> dict:
    """The two fields that legitimately change on every request."""
    out = copy.deepcopy(body)
    out.pop("request_id", None)
    out.pop("elapsed_ms", None)
    return out


# --------------------------------------------------------------------------- #
# 1. the frozen schemas and the captured evidence
# --------------------------------------------------------------------------- #

def test_schemas_are_loadable_and_only_use_implemented_keywords():
    for name in ("request.schema.json", "response.schema.json"):
        schema = load_schema(name)
        assert schema.get("$schema", "").endswith("draft-07/schema#")
        assert schema.get("title")
    validate_request(VALID)
    validate_response(CAPTURED)


def test_captured_fixture_is_reproduced_by_the_live_route(client, monkeypatch):
    """The fixture is evidence from this app, not a mock someone typed by hand."""
    monkeypatch.delenv("ADAPT_INTEGRATION_TOKEN", raising=False)
    response = _post(client, VALID)
    assert response.status_code == 200, response.text
    body = response.json()
    validate_response(body)
    assert body["ok"] is True
    assert body["derived_profile"] == CAPTURED["derived_profile"]
    assert body["adapted_content"] == CAPTURED["adapted_content"], (
        "the captured response drifted: update the fixture deliberately, with a new capture"
    )
    assert body["engine"]["local_only"] is True
    assert body["engine"]["name"] == "adapt"


def test_response_schema_rejects_a_truncated_or_forged_success():
    with pytest.raises(ContractError):
        validate_response({"ok": True})
    forged = copy.deepcopy(CAPTURED)
    forged["engine"]["local_only"] = False  # the route is model-free by construction
    with pytest.raises(ContractError):
        validate_response(forged)
    forged = copy.deepcopy(CAPTURED)
    forged["adapted_content"]["blocks"] = []  # a lesson with nothing in it is not a lesson
    with pytest.raises(ContractError):
        validate_response(forged)


def test_request_schema_rejects_out_of_range_values_before_the_network():
    bad = copy.deepcopy(VALID)
    bad["activity"][0]["response_ms"] = -1
    with pytest.raises(ContractError):
        validate_request(bad)
    bad = copy.deepcopy(VALID)
    bad["activity"][0]["correct"] = "perhaps"
    with pytest.raises(ContractError):
        validate_request(bad)


# --------------------------------------------------------------------------- #
# 2. malformed requests, unauthorized requests
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("case", MALFORMED, ids=lambda c: c["name"])
def test_malformed_and_unauthorized_fixtures(client, monkeypatch, case):
    monkeypatch.delenv("ADAPT_INTEGRATION_TOKEN", raising=False)
    if case.get("token_env"):
        monkeypatch.setenv("ADAPT_INTEGRATION_TOKEN", case["token_env"])
    body = copy.deepcopy(case["body"])
    if body.get("activity") == "TOO_MANY":
        body["activity"] = [{"kind": "attempt", "correct": True} for _ in range(501)]
    response = _post(client, body, headers=case.get("headers"))
    assert response.status_code == case["expected_status"], (
        f"{case['name']}: expected {case['expected_status']}, got {response.status_code}: {response.text[:300]}"
    )
    payload = response.json()
    node = payload
    for part in case["expected_error_path"].split("."):
        node = node[part]
    assert node == case["expected_error"]


def test_valid_bearer_and_header_tokens_are_both_accepted(client, monkeypatch):
    monkeypatch.setenv("ADAPT_INTEGRATION_TOKEN", "release-contract-token")
    for headers in (
        {"authorization": "Bearer release-contract-token"},
        {"x-adapt-integration-token": "release-contract-token"},
    ):
        response = _post(client, VALID, headers=headers)
        assert response.status_code == 200, response.text
        validate_response(response.json())


def test_the_endpoint_sets_no_session_cookie_even_when_authorized(client, monkeypatch):
    monkeypatch.setenv("ADAPT_INTEGRATION_TOKEN", "release-contract-token")
    response = _post(client, VALID, headers={"authorization": "Bearer release-contract-token"})
    assert response.status_code == 200
    assert "set-cookie" not in {k.lower() for k in response.headers}


# --------------------------------------------------------------------------- #
# 3. duplicate requests, identity and institution isolation
# --------------------------------------------------------------------------- #

def test_duplicate_requests_are_deterministic_including_when_concurrent(client, monkeypatch):
    monkeypatch.delenv("ADAPT_INTEGRATION_TOKEN", raising=False)
    with ThreadPoolExecutor(max_workers=12) as pool:
        responses = list(pool.map(lambda _i: _post(client, VALID), range(36)))
    assert all(r.status_code == 200 for r in responses), [r.status_code for r in responses]
    bodies = [r.json() for r in responses]
    assert len({json.dumps(b["adapted_content"], sort_keys=True) for b in bodies}) == 1
    assert len({b["derived_profile"]["attempts"] for b in bodies}) == 1
    # request ids are per request; a duplicate is answered, not silently deduplicated.
    assert len({b["request_id"] for b in bodies}) == len(bodies)
    assert idempotency_key(VALID) == idempotency_key(copy.deepcopy(VALID))


def test_integration_request_writes_nothing_and_reads_no_stored_learner(client, services, monkeypatch):
    """The door is stateless: DB row counts must not move, and stored PII must not leak."""
    from sqlalchemy import func, select

    from adapt.db.models import AuthSession, Student

    marker = f"private-marker-{uuid.uuid4().hex[:10]}"
    created = client.post(
        "/api/v1/students",
        json={
            "display_name": marker,
            "email": f"{marker}@example-invalid.test",
            "password": "a long demo password",
            "consent_analytics": False,
        },
    )
    assert created.status_code == 200, created.text
    monkeypatch.delenv("ADAPT_INTEGRATION_TOKEN", raising=False)

    def counts() -> tuple[int, int]:
        with services.scope() as session:
            students = session.execute(select(func.count()).select_from(Student)).scalar_one()
            sessions = session.execute(select(func.count()).select_from(AuthSession)).scalar_one()
        return students, sessions

    before = counts()
    response = _post(client, VALID)
    after = counts()
    assert response.status_code == 200
    assert before == after, f"the integration door changed learner/session rows: {before} -> {after}"
    assert marker not in response.text
    assert "consent_analytics" not in response.text
    assert response.json()["learner_id"] == "genlink-42"


def test_learner_data_cannot_cross_identities(client, services, monkeypatch):
    """Two real accounts, two integration calls: neither answer contains the other's data."""
    monkeypatch.delenv("ADAPT_INTEGRATION_TOKEN", raising=False)
    ids: list[tuple[str, str]] = []
    for label in ("alpha", "beta"):
        marker = f"{label}-{uuid.uuid4().hex[:8]}"
        created = client.post(
            "/api/v1/students",
            json={
                "display_name": marker,
                "email": f"{marker}@example-invalid.test",
                "password": "a long demo password",
                "consent_analytics": label == "alpha",
            },
        )
        assert created.status_code == 200, created.text
        ids.append((marker, created.json()["student_id"]))

    answers = []
    for marker, student_id in ids:
        body = copy.deepcopy(VALID)
        body["learner"] = {"id": student_id, "language": "en"}
        # Extra caller-owned keys are ignored, not echoed and not stored.
        body["institution_id"] = f"institution-{marker}"
        body["student_id"] = student_id
        response = _post(client, body)
        assert response.status_code == 200, response.text
        validate_response(response.json())
        answers.append((marker, response))

    for (marker, response), (other_marker, _other) in zip(
        answers, reversed(answers), strict=True
    ):
        assert response.json()["learner_id"] != other_marker
        assert other_marker not in response.text, "another learner's stored marker leaked"
        assert f"institution-{other_marker}" not in response.text
        assert marker not in response.text, "the door does not read stored learner records"


def test_institution_field_is_not_a_scope_boundary(client, monkeypatch):
    """Documents the current contract: institution_id is ignored. Do not read this as RLS."""
    monkeypatch.delenv("ADAPT_INTEGRATION_TOKEN", raising=False)
    bodies = []
    for school in ("school-a", "school-b"):
        body = copy.deepcopy(VALID)
        body["institution_id"] = school
        bodies.append(_post(client, body).json())
    assert _volatile_stripped(bodies[0]) == _volatile_stripped(bodies[1])
    assert "institution" not in json.dumps(bodies[0]).lower(), (
        "an ignored field must not be echoed back as if it had been applied"
    )


# --------------------------------------------------------------------------- #
# 4. outage behaviour: model gone, provider gone, Adapt gone
# --------------------------------------------------------------------------- #

def test_model_unavailable_and_no_key_cannot_fail_the_door(client, services, monkeypatch):
    """If the door ever grows a model call, this exploding double makes the test fail."""
    monkeypatch.delenv("ADAPT_GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("ADAPT_YOUTUBE_API_KEY", raising=False)
    monkeypatch.delenv("ADAPT_INTEGRATION_TOKEN", raising=False)

    class _ModelIsDown:
        def __getattr__(self, name):
            raise AssertionError(f"the integration door called the model client ({name})")

    monkeypatch.setattr(services.ai2, "llm", _ModelIsDown(), raising=False)
    response = _post(client, VALID)
    assert response.status_code == 200, response.text
    body = response.json()
    validate_response(body)
    assert body["engine"]["local_only"] is True
    assert body["adapted_content"]["mode"] == "deterministic"


def test_adapt_unavailable_degrades_to_labelled_standard_content():
    """Simulates Adapt being down from the caller's side, not just an in-process 200."""
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    result = reference_adapt(
        f"http://127.0.0.1:{port}", VALID, standard_content=STANDARD,
        max_attempts=2, timeout_s=0.2, backoff_s=0.01, allow_loopback=True,
    )
    assert result.source == "standard_content"
    assert result.adapted is False
    assert result.attempts == 2
    assert result.payload["adapted"] is False
    assert result.payload["source"] == "standard_content"
    assert result.payload["blocks"] == STANDARD["blocks"]
    assert "not an adapted lesson" in result.payload["notice"]
    assert result.payload["learner_id"] == "genlink-42"


def test_a_broken_200_is_not_an_adapted_lesson():
    """Malformed model/adapter output arriving as HTTP 200 must not reach a learner."""
    from integration import test_reference_client as suite

    state = suite._State()
    server = suite._make_server("malformed", state)
    thread = __import__("threading").Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        result = reference_adapt(
            f"http://127.0.0.1:{server.server_address[1]}", VALID,
            standard_content=STANDARD, max_attempts=2, timeout_s=1.0,
            allow_loopback=True,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    assert result.adapted is False
    assert "invalid_response" in (result.error or "")
    assert result.payload["source"] == "standard_content"
