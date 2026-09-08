"""add_tutor_session_exclusion_constraint

Revision ID: 7fc5718ab89d
Revises: 9423f59d0201
Create Date: 2026-09-05 14:30:37.338316+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7fc5718ab89d'
down_revision: Union[str, None] = '9423f59d0201'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable btree_gist extension for UUID equality in GiST
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")

    # 2. Create exclusion constraint preventing overlapping active intervals for the same tutor
    op.execute("""
        ALTER TABLE sessions
        ADD CONSTRAINT uq_tutor_no_overlapping_active_sessions
        EXCLUDE USING gist (
            tutor_id WITH =,
            tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
        )
        WHERE (status IN ('scheduled', 'in_progress'));
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE sessions
        DROP CONSTRAINT IF EXISTS uq_tutor_no_overlapping_active_sessions;
    """)