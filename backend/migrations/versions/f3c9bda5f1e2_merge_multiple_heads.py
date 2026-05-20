"""merge multiple heads

Revision ID: f3c9bda5f1e2
Revises: b7c8d9e0f1a2, bb8ef2a88670, c76ad86d1f31
Create Date: 2026-05-20 00:00:00.000000
"""

from collections.abc import Sequence


revision: str = "f3c9bda5f1e2"
down_revision: str | Sequence[str] | None = (
    "b7c8d9e0f1a2",
    "bb8ef2a88670",
    "c76ad86d1f31",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
