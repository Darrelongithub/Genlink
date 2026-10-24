"""Institutions, Adapt Credits, and the authority boundary around them.

This file is the floor under four claims the rest of the build makes:

* **A wallet cannot be overspent.** Two threads charge the same wallet at the same
  moment; exactly one succeeds and the balance is exactly right afterwards. The debit is
  one conditional ``UPDATE`` (``credits/service.py``), and this is the test that would
  fail if somebody replaced it with read-then-write.
* **A retry cannot charge twice.** The same ``Idempotency-Key`` twice is one ledger row.
  A refund twice is one refund, and it points at the debit it reverses.
* **A call the provider never answered is not billable.** An explanation served from the
  learner's own material is charged, then refunded, in the same request.
* **Exhaustion pauses generation and nothing else.** A 402 names the standard-mode reads
  that stay open, and those reads are then exercised rather than asserted.

It also covers the two authority changes that came with the credit plane: operator-only
admin routes (``require_operator``), and CSRF tokens accepted in a query string on exactly
one path -- the telemetry beacon, which cannot set a header -- instead of on every route.

Run: ``pytest -q tests/test_credits_and_tenancy.py``.
"""

from __future__ import annotations

import threading
import uuid
from pathlib import Path

import pytest
from sqlalchemy import func, select

from adapt.credits.models import CreditLedgerEntry, CreditWallet
from adapt.credits.plans import (
    ACTIONS,
    PlanConfigError,
    default_config_path,
    load_plan_config,
    parse_plan,
)
from adapt.credits.service import (
    Credits,
    CreditsExhausted,
    InvalidAmount,
    LearnerLimitReached,
)

# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #


def _slug(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _new_learner(client) -> dict[str, str]:
    # A fresh jar per learner: the client is session-scoped, and "which learner am I"
    # must be a property of the test rather than of whatever ran before it.
    client.cookies.clear()
    response = client.post(
        "/api/v1/students",
        json={"as_guest": True, "display_name": "Credit test learner", "consent_analytics": True},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    return {
        "student_id": body["student_id"],
        "headers": {"x-csrf-token": body["csrf_token"]},
        "csrf": body["csrf_token"],
        # The raw session cookie, because ``client`` is session-scoped and its jar holds
        # whichever learner was created last. A test that reads "this learner's view"
        # has to say which learner, and a header cannot do that -- only the credential can.
        "cookie": response.cookies.get("adapt_session"),
    }


def _as(client, who: dict[str, str]) -> None:
    """Make ``who`` the caller of the next request on the shared client."""
    client.cookies.clear()
    if who.get("cookie"):
        client.cookies.set("adapt_session", str(who["cookie"]))


@pytest.fixture()
def operator(client, monkeypatch):
    """An operator token from the environment, which is the authority this build checks."""
    monkeypatch.setenv("ADAPT_OPERATOR_TOKEN", "test-operator-token")
    return {"authorization": "Bearer test-operator-token"}


def _institution(client, operator_headers, *, name: str = "Test Institution") -> str:
    response = client.post(
        "/api/v1/admin/institutions",
        json={"name": name, "slug": _slug("inst")},
        headers=operator_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["institution"]["id"]


def _plan(
    client,
    operator_headers,
    *,
    explain: int,
    cost: int = 0,
    learner_limit: int = 0,
    allow_negative: bool = False,
    included: int = 0,
) -> str:
    """Create a plan whose per-action costs the test controls exactly."""
    slug = _slug("plan")
    costs = {action: 0 for action in ACTIONS}
    costs["explain"] = explain
    response = client.post(
        "/api/v1/admin/plans",
        json={
            "slug": slug,
            "name": slug,
            "period": "annual",
            "included_credits": included,
            "learner_limit": learner_limit,
            "allow_negative": allow_negative,
            "action_costs": costs,
        },
        headers=operator_headers,
    )
    assert response.status_code == 201, response.text
    return slug


def _wallet(
    client, operator_headers, institution_id: str, *, plan_slug: str, reset: bool = False
) -> dict:
    response = client.post(
        f"/api/v1/admin/institutions/{institution_id}/plan",
        json={"plan_slug": plan_slug, "reset_balance": reset},
        headers=operator_headers,
    )
    assert response.status_code == 200, response.text
    return response.json()["wallet"]


def _grant(
    client, operator_headers, institution_id: str, credits: int, key: str | None = None
) -> dict:
    response = client.post(
        f"/api/v1/admin/institutions/{institution_id}/credits",
        json={"credits": credits, "reason": "test grant"},
        headers={**operator_headers, "idempotency-key": key or uuid.uuid4().hex},
    )
    assert response.status_code == 201, response.text
    return response.json()["entry"]


def _join(
    client, operator_headers, institution_id: str, student_id: str, *, limit: int | None = None
) -> None:
    response = client.post(
        f"/api/v1/admin/institutions/{institution_id}/members",
        json={"student_id": student_id, "role": "learner", "learner_limit": limit},
        headers=operator_headers,
    )
    assert response.status_code == 201, response.text


def _balance(services, institution_id: str) -> int:
    with services.db.session() as s:
        wallet = s.execute(
            select(CreditWallet).where(CreditWallet.institution_id == institution_id)
        ).scalar_one()
        return int(wallet.balance)


def _ledger(services, institution_id: str) -> list[CreditLedgerEntry]:
    with services.db.session() as s:
        return list(
            s.execute(
                select(CreditLedgerEntry)
                .where(CreditLedgerEntry.institution_id == institution_id)
                .order_by(CreditLedgerEntry.created_at, CreditLedgerEntry.id)
            )
            .scalars()
            .all()
        )


# --------------------------------------------------------------------------- #
# 1. plan configuration: integers, no invented prices
# --------------------------------------------------------------------------- #


def test_shipped_plan_config_is_metering_without_a_price_list():
    """The example file meters; it does not claim a commercial offer."""
    path = default_config_path()
    assert path.exists(), "the shipped plan config is what a fresh deployment meters with"
    plans = load_plan_config(path)
    assert plans, "a config with no plans would leave every action unpriced"
    for plan in plans:
        assert plan.currency is None, f"{plan.slug} ships a currency, i.e. a price claim"
        assert plan.list_price_minor is None, f"{plan.slug} ships a price"
        assert isinstance(plan.included_credits, int) and not isinstance(
            plan.included_credits, bool
        )
        for action, cost in plan.action_costs.items():
            assert action in ACTIONS, f"{plan.slug} prices an action the engine does not meter"
            assert isinstance(cost, int) and not isinstance(cost, bool)
            assert cost >= 0


def test_plan_configuration_refuses_floats_and_unknown_actions():
    """A credit is an integer; a typo in a plan must not start billing somebody."""
    base = {
        "slug": "check",
        "name": "Check",
        "period": "annual",
        "included_credits": 10,
        "action_costs": {"explain": 1},
    }
    with pytest.raises(PlanConfigError):
        parse_plan({**base, "included_credits": 2.5}, where="test")
    with pytest.raises(PlanConfigError):
        parse_plan({**base, "action_costs": {"explain": 1.0}}, where="test")
    with pytest.raises(PlanConfigError):
        parse_plan({**base, "action_costs": {"teleport": 1}}, where="test")
    with pytest.raises(PlanConfigError):
        parse_plan({**base, "included_credits": True}, where="test")
    with pytest.raises(PlanConfigError):
        parse_plan({**base, "period": "fortnight"}, where="test")


def test_the_service_refuses_a_non_integer_debit(services):
    """The last line of defence: even a caller that skips plan validation cannot pass a float."""
    credits = services.credits
    with pytest.raises(InvalidAmount):
        credits._debit(
            ctx=None,  # type: ignore[arg-type]
            student_id="stu_x",
            action="explain",
            units=1.5,  # type: ignore[arg-type]
            idempotency_key="k",
            request_id=None,
            actor_id=None,
            kind="debit",
        )


# --------------------------------------------------------------------------- #
# 2. authority: the operator boundary
# --------------------------------------------------------------------------- #


def test_a_learner_cannot_reach_the_institution_admin_plane(client, learner, monkeypatch):
    monkeypatch.delenv("ADAPT_OPERATOR_TOKEN", raising=False)
    response = client.post(
        "/api/v1/admin/institutions",
        json={"name": "No", "slug": "nope"},
        headers=learner["headers"],
    )
    assert response.status_code == 403, response.text
    assert response.json()["detail"]["error"] == "operator_required"


def test_an_operator_role_is_enough_and_cookie_auth_still_needs_csrf(
    client, services, learner, monkeypatch
):
    """Authority by role works; the CSRF rule follows the *method of authentication*."""
    monkeypatch.delenv("ADAPT_OPERATOR_TOKEN", raising=False)
    with services.db.session() as s:
        from adapt.db.models import Student

        student = s.get(Student, learner["student_id"])
        student.role = "operator"
        s.commit()

    body = {"name": "Role Institution", "slug": _slug("role")}
    # A cookie-authenticated mutation without the CSRF header is refused even for an operator.
    refused = client.post("/api/v1/admin/institutions", json=body, headers={"x-csrf-token": ""})
    assert refused.status_code == 403, refused.text
    # With the token it goes through.
    allowed = client.post("/api/v1/admin/institutions", json=body, headers=learner["headers"])
    assert allowed.status_code == 201, allowed.text


def test_a_bernoulli_token_is_not_needed_when_a_role_exists(client, services, learner, monkeypatch):
    monkeypatch.delenv("ADAPT_OPERATOR_TOKEN", raising=False)
    with services.db.session() as s:
        from adapt.db.models import Student

        s.get(Student, learner["student_id"]).role = "admin"
        s.commit()
    assert client.get("/api/v1/admin/plans", headers=learner["headers"]).status_code == 200


# --------------------------------------------------------------------------- #
# 3. wallet + ledger arithmetic
# --------------------------------------------------------------------------- #


def test_granting_credits_requires_an_idempotency_key_and_is_idempotent(client, operator, services):
    institution = _institution(client, operator)
    plan = _plan(client, operator, explain=1)
    _wallet(client, operator, institution, plan_slug=plan)

    missing = client.post(
        f"/api/v1/admin/institutions/{institution}/credits",
        json={"credits": 10},
        headers=operator,
    )
    assert missing.status_code == 422, missing.text
    assert missing.json()["detail"]["error"] == "idempotency_key_required"

    first = _grant(client, operator, institution, 10, key="grant-1")
    second = _grant(client, operator, institution, 10, key="grant-1")
    assert first["id"] == second["id"], "a retried grant must be the same ledger row"
    assert _balance(services, institution) == 10, "a retried grant must not add credits twice"


def test_wallet_balance_always_equals_the_ledger_sum(services, client, operator):
    institution = _institution(client, operator)
    plan = _plan(client, operator, explain=3)
    _wallet(client, operator, institution, plan_slug=plan)
    learner = _new_learner(client)
    _join(client, operator, institution, learner["student_id"])
    _grant(client, operator, institution, 20)

    credits = services.credits
    for _ in range(2):
        with credits.charge(student_id=learner["student_id"], action="explain") as ticket:
            ticket.charge()

    entries = _ledger(services, institution)
    assert sum(int(e.delta) for e in entries) == _balance(services, institution) == 20 - 6
    assert [e.kind for e in entries].count("grant") == 1
    assert [e.kind for e in entries].count("debit") == 2


def test_the_ledger_is_append_only(services, client, operator):
    institution = _institution(client, operator)
    plan = _plan(client, operator, explain=1)
    _wallet(client, operator, institution, plan_slug=plan)
    entry = _grant(client, operator, institution, 5)

    with services.db.session() as s:
        row = s.get(CreditLedgerEntry, entry["id"])
        row.reason = "rewritten history"
        with pytest.raises(RuntimeError, match="append-only"):
            s.flush()
        s.rollback()


# --------------------------------------------------------------------------- #
# 4. idempotency, refunds, and the "not billable" rule
# --------------------------------------------------------------------------- #


def test_one_idempotency_key_is_one_charge(services, client, operator):
    institution = _institution(client, operator)
    plan = _plan(client, operator, explain=4)
    _wallet(client, operator, institution, plan_slug=plan)
    learner = _new_learner(client)
    _join(client, operator, institution, learner["student_id"])
    _grant(client, operator, institution, 10)

    for _ in range(3):
        with services.credits.charge(
            student_id=learner["student_id"], action="explain", idempotency_key="retry-me"
        ) as ticket:
            ticket.charge()

    debits = [e for e in _ledger(services, institution) if e.kind == "debit"]
    assert len(debits) == 1, "three retries of one request must be one charge"
    assert _balance(services, institution) == 6


def test_a_reservation_is_refunded_when_the_provider_never_answered(services, client, operator):
    """The API-level version: no model is configured, so nothing is billable."""
    institution = _institution(client, operator)
    plan = _plan(client, operator, explain=3)
    _wallet(client, operator, institution, plan_slug=plan)
    learner = _new_learner(client)
    _join(client, operator, institution, learner["student_id"])
    _grant(client, operator, institution, 10)

    response = client.post(
        "/api/v1/explain",
        json={"question": "Why does a fraction get smaller when the denominator grows?"},
        headers={**learner["headers"], "idempotency-key": uuid.uuid4().hex},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["credits"]["metered"] is True
    assert body["credits"]["refunded"] is True
    assert body["credits"]["credits"] == 0
    assert _balance(services, institution) == 10, "a local answer must not cost a credit"

    kinds = [e.kind for e in _ledger(services, institution)]
    assert kinds.count("debit") == 1 and kinds.count("refund") == 1
    refund = next(e for e in _ledger(services, institution) if e.kind == "refund")
    debit = next(e for e in _ledger(services, institution) if e.kind == "debit")
    assert refund.reverses_entry_id == debit.id


def test_a_refund_is_written_once_even_when_asked_for_twice(services, client, operator):
    institution = _institution(client, operator)
    plan = _plan(client, operator, explain=2)
    _wallet(client, operator, institution, plan_slug=plan)
    learner = _new_learner(client)
    _join(client, operator, institution, learner["student_id"])
    _grant(client, operator, institution, 10)

    with services.credits.charge(
        student_id=learner["student_id"], action="explain", idempotency_key="one"
    ) as ticket:
        ticket.charge()
    debit = next(e for e in _ledger(services, institution) if e.kind == "debit")

    first = services.credits.refund(debit, reason="operator correction")
    second = services.credits.refund(debit, reason="operator correction")
    assert first.id == second.id
    refunds = [e for e in _ledger(services, institution) if e.kind == "refund"]
    assert len(refunds) == 1
    assert _balance(services, institution) == 10


# --------------------------------------------------------------------------- #
# 5. concurrency: the test the whole design exists for
# --------------------------------------------------------------------------- #


def test_two_simultaneous_charges_cannot_overspend(services, client, operator):
    """Balance 10, two charges of 8, both released at once: one wins, exactly."""
    institution = _institution(client, operator)
    plan = _plan(client, operator, explain=0)
    # ``personalised_lesson`` is the expensive action; give it 8 credits.
    update = client.post(
        "/api/v1/admin/plans",
        json={
            "slug": plan,
            "name": plan,
            "period": "annual",
            "included_credits": 0,
            "learner_limit": 0,
            "allow_negative": False,
            "action_costs": {**{a: 0 for a in ACTIONS}, "personalised_lesson": 8},
        },
        headers=operator,
    )
    assert update.status_code == 201, update.text
    _wallet(client, operator, institution, plan_slug=plan)
    learner = _new_learner(client)
    _join(client, operator, institution, learner["student_id"])
    _grant(client, operator, institution, 10)

    barrier = threading.Barrier(2)
    outcomes: list[str] = []
    lock = threading.Lock()

    def worker() -> None:
        credits = Credits(services.db.sessionmaker, settings=services.settings)
        try:
            barrier.wait(timeout=10)
            with credits.charge(
                student_id=learner["student_id"],
                action="personalised_lesson",
                idempotency_key=uuid.uuid4().hex,
            ) as ticket:
                ticket.charge()
            result = "charged"
        except CreditsExhausted:
            result = "refused"
        except Exception as exc:  # pragma: no cover - a failure here must be visible
            result = f"error:{type(exc).__name__}:{exc}"
        with lock:
            outcomes.append(result)

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)
        assert not thread.is_alive(), "a charge must not hang; SQLite's busy timeout is 5 s"

    assert sorted(outcomes) == ["charged", "refused"], outcomes
    assert _balance(services, institution) == 2
    debits = [e for e in _ledger(services, institution) if e.kind == "debit"]
    assert len(debits) == 1 and debits[0].units == 8


def test_a_learner_limit_is_enforced_under_the_same_lock(services, client, operator):
    institution = _institution(client, operator)
    plan = _plan(client, operator, explain=2, learner_limit=3)
    _wallet(client, operator, institution, plan_slug=plan)
    learner = _new_learner(client)
    _join(client, operator, institution, learner["student_id"])
    _grant(client, operator, institution, 100)

    credits = services.credits
    with credits.charge(student_id=learner["student_id"], action="explain") as ticket:
        ticket.charge()
    with (
        pytest.raises(LearnerLimitReached),
        credits.charge(student_id=learner["student_id"], action="explain") as ticket,
    ):
        ticket.charge()
    assert _balance(services, institution) == 98, "the refused charge must leave no reservation"


# --------------------------------------------------------------------------- #
# 6. exhaustion: generation stops, learning does not
# --------------------------------------------------------------------------- #


def test_an_empty_wallet_stops_generation_and_says_what_still_works(
    client, operator, services, learner
):
    institution = _institution(client, operator)
    plan = _plan(client, operator, explain=5)
    _wallet(client, operator, institution, plan_slug=plan)  # no grant: balance 0
    _join(client, operator, institution, learner["student_id"])

    response = client.post(
        "/api/v1/explain",
        json={"question": "What is a common denominator?"},
        headers={**learner["headers"], "idempotency-key": uuid.uuid4().hex},
    )
    assert response.status_code == 402, response.text
    detail = response.json()["detail"] if "detail" in response.json() else response.json()
    assert detail["error"] == "credits_exhausted"
    assert detail["mode"] == "standard"
    assert detail["fallback"]["mode"] == "standard"
    assert any("/lessons" in route for route in detail["fallback"]["available"])

    # The promise, exercised rather than asserted: existing material is not metered.
    assert client.get("/api/v1/lessons", headers=learner["headers"]).status_code == 200
    assert client.get("/api/v1/study/items", headers=learner["headers"]).status_code == 200
    assert client.get("/api/v1/credits/me", headers=learner["headers"]).json()["exhausted"] is True


def test_a_negative_balance_is_only_possible_when_the_plan_allows_it(client, operator, services):
    learner = _new_learner(client)

    strict_institution = _institution(client, operator)
    strict_plan = _plan(client, operator, explain=4, allow_negative=False)
    _wallet(client, operator, strict_institution, plan_slug=strict_plan)
    _join(client, operator, strict_institution, learner["student_id"])
    _grant(client, operator, strict_institution, 2)
    with (
        pytest.raises(CreditsExhausted),
        services.credits.charge(student_id=learner["student_id"], action="explain") as ticket,
    ):
        ticket.charge()

    other = _new_learner(client)
    permissive_institution = _institution(client, operator)
    permissive_plan = _plan(client, operator, explain=4, allow_negative=True)
    _wallet(client, operator, permissive_institution, plan_slug=permissive_plan)
    _join(client, operator, permissive_institution, other["student_id"])
    with services.credits.charge(student_id=other["student_id"], action="explain") as ticket:
        ticket.charge()
    assert _balance(services, permissive_institution) == -4


# --------------------------------------------------------------------------- #
# 7. tenant isolation on the surfaces that exist
# --------------------------------------------------------------------------- #


def test_a_learner_sees_their_own_institution_and_no_other(client, operator, services):
    mine = _institution(client, operator, name="Mine")
    theirs = _institution(client, operator, name="Theirs")
    learner = _new_learner(client)
    other = _new_learner(client)
    _wallet(client, operator, mine, plan_slug=_plan(client, operator, explain=1))
    _wallet(client, operator, theirs, plan_slug=_plan(client, operator, explain=1))
    _join(client, operator, mine, learner["student_id"])
    _join(client, operator, theirs, other["student_id"])
    _grant(client, operator, mine, 30)
    _grant(client, operator, theirs, 7)

    with services.credits.charge(student_id=learner["student_id"], action="explain") as ticket:
        ticket.charge()

    _as(client, learner)
    view = client.get("/api/v1/credits/me", headers=learner["headers"]).json()
    assert view["institution"]["id"] == mine
    assert view["balance"] == 29
    assert view["learner_used_in_period"] == 1

    _as(client, other)
    other_view = client.get("/api/v1/credits/me", headers=other["headers"]).json()
    assert other_view["institution"]["id"] == theirs
    assert other_view["balance"] == 7
    assert other_view["learner_used_in_period"] == 0, (
        "one learner's usage must not leak into another's"
    )


def test_usage_reports_are_scoped_to_one_institution(client, operator, services):
    first = _institution(client, operator)
    second = _institution(client, operator)
    learner = _new_learner(client)
    _wallet(client, operator, first, plan_slug=_plan(client, operator, explain=2))
    _wallet(client, operator, second, plan_slug=_plan(client, operator, explain=2))
    _join(client, operator, first, learner["student_id"])
    _grant(client, operator, first, 10)
    with services.credits.charge(student_id=learner["student_id"], action="explain") as ticket:
        ticket.charge()

    mine = client.get(f"/api/v1/admin/institutions/{first}/usage", headers=operator).json()
    theirs = client.get(f"/api/v1/admin/institutions/{second}/usage", headers=operator).json()
    assert mine["credits"]["by_learner"][0]["student_id"] == learner["student_id"]
    assert mine["wallet"]["balance"] == 8
    assert theirs["credits"]["by_learner"] == []
    assert theirs["wallet"]["balance"] == 0
    assert mine["reconciled"] is True
    # Credits and provider tokens are reported separately and never summed.
    assert "upstream_metering" in mine and "credits" in mine
    assert "token" not in " ".join(mine["upstream_metering"].keys())


def test_a_second_membership_is_refused_rather_than_silently_moved(client, operator):
    first = _institution(client, operator)
    second = _institution(client, operator)
    learner = _new_learner(client)
    _join(client, operator, first, learner["student_id"])
    clash = client.post(
        f"/api/v1/admin/institutions/{second}/members",
        json={"student_id": learner["student_id"], "role": "learner"},
        headers=operator,
    )
    assert clash.status_code == 400, clash.text
    assert "already belongs" in clash.json()["message"]


def test_revoking_membership_stops_the_wallet_being_used(client, operator, services):
    institution = _institution(client, operator)
    learner = _new_learner(client)
    _wallet(client, operator, institution, plan_slug=_plan(client, operator, explain=3))
    _join(client, operator, institution, learner["student_id"])
    _grant(client, operator, institution, 10)

    removed = client.delete(
        f"/api/v1/admin/institutions/{institution}/members/{learner['student_id']}",
        headers=operator,
    )
    assert removed.status_code == 200, removed.text

    with services.credits.charge(student_id=learner["student_id"], action="explain") as ticket:
        ticket.charge()
    assert ticket.metered is False
    assert _balance(services, institution) == 10


def test_membership_without_a_wallet_is_a_configuration_error_not_free_credit(client, operator):
    """The gap between "joined" and "has a pool" must not read as "unmetered"."""
    institution = _institution(client, operator)
    learner = _new_learner(client)
    _join(client, operator, institution, learner["student_id"])

    response = client.get("/api/v1/credits/me", headers=learner["headers"])
    assert response.status_code == 409, response.text
    assert response.json()["error"] == "wallet_not_configured"
    assert "assigns a plan" in response.json()["next"]


def test_a_learner_outside_any_institution_is_reported_as_unmetered(client):
    learner = _new_learner(client)
    _as(client, learner)
    view = client.get("/api/v1/credits/me", headers=learner["headers"]).json()
    assert view["metered"] is False
    assert view["institution"] is None
    assert "standard mode" in view["note"]


# --------------------------------------------------------------------------- #
# 8. the hardening that came with the credit plane
# --------------------------------------------------------------------------- #


def test_csrf_in_the_query_string_is_only_accepted_on_the_telemetry_beacon(
    client, learner, session
):
    """A token in a URL is a token in a log; one route cannot set a header, so it is the
    exception."""
    # Not the beacon path: a query token is not enough.
    refused = client.post(
        f"/api/v1/me/voice?csrf={learner['csrf']}",
        json={"enabled": True},
        headers={"x-csrf-token": ""},
    )
    assert refused.status_code == 403, refused.text

    # The beacon path: accepted, because sendBeacon has nowhere else to put it.
    accepted = client.post(
        f"/api/v1/sessions/{session}/events?csrf={learner['csrf']}",
        json={"session_id": session, "events": [{"type": "pause", "client_id": uuid.uuid4().hex}]},
    )
    assert accepted.status_code == 200, accepted.text


def test_the_speech_route_has_a_bounded_body(client, learner):
    too_long = client.post(
        "/api/v1/voice/speak",
        json={"text": "x" * 5000},
        headers=learner["headers"],
    )
    assert too_long.status_code == 422
    empty = client.post("/api/v1/voice/speak", json={}, headers=learner["headers"])
    assert empty.status_code == 422
    internal = client.post(
        "/api/v1/voice/speak",
        json={"text": "hello", "unexpected": {"a": 1}},
        headers=learner["headers"],
    )
    assert internal.status_code in (200, 400, 415), internal.text


def test_the_integration_door_is_closed_on_a_public_tunnel_without_a_token(client, monkeypatch):
    from adapt.api.routes import integration

    monkeypatch.delenv("ADAPT_INTEGRATION_TOKEN", raising=False)
    monkeypatch.setattr(integration, "_public_tunnel", lambda: True)
    monkeypatch.setattr("adapt.security.auth.demo_passphrase_required", lambda: False)
    response = client.post(
        "/api/v1/integration/adapt",
        json={"concept": "photosynthesis", "activity": []},
    )
    assert response.status_code == 401, response.text
    assert response.json()["detail"]["error"] == "integration_unauthorized"


def test_an_unknown_username_costs_the_same_work_as_a_wrong_password(client, services, monkeypatch):
    """The login form must not answer "does this learner exist?" faster than "is this the
    password?". ``authenticate`` runs a dummy Argon2 verification when no row matches."""
    from adapt.security import auth as AUTH
    from adapt.services import sessions as S

    performed: list[str] = []
    monkeypatch.setattr(AUTH, "dummy_password_verify", lambda value: performed.append(value))

    with services.db.session() as s:
        assert S.authenticate(s, username="nobody-here-at-all", password="wrong password") is None
    assert performed == ["wrong password"], "an unknown account must still pay for a hash"

    username = f"rowan{uuid.uuid4().hex[:6]}"
    created = client.post(
        "/api/v1/students",
        json={
            "username": username,
            "password": "correct horse battery",
            "display_name": "Rowan",
            "consent_analytics": True,
        },
    )
    assert created.status_code == 200, created.text
    performed.clear()
    with services.db.session() as s:
        assert S.authenticate(s, username=username, password="not the password") is None
    assert performed == [], "a real account verifies for real; there is no dummy in the way"


def test_a_cross_site_login_does_not_get_a_session_cookie(client):
    """``SameSite=Lax`` protects requests that *carry* a cookie, not the ones that mint one.

    A cross-site form post to the login route carries the attacker's credentials and the
    browser stores whatever session cookie comes back, so the victim would then be
    studying inside the attacker's account. ``origin_ok`` existed for this and was wired
    to nothing; the login, registration and demo routes now depend on it.
    """
    client.cookies.clear()
    response = client.post(
        "/api/v1/login",
        json={"username": "somebody", "password": "whatever they typed"},
        headers={"origin": "https://evil.example"},
    )
    assert response.status_code == 403, response.text
    assert response.json()["detail"]["error"] == "origin_not_allowed"
    assert "adapt_session" not in response.cookies, "a refused login must not set a cookie"

    created = client.post(
        "/api/v1/students",
        json={"as_guest": True, "display_name": "Forged", "consent_analytics": True},
        headers={"origin": "https://evil.example"},
    )
    assert created.status_code == 403, created.text
    assert "adapt_session" not in created.cookies


def test_the_apps_own_origin_is_still_accepted(client):
    """The guard has to be invisible to the real client, or it is an outage."""
    client.cookies.clear()
    ok = client.post(
        "/api/v1/students",
        json={"as_guest": True, "display_name": "Same origin", "consent_analytics": True},
        headers={"origin": "http://testserver"},
    )
    assert ok.status_code == 200, ok.text
    assert ok.cookies.get("adapt_session")


def test_a_missing_origin_is_not_treated_as_a_browser(client):
    """A missing Origin is a non-browser caller (curl, the tests, a native app)."""
    client.cookies.clear()
    ok = client.post(
        "/api/v1/students",
        json={"as_guest": True, "display_name": "No origin", "consent_analytics": True},
    )
    assert ok.status_code == 200, ok.text


def test_a_learner_cannot_be_tricked_into_a_state_change_from_another_site(client):
    """Even holding a valid CSRF token, a request from another origin is refused.

    The token is unreadable cross-site, but this is the layer that still holds if that
    ever changes: a forged request is refused for being forged.
    """
    learner = _new_learner(client)
    _as(client, learner)
    forged = client.post(
        "/api/v1/events",
        json={"session_id": "nope", "events": []},
        headers={**learner["headers"], "origin": "https://evil.example"},
    )
    assert forged.status_code == 403, forged.text
    assert forged.json()["detail"]["error"] == "origin_not_allowed"

    _as(client, learner)
    honest = client.post(
        "/api/v1/events",
        json={"session_id": "nope", "events": []},
        headers={**learner["headers"], "origin": "http://testserver"},
    )
    assert honest.status_code != 403 or honest.json()["detail"] != "origin_not_allowed"


def test_scaffolding_is_not_shipped_by_accident():
    """A tiny guard against a leftover: the readiness note and the efficiency note exist."""
    root = Path(__file__).resolve().parents[2]
    assert (root / "BACKEND_READINESS.md").exists()
    assert (root / "docs" / "EFFICIENCY.md").exists()


def test_every_backend_package_lands_in_a_built_wheel():
    """A directory without ``__init__.py`` is not a package to setuptools.

    ``[tool.setuptools.packages.find]`` only collects real packages, and an editable
    install (what the tests run on) silently papers over the difference: the wheel would
    ship without ``adapt.ai``, ``adapt.assessment``, ``adapt.resources``, ``adapt.voice``
    or ``adapt.credits``, and the app would fail at import on a machine that installed it.
    """
    from setuptools import find_packages

    src = Path(__file__).resolve().parents[1] / "src"
    found = set(find_packages(str(src)))
    expected = {
        f"adapt.{entry.name}"
        for entry in (src / "adapt").iterdir()
        if entry.is_dir() and entry.name != "__pycache__" and not entry.name.startswith(".")
        and any(child.suffix == ".py" for child in entry.iterdir() if child.is_file())
    }
    assert expected - found == set(), f"packages a wheel would omit: {sorted(expected - found)}"


def test_ledger_rows_are_never_floats_in_the_database(services, client, operator):
    institution = _institution(client, operator)
    _wallet(client, operator, institution, plan_slug=_plan(client, operator, explain=1))
    _grant(client, operator, institution, 3)
    with services.db.session() as s:
        stored = (
            s.execute(
                select(func.typeof(CreditLedgerEntry.delta)).where(
                    CreditLedgerEntry.institution_id == institution
                )
            )
            .scalars()
            .all()
        )
    assert stored and set(stored) <= {"integer"}, stored
