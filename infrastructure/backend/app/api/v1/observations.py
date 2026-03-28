from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
import asyncio

from app.database import get_db
from app.models import Observation, Account
from app.schemas import ObservationCreate, ObservationResponse
from app.services.kafka_producer import KafkaProducer
from app.services.rate_limiter import RateLimiter
from app.config import settings

router = APIRouter()
kafka_producer = KafkaProducer()
rate_limiter = RateLimiter()


@router.post("/", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
async def create_observation(
    observation: ObservationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a new weather observation.
    Rate limited to one observation per device per 5 minutes.
    """
    # Check rate limit
    if not await rate_limiter.allow_request(
        observation.device_id_hash,
        interval_seconds=300  # 5 minutes
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. One observation per 5 minutes allowed."
        )
    
    # Create observation record
    db_observation = Observation(
        device_id_hash=observation.device_id_hash,
        timestamp=observation.timestamp,
        pressure_hpa=observation.pressure_hpa,
        latitude_grid=observation.latitude_grid,
        longitude_grid=observation.longitude_grid,
        altitude_m=observation.altitude_m,
        # Create PostGIS point
        location=f"SRID=4326;POINT({observation.longitude_grid} {observation.latitude_grid})"
    )
    
    db.add(db_observation)
    await db.commit()
    await db.refresh(db_observation)
    
    # Publish to Kafka for async validation
    await kafka_producer.send_observation({
        "observation_id": str(db_observation.id),
        "device_id_hash": db_observation.device_id_hash,
        "timestamp": db_observation.timestamp.isoformat(),
        "pressure_hpa": db_observation.pressure_hpa,
        "latitude_grid": db_observation.latitude_grid,
        "longitude_grid": db_observation.longitude_grid,
        "altitude_m": db_observation.altitude_m,
    })
    
    return db_observation


@router.get("/{device_id_hash}/recent", response_model=list[ObservationResponse])
async def get_recent_observations(
    device_id_hash: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get recent observations for a device."""
    result = await db.execute(
        select(Observation)
        .where(Observation.device_id_hash == device_id_hash)
        .order_by(Observation.timestamp.desc())
        .limit(limit)
    )
    observations = result.scalars().all()
    return observations


@router.get("/stats/network")
async def get_network_stats(db: AsyncSession = Depends(get_db)):
    """Get network-wide statistics for the last 24 hours."""
    since = datetime.utcnow() - timedelta(hours=24)
    
    # Total observations
    total_result = await db.execute(
        select(func.count(Observation.id))
        .where(Observation.timestamp >= since)
    )
    total_observations = total_result.scalar()
    
    # Unique devices
    devices_result = await db.execute(
        select(func.count(func.distinct(Observation.device_id_hash)))
        .where(Observation.timestamp >= since)
    )
    unique_devices = devices_result.scalar()
    
    # Validated observations
    validated_result = await db.execute(
        select(func.count(Observation.id))
        .where(Observation.timestamp >= since)
        .where(Observation.tier.isnot(None))
    )
    validated_count = validated_result.scalar()
    
    return {
        "observations_24h": total_observations,
        "unique_devices_24h": unique_devices,
        "validated_observations_24h": validated_count,
        "validation_rate": validated_count / total_observations if total_observations > 0 else 0
    }
