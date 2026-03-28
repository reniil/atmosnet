#!/usr/bin/env python3
"""
AtmosNet Validation Engine

Consumes raw observations from Kafka, validates them, and writes validated data.
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

import httpx
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from app.models import Observation, ValidatedObservation
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("validation-engine")


class ValidationEngine:
    """Validates weather observations from devices."""
    
    def __init__(self):
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.producer: Optional[AIOKafkaProducer] = None
        self.http_client = httpx.AsyncClient(timeout=10.0)
    
    async def start(self):
        """Start the validation engine."""
        logger.info("Starting Validation Engine...")
        
        # Create consumer
        self.consumer = AIOKafkaConsumer(
            settings.KAFKA_OBSERVATIONS_TOPIC,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id="validation-engine",
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest'
        )
        
        # Create producer for validated observations
        self.producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        
        await self.consumer.start()
        await self.producer.start()
        
        logger.info("Validation Engine started. Waiting for observations...")
        
        try:
            async for msg in self.consumer:
                await self.process_observation(msg.value)
        finally:
            await self.stop()
    
    async def stop(self):
        """Stop the validation engine."""
        logger.info("Stopping Validation Engine...")
        await self.consumer.stop()
        await self.producer.stop()
        await self.http_client.aclose()
    
    async def process_observation(self, observation_data: Dict[str, Any]):
        """Process a single observation."""
        observation_id = observation_data.get("observation_id")
        logger.info(f"Processing observation {observation_id}")
        
        async with AsyncSessionLocal() as session:
            # Get observation from DB
            result = await session.execute(
                select(Observation).where(Observation.id == observation_id)
            )
            observation = result.scalar_one_or_none()
            
            if not observation:
                logger.warning(f"Observation {observation_id} not found in DB")
                return
            
            # Run validation
            validation_result = await self.validate_observation(session, observation)
            
            # Update observation with validation results
            observation.confidence_score = validation_result["confidence_score"]
            observation.tier = validation_result["tier"]
            observation.validated_at = datetime.utcnow()
            
            # If Tier A or B, create validated observation record
            if validation_result["tier"] in ["A", "B"]:
                validated = ValidatedObservation(
                    observation_id=observation.id,
                    device_id_hash=observation.device_id_hash,
                    timestamp=observation.timestamp,
                    pressure_hpa=observation.pressure_hpa,
                    pressure_corrected_hpa=validation_result["pressure_corrected_hpa"],
                    latitude_grid=observation.latitude_grid,
                    longitude_grid=observation.longitude_grid,
                    altitude_m=observation.altitude_m,
                    location=observation.location,
                    confidence_score=validation_result["confidence_score"],
                    tier=validation_result["tier"],
                    api_comparison_diff_hpa=validation_result.get("api_diff_hpa"),
                    nearby_observations_count=validation_result.get("nearby_count")
                )
                session.add(validated)
                
                # Publish to validated topic for points processing
                await self.producer.send(
                    settings.KAFKA_VALIDATED_TOPIC,
                    {
                        "observation_id": str(observation.id),
                        "device_id_hash": observation.device_id_hash,
                        "tier": validation_result["tier"],
                        "timestamp": observation.timestamp.isoformat()
                    }
                )
                
                logger.info(f"Observation {observation_id} validated: Tier {validation_result['tier']}, Score {validation_result['confidence_score']:.1f}")
            else:
                logger.info(f"Observation {observation_id} rejected: Score {validation_result['confidence_score']:.1f}")
            
            await session.commit()
    
    async def validate_observation(
        self,
        session: AsyncSession,
        observation
    ) -> Dict[str, Any]:
        """
        Validate an observation and return confidence score.
        
        Validation criteria:
        1. Altitude correction using hypsometric formula
        2. Comparison with OpenWeatherMap API
        3. Comparison with nearby observations (30 min window)
        """
        
        scores = []
        
        # 1. Altitude correction
        pressure_corrected = self.correct_pressure_for_altitude(
            observation.pressure_hpa,
            observation.altitude_m or 0
        )
        
        # 2. Compare with OpenWeatherMap API
        api_diff = None
        if settings.OPENWEATHER_API_KEY:
            try:
                api_data = await self.get_openweather_data(
                    observation.latitude_grid,
                    observation.longitude_grid
                )
                if api_data:
                    api_diff = abs(pressure_corrected - api_data["pressure_hpa"])
                    # Score based on difference (closer = higher score)
                    if api_diff < 1.0:
                        scores.append(35)
                    elif api_diff < 2.5:
                        scores.append(25)
                    elif api_diff < 5.0:
                        scores.append(15)
                    else:
                        scores.append(5)
            except Exception as e:
                logger.warning(f"Failed to fetch OpenWeatherMap data: {e}")
        
        # If no API check, give baseline score
        if api_diff is None:
            scores.append(20)
        
        # 3. Compare with nearby observations
        nearby_count = await self.count_nearby_observations(session, observation)
        
        if nearby_count >= 5:
            scores.append(35)
        elif nearby_count >= 3:
            scores.append(25)
        elif nearby_count >= 1:
            scores.append(15)
        else:
            scores.append(10)  # First observation in area
        
        # 4. Plausibility check (basic sanity check)
        if 950 <= pressure_corrected <= 1050:
            scores.append(30)
        elif 900 <= pressure_corrected <= 1100:
            scores.append(20)
        else:
            scores.append(0)  # Reject extreme values
        
        # Calculate final confidence score
        confidence_score = sum(scores)
        
        # Determine tier
        if confidence_score >= 85:
            tier = "A"
        elif confidence_score >= 60:
            tier = "B"
        else:
            tier = None  # Rejected
        
        return {
            "confidence_score": confidence_score,
            "tier": tier,
            "pressure_corrected_hpa": pressure_corrected,
            "api_diff_hpa": api_diff,
            "nearby_count": nearby_count
        }
    
    def correct_pressure_for_altitude(self, pressure_hpa: float, altitude_m: float) -> float:
        """
        Correct pressure reading for altitude using simplified hypsometric formula.
        
        P_sea = P_station * (1 + (altitude / 44330))^5.255
        """
        if altitude_m == 0:
            return pressure_hpa
        
        return pressure_hpa * (1 + (altitude_m / 44330.0)) ** 5.255
    
    async def get_openweather_data(self, lat: float, lon: float) -> Optional[Dict]:
        """Fetch current weather data from OpenWeatherMap API."""
        if not settings.OPENWEATHER_API_KEY:
            return None
        
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": settings.OPENWEATHER_API_KEY,
            "units": "metric"
        }
        
        response = await self.http_client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        return {
            "pressure_hpa": data["main"]["pressure"],
            "temperature_c": data["main"]["temp"],
            "humidity_percent": data["main"]["humidity"]
        }
    
    async def count_nearby_observations(
        self,
        session: AsyncSession,
        observation
    ) -> int:
        """Count validated observations near this location in the last 30 minutes."""
        from geoalchemy2.functions import ST_DWithin, ST_GeogFromText
        
        thirty_min_ago = observation.timestamp - timedelta(minutes=30)
        
        # Query for observations within ~2km (roughly 0.02 degrees)
        result = await session.execute(
            select(func.count(ValidatedObservation.id))
            .where(ValidatedObservation.timestamp >= thirty_min_ago)
            .where(ValidatedObservation.timestamp < observation.timestamp)
            .where(
                func.ST_DWithin(
                    ValidatedObservation.location,
                    observation.location,
                    2000  # 2000 meters
                )
            )
        )
        
        return result.scalar()


async def main():
    """Main entry point."""
    engine = ValidationEngine()
    
    try:
        await engine.start()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    finally:
        await engine.stop()


if __name__ == "__main__":
    asyncio.run(main())
