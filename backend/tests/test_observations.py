"""Tests for observations API."""

import pytest
from datetime import datetime
import hashlib


@pytest.fixture
def sample_device_hash():
    """Generate a sample device hash."""
    return hashlib.sha256(b"test_device_123").hexdigest()


@pytest.fixture
def sample_observation_data(sample_device_hash):
    """Sample observation data."""
    return {
        "device_id_hash": sample_device_hash,
        "timestamp": datetime.utcnow().isoformat(),
        "pressure_hpa": 1013.25,
        "latitude_grid": 6.5244,
        "longitude_grid": 3.3792,
        "altitude_m": 50.0
    }


def test_observation_create_valid(client, sample_observation_data):
    """Test creating a valid observation."""
    response = client.post("/v1/observations/", json=sample_observation_data)
    assert response.status_code == 201
    data = response.json()
    assert data["device_id_hash"] == sample_observation_data["device_id_hash"]
    assert data["pressure_hpa"] == sample_observation_data["pressure_hpa"]
    assert data["points_awarded"] == 0  # Points awarded after validation


def test_observation_rate_limit(client, sample_observation_data):
    """Test rate limiting."""
    # First request should succeed
    response = client.post("/v1/observations/", json=sample_observation_data)
    assert response.status_code == 201
    
    # Second immediate request should be rate limited
    response = client.post("/v1/observations/", json=sample_observation_data)
    assert response.status_code == 429


def test_observation_invalid_pressure(client, sample_observation_data):
    """Test observation with invalid pressure."""
    sample_observation_data["pressure_hpa"] = 2000  # Too high
    response = client.post("/v1/observations/", json=sample_observation_data)
    assert response.status_code == 422


def test_observation_invalid_coordinates(client, sample_observation_data):
    """Test observation with invalid coordinates."""
    sample_observation_data["latitude_grid"] = 100  # Invalid
    response = client.post("/v1/observations/", json=sample_observation_data)
    assert response.status_code == 422


def test_get_recent_observations(client, sample_observation_data):
    """Test getting recent observations."""
    # Create an observation first
    client.post("/v1/observations/", json=sample_observation_data)
    
    # Get recent observations
    response = client.get(f"/v1/observations/{sample_observation_data['device_id_hash']}/recent")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert data[0]["device_id_hash"] == sample_observation_data["device_id_hash"]
