"""describe change

Revision ID: 21bc34c96071
Revises: aafd171c803b
Create Date: 2026-04-21 20:04:11.778561
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa



revision: str = '21bc34c96071'
down_revision: str | None = 'aafd171c803b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
