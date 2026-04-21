"""describe change

Revision ID: e0e4e39bc28b
Revises: 20260421_0001
Create Date: 2026-04-21 20:02:18.004215
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa



revision: str = 'e0e4e39bc28b'
down_revision: str | None = '20260421_0001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
