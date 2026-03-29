"""
Enhanced AtmosNet Backend with IP-based Location Registration
Adds IP geolocation for base location and debugging endpoints
"""

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v2 import router as v2_router
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import select, func, Column, String, Float, DateTime, Integer, Text
from sqlalchemy.dialects.sqlite import BLOB
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import Optional, List
import uuid
import hashlib
import json
import re

# Setup
DATABASE_URL = "sqlite+aiosqlite:///./atmosnet_simple.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# In-memory rate limiting (replace with Redis in production)
rate_limit_cache = {}

# Models
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

# NEW: IP Location Registration Model
class IPLocation(Base):
    __tablename__ = "ip_locations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id_hash = Column(String(64), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    user_agent = Column(Text, nullable=True)
    registered_at = Column(DateTime, default=datetime.utcnow)

# NEW: Debug Log Model
class DebugLog(Base):
    __tablename__ = "debug_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id_hash = Column(String(64), nullable=True, index=True)
    endpoint = Column(String(100), nullable=False)
    request_data = Column(Text, nullable=True)
    response_data = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Schemas
class ObservationCreate(BaseModel):
    device_id_hash: str = Field(..., min_length=32, max_length=64)
    timestamp: Optional[datetime] = None
    pressure_hpa: float = Field(..., ge=870, le=1085)
    latitude_grid: float = Field(..., ge=-90, le=90)
    longitude_grid: float = Field(..., ge=-180, le=180)
    altitude_m: Optional[float] = Field(None, ge=-500, le=9000)
    gps_accuracy: Optional[float] = Field(None, ge=0, le=1000)
    location_provider: Optional[str] = Field(None)

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

# NEW: IP Location Registration Schema
class IPLocationCreate(BaseModel):
    device_id_hash: str = Field(..., min_length=32, max_length=64)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class IPLocationResponse(BaseModel):
    id: str
    device_id_hash: str
    ip_address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    city: Optional[str]
    country: Optional[str]
    region: Optional[str]
    registered_at: datetime

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
app = FastAPI(title="AtmosNet API (Enhanced)", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper: Get client IP
async def get_client_ip(request: Request) -> str:
    """Extract real client IP from request headers"""
    # Check X-Forwarded-For (for proxies)
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        # Get first IP in chain
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        # Fall back to direct connection
        ip = request.client.host if request.client else "unknown"
    
    return ip

# Helper: Simple IP geolocation (for demo - in production use ipapi.co or similar)
async def geolocate_ip(ip: str) -> dict:
    """Simple IP geolocation - returns approximate location"""
    # In production, call external API like:
    # response = await requests.get(f"https://ipapi.co/{ip}/json/")
    # For demo, return approximate based on IP hash
    
    # Generate pseudo-random but consistent location from IP
    ip_hash = hashlib.md5(ip.encode()).hexdigest()
    
    # Use hash to generate lat/lon in major regions
    regions = [
        {"lat": 40.7128, "lon": -74.0060, "city": "New York", "country": "USA"},  # US East
        {"lat": 37.7749, "lon": -122.4194, "city": "San Francisco", "country": "USA"},  # US West
        {"lat": 51.5074, "lon": -0.1278, "city": "London", "country": "UK"},  # UK
        {"lat": 48.8566, "lon": 2.3522, "city": "Paris", "country": "France"},  # France
        {"lat": 52.5200, "lon": 13.4050, "city": "Berlin", "country": "Germany"},  # Germany
        {"lat": 35.6762, "lon": 139.6503, "city": "Tokyo", "country": "Japan"},  # Japan
        {"lat": -33.8688, "lon": 151.2093, "city": "Sydney", "country": "Australia"},  # Australia
        {"lat": -23.5505, "lon": -46.6333, "city": "São Paulo", "country": "Brazil"},  # Brazil
        {"lat": 6.5244, "lon": 3.3792, "city": "Lagos", "country": "Nigeria"},  # Nigeria
        {"lat": -1.2921, "lon": 36.8219, "city": "Nairobi", "country": "Kenya"},  # Kenya
        {"lat": -6.2088, "lon": 106.8456, "city": "Jakarta", "country": "Indonesia"},  # Indonesia
    ]
    
    # Select region based on hash
    region_idx = int(ip_hash[:8], 16) % len(regions)
    region = regions[region_idx]
    
    # Add some variation
    lat_var = (int(ip_hash[8:16], 16) % 100 - 50) / 100  # ±0.5 degrees
    lon_var = (int(ip_hash[16:24], 16) % 100 - 50) / 100
    
    return {
        "latitude": region["lat"] + lat_var,
        "longitude": region["lon"] + lon_var,
        "city": region["city"],
        "country": region["country"],
        "region": region["city"]
    }

# Helper: Log debug info
async def log_debug(db: AsyncSession, device_id: str, endpoint: str, 
                   request_data: dict, response_data: dict, 
                   ip: str, user_agent: str):
    """Log request/response for debugging"""
    try:
        log = DebugLog(
            device_id_hash=device_id,
            endpoint=endpoint,
            request_data=json.dumps(request_data) if request_data else None,
            response_data=json.dumps(response_data) if response_data else None,
            ip_address=ip,
            user_agent=user_agent
        )
        db.add(log)
        await db.commit()
    except Exception as e:
        print(f"Debug log error: {e}")

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
async def validate_observation(
    obs: Observation, 
    gps_accuracy: Optional[float] = None,
    location_provider: Optional[str] = None
) -> tuple[float, Optional[str], dict]:
    """Enhanced validation with GPS accuracy scoring"""
    score = 60  # Base score
    details = {}
    
    # Pressure plausibility (30 points max)
    pressure_score = 0
    if 980 <= obs.pressure_hpa <= 1025:
        pressure_score = 30
    elif 950 <= obs.pressure_hpa <= 1050:
        pressure_score = 20
    elif 900 <= obs.pressure_hpa <= 1100:
        pressure_score = 10
    score += pressure_score
    details['pressure'] = pressure_score
    
    # Location quality (40 points max)
    location_score = 0
    if gps_accuracy is not None:
        if gps_accuracy < 10:
            location_score = 40
        elif gps_accuracy < 25:
            location_score = 35
        elif gps_accuracy < 50:
            location_score = 25
        elif gps_accuracy < 100:
            location_score = 15
        else:
            location_score = 5
    elif location_provider:
        if location_provider == 'GPS':
            location_score = 35
        elif location_provider == 'GPS+Network':
            location_score = 30
        elif location_provider == 'Network':
            location_score = 20
        else:
            location_score = 15
    else:
        location_score = 20
    score += location_score
    details['location'] = location_score
    
    # Coordinate precision (15 points max)
    precision_score = 0
    lat_str = str(obs.latitude_grid)
    lng_str = str(obs.longitude_grid)
    decimal_places = max(
        len(lat_str.split('.')[-1]) if '.' in lat_str else 0,
        len(lng_str.split('.')[-1]) if '.' in lng_str else 0
    )
    if decimal_places >= 5:
        precision_score = 15
    elif decimal_places >= 4:
        precision_score = 10
    elif decimal_places >= 3:
        precision_score = 5
    score += precision_score
    details['precision'] = precision_score
    
    # Altitude bonus (15 points)
    altitude_score = 15 if obs.altitude_m is not None else 0
    score += altitude_score
    details['altitude'] = altitude_score
    
    # Determine tier
    tier = None
    if score >= 85:
        tier = "A"
    elif score >= 60:
        tier = "B"
    
    score = min(score, 100)
    
    return score, tier, details

# ============ ENDPOINTS ============

@app.get("/")
async def root():
    return {"name": "AtmosNet API (Enhanced)", "version": "1.1.0", "features": ["ip_location", "debug_logs", "global_network"]}

@app.get("/health/")
async def health():
    return {"status": "healthy", "version": "1.1.0"}

# NEW: IP Location Registration Endpoint
@app.post("/v1/auth/register-location", response_model=IPLocationResponse)
async def register_ip_location(
    data: IPLocationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Register device with IP-based location at signup"""
    ip = await get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    
    # Get IP geolocation
    geo = await geolocate_ip(ip)
    
    # Override with provided GPS coords if available
    if data.latitude is not None and data.longitude is not None:
        geo["latitude"] = data.latitude
        geo["longitude"] = data.longitude
    
    # Create IP location record
    ip_location = IPLocation(
        device_id_hash=data.device_id_hash,
        ip_address=ip,
        latitude=geo.get("latitude"),
        longitude=geo.get("longitude"),
        city=geo.get("city"),
        country=geo.get("country"),
        region=geo.get("region"),
        user_agent=user_agent
    )
    
    db.add(ip_location)
    await db.commit()
    await db.refresh(ip_location)
    
    # Also create account if not exists
    result = await db.execute(select(Account).where(Account.device_id_hash == data.device_id_hash))
    account = result.scalar_one_or_none()
    
    if not account:
        account = Account(
            id=str(uuid.uuid4()),
            device_id_hash=data.device_id_hash,
            balance=0,
            total_earned=0
        )
        db.add(account)
        await db.commit()
    
    return IPLocationResponse(
        id=ip_location.id,
        device_id_hash=ip_location.device_id_hash,
        ip_address=ip_location.ip_address,
        latitude=ip_location.latitude,
        longitude=ip_location.longitude,
        city=ip_location.city,
        country=ip_location.country,
        region=ip_location.region,
        registered_at=ip_location.registered_at
    )

# NEW: Debug endpoint to check data
@app.get("/v1/debug/observations")
async def debug_observations(
    device_id_hash: Optional[str] = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Debug endpoint to see recent observations"""
    query = select(Observation).order_by(Observation.created_at.desc()).limit(limit)
    
    if device_id_hash:
        query = query.where(Observation.device_id_hash == device_id_hash)
    
    result = await db.execute(query)
    observations = result.scalars().all()
    
    return {
        "count": len(observations),
        "observations": [
            {
                "id": obs.id,
                "device_id_hash": obs.device_id_hash[:16] + "...",
                "timestamp": obs.timestamp,
                "pressure_hpa": obs.pressure_hpa,
                "latitude_grid": obs.latitude_grid,
                "longitude_grid": obs.longitude_grid,
                "confidence_score": obs.confidence_score,
                "tier": obs.tier,
                "points_awarded": obs.points_awarded,
                "created_at": obs.created_at
            }
            for obs in observations
        ]
    }

# NEW: Get registered locations for map
@app.get("/v1/locations/registered")
async def get_registered_locations(
    limit: int = 1000,
    db: AsyncSession = Depends(get_db)
):
    """Get all registered IP locations for the world map"""
    result = await db.execute(
        select(IPLocation)
        .where(IPLocation.latitude.isnot(None))
        .where(IPLocation.longitude.isnot(None))
        .order_by(IPLocation.registered_at.desc())
        .limit(limit)
    )
    locations = result.scalars().all()
    
    return {
        "count": len(locations),
        "locations": [
            {
                "device_id_hash": loc.device_id_hash[:16] + "...",
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "city": loc.city,
                "country": loc.country,
                "registered_at": loc.registered_at
            }
            for loc in locations
        ]
    }

# Observation endpoints (unchanged but with debug logging)
@app.post("/v1/observations/", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
async def create_observation(
    obs: ObservationCreate, 
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    ip = await get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    
    # Rate limiting
    if not await check_rate_limit(obs.device_id_hash):
        await log_debug(db, obs.device_id_hash, "/v1/observations/", 
                       obs.dict(), {"error": "Rate limited"}, ip, user_agent)
        raise HTTPException(status_code=429, detail="Rate limit exceeded. One observation per 5 minutes.")
    
    # Auto-generate timestamp if not provided
    timestamp = obs.timestamp or datetime.utcnow()
    
    # Create observation
    db_obs = Observation(
        id=str(uuid.uuid4()),
        device_id_hash=obs.device_id_hash,
        timestamp=timestamp,
        pressure_hpa=obs.pressure_hpa,
        latitude_grid=obs.latitude_grid,
        longitude_grid=obs.longitude_grid,
        altitude_m=obs.altitude_m
    )
    
    # Validate with GPS accuracy info
    score, tier, details = await validate_observation(
        db_obs, 
        gps_accuracy=obs.gps_accuracy,
        location_provider=obs.location_provider
    )
    db_obs.confidence_score = score
    db_obs.tier = tier
    db_obs.validated_at = datetime.utcnow()
    
    # Award points based on tier
    if tier == "A":
        points = 10
    elif tier == "B":
        points = 5
    else:
        points = 2
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
    
    # Log successful observation
    response_data = {
        "id": db_obs.id,
        "confidence_score": score,
        "tier": tier,
        "points_awarded": points
    }
    await log_debug(db, obs.device_id_hash, "/v1/observations/",
                   obs.dict(), response_data, ip, user_agent)
    
    return db_obs

# Other endpoints (unchanged)
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