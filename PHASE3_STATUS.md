# Phase 3 — B2B API & Kong Gateway

**Status:** 🟡 **IN PROGRESS**

---

## Enterprise API Endpoints (v2)

### 1. Current Weather

**GET** `/v2/current`

**Query Parameters:**
- `lat` (required): Latitude (-90 to 90)
- `lon` (required): Longitude (-180 to 180)
- `x-api-key` (required): API key in query or header

**Response by Tier:**

| Tier | Resolution | Example Key Prefix |
|------|------------|-------------------|
| Free | 5km | `free_...` |
| Standard ($299/mo) | 1km | `std_...` |
| Pro ($999/mo) | 500m | `pro_...` |

**Example:**
```bash
curl "http://localhost:3000/v2/current?lat=6.5244&lon=3.3792&x-api-key=free_demo_key"
```

**Response:**
```json
{
  "location": {"lat": 6.5244, "lon": 3.3792},
  "grid": {"lat": 6.524, "lon": 3.379},
  "timestamp": "2024-03-25T22:00:00Z",
  "pressure_hpa": 1013.25,
  "temperature_c": 28.5,
  "humidity_percent": 75,
  "data_quality": {
    "device_weight": 0.6,
    "observations_count": 12,
    "tier_a_count": 8
  },
  "tier": "free",
  "resolution_m": 5000
}
```

---

### 2. Hourly Forecast

**GET** `/v2/forecast`

**Query Parameters:**
- `lat`, `lon` (required): Location
- `hours` (optional): 1-72 (default: 24)
- `x-api-key` (required)

**Example:**
```bash
curl "http://localhost:3000/v2/forecast?lat=6.5244&lon=3.3792&hours=24&x-api-key=pro_client"
```

**Response:**
```json
{
  "location": {"lat": 6.5244, "lon": 3.3792},
  "generated_at": "2024-03-25T22:00:00Z",
  "hours_requested": 24,
  "hours_returned": 24,
  "tier": "pro",
  "forecast": [
    {
      "hour": 0,
      "timestamp": "2024-03-25T22:00:00Z",
      "pressure_hpa": 1013.25,
      "temperature_c": 28.5,
      "humidity_percent": 75
    },
    ...
  ]
}
```

---

### 3. Grid Data (Bulk)

**GET** `/v2/grid`

**Query Parameters:**
- `bbox` (required): Bounding box `minLon,minLat,maxLon,maxLat`
- `x-api-key` (required)

**Example:**
```bash
curl "http://localhost:3000/v2/grid?bbox=3.3,6.5,3.4,6.6&x-api-key=std_client"
```

**Response:** GeoJSON FeatureCollection
```json
{
  "type": "FeatureCollection",
  "bbox": [3.3, 6.5, 3.4, 6.6],
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [3.379, 6.524]
      },
      "properties": {
        "pressure_hpa": 1013.25,
        "temperature_c": 28.5,
        "observations_count": 12
      }
    }
  ],
  "count": 45,
  "tier": "standard",
  "resolution_m": 1000
}
```

---

### 4. Weather Alerts

**GET** `/v2/alerts`

**Query Parameters:**
- `lat`, `lon` (required): Center location
- `radius_km` (optional): 1-200 (default: 50)
- `x-api-key` (required)

**Response:**
```json
{
  "location": {"lat": 6.5244, "lon": 3.3792},
  "radius_km": 50,
  "data_points": 124,
  "alerts": [
    {
      "type": "pressure_drop",
      "severity": "moderate",
      "message": "Rapid pressure drop detected",
      "details": {
        "pressure_change_hpa": 4.5,
        "avg_pressure_hpa": 1010.2
      }
    }
  ],
  "last_updated": "2024-03-25T22:00:00Z"
}
```

---

### 5. Usage Stats

**GET** `/v2/usage`

**Headers:** `x-api-key: your_key`

**Response:**
```json
{
  "tier": "pro",
  "rate_limit_per_day": 1000000,
  "current_usage_today": 15234,
  "remaining_today": 984766,
  "resolution_m": 500
}
```

---

## Pricing Tiers

| Tier | Price | Daily Calls | Resolution | Best For |
|------|-------|-------------|------------|----------|
| **Free** | $0 | 1,000 | 5km | Personal projects, testing |
| **Standard** | $299/mo | 100,000 | 1km | Small businesses, startups |
| **Pro** | $999/mo | 1,000,000 | 500m | Enterprise, high-frequency apps |

**Custom:** Contact sales for higher limits or dedicated infrastructure.

---

## Kong API Gateway Setup

### Installation (Local Docker)

```bash
# Start Kong
docker run -d --name kong-database \
  -e POSTGRES_USER=kong \
  -e POSTGRES_DB=kong \
  -p 5432:5432 \
  postgres:13

docker run --rm \
  -e KONG_DATABASE=postgres \
  -e KONG_PG_HOST=kong-database \
  kong:latest kong migrations bootstrap

docker run -d --name kong \
  -e KONG_DATABASE=postgres \
  -e KONG_PG_HOST=kong-database \
  -e KONG_PROXY_ACCESS_LOG=/dev/stdout \
  -e KONG_ADMIN_ACCESS_LOG=/dev/stdout \
  -e KONG_PROXY_ERROR_LOG=/dev/stderr \
  -e KONG_ADMIN_ERROR_LOG=/dev/stderr \
  -p 8000:8000 \
  -p 8443:8443 \
  -p 8001:8001 \
  -p 8444:8444 \
  kong:latest
```

### Configure Routes

```bash
# Create service for AtmosNet
curl -i -X POST http://localhost:8001/services \
  --data name=atmosnet-backend \
  --data url=http://atmosnet-backend:3000

# Create route for v2 API
curl -i -X POST http://localhost:8001/services/atmosnet-backend/routes \
  --data 'paths[]=/v2' \
  --data name=v2-api

# Enable rate limiting by API key
curl -X POST http://localhost:8001/services/atmosnet-backend/plugins \
  --data name=rate-limiting \
  --data config.minute=1000 \
  --data config.policy=redis \
  --data config.redis_host=redis

# Enable API key authentication
curl -X POST http://localhost:8001/services/atmosnet-backend/plugins \
  --data name=key-auth

# Create a consumer
curl -d "username=acme-corp" http://localhost:8001/consumers/

# Provision API key
curl -d "key=pro_acme_2024" http://localhost:8001/consumers/acme-corp/key-auth/
```

---

## Developer Portal

### Features to Build:

1. **API Documentation**
   - Interactive Swagger/OpenAPI UI
   - Code examples (curl, Python, JavaScript)
   - Response schemas

2. **API Key Management**
   - Self-service key generation
   - Usage dashboard
   - Rate limit alerts

3. **Pricing Page**
   - Clear tier comparison
   - Usage calculator
   - Upgrade/downgrade flow

4. **Support**
   - FAQ
   - Contact form
   - Status page integration

---

## Files Created

```
backend/app/api/v2/
├── __init__.py           # Router exports
└── enterprise.py         # B2B endpoints:
                          #   /v2/current
                          #   /v2/forecast
                          #   /v2/grid
                          #   /v2/alerts
                          #   /v2/usage
```

---

## Testing

```bash
# Test with different API keys
# Free tier (5km resolution)
curl "http://localhost:3000/v2/current?lat=6.5244&lon=3.3792&x-api-key=free_demo"

# Pro tier (500m resolution)
curl "http://localhost:3000/v2/current?lat=6.5244&lon=3.3792&x-api-key=pro_client"

# Grid data (GeoJSON)
curl "http://localhost:3000/v2/grid?bbox=3.3,6.5,3.5,6.7&x-api-key=std_key"

# Usage stats
curl "http://localhost:3000/v2/usage?x-api-key=pro_client"
```

---

## Revenue Model

| Metric | Projection |
|--------|------------|
| Free users | 10,000 (acquisition) |
| Standard conversion | 2% → 200 customers × $299 = $59,800/mo |
| Pro conversion | 0.5% → 50 customers × $999 = $49,950/mo |
| **Monthly Revenue** | ~$110,000 |
| **Annual Revenue** | ~$1.3M |

---

## Next Steps for Phase 3

1. ✅ Create v2 API endpoints
2. ⏳ Integrate Kong Gateway (Docker)
3. ⏳ Build developer portal (Next.js)
4. ⏳ Add usage tracking to database
5. ⏳ Create pricing page
6. ⏳ Set up Stripe for billing

---

**Status:** Phase 3 API endpoints ready. Need Kong Gateway setup and developer portal.**
