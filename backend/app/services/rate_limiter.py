import asyncio
from typing import Optional
import hashlib
import time

from app.services.redis_client import get_redis


class RateLimiter:
    """Rate limiter using Redis."""
    
    async def allow_request(
        self,
        device_id_hash: str,
        interval_seconds: int = 300
    ) -> bool:
        """
        Check if request is allowed under rate limit.
        Returns True if allowed, False if rate limited.
        """
        redis = await get_redis()
        
        # Create rate limit key
        key = f"ratelimit:{device_id_hash}"
        
        # Get current time
        now = time.time()
        
        # Check if key exists and when it expires
        ttl = await redis.ttl(key)
        
        if ttl > 0:
            # Still within rate limit window
            return False
        
        # Set new rate limit window
        await redis.setex(key, interval_seconds, str(now))
        return True
    
    async def get_remaining_time(
        self,
        device_id_hash: str
    ) -> Optional[int]:
        """Get remaining time until next allowed request (in seconds)."""
        redis = await get_redis()
        key = f"ratelimit:{device_id_hash}"
        
        ttl = await redis.ttl(key)
        return ttl if ttl > 0 else None
