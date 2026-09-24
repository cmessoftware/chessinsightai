"""MLflow PostgreSQL tracking (placeholder revision).

Revision ID: mlflow_postgres_migration
Revises: f0f85e5542e7
Create Date: 2026-03-20

MLflow experiment tables are managed outside this Alembic chain in many setups.
This revision exists so downstream migration d65ac6f4b42a can resolve.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "mlflow_postgres_migration"
down_revision: Union[str, None] = "f0f85e5542e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
