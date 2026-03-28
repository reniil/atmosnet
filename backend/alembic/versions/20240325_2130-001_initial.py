"""Initial migration

Revision ID: 202403252130-001_initial
Create Date: 2024-03-25 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    
    # observations table
    op.create_table(
        'observations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('device_id_hash', sa.String(64), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('pressure_hpa', sa.Float(), nullable=False),
        sa.Column('latitude_grid', sa.Float(), nullable=False),
        sa.Column('longitude_grid', sa.Float(), nullable=False),
        sa.Column('altitude_m', sa.Float(), nullable=True),
        sa.Column('location', Geometry('POINT', srid=4326), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('tier', sa.String(1), nullable=True),
        sa.Column('validated_at', sa.DateTime(), nullable=True),
        sa.Column('points_awarded', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_observations_device', 'observations', ['device_id_hash'])
    op.create_index('idx_observations_timestamp', 'observations', ['timestamp'])
    
    # validated_observations table
    op.create_table(
        'validated_observations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('observation_id', sa.UUID(), nullable=False),
        sa.Column('device_id_hash', sa.String(64), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('pressure_hpa', sa.Float(), nullable=False),
        sa.Column('pressure_corrected_hpa', sa.Float(), nullable=False),
        sa.Column('latitude_grid', sa.Float(), nullable=False),
        sa.Column('longitude_grid', sa.Float(), nullable=False),
        sa.Column('altitude_m', sa.Float(), nullable=True),
        sa.Column('location', Geometry('POINT', srid=4326), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('tier', sa.String(1), nullable=False),
        sa.Column('api_comparison_diff_hpa', sa.Float(), nullable=True),
        sa.Column('nearby_observations_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_validated_device', 'validated_observations', ['device_id_hash'])
    op.create_index('idx_validated_timestamp', 'validated_observations', ['timestamp'])
    
    # forecast_grids table
    op.create_table(
        'forecast_grids',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('latitude_grid', sa.Float(), nullable=False),
        sa.Column('longitude_grid', sa.Float(), nullable=False),
        sa.Column('location', Geometry('POINT', srid=4326), nullable=False),
        sa.Column('pressure_hpa', sa.Float(), nullable=False),
        sa.Column('temperature_c', sa.Float(), nullable=True),
        sa.Column('humidity_percent', sa.Float(), nullable=True),
        sa.Column('device_data_weight', sa.Float(), nullable=False),
        sa.Column('api_data_weight', sa.Float(), nullable=False),
        sa.Column('observations_count', sa.Integer(), nullable=False),
        sa.Column('tier_a_count', sa.Integer(), nullable=False),
        sa.Column('calculated_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_forecast_grid', 'forecast_grids', ['latitude_grid', 'longitude_grid'])
    
    # accounts table
    op.create_table(
        'accounts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('device_id_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('balance', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_earned', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_redeemed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('current_streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_contribution_date', sa.DateTime(), nullable=True),
        sa.Column('contributions_today', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_accounts_device', 'accounts', ['device_id_hash'])
    
    # transactions table
    op.create_table(
        'transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('account_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(32), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('observation_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_transactions_account', 'transactions', ['account_id'])
    op.create_index('idx_transactions_created', 'transactions', ['created_at'])
    
    # redemptions table
    op.create_table(
        'redemptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('account_id', sa.UUID(), nullable=False),
        sa.Column('points_spent', sa.Integer(), nullable=False),
        sa.Column('reward_type', sa.String(64), nullable=False),
        sa.Column('reward_details', sa.String(500), nullable=True),
        sa.Column('status', sa.String(32), nullable=False, server_default='pending'),
        sa.Column('fulfilled_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_redemptions_account', 'redemptions', ['account_id'])


def downgrade() -> None:
    op.drop_table('redemptions')
    op.drop_table('transactions')
    op.drop_table('accounts')
    op.drop_table('forecast_grids')
    op.drop_table('validated_observations')
    op.drop_table('observations')
