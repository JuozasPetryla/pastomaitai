"""notification timestamps

Revision ID: b7c8d9e0f1a2
Revises: e0e4e39bc28b
Create Date: 2026-05-17 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "b7c8d9e0f1a2"
down_revision = "e0e4e39bc28b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "pranesimai",
        "issiuntimo_operatoriui_data",
        type_=postgresql.TIMESTAMP(timezone=True),
        existing_type=sa.DATE(),
        existing_nullable=True,
    )
    op.alter_column(
        "pranesimai",
        "operatoriaus_atsako_data",
        type_=postgresql.TIMESTAMP(timezone=True),
        existing_type=sa.DATE(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "pranesimai",
        "operatoriaus_atsako_data",
        type_=sa.DATE(),
        existing_type=postgresql.TIMESTAMP(timezone=True),
        existing_nullable=True,
    )
    op.alter_column(
        "pranesimai",
        "issiuntimo_operatoriui_data",
        type_=sa.DATE(),
        existing_type=postgresql.TIMESTAMP(timezone=True),
        existing_nullable=True,
    )
