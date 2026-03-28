from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
import uuid

from app.database import Base


class Observation(Base):
    __tablename__ = "observations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id_hash = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    pressure_hpa = Column(Float, nullable=False)
    latitude_grid = Column(Float, nullable=False)
    longitude_grid = Column(Float, nullable=False)
    altitude_m = Column(Float, nullable=True)
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    
    # Validation fields
    confidence_score = Column(Float, nullable=True)
    tier = Column(String(1), nullable=True)  # 'A', 'B', or None
    validated_at = Column(DateTime, nullable=True)
    
    # Points awarded
    points_awarded = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index("idx_observations_location", "location", postgresql_using="gist"),
        Index("idx_observations_timestamp_location", "timestamp", "location"),
    )


class ValidatedObservation(Base):
    __tablename__ = "validated_observations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    observation_id = Column(UUID(as_uuid=True), ForeignKey("observations.id"), nullable=False)
    device_id_hash = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    pressure_hpa = Column(Float, nullable=False)
    pressure_corrected_hpa = Column(Float, nullable=False)  # Altitude corrected
    latitude_grid = Column(Float, nullable=False)
    longitude_grid = Column(Float, nullable=False)
    altitude_m = Column(Float, nullable=True)
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    
    # Validation results
    confidence_score = Column(Float, nullable=False)
    tier = Column(String(1), nullable=False)  # 'A' or 'B'
    api_comparison_diff_hpa = Column(Float, nullable=True)
    nearby_observations_count = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_validated_location", "location", postgresql_using="gist"),
        Index("idx_validated_tier_timestamp", "tier", "timestamp"),
    )


class ForecastGrid(Base):
    __tablename__ = "forecast_grids"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    latitude_grid = Column(Float, nullable=False)
    longitude_grid = Column(Float, nullable=False)
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    
    # Grid data
    pressure_hpa = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=True)
    humidity_percent = Column(Float, nullable=True)
    
    # Data sources
    device_data_weight = Column(Float, nullable=False)  # 0.0 to 1.0
    api_data_weight = Column(Float, nullable=False)  # 0.0 to 1.0
    observations_count = Column(Integer, nullable=False)
    tier_a_count = Column(Integer, nullable=False)
    
    # Metadata
    calculated_at = Column(DateTime, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    
    __table_args__ = (
        Index("idx_forecast_location", "location", postgresql_using="gist"),
        Index("idx_forecast_calculated", "calculated_at"),
        Index("idx_forecast_expires", "expires_at"),
    )


class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id_hash = Column(String(64), nullable=False, unique=True, index=True)
    
    # Points
    balance = Column(Integer, default=0)
    total_earned = Column(Integer, default=0)
    total_redeemed = Column(Integer, default=0)
    
    # Streak tracking
    current_streak = Column(Integer, default=0)
    last_contribution_date = Column(DateTime, nullable=True)
    contributions_today = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)
    
    # Transaction details
    amount = Column(Integer, nullable=False)  # Positive for credit, negative for debit
    type = Column(String(32), nullable=False)  # 'observation_tier_a', 'observation_tier_b', 'daily_bonus', 'redemption'
    description = Column(String(255), nullable=True)
    
    # Reference to observation if applicable
    observation_id = Column(UUID(as_uuid=True), ForeignKey("observations.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class Redemption(Base):
    __tablename__ = "redemptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)
    
    # Redemption details
    points_spent = Column(Integer, nullable=False)
    reward_type = Column(String(64), nullable=False)  # 'premium_feature', 'partner_data', 'marketplace_item'
    reward_details = Column(String(500), nullable=True)  # JSON string with reward specifics
    
    # Status
    status = Column(String(32), default="pending")  # 'pending', 'fulfilled', 'cancelled'
    fulfilled_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
