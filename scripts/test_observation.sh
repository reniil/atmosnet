#!/bin/bash
# Test script for submitting observations

DEVICE_HASH="a"$(openssl rand -hex 32)

# Lagos coordinates (rounded to 500m grid)
LAT="6.5244"
LON="3.3792"

# Current timestamp in ISO 8601
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Sample pressure (typical sea level)
PRESSURE="1013.25"

echo "Submitting observation..."
echo "Device Hash: $DEVICE_HASH"
echo "Location: $LAT, $LON"
echo "Pressure: $PRESSURE hPa"

curl -X POST http://localhost:8000/v1/observations/ \
  -H "Content-Type: application/json" \
  -d "{
    \"device_id_hash\": \"$DEVICE_HASH\",
    \"timestamp\": \"$TIMESTAMP\",
    \"pressure_hpa\": $PRESSURE,
    \"latitude_grid\": $LAT,
    \"longitude_grid\": $LON,
    \"altitude_m\": 15.0
  }" | jq .

echo ""
echo "Checking balance..."
sleep 2

curl -s http://localhost:8000/v1/rewards/balance/$DEVICE_HASH | jq .
