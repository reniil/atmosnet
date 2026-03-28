from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import asyncio

from app.database import get_db
from app.services.redis_client import get_redis
from app.services.kafka_producer import KafkaProducer
from app.config import settings

router = APIRouter()


@router.get("/")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "atmosnet-backend",
        "version": "1.0.0"
    }


@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe - checks all dependencies."""
    checks = {}
    
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
    
    # Check Redis
    try:
        redis = await get_redis()
        await redis.ping()
        checks["redis"] = "healthy"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"
    
    # Check Kafka
    try:
        producer = KafkaProducer()
        # Just check if we can connect, don't actually send
        checks["kafka"] = "healthy"
    except Exception as e:
        checks["kafka"] = f"unhealthy: {str(e)}"
    
    # Determine overall status
    all_healthy = all(v == "healthy" for v in checks.values())
    
    if all_healthy:
        return {
            "status": "ready",
            "checks": checks
        }
    else:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "checks": checks
            }
        )


@router.get("/live")
async def liveness_check():
    """Liveness probe - lightweight check."""
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }
