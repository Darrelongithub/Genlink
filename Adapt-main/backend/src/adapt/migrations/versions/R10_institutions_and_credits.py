"""Institutions, plans, wallets and the Adapt Credit ledger.

Revision ID: R10
Revises: R9

Four additive tables, existence-aware like every revision since 0003 (a database built by
``create_all`` from this build already has them). Nothing here alters or drops an existing
table, so an installation with learners keeps every row it had:

* ``institutions`` -- the organisation that owns a credit pool;
* ``institution_memberships`` -- which learner belongs to which institution, with a
  partial unique index so a learner has at most one *active* membership while revoked
  history survives;
* ``credit_plans`` -- configurable commercial terms. No price is written by this
  revision: the columns are nullable so an operator can create a plan and price it later,
  rather than a migration inventing a currency;
* ``credit_wallets`` and ``credit_ledger`` -- an integer balance and its append-only
  history. The wallet is a denormalised sum of the ledger; every write goes through
  ``adapt.credits.service``, which never lets the two disagree.

Deliberately **not** in this revision: an ``institution_id`` column on the learner-facing
tables (attempts, sessions, evidence, chat, ...). Backfilling a tenant column onto tables
that predate tenancy is a data migration with a real chance of mis-attributing a learner's
history, and it would not be correct until every query filters on it. The readiness note
(`BACKEND_READINESS.md`) carries that as a blocking item with the exact steps, instead of
this revision pretending the isolation exists.

SQLite cannot add a foreign key to an existing table in place; the new tables are new, so
that limitation does not apply here -- ``PRAGMA foreign_keys`` is already on for every
connection (see ``db/engine.py``), which is what makes the ``ON DELETE CASCADE`` clauses
above mean something.

Downgrade drops the four tables in dependency order. It is destructive by definition
(the ledger is the record of what was spent) and is documented as such in
``BACKEND_READINESS.md``: take a copy of the database file first.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Registers the five ORM tables on ``Base.metadata`` so ``alembic check`` compares the
# migrated database against the same schema the application declares.
import adapt.credits.models  # noqa: F401

revision: str = "R10"
down_revision: str | None = "R9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _tables()

    if "institutions" not in existing:
        op.create_table(
            "institutions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("slug", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False),
            sa.Column("external_ref", sa.String(length=120), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.CheckConstraint(
                "status IN ('active', 'suspended', 'closed')", name="ck_institution_status"
            ),
        )
        op.create_index("ix_institutions_slug", "institutions", ["slug"], unique=True)
        op.create_index("ix_institutions_status", "institutions", ["status"])
        op.create_index("ix_institutions_status_created", "institutions", ["status", "created_at"])

    if "institution_memberships" not in existing:
        op.create_table(
            "institution_memberships",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column(
                "institution_id",
                sa.String(),
                sa.ForeignKey("institutions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "student_id",
                sa.String(),
                sa.ForeignKey("students.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("role", sa.String(length=16), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False),
            sa.Column("learner_limit", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.CheckConstraint(
                "role IN ('learner', 'instructor', 'admin')", name="ck_membership_role"
            ),
            sa.CheckConstraint("status IN ('active', 'revoked')", name="ck_membership_status"),
            sa.CheckConstraint(
                "learner_limit IS NULL OR learner_limit >= 0",
                name="ck_membership_limit_non_negative",
            ),
        )
        op.create_index(
            "ix_institution_memberships_institution_id",
            "institution_memberships",
            ["institution_id"],
        )
        op.create_index(
            "ix_institution_memberships_student_id", "institution_memberships", ["student_id"]
        )
        op.create_index("ix_institution_memberships_status", "institution_memberships", ["status"])
        op.create_index(
            "uq_membership_active_student",
            "institution_memberships",
            ["student_id"],
            unique=True,
            sqlite_where=sa.text("status = 'active'"),
            postgresql_where=sa.text("status = 'active'"),
        )

    if "credit_plans" not in existing:
        op.create_table(
            "credit_plans",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("slug", sa.String(length=48), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("included_credits", sa.Integer(), nullable=False),
            sa.Column("period", sa.String(length=16), nullable=False),
            sa.Column("action_costs", sa.JSON(), nullable=False),
            sa.Column("learner_limit", sa.Integer(), nullable=False),
            sa.Column("allow_negative", sa.Boolean(), nullable=False),
            sa.Column("currency", sa.String(length=3), nullable=True),
            sa.Column("list_price_minor", sa.Integer(), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.CheckConstraint("included_credits >= 0", name="ck_plan_included_non_negative"),
            sa.CheckConstraint("learner_limit >= 0", name="ck_plan_limit_non_negative"),
            sa.CheckConstraint(
                "list_price_minor IS NULL OR list_price_minor >= 0",
                name="ck_plan_price_non_negative",
            ),
            sa.CheckConstraint("period IN ('month', 'quarter', 'annual')", name="ck_plan_period"),
        )
        op.create_index("ix_credit_plans_slug", "credit_plans", ["slug"], unique=True)
        op.create_index("ix_credit_plans_active", "credit_plans", ["active"])

    if "credit_wallets" not in existing:
        op.create_table(
            "credit_wallets",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column(
                "institution_id",
                sa.String(),
                sa.ForeignKey("institutions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "plan_id",
                sa.String(),
                sa.ForeignKey("credit_plans.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("balance", sa.Integer(), nullable=False),
            sa.Column("allow_negative", sa.Boolean(), nullable=False),
            sa.Column("learner_limit", sa.Integer(), nullable=False),
            sa.Column("period_start", sa.DateTime(), nullable=False),
            sa.Column("period_end", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.CheckConstraint("learner_limit >= 0", name="ck_wallet_limit_non_negative"),
        )
        op.create_index(
            "ix_credit_wallets_institution_id", "credit_wallets", ["institution_id"], unique=True
        )
        op.create_index("ix_credit_wallets_plan_id", "credit_wallets", ["plan_id"])

    if "credit_ledger" not in existing:
        op.create_table(
            "credit_ledger",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column(
                "institution_id",
                sa.String(),
                sa.ForeignKey("institutions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "wallet_id",
                sa.String(),
                sa.ForeignKey("credit_wallets.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "student_id",
                sa.String(),
                sa.ForeignKey("students.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("kind", sa.String(length=16), nullable=False),
            sa.Column("action", sa.String(length=48), nullable=False),
            sa.Column("delta", sa.Integer(), nullable=False),
            sa.Column("units", sa.Integer(), nullable=False),
            sa.Column("balance_after", sa.Integer(), nullable=False),
            sa.Column("idempotency_key", sa.String(length=120), nullable=False),
            sa.Column(
                "reverses_entry_id",
                sa.String(),
                sa.ForeignKey("credit_ledger.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("actor_id", sa.String(), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("request_id", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint(
                "institution_id", "idempotency_key", name="uq_credit_ledger_idempotency"
            ),
            sa.CheckConstraint("delta != 0", name="ck_credit_ledger_non_zero_delta"),
            sa.CheckConstraint("units >= 0", name="ck_credit_ledger_units_non_negative"),
            sa.CheckConstraint(
                "kind IN ('debit', 'refund', 'grant', 'adjustment')", name="ck_credit_ledger_kind"
            ),
        )
        op.create_index("ix_credit_ledger_institution_id", "credit_ledger", ["institution_id"])
        op.create_index("ix_credit_ledger_wallet_id", "credit_ledger", ["wallet_id"])
        op.create_index("ix_credit_ledger_student_id", "credit_ledger", ["student_id"])
        op.create_index("ix_credit_ledger_kind", "credit_ledger", ["kind"])
        op.create_index("ix_credit_ledger_action", "credit_ledger", ["action"])
        op.create_index(
            "ix_credit_ledger_reverses_entry_id", "credit_ledger", ["reverses_entry_id"]
        )
        op.create_index("ix_credit_ledger_actor_id", "credit_ledger", ["actor_id"])
        op.create_index("ix_credit_ledger_created_at", "credit_ledger", ["created_at"])
        op.create_index(
            "uq_credit_ledger_one_refund_per_debit",
            "credit_ledger",
            ["institution_id", "reverses_entry_id"],
            unique=True,
            sqlite_where=sa.text("reverses_entry_id IS NOT NULL"),
            postgresql_where=sa.text("reverses_entry_id IS NOT NULL"),
        )
        op.create_index(
            "ix_credit_ledger_institution_created",
            "credit_ledger",
            ["institution_id", "created_at"],
        )
        op.create_index(
            "ix_credit_ledger_student_created", "credit_ledger", ["student_id", "created_at"]
        )


def downgrade() -> None:
    existing = _tables()
    if "credit_ledger" in existing:
        op.drop_table("credit_ledger")
    if "credit_wallets" in existing:
        op.drop_table("credit_wallets")
    if "credit_plans" in existing:
        op.drop_table("credit_plans")
    if "institution_memberships" in existing:
        op.drop_table("institution_memberships")
    if "institutions" in existing:
        op.drop_table("institutions")
