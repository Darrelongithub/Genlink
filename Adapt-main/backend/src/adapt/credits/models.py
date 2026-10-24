"""Institutions, plans, wallets and the immutable Adapt Credit ledger.

Four tables, and the shape of each is a decision rather than a convenience:

``institutions``
    An institution is a *billing and governance* tenant. Before this revision the word
    did not appear in the schema at all: every learner row was owned by a learner and
    nobody else, so "institution" was a slide, not a thing. It is a thing now, but only
    where it can be enforced -- see :class:`InstitutionMembership` for the honest limit.

``institution_memberships``
    The join between a learner and an institution, with a **partial unique index** so a
    learner has at most one *active* membership while revoked memberships stay on
    record. One active institution per learner is a deliberate under-reach: it makes
    every tenant check a single lookup and removes the "which institution is this
    request for?" ambiguity that multi-membership would introduce before the rest of
    the schema is tenant-aware.

``credit_plans``
    Commercial configuration, not commercial truth. Plans are rows an operator edits;
    no KSh figure, and no plan name, appears in the adaptive-learning code. Every
    numeric column is an ``Integer`` (credits, minor currency units, caps): a balance
    is never a float, so the ledger cannot drift by a rounding error.

``credit_wallets`` / ``credit_ledger``
    A wallet is the *current* balance and the ledger is the *history*. The ledger is
    append-only -- a SQLAlchemy event listener refuses any UPDATE or DELETE on it --
    and each row carries ``idempotency_key``, so replaying a request cannot charge
    twice, and ``reverses_entry_id``, so a refund points at the debit it undoes rather
    than being an unexplained positive number.

Two vocabularies are kept apart on purpose:

* **Adapt Credits** -- customer-facing units, integers, what the ledger stores.
* **provider tokens** -- the model provider's meters (``tables.LlmCall``).

Nothing here converts one into the other. A credit costs what the plan says it
costs; a token count is an operator's cost diagnostic. Confusing the two is how a
pricing page starts billing people for punctuation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
    select,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..db.models import Base, new_id, utcnow


class Institution(Base):
    """A school, university or other organisation that owns a credit pool."""

    __tablename__ = "institutions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("ins"))
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    #: Stable, human-typed handle. Unique, because two institutions with the same slug
    #: makes "which one did the operator mean" unanswerable from an audit row.
    slug: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    #: ``active`` | ``suspended`` | ``closed``. A suspended institution keeps its data and
    #: its ledger but cannot spend: the safe state for a billing dispute.
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active", index=True)
    #: Operator-supplied reference in *their* system (SIS id, contract number). Never
    #: treated as a credential.
    external_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'suspended', 'closed')", name="ck_institution_status"
        ),
        Index("ix_institutions_status_created", "status", "created_at"),
    )


class InstitutionMembership(Base):
    """Which institution a learner belongs to, and in what capacity.

    The partial unique index is the tenant model in one line: at most one **active**
    membership per learner. A revoked row stays for the audit trail, so "was this person
    ever in that institution" is answerable after they leave.

    ``role`` here is *institutional* authority (who may read the institution's usage
    report). It is separate from ``Student.role``, which is platform authority, and
    neither is accepted from a request body anywhere.
    """

    __tablename__ = "institution_memberships"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("mem"))
    institution_id: Mapped[str] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="learner")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active", index=True)
    #: Per-learner override of the plan's cap. ``None`` means "use the wallet's".
    learner_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint("role IN ('learner', 'instructor', 'admin')", name="ck_membership_role"),
        CheckConstraint("status IN ('active', 'revoked')", name="ck_membership_status"),
        CheckConstraint(
            "learner_limit IS NULL OR learner_limit >= 0", name="ck_membership_limit_non_negative"
        ),
        # One *active* membership per learner; revoked history is not constrained.
        Index(
            "uq_membership_active_student",
            "student_id",
            unique=True,
            sqlite_where=text("status = 'active'"),
            postgresql_where=text("status = 'active'"),
        ),
    )


class CreditPlan(Base):
    """A configurable commercial plan: integer credits per period, and per-action costs.

    ``action_costs`` is the action-to-credit rule table (``explain`` -> 1, and so on).
    Keeping it in the plan row rather than in code is what lets an operator change what
    a lesson costs without a deployment, and what keeps a price out of the adaptive
    learning path entirely.

    ``list_price_minor`` is an *integer* number of minor currency units, and is display
    metadata only: no code path in this package reads it to decide anything. There is
    deliberately no default price -- a plan created without one is a plan with no price,
    which is the honest state before somebody types their commercial terms.
    """

    __tablename__ = "credit_plans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("plan"))
    slug: Mapped[str] = mapped_column(String(48), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    #: Credits included per period. 0 is a real value: a plan that grants nothing and
    #: meters everything against a manually granted balance.
    included_credits: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    #: ``month`` | ``quarter`` | ``annual``. Also the window a learner cap is measured over.
    period: Mapped[str] = mapped_column(String(16), nullable=False, default="annual")
    #: ``{"explain": 1, "generate_check": 2, ...}`` -- integer credits per action.
    action_costs: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    #: Credits one learner may consume in a period. 0 = no per-learner cap.
    learner_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    #: Whether a wallet on this plan may go below zero. Off unless an operator says so.
    allow_negative: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    #: ISO-4217 code, or NULL when the operator has not priced the plan. Display only.
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    list_price_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    #: Bumped when the action table changes, so a ledger row can name the rules in force.
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        CheckConstraint("included_credits >= 0", name="ck_plan_included_non_negative"),
        CheckConstraint("learner_limit >= 0", name="ck_plan_limit_non_negative"),
        CheckConstraint(
            "list_price_minor IS NULL OR list_price_minor >= 0", name="ck_plan_price_non_negative"
        ),
        CheckConstraint("period IN ('month', 'quarter', 'annual')", name="ck_plan_period"),
    )


class CreditWallet(Base):
    """One institution's current Adapt Credit balance.

    ``balance`` is an ``Integer`` and nothing else writes it. It is *not* the source of
    truth -- :class:`CreditLedgerEntry` is, and ``balance`` must always equal the sum of
    that ledger. Keeping a denormalised balance is what makes the debit a single
    conditional ``UPDATE`` (and therefore atomic on SQLite, which has one writer) while
    the ledger stays the audit record that can prove it.
    """

    __tablename__ = "credit_wallets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("wal"))
    institution_id: Mapped[str] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    plan_id: Mapped[str | None] = mapped_column(
        ForeignKey("credit_plans.id", ondelete="SET NULL"), nullable=True, index=True
    )
    balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    #: Copied from the plan when assigned, so a later plan edit cannot silently turn a
    #: negative balance on (or off) for an institution that already has one.
    allow_negative: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    learner_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    period_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        # Optimistic-concurrency marker for operators: a write states the version it read.
        CheckConstraint("learner_limit >= 0", name="ck_wallet_limit_non_negative"),
    )


class CreditLedgerEntry(Base):
    """One immutable line in the credit ledger.

    Signs: a ``debit`` has a negative ``delta``; a ``grant``, ``refund`` or
    ``adjustment`` has a positive one. ``units`` is always the positive magnitude, so
    reporting can sum ``units`` without caring about direction.

    Idempotency is per institution: ``(institution_id, idempotency_key)`` is unique, so a
    retried request either finds the original row (and returns it) or loses the race to
    the unique index and re-reads it. Either way the learner is charged once.

    A ``refund`` must name the debit it reverses (``reverses_entry_id``), and there can
    be at most one live refund per debit -- enforced by the same unique-index trick on
    ``(institution_id, reverses_entry_id)`` where the row is a refund. That is the rule
    that stops "failed call" compensation from being applied twice.
    """

    __tablename__ = "credit_ledger"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("crl"))
    institution_id: Mapped[str] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    wallet_id: Mapped[str] = mapped_column(
        ForeignKey("credit_wallets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    #: The learner the action belongs to, when there is one. Null for operator grants.
    student_id: Mapped[str | None] = mapped_column(
        ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    #: The metered action (``explain``, ``personalised_lesson``, ...) or ``grant``/``refund``.
    action: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    units: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(120), nullable=False)
    reverses_entry_id: Mapped[str | None] = mapped_column(
        ForeignKey("credit_ledger.id", ondelete="SET NULL"), nullable=True, index=True
    )
    #: Who caused it: a student id for a learner action, an operator identity for a grant.
    actor_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    #: Human-readable reason for an administrative change. Never contains learner text.
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False, index=True
    )

    __table_args__ = (
        UniqueConstraint("institution_id", "idempotency_key", name="uq_credit_ledger_idempotency"),
        Index(
            "uq_credit_ledger_one_refund_per_debit",
            "institution_id",
            "reverses_entry_id",
            unique=True,
            sqlite_where=text("reverses_entry_id IS NOT NULL"),
            postgresql_where=text("reverses_entry_id IS NOT NULL"),
        ),
        CheckConstraint("delta != 0", name="ck_credit_ledger_non_zero_delta"),
        CheckConstraint("units >= 0", name="ck_credit_ledger_units_non_negative"),
        CheckConstraint(
            "kind IN ('debit', 'refund', 'grant', 'adjustment')", name="ck_credit_ledger_kind"
        ),
        Index("ix_credit_ledger_institution_created", "institution_id", "created_at"),
        Index("ix_credit_ledger_student_created", "student_id", "created_at"),
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<CreditLedgerEntry {self.kind} {self.delta} {self.action}>"


def _refuse_ledger_mutation(mapper: Any, connection: Any, target: Any) -> None:
    """The ledger is append-only, and this is the mechanism, not the comment.

    A refund is a new row that points at the debit. An adjustment is a new row that says
    why. Nothing rewrites history, so a balance can always be recomputed from the ledger
    and will always agree with the wallet.
    """
    raise RuntimeError(
        "credit_ledger is append-only: write a refund or adjustment entry instead of "
        "updating or deleting a ledger row"
    )


event.listen(CreditLedgerEntry, "before_update", _refuse_ledger_mutation)
event.listen(CreditLedgerEntry, "before_delete", _refuse_ledger_mutation)


def ledger_sum(session: Any, institution_id: str) -> int:
    """The balance the ledger implies. Used by tests and by the reconciliation report."""
    total = (
        session.execute(
            select(CreditLedgerEntry.delta).where(
                CreditLedgerEntry.institution_id == institution_id
            )
        )
        .scalars()
        .all()
    )
    return int(sum(total or []))


__all__ = [
    "CreditLedgerEntry",
    "CreditPlan",
    "CreditWallet",
    "Institution",
    "InstitutionMembership",
    "ledger_sum",
]
