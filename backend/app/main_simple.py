"""
Simplified AtmosNet Backend for Local Development
No external dependencies (Redis, Kafka)
Uses SQLite for quick testing
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v2 import router as v2_router
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import select, func, Column, String, Float, DateTime, Integer
from sqlalchemy.dialects.sqlite import BLOB
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import Optional
import uuid
import hashlib

# Setup
DATABASE_URL = "sqlite+aiosqlite:///./atmosnet_simple.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# In-memory rate limiting (replace with Redis in production)
rate_limit_cache = {}

# Models (without PostGIS for simplicity)
class Observation(Base):
    __tablename__ = "observations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id_hash = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    pressure_hpa = Column(Float, nullable=False)
    latitude_grid = Column(Float, nullable=False)
    longitude_grid = Column(Float, nullable=False)
    altitude_m = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    tier = Column(String(1), nullable=True)
    validated_at = Column(DateTime, nullable=True)
    points_awarded = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id_hash = Column(String(64), nullable=False, unique=True, index=True)
    balance = Column(Integer, default=0)
    total_earned = Column(Integer, default=0)
    total_redeemed = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    last_contribution_date = Column(DateTime, nullable=True)
    contributions_today = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Schemas
class ObservationCreate(BaseModel):
    device_id_hash: str = Field(..., min_length=64, max_length=64)
    timestamp: datetime
    pressure_hpa: float = Field(..., ge=870, le=1085)
    latitude_grid: float = Field(..., ge=-90, le=90)
    longitude_grid: float = Field(..., ge=-180, le=180)
    altitude_m: Optional[float] = Field(None, ge=-500, le=9000)

class ObservationResponse(BaseModel):
    id: str
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

class PointsBalanceResponse(BaseModel):
    device_id_hash: str
    balance: int
    total_earned: int
    total_redeemed: int
    current_streak: int
    contributions_today: int

# Database dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

# App
app = FastAPI(title="AtmosNet API (Simple)", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
async def check_rate_limit(device_id_hash: str) -> bool:
    now = datetime.utcnow()
    key = device_id_hash
    
    if key in rate_limit_cache:
        last_time = rate_limit_cache[key]
        if (now - last_time).total_seconds() < 300:  # 5 minutes
            return False
    
    rate_limit_cache[key] = now
    return True

# Validation
async def validate_observation(obs: Observation) -> tuple[float, Optional[str]]:
    """Simple validation - returns (confidence_score, tier)"""
    score = 70  # Base score
    
    # Check pressure plausibility
    if 950 <= obs.pressure_hpa <= 1050:
        score += 20
    elif 900 <= obs.pressure_hpa <= 1100:
        score += 10
    
    # Determine tier
    if score >= 85:
        return score, "A"
    elif score >= 60:
        return score, "B"
    else:
        return score, None

# Endpoints
@app.get("/")
async def root():
    return {"name": "AtmosNet API", "version": "1.0.0", "mode": "simple"}

@app.get("/health/")
async def health():
    return {"status": "healthy", "mode": "simple"}

@app.post("/v1/observations/", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
async def create_observation(obs: ObservationCreate, db: AsyncSession = Depends(get_db)):
    # Rate limiting
    if not await check_rate_limit(obs.device_id_hash):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. One observation per 5 minutes.")
    
    # Create observation
    db_obs = Observation(
        id=str(uuid.uuid4()),
        device_id_hash=obs.device_id_hash,
        timestamp=obs.timestamp,
        pressure_hpa=obs.pressure_hpa,
        latitude_grid=obs.latitude_grid,
        longitude_grid=obs.longitude_grid,
        altitude_m=obs.altitude_m
    )
    
    # Validate
    score, tier = await validate_observation(db_obs)
    db_obs.confidence_score = score
    db_obs.tier = tier
    db_obs.validated_at = datetime.utcnow()
    
    # Award points
    points = 10 if tier == "A" else (4 if tier == "B" else 0)
    db_obs.points_awarded = points
    
    db.add(db_obs)
    await db.flush()
    
    # Update account
    result = await db.execute(select(Account).where(Account.device_id_hash == obs.device_id_hash))
    account = result.scalar_one_or_none()
    
    if not account:
        account = Account(
            id=str(uuid.uuid4()),
            device_id_hash=obs.device_id_hash,
            balance=points,
            total_earned=points,
            contributions_today=1
        )
        db.add(account)
    else:
        account.balance += points
        account.total_earned += points
        account.contributions_today += 1
    
    await db.commit()
    await db.refresh(db_obs)
    
    return db_obs

@app.get("/v1/observations/{device_id_hash}/recent")
async def get_recent_observations(device_id_hash: str, limit: int = 10, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Observation)
        .where(Observation.device_id_hash == device_id_hash)
        .order_by(Observation.timestamp.desc())
        .limit(limit)
    )
    return result.scalars().all()

@app.get("/v1/observations/stats/network")
async def get_network_stats(db: AsyncSession = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=24)
    
    total = await db.execute(select(func.count(Observation.id)).where(Observation.timestamp >= since))
    devices = await db.execute(select(func.count(func.distinct(Observation.device_id_hash))).where(Observation.timestamp >= since))
    validated = await db.execute(select(func.count(Observation.id)).where(Observation.timestamp >= since).where(Observation.tier.isnot(None)))
    
    total_count = total.scalar()
    devices_count = devices.scalar()
    validated_count = validated.scalar()
    
    return {
        "observations_24h": total_count,
        "unique_devices_24h": devices_count,
        "validated_observations_24h": validated_count,
        "validation_rate": validated_count / total_count if total_count > 0 else 0
    }

@app.get("/v1/rewards/balance/{device_id_hash}", response_model=PointsBalanceResponse)
async def get_balance(device_id_hash: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.device_id_hash == device_id_hash))
    account = result.scalar_one_or_none()
    
    if not account:
        return PointsBalanceResponse(
            device_id_hash=device_id_hash,
            balance=0,
            total_earned=0,
            total_redeemed=0,
            current_streak=0,
            contributions_today=0
        )
    
    return PointsBalanceResponse(
        device_id_hash=account.device_id_hash,
        balance=account.balance,
        total_earned=account.total_earned,
        total_redeemed=account.total_redeemed,
        current_streak=account.current_streak,
        contributions_today=account.contributions_today
    )

# Include v2 enterprise API
app.include_router(v2_router, prefix="/v2")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
