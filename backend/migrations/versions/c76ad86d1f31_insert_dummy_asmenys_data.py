"""insert dummy asmenys data

Revision ID: c76ad86d1f31
Revises: 20260421_0001
Create Date: 2026-04-21 22:44:14.797662
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa



revision: str = 'c76ad86d1f31'
down_revision: str | None = '20260421_0001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade():
    op.execute("""
        INSERT INTO asmenys (telefono_nr, el_pastas, vardas, pavarde)
        VALUES
        ('+37061234567', 'jonas.jonaitis@example.com', 'Jonas', 'Jonaitis'),
        ('+37069876543', 'ona.petraitiene@example.com', 'Ona', 'Petraitiene'),
        ('+37065551234', 'tomas.kazlauskas@example.com', 'Tomas', 'Kazlauskas');
    """)


def downgrade():
    op.execute("""
        DELETE FROM asmenys
        WHERE el_pastas IN (
            'jonas.jonaitis@example.com',
            'ona.petraitiene@example.com',
            'tomas.kazlauskas@example.com'
        );
    """)
