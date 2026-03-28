# AtmosNet Local Development

Quick start guide for running AtmosNet locally.

## Prerequisites

- Docker & Docker Compose
- Python 3.11+ (optional, for local development)
- Node.js 20+ (for mobile/dashboard)

## Quick Start

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f validation-engine
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 8000 | FastAPI - data ingestion |
| PostgreSQL | 5432 | Database with PostGIS |
| Redis | 6379 | Cache & rate limiting |
| Kafka | 9092 | Message queue |
| Zookeeper | 2181 | Kafka coordination |
| Kafka UI | 8080 | Web UI for Kafka (http://localhost:8080) |

## API Endpoints

```bash
# Submit observation
curl -X POST http://localhost:8000/v1/observations/ \
  -H "Content-Type: application/json" \
  -d '{
    "device_id_hash": "abc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "timestamp": "2024-03-25T12:00:00Z",
    "pressure_hpa": 1013.25,
    "latitude_grid": 6.5244,
    "longitude_grid": 3.3792
  }'

# Check balance
curl http://localhost:8000/v1/rewards/balance/abc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890

# Health check
curl http://localhost:8000/health/
```

## Architecture Flow

1. **Mobile app** → POST `/v1/observations` → Backend API
2. Backend → Publishes to Kafka topic `observations.raw`
3. **Validation Engine** → Consumes from Kafka → Validates → Writes to `validated_observations`
4. Validation Engine → Publishes to `observations.validated` (for points)
5. **Points Ledger** → Awards AtmosPoints based on tier
6. **Grid Model** (every 10 min) → Aggregates observations → Creates forecasts

## Testing

```bash
# Run backend tests
cd backend
pip install -r requirements.txt -r requirements-test.txt
pytest

# Test observation submission
./scripts/test_observation.sh
```

## Reset Database

```bash
docker-compose down -v
docker-compose up -d
```

## Troubleshooting

**Kafka connection issues:**
```bash
# Check Kafka topics
docker exec atmosnet-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Create topics manually
docker exec atmosnet-kafka kafka-topics --bootstrap-server localhost:9092 --create --topic observations.raw --partitions 1 --replication-factor 1
docker exec atmosnet-kafka kafka-topics --bootstrap-server localhost:9092 --create --topic observations.validated --partitions 1 --replication-factor 1
```

**Database connection issues:**
```bash
# Check PostGIS extension
docker exec atmosnet-postgres psql -U atmosnet -c "SELECT PostGIS_Version();"
```
