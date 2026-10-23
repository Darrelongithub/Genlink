"""Scope persisted resource candidates to the learner who reviewed them.

Revision ID: R10
Revises: R9

Resource references are also used as the server-issued IDs in the curriculum
review flow. A global provider/external-id unique constraint would let the
first learner who searched own the row for every later learner, so later
learners could not approve the same public item. Make the identity unique per
learner while retaining the existing rows and their provenance.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "R10"
down_revision: str | None = "R9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "resource_references" not in inspector.get_table_names():
        return
    constraints = {
        str(row.get("name"))
        for row in inspector.get_unique_constraints("resource_references")
        if row.get("name")
    }
    if "uq_resource_provider_ext" not in constraints and "uq_resource_owner_provider_ext" in constraints:
        return
    with op.batch_alter_table("resource_references", schema=None) as batch_op:
        if "uq_resource_provider_ext" in constraints:
            batch_op.drop_constraint("uq_resource_provider_ext", type_="unique")
        if "uq_resource_owner_provider_ext" not in constraints:
            batch_op.create_unique_constraint(
                "uq_resource_owner_provider_ext",
                ["student_id", "provider", "external_id"],
            )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "resource_references" not in inspector.get_table_names():
        return
    constraints = {
        str(row.get("name"))
        for row in inspector.get_unique_constraints("resource_references")
        if row.get("name")
    }
    with op.batch_alter_table("resource_references", schema=None) as batch_op:
        if "uq_resource_owner_provider_ext" in constraints:
            batch_op.drop_constraint("uq_resource_owner_provider_ext", type_="unique")
        if "uq_resource_provider_ext" not in constraints:
            batch_op.create_unique_constraint(
                "uq_resource_provider_ext",
                ["provider", "external_id"],
            )
