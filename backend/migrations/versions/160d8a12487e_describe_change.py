"""describe change

Revision ID: 160d8a12487e
Revises: e0e4e39bc28b
Create Date: 2026-04-21 20:02:55.379287
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa



revision: str = '160d8a12487e'
down_revision: str | None = 'e0e4e39bc28b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
