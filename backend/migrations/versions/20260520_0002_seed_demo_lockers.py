"""seed demo lockers

Revision ID: 20260520_0002
Revises: f3c9bda5f1e2
Create Date: 2026-05-20
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260520_0002"
down_revision: str | Sequence[str] | None = "f3c9bda5f1e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LOCKERS = (
    ("Vilnius, Gedimino pr. 9", "VLN-CENTRO-001"),
    ("Vilnius, Ozo g. 18", "VLN-OZAS-002"),
    ("Kaunas, Laisves al. 45", "KNS-CENTRO-001"),
    ("Klaipeda, Taikos pr. 61", "KLP-AKROPOLIS-001"),
)


def upgrade() -> None:
    for address, product_code in LOCKERS:
        op.execute(
            f"""
            INSERT INTO pastomatai (adresas, busena, produkto_kodas)
            VALUES ('{address}', 'aktyvus', '{product_code}')
            ON CONFLICT (produkto_kodas) DO NOTHING
            """
        )
        op.execute(
            f"""
            INSERT INTO pastomato_skyriai (pastomatas_id, dydis, numeris)
            SELECT p.id, cell.dydis::siuntos_dydis, cell.numeris
            FROM pastomatai p
            CROSS JOIN (
                VALUES
                    ('s', 1),
                    ('s', 2),
                    ('m', 3),
                    ('m', 4),
                    ('m', 5),
                    ('l', 6),
                    ('l', 7)
            ) AS cell(dydis, numeris)
            WHERE p.produkto_kodas = '{product_code}'
            ON CONFLICT (pastomatas_id, numeris) DO NOTHING
            """
        )


def downgrade() -> None:
    product_codes = ", ".join(f"'{product_code}'" for _, product_code in LOCKERS)
    op.execute(f"DELETE FROM pastomatai WHERE produkto_kodas IN ({product_codes})")
