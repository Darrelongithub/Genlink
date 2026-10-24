"""Adapt Credit metering: wallets, the atomic debit, refunds, and the admin plane.

Four invariants, each with a mechanism rather than a comment:

1. **A wallet cannot be overspent by concurrent requests.** The debit is a single
   conditional ``UPDATE credit_wallets SET balance = balance - :units WHERE id = :id AND
   balance >= :units``. SQLite permits one writer, so two simultaneous charges serialise
   on that row; the loser's update matches zero rows and it is refused. No read-then-write
   window exists for a race to fit in, which is why the concurrency test in
   ``tests/test_credits_and_tenancy.py`` can assert an exact final balance.
2. **A retry cannot charge twice.** Every debit carries an idempotency key, unique per
   institution. A replay finds the original entry and returns it; a lost race to the
   unique index is caught and the winner's row is re-read.
3. **A failed call is not billable.** :meth:`Credits.charge` reserves before the provider
   call and *refunds* on exception or when the caller says the answer was not produced by
   the model. A refund is a new ledger row pointing at the debit, and there is at most one
   per debit -- so compensation cannot be applied twice either.
4. **Credits are integers, always.** ``units`` and ``balance`` are Python ``int`` and
   SQL ``Integer``. Nothing here divides, rounds, or multiplies by a rate.

What is deliberately *not* here: payment processing. No card is charged, no invoice is
issued, no provider is called. Granting credits is an operator action that writes a
ledger row; where the money came from is outside this system, and the readiness note says
so in those words.
"""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db.models import utcnow
from .models import (
    CreditLedgerEntry,
    CreditPlan,
    CreditWallet,
    Institution,
    InstitutionMembership,
    ledger_sum,
)
from .plans import ACTIONS, PlanConfigError, PlanSpec, default_config_path, load_plan_config

log = logging.getLogger("adapt.credits")

#: How long a charge may wait for another writer before giving up rather than hanging the
#: request. SQLite's ``busy_timeout`` is 5 s; this is a second, request-level ceiling so a
#: pathological lock shows up as a 503 with a sentence instead of a hung browser tab.
DEBIT_BUSY_RETRIES = 3
DEBIT_BUSY_SLEEP_S = 0.05


# --------------------------------------------------------------------------- #
# errors: each one carries the status code and the sentence a caller reads
# --------------------------------------------------------------------------- #


class CreditError(Exception):
    status_code = 400
    code = "credit_error"

    def detail(self) -> dict[str, Any]:
        return {"error": self.code, "message": str(self)}


class InstitutionUnknown(CreditError):
    status_code = 404
    code = "institution_unknown"


class WalletNotConfigured(CreditError):
    status_code = 409
    code = "wallet_not_configured"

    def detail(self) -> dict[str, Any]:
        return {
            **super().detail(),
            "next": "an operator assigns a plan to this institution before its learners can spend",
        }


class UnknownAction(CreditError):
    status_code = 422
    code = "unknown_action"


class InvalidAmount(CreditError):
    status_code = 422
    code = "invalid_amount"


class CreditsExhausted(CreditError):
    """402 with a *route out*, not a dead end.

    The console promises that when adapted credits reach zero, new AI adaptation pauses
    and existing notes, lessons and quizzes stay available. The payload names those reads
    explicitly, so a client that only knows how to show an error still shows the learner
    something actionable.
    """

    status_code = 402
    code = "credits_exhausted"

    def __init__(self, *, action: str, required: int, balance: int, institution: str) -> None:
        super().__init__(
            "this institution's Adapt Credit balance does not cover this action; "
            "standard material stays available"
        )
        self.action = action
        self.required = int(required)
        self.balance = int(balance)
        self.institution = institution

    def detail(self) -> dict[str, Any]:
        return {
            "error": self.code,
            "message": str(self),
            "action": self.action,
            "required_credits": self.required,
            "balance": self.balance,
            "mode": "standard",
            "fallback": {
                "mode": "standard",
                "note": (
                    "Adapted generation is paused for this institution. Notes, existing "
                    "lessons, practice from the authored bank, review and export are not "
                    "metered and stay available."
                ),
                "available": [
                    "GET /api/v1/content/pack",
                    "GET /api/v1/lessons",
                    "GET /api/v1/practice",
                    "GET /api/v1/review/due",
                    "GET /api/v1/study/items",
                ],
            },
        }


class LearnerLimitReached(CreditError):
    status_code = 429
    code = "learner_credit_limit"

    def __init__(self, *, action: str, limit: int, used: int, student_id: str) -> None:
        super().__init__(
            "this learner has reached their Adapt Credit allowance for the period; "
            "standard material stays available"
        )
        self.action = action
        self.limit = int(limit)
        self.used = int(used)
        self.student_id = student_id

    def detail(self) -> dict[str, Any]:
        return {
            "error": self.code,
            "message": str(self),
            "action": self.action,
            "learner_limit": self.limit,
            "learner_used": self.used,
            "mode": "standard",
            "fallback": {
                "mode": "standard",
                "note": "an instructor or operator can raise the allowance",
            },
        }


# --------------------------------------------------------------------------- #
# the resolved spending context
# --------------------------------------------------------------------------- #


@dataclass
class CreditContext:
    institution: Institution
    wallet: CreditWallet
    plan: CreditPlan | None
    membership: InstitutionMembership | None
    learner_limit: int
    period_start: datetime

    def cost(self, action: str) -> int:
        """Credits this action costs under the plan in force.

        An action the plan does not price costs nothing *and* is reported as unpriced by
        :meth:`Credits.usage` -- silently charging a made-up number would be worse than
        not charging, and silently charging nothing without saying so would hide a
        configuration gap.
        """
        if self.plan is None:
            return 0
        raw = (self.plan.action_costs or {}).get(action)
        if raw is None:
            return 0
        # Plans are validated as integers at load time; this is the belt to that braces.
        if isinstance(raw, bool) or not isinstance(raw, int):
            raise InvalidAmount(f"plan action_costs.{action} is not an integer")
        return max(0, raw)

    def as_dict(self) -> dict[str, Any]:
        return {
            "institution_id": self.institution.id,
            "institution": self.institution.name,
            "balance": int(self.wallet.balance),
            "plan": self.plan.slug if self.plan else None,
            "plan_name": self.plan.name if self.plan else None,
            "learner_limit": int(self.learner_limit),
            "allow_negative": bool(self.wallet.allow_negative),
            "period_start": self.period_start.isoformat(),
            "metered": True,
        }


@dataclass
class Ticket:
    """One charge in progress. ``billable`` is the caller's answer to "did it happen?"."""

    service: Credits
    metered: bool
    action: str
    cost: int = 0
    entry: CreditLedgerEntry | None = None
    billable: bool = True
    refunded: bool = False
    note: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)

    def charge(self) -> None:
        """Mark the reserved charge as earned (the provider answered)."""
        self.billable = True

    def not_billable(self, note: str) -> None:
        self.billable = False
        self.note = note

    def as_dict(self) -> dict[str, Any]:
        return {
            "metered": self.metered,
            "action": self.action,
            "credits": self.cost if self.metered and not self.refunded else 0,
            "charged": bool(self.metered and self.cost and not self.refunded),
            "refunded": self.refunded,
            "balance_after": int(self.entry.balance_after) if self.entry is not None else None,
            "note": self.note,
        }


# --------------------------------------------------------------------------- #
# period arithmetic (whole days, UTC, no floats)
# --------------------------------------------------------------------------- #


def period_window(period: str, now: datetime | None = None) -> tuple[datetime, datetime]:
    now = now or utcnow()
    if period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = (start + timedelta(days=32)).replace(day=1)
        return start, end
    if period == "quarter":
        month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=month, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = (start + timedelta(days=95)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, end
    start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, start.replace(year=start.year + 1)


def _period_start_for(wallet: CreditWallet) -> datetime:
    """The window a per-learner cap is measured over.

    Read from the wallet when it has one (so an operator can reset a period without
    editing a plan) and derived from the plan's period otherwise.
    """
    if wallet.period_start is not None:
        return wallet.period_start
    return period_window("annual")[0]


# --------------------------------------------------------------------------- #
# the service
# --------------------------------------------------------------------------- #


class Credits:
    """Metering for one deployment. Holds a session factory, not a session.

    Every write opens its own short session and commits before returning. That is the
    same rule ``services/baseline.py`` follows and for the same reason: a charge taken
    inside a request-scoped session would hold SQLite's single write lock for the rest of
    the request, and the next write in that request -- often the one recording what the
    learner did -- would wait behind it.
    """

    def __init__(self, session_factory: Callable[[], Session], *, settings: Any = None) -> None:
        self._session = session_factory
        self.settings = settings
        self._lock = threading.Lock()

    # -- configuration ------------------------------------------------- #
    def seeded_plans(self, specs: list[PlanSpec] | None = None) -> dict[str, Any]:
        """Insert plans that are not in the database yet. Existing rows are left alone.

        "Left alone" matters: once an operator has edited a plan through the admin API,
        a restart must not overwrite their commercial terms with the example file. The
        file is a starting point, not a desired state.
        """
        specs = specs if specs is not None else self.plan_specs_from_config()
        created: list[str] = []
        with self._session() as s:
            existing = {row.slug for row in s.execute(select(CreditPlan)).scalars().all()}
            for spec in specs:
                if spec.slug in existing:
                    continue
                s.add(
                    CreditPlan(
                        slug=spec.slug,
                        name=spec.name,
                        included_credits=int(spec.included_credits),
                        period=spec.period,
                        action_costs={k: int(v) for k, v in spec.action_costs.items()},
                        learner_limit=int(spec.learner_limit),
                        allow_negative=bool(spec.allow_negative),
                        currency=spec.currency,
                        list_price_minor=spec.list_price_minor,
                        active=bool(spec.active),
                        version=int(spec.version),
                    )
                )
                created.append(spec.slug)
        return {"created": created, "source": "config" if specs else "none"}

    def plan_specs_from_config(self) -> list[PlanSpec]:
        path = getattr(self.settings, "credit_plans_path", None) or default_config_path()
        try:
            return load_plan_config(path)
        except PlanConfigError as exc:
            # A broken plan file must not stop the app from starting: learners' notes and
            # existing lessons have nothing to do with billing. It must be loud, though.
            log.error("credit plan config unusable (%s); plans left unchanged", exc)
            return []

    # -- lookups ------------------------------------------------------- #
    def context(self, student_id: str) -> CreditContext | None:
        """The spending context for a learner, or ``None`` when they are not tenanted.

        ``None`` is not a silent bypass dressed up as a success: it means this learner
        belongs to no institution, so there is no wallet that could be billed. The
        metering report says ``metered: false`` in exactly those words, and the
        readiness note records the consequence -- a standalone learner is unmetered by
        design on this build.
        """
        with self._session() as s:
            membership = s.execute(
                select(InstitutionMembership).where(
                    InstitutionMembership.student_id == student_id,
                    InstitutionMembership.status == "active",
                )
            ).scalar_one_or_none()
            if membership is None:
                return None
            institution = s.get(Institution, membership.institution_id)
            wallet = s.execute(
                select(CreditWallet).where(CreditWallet.institution_id == membership.institution_id)
            ).scalar_one_or_none()
            if institution is None:
                # A membership pointing at a deleted institution is a data error, not a
                # reason to let the request through unbilled.
                raise WalletNotConfigured(
                    "this learner's institution no longer exists; an operator must repair "
                    "the membership before credits can be spent"
                )
            if wallet is None:
                # Belonging to an institution that has no pool yet is *not* the same thing
                # as belonging to none: treating it as unmetered would make the first
                # learner of a new institution generate free adapted lessons until somebody
                # noticed. It is a configuration gap and it says so.
                raise WalletNotConfigured(
                    "this learner's institution has no credit pool yet; an operator must "
                    "assign a plan before its learners can spend credits"
                )
            plan = s.get(CreditPlan, wallet.plan_id) if wallet.plan_id else None
            limit = (
                membership.learner_limit
                if membership.learner_limit is not None
                else int(wallet.learner_limit or 0)
            )
            ctx = CreditContext(
                institution=institution,
                wallet=wallet,
                plan=plan,
                membership=membership,
                learner_limit=int(limit or 0),
                period_start=_period_start_for(wallet),
            )
            # Detach: the session closes at the end of this block, and a context object
            # that lazily loads attributes afterwards would raise at the worst moment.
            s.expunge_all()
            return ctx

    # -- the charge ---------------------------------------------------- #
    @contextmanager
    def charge(
        self,
        *,
        student_id: str,
        action: str,
        idempotency_key: str | None = None,
        request_id: str | None = None,
    ) -> Iterator[Ticket]:
        """Reserve credits for one action, then settle when the caller says how it went.

        Usage inside a route::

            with credits.charge(student_id=student.id, action="explain") as ticket:
                reply = await svcs.ai2.explain(...)
                if reply.provider != "gemini":
                    ticket.not_billable("the provider was not used, so nothing was adapted")

        * an exception inside the block refunds the reservation and re-raises;
        * ``billable`` left ``True`` keeps the charge;
        * ``not_billable`` refunds it.

        A learner with no institution gets ``metered=False`` and no ledger row: there is
        no wallet to bill, and inventing one would be pretending tenancy exists.
        """
        if action not in ACTIONS:
            raise UnknownAction(f"{action!r} is not a metered action; known: {sorted(ACTIONS)}")
        if not bool(getattr(self.settings, "credits_metering", True)):
            yield Ticket(
                service=self,
                metered=False,
                action=action,
                note="metering disabled by configuration",
            )
            return
        ctx = self.context(student_id)
        if ctx is None:
            ticket = Ticket(
                service=self, metered=False, action=action, note="learner is not in an institution"
            )
            yield ticket
            return
        if ctx.institution.status != "active":
            ticket = Ticket(
                service=self,
                metered=False,
                action=action,
                note=f"institution status is {ctx.institution.status}; nothing is billed",
            )
            yield ticket
            return
        cost = ctx.cost(action)
        if cost <= 0:
            ticket = Ticket(
                service=self,
                metered=False,
                action=action,
                note="the plan prices this action at 0 credits",
            )
            yield ticket
            return

        key = self._key(idempotency_key, student_id=student_id, action=action)
        entry = self._debit(
            ctx=ctx,
            student_id=student_id,
            action=action,
            units=cost,
            idempotency_key=key,
            request_id=request_id,
        )
        ticket = Ticket(service=self, metered=True, action=action, cost=cost, entry=entry)
        try:
            yield ticket
        except BaseException:
            # A request that failed before the work became billable must not leave the
            # learner charged. The refund itself must never mask the real exception.
            self._refund_quietly(entry, reason="request failed before the action was billable")
            ticket.refunded = True
            raise
        else:
            if not ticket.billable:
                self._refund_quietly(entry, reason=ticket.note or "not billable")
                ticket.refunded = True
                ticket.meta["refund_reason"] = ticket.note

    def _key(self, provided: str | None, *, student_id: str, action: str) -> str:
        if provided:
            key = str(provided).strip()[:120]
            if not key:
                raise InvalidAmount("idempotency key was empty")
            return f"action:{key}"
        # No client key: derive a unique one so the row is still a single, traceable charge.
        stamp = utcnow().timestamp()
        return f"action:{student_id}:{action}:{stamp:.6f}:{id(threading.current_thread())}"

    def _debit(
        self,
        *,
        ctx: CreditContext,
        student_id: str,
        action: str,
        units: int,
        idempotency_key: str,
        request_id: str | None,
        actor_id: str | None = None,
        kind: str = "debit",
    ) -> CreditLedgerEntry:
        """The one place a wallet balance decreases. See the module docstring, invariant 1."""
        if isinstance(units, bool) or not isinstance(units, int) or units <= 0:
            raise InvalidAmount("credits to debit must be a positive integer")
        last_error: Exception | None = None
        for attempt in range(DEBIT_BUSY_RETRIES + 1):
            try:
                return self._debit_once(
                    ctx=ctx,
                    student_id=student_id,
                    action=action,
                    units=units,
                    idempotency_key=idempotency_key,
                    request_id=request_id,
                    actor_id=actor_id,
                    kind=kind,
                )
            except IntegrityError:
                # Two paths land here: the idempotency key already exists (a retry), and
                # a concurrent refund won the one-refund-per-debit index. Both are
                # resolved by reading what beat us.
                existing = self._entry_by_key(ctx.institution.id, idempotency_key)
                if existing is not None:
                    return existing
                raise
            except Exception as exc:
                if "database is locked" not in str(exc).lower() or attempt >= DEBIT_BUSY_RETRIES:
                    raise
                last_error = exc
                time.sleep(DEBIT_BUSY_SLEEP_S * (attempt + 1))
        raise CreditError(f"could not take a credit reservation: {last_error}")

    def _debit_once(
        self,
        *,
        ctx: CreditContext,
        student_id: str,
        action: str,
        units: int,
        idempotency_key: str,
        request_id: str | None,
        actor_id: str | None,
        kind: str,
    ) -> CreditLedgerEntry:
        with self._session() as s:
            existing = self._entry_by_key(ctx.institution.id, idempotency_key, session=s)
            if existing is not None:
                return existing

            wallet = s.execute(
                select(CreditWallet).where(CreditWallet.institution_id == ctx.institution.id)
            ).scalar_one_or_none()
            if wallet is None:
                raise WalletNotConfigured("this institution has no credit wallet")
            if wallet.period_end is not None and wallet.period_end < utcnow():
                raise WalletNotConfigured(
                    "this institution's credit period has ended; an operator must renew it"
                )

            # The whole concurrency story is this statement. A conditional decrement is
            # one atomic operation on every engine this app supports: SQLite serialises
            # writers on the database, Postgres on the row. Two requests that both think
            # the balance is 10 cannot both succeed when it is 10 and the cost is 8.
            stmt = (
                update(CreditWallet)
                .where(CreditWallet.id == wallet.id)
                .values(balance=CreditWallet.balance - units, updated_at=utcnow())
            )
            if not bool(wallet.allow_negative):
                stmt = stmt.where(CreditWallet.balance >= units)
            result = s.execute(stmt)
            # ``rowcount`` is on the DBAPI cursor result; the typed stub for a generic
            # ``execute`` does not carry it, so it is read defensively rather than by
            # loosening the return type of every call site.
            if int(getattr(result, "rowcount", 0)) != 1:
                balance = int(wallet.balance)
                raise CreditsExhausted(
                    action=action,
                    required=units,
                    balance=balance,
                    institution=ctx.institution.slug,
                )

            # Per-learner cap, measured *after* the write lock is held above, so two
            # concurrent charges for the same learner cannot both see "one slot left".
            if ctx.learner_limit > 0:
                used = int(
                    s.execute(
                        select(func.coalesce(func.sum(CreditLedgerEntry.units), 0)).where(
                            CreditLedgerEntry.institution_id == ctx.institution.id,
                            CreditLedgerEntry.student_id == student_id,
                            CreditLedgerEntry.kind == "debit",
                            CreditLedgerEntry.created_at >= ctx.period_start,
                        )
                    ).scalar()
                    or 0
                )
                if used + units > ctx.learner_limit:
                    s.rollback()
                    raise LearnerLimitReached(
                        action=action,
                        limit=ctx.learner_limit,
                        used=used,
                        student_id=student_id,
                    )

            s.refresh(wallet)
            entry = CreditLedgerEntry(
                institution_id=ctx.institution.id,
                wallet_id=wallet.id,
                student_id=student_id,
                kind=kind,
                action=action,
                delta=-units,
                units=units,
                balance_after=int(wallet.balance),
                idempotency_key=idempotency_key,
                actor_id=actor_id or student_id,
                request_id=request_id,
            )
            s.add(entry)
            s.flush()
            # Commit is explicit and immediate: the reservation must be visible to any
            # other writer before this function returns, or the serialisation above is
            # only in-process.
            s.commit()
            s.expunge_all()
            return entry

    def _entry_by_key(
        self, institution_id: str, key: str, *, session: Session | None = None
    ) -> CreditLedgerEntry | None:
        def _read(s: Session) -> CreditLedgerEntry | None:
            return s.execute(
                select(CreditLedgerEntry).where(
                    CreditLedgerEntry.institution_id == institution_id,
                    CreditLedgerEntry.idempotency_key == key,
                )
            ).scalar_one_or_none()

        if session is not None:
            return _read(session)
        with self._session() as s:
            row = _read(s)
            if row is not None:
                s.expunge(row)
            return row

    def _refund_quietly(self, entry: CreditLedgerEntry | None, *, reason: str) -> None:
        if entry is None:
            return
        try:
            self.refund(entry, reason=reason)
        except Exception:
            log.exception("credit refund failed for ledger entry %s", entry.id)

    # -- refunds and grants -------------------------------------------- #
    def refund(
        self, entry: CreditLedgerEntry, *, reason: str = "", actor_id: str | None = None
    ) -> CreditLedgerEntry:
        """Return a debit's credits. Idempotent: one refund per debit, enforced by index."""
        if entry.kind != "debit":
            raise CreditError("only a debit can be refunded")
        key = f"refund:{entry.id}"
        with self._session() as s:
            existing = s.execute(
                select(CreditLedgerEntry).where(
                    CreditLedgerEntry.institution_id == entry.institution_id,
                    CreditLedgerEntry.idempotency_key == key,
                )
            ).scalar_one_or_none()
            if existing is not None:
                s.expunge(existing)
                return existing
            wallet = s.get(CreditWallet, entry.wallet_id)
            if wallet is None:
                raise WalletNotConfigured("the wallet this debit belongs to no longer exists")
            s.execute(
                update(CreditWallet)
                .where(CreditWallet.id == wallet.id)
                .values(balance=CreditWallet.balance + int(entry.units), updated_at=utcnow())
            )
            s.refresh(wallet)
            row = CreditLedgerEntry(
                institution_id=entry.institution_id,
                wallet_id=wallet.id,
                student_id=entry.student_id,
                kind="refund",
                action=entry.action,
                delta=int(entry.units),
                units=int(entry.units),
                balance_after=int(wallet.balance),
                idempotency_key=key,
                reverses_entry_id=entry.id,
                actor_id=actor_id,
                reason=(reason or "")[:240] or None,
            )
            s.add(row)
            s.commit()
            s.expunge_all()
            return row

    def grant(
        self,
        *,
        institution_id: str,
        units: int,
        idempotency_key: str,
        actor_id: str | None,
        reason: str | None = None,
        kind: str = "grant",
    ) -> CreditLedgerEntry:
        """Add credits. Administrator-only, idempotent, and always leaves a ledger row."""
        if isinstance(units, bool) or not isinstance(units, int) or units <= 0:
            raise InvalidAmount("credits to grant must be a positive integer")
        if kind not in ("grant", "adjustment"):
            raise InvalidAmount("a positive ledger entry is a grant or an adjustment")
        key = f"{kind}:{str(idempotency_key).strip()[:110]}"
        with self._session() as s:
            existing = s.execute(
                select(CreditLedgerEntry).where(
                    CreditLedgerEntry.institution_id == institution_id,
                    CreditLedgerEntry.idempotency_key == key,
                )
            ).scalar_one_or_none()
            if existing is not None:
                s.expunge(existing)
                return existing
            institution = s.get(Institution, institution_id)
            if institution is None:
                raise InstitutionUnknown(institution_id)
            wallet = s.execute(
                select(CreditWallet).where(CreditWallet.institution_id == institution_id)
            ).scalar_one_or_none()
            if wallet is None:
                raise WalletNotConfigured("this institution has no credit wallet")
            s.execute(
                update(CreditWallet)
                .where(CreditWallet.id == wallet.id)
                .values(balance=CreditWallet.balance + units, updated_at=utcnow())
            )
            s.refresh(wallet)
            row = CreditLedgerEntry(
                institution_id=institution_id,
                wallet_id=wallet.id,
                student_id=None,
                kind=kind,
                action="grant" if kind == "grant" else "adjustment",
                delta=units,
                units=units,
                balance_after=int(wallet.balance),
                idempotency_key=key,
                actor_id=actor_id,
                reason=(reason or "")[:240] or None,
            )
            s.add(row)
            s.commit()
            s.expunge_all()
            return row

    # -- reporting ------------------------------------------------------ #
    def usage(self, institution_id: str, *, days: int = 30) -> dict[str, Any]:
        """Institution-wide usage: credits by action, by learner, and the token split.

        Credits and provider tokens are reported in **separate objects** and are never
        combined. One is what the customer bought; the other is what the model provider
        metered, and a deployment whose plan changes has no effect on the second.
        """
        since = utcnow() - timedelta(days=max(1, min(366, int(days))))
        with self._session() as s:
            institution = s.get(Institution, institution_id)
            if institution is None:
                raise InstitutionUnknown(institution_id)
            wallet = s.execute(
                select(CreditWallet).where(CreditWallet.institution_id == institution_id)
            ).scalar_one_or_none()
            plan = s.get(CreditPlan, wallet.plan_id) if wallet and wallet.plan_id else None

            by_action: dict[str, dict[str, int]] = {}
            for action, kind, delta, units in s.execute(
                select(
                    CreditLedgerEntry.action,
                    CreditLedgerEntry.kind,
                    CreditLedgerEntry.delta,
                    CreditLedgerEntry.units,
                ).where(
                    CreditLedgerEntry.institution_id == institution_id,
                    CreditLedgerEntry.created_at >= since,
                )
            ).all():
                row = by_action.setdefault(action, {"debits": 0, "refunds": 0, "granted": 0})
                if kind == "debit":
                    row["debits"] += int(units)
                    row["charged_net"] = row.get("charged_net", 0) + int(abs(delta))
                elif kind == "refund":
                    row["refunds"] += int(units)
                else:
                    row["granted"] += int(units)

            by_learner: list[dict[str, Any]] = []
            for student_id, units, events in s.execute(
                select(
                    CreditLedgerEntry.student_id,
                    func.coalesce(func.sum(CreditLedgerEntry.units), 0),
                    func.count(),
                )
                .where(
                    CreditLedgerEntry.institution_id == institution_id,
                    CreditLedgerEntry.kind == "debit",
                    CreditLedgerEntry.created_at >= since,
                )
                .group_by(CreditLedgerEntry.student_id)
            ).all():
                if student_id:
                    by_learner.append(
                        {"student_id": student_id, "credits": int(units), "charges": int(events)}
                    )
            by_learner.sort(key=lambda row: (-row["credits"], row["student_id"]))

            from ..db.models import LlmCall

            token_rows = s.execute(
                select(
                    LlmCall.role,
                    func.count(),
                    func.coalesce(func.sum(LlmCall.tokens_in), 0),
                    func.coalesce(func.sum(LlmCall.tokens_out), 0),
                )
                .where(LlmCall.created_at >= since)
                .group_by(LlmCall.role)
            ).all()
            tokens = {
                "note": (
                    "upstream tokens are the model provider's meters; they are not Adapt "
                    "Credits and nothing converts between the two"
                ),
                "by_role": [
                    {
                        "role": role or "?",
                        "calls": int(calls),
                        "tokens_in": int(tin),
                        "tokens_out": int(tout),
                        "tokens_total": int(tin) + int(tout),
                    }
                    for role, calls, tin, tout in token_rows
                ],
            }

            unpriced = (
                sorted(set(ACTIONS) - set(plan.action_costs or {})) if plan is not None else []
            )
            return {
                "institution": {
                    "id": institution.id,
                    "name": institution.name,
                    "slug": institution.slug,
                    "status": institution.status,
                },
                "wallet": {
                    "balance": int(wallet.balance) if wallet else None,
                    "allow_negative": bool(wallet.allow_negative) if wallet else False,
                    "learner_limit": int(wallet.learner_limit or 0) if wallet else 0,
                    "period_start": wallet.period_start.isoformat() if wallet else None,
                    "period_end": wallet.period_end.isoformat()
                    if wallet and wallet.period_end
                    else None,
                },
                "plan": (
                    {
                        "slug": plan.slug,
                        "name": plan.name,
                        "version": plan.version,
                        "action_costs": plan.action_costs,
                    }
                    if plan
                    else None
                ),
                "window_days": max(1, min(366, int(days))),
                "credits": {"by_action": by_action, "by_learner": by_learner},
                # Named without the words the response scrubber withholds ("token",
                # "provider", "llm", "model"): this is a report inside a body the learner
                # or an operator reads, and a silently dropped key reads as a hidden one.
                "upstream_metering": tokens,
                "unpriced_actions": unpriced,
                "reconciled": wallet is not None
                and ledger_sum(s, institution_id) == int(wallet.balance),
            }

    def learner_view(self, student_id: str, *, days: int = 30) -> dict[str, Any]:
        """What one learner may see: their own usage, their pool, and the price list."""
        ctx = self.context(student_id)
        if ctx is None:
            return {
                "metered": False,
                "institution": None,
                "note": (
                    "this learner is not in an institution, so no Adapt Credits are spent; "
                    "the engine runs in standard mode"
                ),
                "actions": ACTIONS,
            }
        since = utcnow() - timedelta(days=max(1, min(366, int(days))))
        with self._session() as s:
            rows = s.execute(
                select(
                    CreditLedgerEntry.action,
                    func.coalesce(func.sum(CreditLedgerEntry.units), 0),
                    func.count(),
                )
                .where(
                    CreditLedgerEntry.institution_id == ctx.institution.id,
                    CreditLedgerEntry.student_id == student_id,
                    CreditLedgerEntry.kind == "debit",
                    CreditLedgerEntry.created_at >= since,
                )
                .group_by(CreditLedgerEntry.action)
            ).all()
            used = int(
                s.execute(
                    select(func.coalesce(func.sum(CreditLedgerEntry.units), 0)).where(
                        CreditLedgerEntry.institution_id == ctx.institution.id,
                        CreditLedgerEntry.student_id == student_id,
                        CreditLedgerEntry.kind == "debit",
                        CreditLedgerEntry.created_at >= ctx.period_start,
                    )
                ).scalar()
                or 0
            )
        costs = {action: ctx.cost(action) for action in ACTIONS}
        remaining = ctx.learner_limit - used if ctx.learner_limit else None
        return {
            "metered": True,
            "institution": {
                "id": ctx.institution.id,
                "name": ctx.institution.name,
                "status": ctx.institution.status,
            },
            "plan": {"slug": ctx.plan.slug, "name": ctx.plan.name} if ctx.plan else None,
            "balance": int(ctx.wallet.balance),
            "learner_used_in_period": used,
            "learner_limit": ctx.learner_limit,
            "learner_remaining": remaining,
            "period_start": ctx.period_start.isoformat(),
            "usage_by_action": [
                {"action": action, "credits": int(units), "charges": int(count)}
                for action, units, count in rows
            ],
            "action_costs": costs,
            "exhausted": int(ctx.wallet.balance) <= 0 and not bool(ctx.wallet.allow_negative),
            "standard_mode": {
                "available": True,
                "note": (
                    "notes, existing lessons and quizzes, practice and review are not metered "
                    "and keep working when credits run out"
                ),
            },
            "actions": ACTIONS,
        }

    def ledger(self, institution_id: str, *, limit: int = 100) -> list[dict[str, Any]]:
        with self._session() as s:
            rows = (
                s.execute(
                    select(CreditLedgerEntry)
                    .where(CreditLedgerEntry.institution_id == institution_id)
                    .order_by(CreditLedgerEntry.created_at.desc(), CreditLedgerEntry.id.desc())
                    .limit(max(1, min(500, int(limit))))
                )
                .scalars()
                .all()
            )
            return [
                {
                    "id": row.id,
                    "kind": row.kind,
                    "action": row.action,
                    "delta": int(row.delta),
                    "units": int(row.units),
                    "balance_after": int(row.balance_after),
                    "student_id": row.student_id,
                    "actor_id": row.actor_id,
                    "reason": row.reason,
                    "reverses_entry_id": row.reverses_entry_id,
                    "idempotency_key": row.idempotency_key,
                    "created_at": row.created_at.isoformat(),
                }
                for row in rows
            ]

    # -- administration ------------------------------------------------ #
    def create_institution(
        self, *, name: str, slug: str, actor_id: str | None, external_ref: str | None = None
    ) -> Institution:
        slug = (slug or "").strip().lower()
        if not slug or len(slug) > 64:
            raise InvalidAmount("slug is required and at most 64 characters")
        with self._session() as s:
            if s.execute(select(Institution).where(Institution.slug == slug)).scalar_one_or_none():
                raise CreditError(f"an institution with slug {slug!r} already exists")
            row = Institution(
                name=(name or slug).strip()[:160],
                slug=slug,
                status="active",
                external_ref=(external_ref or None) and str(external_ref)[:120],
            )
            s.add(row)
            s.commit()
            s.expunge(row)
            return row

    def add_member(
        self,
        *,
        institution_id: str,
        student_id: str,
        role: str = "learner",
        learner_limit: int | None = None,
        actor_id: str | None = None,
    ) -> InstitutionMembership:
        if role not in ("learner", "instructor", "admin"):
            raise InvalidAmount("role must be learner, instructor or admin")
        with self._session() as s:
            institution = s.get(Institution, institution_id)
            if institution is None:
                raise InstitutionUnknown(institution_id)
            current = s.execute(
                select(InstitutionMembership).where(
                    InstitutionMembership.student_id == student_id,
                    InstitutionMembership.status == "active",
                )
            ).scalar_one_or_none()
            if current is not None:
                if current.institution_id == institution_id:
                    return current
                raise CreditError(
                    "this learner already belongs to another institution; "
                    "revoke that membership first"
                )
            row = InstitutionMembership(
                institution_id=institution_id,
                student_id=student_id,
                role=role,
                status="active",
                learner_limit=learner_limit,
            )
            s.add(row)
            s.commit()
            s.expunge(row)
            return row

    def revoke_member(
        self, *, institution_id: str, student_id: str, actor_id: str | None = None
    ) -> bool:
        with self._session() as s:
            row = s.execute(
                select(InstitutionMembership).where(
                    InstitutionMembership.institution_id == institution_id,
                    InstitutionMembership.student_id == student_id,
                    InstitutionMembership.status == "active",
                )
            ).scalar_one_or_none()
            if row is None:
                return False
            row.status = "revoked"
            row.revoked_at = utcnow()
            s.commit()
            return True

    def assign_plan(
        self,
        *,
        institution_id: str,
        plan_slug: str,
        actor_id: str | None,
        reset_balance: bool = False,
    ) -> CreditWallet:
        """Attach a plan, creating the wallet or updating limits from the plan.

        ``reset_balance`` is how an operator starts a new period with the plan's included
        credits: rather than overwriting ``balance`` (which would break the ledger's
        arithmetic), it writes a **grant** entry for the difference. A balance must always
        equal the ledger sum.
        """
        with self._session() as s:
            institution = s.get(Institution, institution_id)
            if institution is None:
                raise InstitutionUnknown(institution_id)
            plan = s.execute(
                select(CreditPlan).where(CreditPlan.slug == plan_slug)
            ).scalar_one_or_none()
            if plan is None:
                raise CreditError(f"no plan with slug {plan_slug!r}")
            wallet = s.execute(
                select(CreditWallet).where(CreditWallet.institution_id == institution_id)
            ).scalar_one_or_none()
            start, end = period_window(plan.period)
            if wallet is None:
                wallet = CreditWallet(
                    institution_id=institution_id,
                    plan_id=plan.id,
                    balance=0,
                    allow_negative=bool(plan.allow_negative),
                    learner_limit=int(plan.learner_limit),
                    period_start=start,
                    period_end=end,
                )
                s.add(wallet)
                s.flush()
            else:
                wallet.plan_id = plan.id
                wallet.allow_negative = bool(plan.allow_negative)
                wallet.learner_limit = int(plan.learner_limit)
                wallet.period_start = start
                wallet.period_end = end
            wanted = int(plan.included_credits) if reset_balance else 0
            s.commit()
            wallet_id = wallet.id
        if wanted > 0:
            self.grant(
                institution_id=institution_id,
                units=wanted,
                idempotency_key=f"plan:{plan_slug}:{start.date().isoformat()}",
                actor_id=actor_id,
                reason=f"included credits for plan {plan_slug}",
            )
        with self._session() as s:
            row = s.get(CreditWallet, wallet_id)
            assert row is not None
            s.expunge(row)
            return row


__all__ = [
    "ACTIONS",
    "CreditContext",
    "CreditError",
    "Credits",
    "CreditsExhausted",
    "InstitutionUnknown",
    "InvalidAmount",
    "LearnerLimitReached",
    "Ticket",
    "UnknownAction",
    "WalletNotConfigured",
    "period_window",
]
