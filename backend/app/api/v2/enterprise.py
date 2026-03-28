"""
AtmosNet Enterprise API (v2)
B2B endpoints for weather data access
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.models import ForecastGrid, ValidatedObservation

router = APIRouter(prefix="/v2")


# Authentication dependency (simplified - use API key in production)
async def get_api_key(x_api_key: Optional[str] = Query(None)):
    """Validate API key and determine tier."""
    # In production, validate against database
    # For now, simplified tier detection
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # Mock tier detection based on key prefix
    if x_api_key.startswith("pro_"):
        return {"tier": "pro", "rate_limit": 1000000, "resolution_m": 500}
    elif x_api_key.startswith("std_"):
        return {"tier": "standard", "rate_limit": 100000, "resolution_m": 1000}
    elif x_api_key.startswith("free_"):
        return {"tier": "free", "rate_limit": 1000, "resolution_m": 5000}
    else:
        # Default to free tier
        return {"tier": "free", "rate_limit": 1000, "resolution_m": 5000}


@router.get("/current")
async def get_current_weather(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    api_key: dict = Depends(get_api_key),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current weather conditions at a location.
    
    **Tiers:**
    - Free: 5km resolution
    - Standard: 1km resolution  
    - Pro: 500m resolution
    """
    # Round to grid based on tier
    if api_key["tier"] == "pro":
        grid_size = 0.0045  # ~500m
    elif api_key["tier"] == "standard":
        grid_size = 0.009   # ~1km
    else:
        grid_size = 0.045   # ~5km
    
    lat_grid = round(lat / grid_size) * grid_size
    lon_grid = round(lon / grid_size) * grid_size
    
    # Get latest forecast for this grid
    result = await db.execute(
        select(ForecastGrid)
        .where(ForecastGrid.latitude_grid == lat_grid)
        .where(ForecastGrid.longitude_grid == lon_grid)
        .where(ForecastGrid.expires_at > datetime.utcnow())
        .order_by(ForecastGrid.calculated_at.desc())
    )
    forecast = result.scalar_one_or_none()
    
    if not forecast:
        # Return fallback or error
        return {
            "location": {"lat": lat, "lon": lon},
            "grid": {"lat": lat_grid, "lon": lon_grid},
            "data": None,
            "message": "No data available for this location"
        }
    
    return {
        "location": {"lat": lat, "lon": lon},
        "grid": {"lat": lat_grid, "lon": lon_grid},
        "timestamp": forecast.calculated_at.isoformat(),
        "pressure_hpa": forecast.pressure_hpa,
        "temperature_c": forecast.temperature_c,
        "humidity_percent": forecast.humidity_percent,
        "data_quality": {
            "device_weight": forecast.device_data_weight,
            "observations_count": forecast.observations_count,
            "tier_a_count": forecast.tier_a_count
        },
        "tier": api_key["tier"],
        "resolution_m": api_key["resolution_m"]
    }


@router.get("/forecast")
async def get_forecast(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    hours: int = Query(24, ge=1, le=72, description="Hours to forecast (max 72)"),
    api_key: dict = Depends(get_api_key),
    db: AsyncSession = Depends(get_db)
):
    """
    Get hourly forecast up to 72 hours.
    
    **Note:** AtmosNet provides nowcasting (0-6 hours) based on device data.
    Extended forecasts blend with external models.
    """
    # For MVP, return current conditions repeated
    # In production, this would query actual forecast model
    current = await get_current_weather(lat, lon, api_key, db)
    
    forecast_hours = []
    base_time = datetime.utcnow()
    
    for h in range(min(hours, 72)):
        hour_time = base_time + timedelta(hours=h)
        forecast_hours.append({
            "hour": h,
            "timestamp": hour_time.isoformat(),
            "pressure_hpa": current.get("data", {}).get("pressure_hpa", 1013.25),
            "temperature_c": current.get("data", {}).get("temperature_c"),
            "humidity_percent": current.get("data", {}).get("humidity_percent")
        })
    
    return {
        "location": {"lat": lat, "lon": lon},
        "generated_at": base_time.isoformat(),
        "hours_requested": hours,
        "hours_returned": len(forecast_hours),
        "tier": api_key["tier"],
        "forecast": forecast_hours
    }


@router.get("/grid")
async def get_grid_data(
    bbox: str = Query(..., description="Bounding box: minLon,minLat,maxLon,maxLat"),
    api_key: dict = Depends(get_api_key),
    db: AsyncSession = Depends(get_db)
):
    """
    Get bulk data for a bounding box area.
    
    **Format:** bbox=minLon,minLat,maxLon,maxLat
    
    **Example:** bbox=-122.5,37.7,-122.3,37.9
    
    **Response:** GeoJSON FeatureCollection
    """
    try:
        parts = bbox.split(",")
        if len(parts) != 4:
            raise ValueError("Invalid format")
        min_lon, min_lat, max_lon, max_lat = map(float, parts)
    except:
        raise HTTPException(status_code=400, detail="Invalid bbox format. Use: minLon,minLat,maxLon,maxLat")
    
    # Query grid cells within bbox
    result = await db.execute(
        select(ForecastGrid)
        .where(ForecastGrid.latitude_grid >= min_lat)
        .where(ForecastGrid.latitude_grid <= max_lat)
        .where(ForecastGrid.longitude_grid >= min_lon)
        .where(ForecastGrid.longitude_grid <= max_lon)
        .where(ForecastGrid.expires_at > datetime.utcnow())
    )
    grids = result.scalars().all()
    
    # Build GeoJSON
    features = []
    for grid in grids:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [grid.longitude_grid, grid.latitude_grid]
            },
            "properties": {
                "pressure_hpa": grid.pressure_hpa,
                "temperature_c": grid.temperature_c,
                "humidity_percent": grid.humidity_percent,
                "device_weight": grid.device_data_weight,
                "observations_count": grid.observations_count,
                "calculated_at": grid.calculated_at.isoformat()
            }
        })
    
    return {
        "type": "FeatureCollection",
        "bbox": [min_lon, min_lat, max_lon, max_lat],
        "features": features,
        "count": len(features),
        "tier": api_key["tier"],
        "resolution_m": api_key["resolution_m"]
    }


@router.get("/alerts")
async def get_weather_alerts(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(50, ge=1, le=200, description="Search radius in km"),
    api_key: dict = Depends(get_api_key),
    db: AsyncSession = Depends(get_db)
):
    """
    Get active weather alerts near a location.
    
    **Note:** Returns pressure-based anomaly detection.
    In production, would integrate with official weather services.
    """
    # Get recent observations in radius
    # Simplified: check for pressure anomalies
    since = datetime.utcnow() - timedelta(hours=1)
    
    result = await db.execute(
        select(ValidatedObservation)
        .where(ValidatedObservation.timestamp >= since)
        .where(ValidatedObservation.latitude_grid >= lat - 0.5)
        .where(ValidatedObservation.latitude_grid <= lat + 0.5)
        .where(ValidatedObservation.longitude_grid >= lon - 0.5)
        .where(ValidatedObservation.longitude_grid <= lon + 0.5)
        .order_by(ValidatedObservation.timestamp.desc())
        .limit(100)
    )
    observations = result.scalars().all()
    
    if len(observations) < 5:
        return {
            "location": {"lat": lat, "lon": lon},
            "radius_km": radius_km,
            "alerts": [],
            "message": "Insufficient data for alert detection"
        }
    
    # Simple anomaly detection: rapid pressure drop
    pressures = [obs.pressure_corrected_hpa for obs in observations]
    avg_pressure = sum(pressures) / len(pressures)
    recent_avg = sum(pressures[:10]) / min(10, len(pressures))
    
    alerts = []
    
    # Pressure drop > 3 hPa in 1 hour = potential storm
    if avg_pressure - recent_avg > 3:
        alerts.append({
            "type": "pressure_drop",
            "severity": "moderate",
            "message": "Rapid pressure drop detected",
            "details": {
                "pressure_change_hpa": round(avg_pressure - recent_avg, 2),
                "avg_pressure_hpa": round(avg_pressure, 2)
            }
        })
    
    # Very low pressure = potential severe weather
    if recent_avg < 990:
        alerts.append({
            "type": "low_pressure",
            "severity": "high",
            "message": "Very low pressure detected",
            "details": {
                "current_pressure_hpa": round(recent_avg, 2)
            }
        })
    
    return {
        "location": {"lat": lat, "lon": lon},
        "radius_km": radius_km,
        "data_points": len(observations),
        "alerts": alerts,
        "last_updated": datetime.utcnow().isoformat()
    }


@router.get("/usage")
async def get_usage_stats(api_key: dict = Depends(get_api_key)):
    """Get API usage statistics."""
    # In production, query usage database
    return {
        "tier": api_key["tier"],
        "rate_limit_per_day": api_key["rate_limit"],
        "current_usage_today": 0,  # Would query from DB
        "remaining_today": api_key["rate_limit"],
        "resolution_m": api_key["resolution_m"]
    }
