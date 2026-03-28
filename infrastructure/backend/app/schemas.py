from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
from uuid import UUID


# Observation schemas
class ObservationCreate(BaseModel):
    device_id_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 hash of device ID")
    timestamp: datetime = Field(..., description="ISO 8601 timestamp of observation")
    pressure_hpa: float = Field(..., ge=870, le=1085, description="Barometric pressure in hPa")
    latitude_grid: float = Field(..., ge=-90, le=90, description="Rounded latitude (500m grid)")
    longitude_grid: float = Field(..., ge=-180, le=180, description="Rounded longitude (500m grid)")
    altitude_m: Optional[float] = Field(None, ge=-500, le=9000, description="Altitude in meters (optional)")


class ObservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    device_id_hash: str
    timestamp: datetime
    pressure_hpa: float
    latitude_grid: float
    longitude_grid: float
    altitude_m: Optional[float]
    confidence_score: Optional[float]
    tier: Optional[str]
    points_awarded: int
    created_at: datetime


# Rewards schemas
class PointsBalanceResponse(BaseModel):
    device_id_hash: str
    balance: int
    total_earned: int
    total_redeemed: int
    current_streak: int
    contributions_today: int


class RedemptionCreate(BaseModel):
    device_id_hash: str
    points_amount: int = Field(..., gt=0)
    reward_type: str
    reward_details: Optional[str] = None


class RedemptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    account_id: UUID
    points_spent: int
    reward_type: str
    reward_details: Optional[str]
    status: str
    created_at: datetime


# Health check schemas
class HealthCheck(BaseModel):
    status: str
    timestamp: datetime
    version: str
    uptime_seconds: float


class SystemStatus(BaseModel):
    database: str
    redis: str
    kafka: str
    observations_24h: int
