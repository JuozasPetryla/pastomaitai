"""describe change

Revision ID: aafd171c803b
Revises: 160d8a12487e
Create Date: 2026-04-21 20:03:32.971229
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa



revision: str = 'aafd171c803b'
down_revision: str | None = '160d8a12487e'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
