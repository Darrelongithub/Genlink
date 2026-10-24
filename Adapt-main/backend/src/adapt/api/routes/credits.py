"""Adapt Credits over HTTP: a learner's own view, and the operator's admin plane.

Two surfaces, deliberately not one:

``GET /api/v1/credits/me``
    What the signed-in learner may know about their own consumption: the institution they
    belong to, the pool balance (a shared number they can see, not one they can change),
    their own usage in the period, the price of each action, and the fact that standard
    material keeps working at zero.

``/api/v1/admin/...``
    Institutions, plans, membership, grants, usage and the ledger. Every route depends on
    :func:`adapt.api.deps.require_operator`, so authority comes from an operator token or
    a real ``Student.role`` -- never from the request body. Every mutation is written to
    the audit log as well as to the credit ledger: the ledger says *what the balance did*,
    the audit row says *who asked for it and from where*.

What is not here: anything that touches a card, an invoice, a bank or a payment provider.
Granting credits is an operator action; this build records the grant, not the money. The
readiness note (`BACKEND_READINESS.md`) states that in the list of unresolved blockers
rather than implying otherwise.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from ...credits.plans import ACTIONS, PlanConfigError, parse_plan
from ...db.models import Student
from ...security.middleware import audit_event
from ...services import current
from ..deps import (
    Actor,
    idempotency_key,
    require_operator,
    student_from_request,
)

router = APIRouter(prefix="/api/v1/credits", tags=["credits"])
admin = APIRouter(prefix="/api/v1/admin", tags=["credits-admin"])


# --------------------------------------------------------------------------- #
# learner-facing
# --------------------------------------------------------------------------- #


@router.get("/me")
def my_credits(
    days: int = Query(default=30, ge=1, le=366),
    student: Student = Depends(student_from_request),
) -> dict[str, Any]:
    """This learner's own usage. Never another learner's, and never the institution's roster."""
    return current().credits.learner_view(student.id, days=days)


@router.get("/actions")
def metered_actions(_student: Student = Depends(student_from_request)) -> dict[str, Any]:
    """The catalogue of things that can cost credits -- and what cannot."""
    from ...credits.plans import FREE_ACTIONS

    return {
        "actions": ACTIONS,
        "never_charged": sorted(FREE_ACTIONS),
        "note": (
            "an action costs whatever the institution's plan says; this endpoint names the "
            "actions, not the prices"
        ),
    }


# --------------------------------------------------------------------------- #
# admin request shapes
# --------------------------------------------------------------------------- #


class InstitutionBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=160)
    slug: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9][a-z0-9._-]*$")
    external_ref: str | None = Field(default=None, max_length=120)


class PlanBody(BaseModel):
    """A plan as an operator writes it. Parsed by :func:`parse_plan`, not by pydantic alone.

    The strict integer rules live in one place (``credits/plans.py``) so the same
    validation applies to the JSON file and to this endpoint: ``"included_credits": 25.5``
    is refused here for exactly the reason it is refused in the file.
    """

    model_config = ConfigDict(extra="allow")

    slug: str = Field(min_length=1, max_length=48)
    name: str | None = Field(default=None, max_length=120)


class AssignPlanBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plan_slug: str = Field(min_length=1, max_length=48)
    #: Start the period with the plan's included credits, written as a grant entry.
    reset_balance: bool = False


class GrantBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    credits: int = Field(gt=0, le=10_000_000)
    reason: str | None = Field(default=None, max_length=240)


class MemberBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    student_id: str = Field(min_length=1, max_length=64)
    role: str = Field(default="learner", pattern=r"^(learner|instructor|admin)$")
    learner_limit: int | None = Field(default=None, ge=0, le=10_000_000)


def _institution_or_404(institution_id: str) -> None:
    from ...credits.models import Institution

    with current().db.session() as s:
        if s.get(Institution, institution_id) is None:
            raise HTTPException(
                status_code=404,
                detail={"error": "institution_unknown", "message": "no such institution"},
            )


# --------------------------------------------------------------------------- #
# admin: plans
# --------------------------------------------------------------------------- #


@admin.get("/plans")
def list_plans(_operator: Actor = Depends(require_operator)) -> dict[str, Any]:
    from sqlalchemy import select

    from ...credits.models import CreditPlan

    with current().db.session() as s:
        rows = s.execute(select(CreditPlan).order_by(CreditPlan.slug)).scalars().all()
        return {
            "plans": [
                {
                    "slug": row.slug,
                    "name": row.name,
                    "included_credits": int(row.included_credits),
                    "period": row.period,
                    "action_costs": row.action_costs,
                    "learner_limit": int(row.learner_limit),
                    "allow_negative": bool(row.allow_negative),
                    "currency": row.currency,
                    "list_price_minor": row.list_price_minor,
                    "active": bool(row.active),
                    "version": int(row.version),
                }
                for row in rows
            ],
            "known_actions": ACTIONS,
            "note": "credits are integers; a plan with no currency/price has not been priced",
        }


@admin.post("/plans", status_code=201)
def upsert_plan(
    body: PlanBody, request: Request, operator: Actor = Depends(require_operator)
) -> dict[str, Any]:
    """Create or replace a plan definition. Commercial terms, behind operator authority."""
    from sqlalchemy import select

    from ...credits.models import CreditPlan

    raw = body.model_dump()
    try:
        spec = parse_plan(raw, where=f"plan[{raw.get('slug')}]")
    except PlanConfigError as exc:
        raise HTTPException(
            status_code=422, detail={"error": "invalid_plan", "message": str(exc)}
        ) from exc
    with current().db.session() as s:
        row = s.execute(select(CreditPlan).where(CreditPlan.slug == spec.slug)).scalar_one_or_none()
        created = row is None
        if row is None:
            row = CreditPlan(slug=spec.slug)
            s.add(row)
        row.name = spec.name
        row.included_credits = int(spec.included_credits)
        row.period = spec.period
        row.action_costs = {k: int(v) for k, v in spec.action_costs.items()}
        row.learner_limit = int(spec.learner_limit)
        row.allow_negative = bool(spec.allow_negative)
        row.currency = spec.currency
        row.list_price_minor = spec.list_price_minor
        row.active = bool(spec.active)
        # A changed action table is a new version, so a ledger row's cost can be read
        # against the rules that were in force when it was written.
        row.version = int(spec.version) if created else int(row.version or 1) + 1
        s.commit()
        version = int(row.version)
    audit_event(
        request,
        action="credit_plan_upserted",
        actor=operator.id,
        detail={"slug": spec.slug, "created": created, "version": version},
    )
    return {"plan": spec.as_dict(), "created": created, "version": version}


# --------------------------------------------------------------------------- #
# admin: institutions, membership, plans, grants
# --------------------------------------------------------------------------- #


@admin.post("/institutions", status_code=201)
def create_institution(
    body: InstitutionBody, request: Request, operator: Actor = Depends(require_operator)
) -> dict[str, Any]:
    row = current().credits.create_institution(
        name=body.name, slug=body.slug, actor_id=operator.id, external_ref=body.external_ref
    )
    audit_event(
        request,
        action="institution_created",
        actor=operator.id,
        detail={"institution_id": row.id, "slug": row.slug},
    )
    return {"institution": {"id": row.id, "name": row.name, "slug": row.slug, "status": row.status}}


@admin.post("/institutions/{institution_id}/plan")
def assign_plan(
    institution_id: str,
    body: AssignPlanBody,
    request: Request,
    operator: Actor = Depends(require_operator),
) -> dict[str, Any]:
    _institution_or_404(institution_id)
    wallet = current().credits.assign_plan(
        institution_id=institution_id,
        plan_slug=body.plan_slug,
        actor_id=operator.id,
        reset_balance=body.reset_balance,
    )
    audit_event(
        request,
        action="institution_plan_assigned",
        actor=operator.id,
        detail={
            "institution_id": institution_id,
            "plan": body.plan_slug,
            "reset_balance": body.reset_balance,
        },
    )
    return {
        "wallet": {
            "institution_id": wallet.institution_id,
            "balance": int(wallet.balance),
            "plan_id": wallet.plan_id,
            "learner_limit": int(wallet.learner_limit),
            "allow_negative": bool(wallet.allow_negative),
            "period_start": wallet.period_start.isoformat(),
            "period_end": wallet.period_end.isoformat() if wallet.period_end else None,
        }
    }


@admin.post("/institutions/{institution_id}/credits", status_code=201)
def grant_credits(
    institution_id: str,
    body: GrantBody,
    request: Request,
    operator: Actor = Depends(require_operator),
    key: str | None = Depends(idempotency_key),
) -> dict[str, Any]:
    """Add credits to an institution. **Requires** an Idempotency-Key.

    A grant is the one place an operator can create balance out of nothing, so it is the
    one place a retried HTTP request must not be able to do it twice. The header is
    mandatory here rather than optional: a client that cannot retry safely should not be
    retrying.
    """
    if not key:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "idempotency_key_required",
                "message": "granting credits requires an Idempotency-Key header",
                "next": "send Idempotency-Key: <a stable value for this grant>",
            },
        )
    _institution_or_404(institution_id)
    entry = current().credits.grant(
        institution_id=institution_id,
        units=body.credits,
        idempotency_key=key,
        actor_id=operator.id,
        reason=body.reason,
    )
    audit_event(
        request,
        action="credit_grant",
        actor=operator.id,
        detail={
            "institution_id": institution_id,
            "credits": body.credits,
            "entry_id": entry.id,
            "idempotency_key": key,
        },
    )
    return {
        "entry": {
            "id": entry.id,
            "kind": entry.kind,
            "delta": int(entry.delta),
            "balance_after": int(entry.balance_after),
            "idempotency_key": entry.idempotency_key,
        }
    }


@admin.post("/institutions/{institution_id}/members", status_code=201)
def add_member(
    institution_id: str,
    body: MemberBody,
    request: Request,
    operator: Actor = Depends(require_operator),
) -> dict[str, Any]:
    _institution_or_404(institution_id)
    row = current().credits.add_member(
        institution_id=institution_id,
        student_id=body.student_id,
        role=body.role,
        learner_limit=body.learner_limit,
        actor_id=operator.id,
    )
    audit_event(
        request,
        action="institution_member_added",
        actor=operator.id,
        detail={"institution_id": institution_id, "student_id": body.student_id, "role": body.role},
    )
    return {
        "membership": {
            "id": row.id,
            "institution_id": row.institution_id,
            "student_id": row.student_id,
            "role": row.role,
            "status": row.status,
            "learner_limit": row.learner_limit,
        }
    }


@admin.delete("/institutions/{institution_id}/members/{student_id}")
def remove_member(
    institution_id: str,
    student_id: str,
    request: Request,
    operator: Actor = Depends(require_operator),
) -> dict[str, Any]:
    _institution_or_404(institution_id)
    removed = current().credits.revoke_member(
        institution_id=institution_id, student_id=student_id, actor_id=operator.id
    )
    audit_event(
        request,
        action="institution_member_revoked",
        actor=operator.id,
        detail={"institution_id": institution_id, "student_id": student_id, "revoked": removed},
    )
    if not removed:
        raise HTTPException(
            status_code=404,
            detail={"error": "membership_unknown", "message": "no active membership to revoke"},
        )
    return {"revoked": True}


# --------------------------------------------------------------------------- #
# admin: reporting
# --------------------------------------------------------------------------- #


@admin.get("/institutions/{institution_id}/usage")
def institution_usage(
    institution_id: str,
    days: int = Query(default=30, ge=1, le=366),
    _operator: Actor = Depends(require_operator),
) -> dict[str, Any]:
    _institution_or_404(institution_id)
    return current().credits.usage(institution_id, days=days)


@admin.get("/institutions/{institution_id}/ledger")
def institution_ledger(
    institution_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    _operator: Actor = Depends(require_operator),
) -> dict[str, Any]:
    """The whole ledger, newest first. Append-only, so this is a history and not a view."""
    _institution_or_404(institution_id)
    entries = current().credits.ledger(institution_id, limit=limit)
    return {"entries": entries, "count": len(entries), "append_only": True}


__all__ = ["admin", "router"]
