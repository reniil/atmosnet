#!/usr/bin/env python3
"""
AtmosNet Grid Model

Runs every 10 minutes to aggregate validated observations into grid forecasts.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from typing import List, Tuple, Optional
import logging
import time

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from app.models import ValidatedObservation, ForecastGrid
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("grid-model")


class GridModel:
    """Generates weather forecasts for grid cells."""
    
    def __init__(self):
        self.grid_size = 0.0045  # ~500m at equator in decimal degrees
    
    async def run(self):
        """Run the grid model once."""
        logger.info("Running Grid Model...")
        
        async with AsyncSessionLocal() as session:
            # Get active grid cells with recent observations
            active_cells = await self.get_active_grid_cells(session)
            
            for cell in active_cells:
                await self.process_grid_cell(session, cell)
            
            await session.commit()
            
            logger.info(f"Processed {len(active_cells)} grid cells")
    
    async def get_active_grid_cells(self, session: AsyncSession) -> List[Tuple[float, float]]:
        """Get grid cells with observations in the last 30 minutes."""
        thirty_min_ago = datetime.utcnow() - timedelta(minutes=30)
        
        result = await session.execute(
            select(
                ValidatedObservation.latitude_grid,
                ValidatedObservation.longitude_grid
            )
            .where(ValidatedObservation.timestamp >= thirty_min_ago)
            .distinct()
        )
        
        return result.all()
    
    async def process_grid_cell(self, session: AsyncSession, cell: Tuple[float, float]):
        """Process a single grid cell."""
        lat, lon = cell
        
        # Get recent observations for this cell
        thirty_min_ago = datetime.utcnow() - timedelta(minutes=30)
        
        result = await session.execute(
            select(ValidatedObservation)
            .where(ValidatedObservation.timestamp >= thirty_min_ago)
            .where(ValidatedObservation.latitude_grid == lat)
            .where(ValidatedObservation.longitude_grid == lon)
            .order_by(ValidatedObservation.confidence_score.desc())
        )
        observations = result.scalars().all()
        
        if not observations:
            return
        
        # Calculate weighted average pressure
        total_weight = 0
        weighted_pressure = 0
        tier_a_count = 0
        
        for obs in observations:
            weight = obs.confidence_score / 100.0
            total_weight += weight
            weighted_pressure += obs.pressure_corrected_hpa * weight
            
            if obs.tier == "A":
                tier_a_count += 1
        
        avg_pressure = weighted_pressure / total_weight if total_weight > 0 else observations[0].pressure_corrected_hpa
        
        # Determine data source weights
        if tier_a_count >= 5:
            # Strong device coverage: 60% device / 40% API
            device_weight = 0.6
            api_weight = 0.4
        else:
            # Weak device coverage: 20% device / 80% API
            device_weight = 0.2
            api_weight = 0.8
        
        # Create or update forecast grid
        forecast = ForecastGrid(
            latitude_grid=lat,
            longitude_grid=lon,
            location=f"SRID=4326;POINT({lon} {lat})",
            pressure_hpa=avg_pressure,
            device_data_weight=device_weight,
            api_data_weight=api_weight,
            observations_count=len(observations),
            tier_a_count=tier_a_count,
            calculated_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=15)  # Valid for 15 min
        )
        
        session.add(forecast)
    
    async def run_loop(self):
        """Run the grid model in a loop every 10 minutes."""
        while True:
            try:
                await self.run()
            except Exception as e:
                logger.error(f"Error in grid model: {e}")
            
            # Sleep for 10 minutes
            logger.info("Sleeping for 10 minutes...")
            await asyncio.sleep(600)


async def main():
    """Main entry point."""
    model = GridModel()
    await model.run_loop()


if __name__ == "__main__":
    asyncio.run(main())
