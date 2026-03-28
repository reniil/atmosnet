# AtmosNet Project Status

**Last Updated:** March 25, 2026

---

## 🟢 LOCAL DEV SERVER RUNNING

**URL:** http://localhost:8000  
**Health:** http://localhost:8000/health/  
**API Docs:** http://localhost:8000/docs

---

## Phase 1 — Backend

### ✅ Working Endpoints

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/` | GET | ✅ | API info |
| `/health/` | GET | ✅ | Health check |
| `/v1/observations/` | POST | ✅ | Submit observation (rate limited: 1/5min) |
| `/v1/observations/{id}/recent` | GET | ✅ | Get recent observations |
| `/v1/observations/stats/network` | GET | ✅ | Network stats (24h) |
| `/v1/rewards/balance/{id}` | GET | ✅ | Points balance |

### Simplified Mode
- **Database:** SQLite (aiosqlite)
- **Rate Limiting:** In-memory (not Redis)
- **Validation:** Simplified (no OpenWeatherMap API)
- **No Kafka:** Direct processing

### Test Results
```
POST /v1/observations/ → 201 Created
  → Returns: id, confidence_score: 90, tier: "A", points_awarded: 10

GET /v1/rewards/balance/{id} → 200 OK
  → Returns: balance: 10, total_earned: 10

Rate Limit → 429 (if < 5 minutes)
```

---

## Phase 2 — Mobile App

### Status: Code Complete

**Location:** `/atmosnet/mobile/`

**Screens:**
- ✅ Onboarding (4-step, permissions, opt-in)
- ✅ Home (balance, streak, manual submit)
- ✅ Map (network coverage)
- ✅ Rewards (redemption, history)
- ✅ Settings (privacy controls)

**Privacy Features:**
- GPS rounded to 500m before transmission
- Device ID SHA-256 hashed
- Battery check (stops at 20%)
- WiFi-only uploads

**To run:**
```bash
cd mobile
npm install
npm start  # Opens Expo dev tools
```

---

## Supabase Setup (Production)

**Guide:** `/atmosnet/SUPABASE_SETUP.md`

**Steps:**
1. Create project at supabase.com
2. Enable PostGIS extension
3. Copy connection string to `.env`
4. Run: `alembic upgrade head`

**Benefits:**
- Managed PostgreSQL + PostGIS
- Real-time subscriptions (alternative to Kafka)
- Auth included
- Edge Functions (deploy FastAPI)

---

## Next Steps

### Option A: Test Mobile Integration
- Configure mobile app to point to `http://localhost:8000`
- Run mobile app in simulator
- Submit observation from device

### Option B: Phase 3 — B2B API
- Build enterprise endpoints
- Kong API Gateway
- Pricing tiers

### Option C: Production Deploy
- Set up Supabase
- Deploy to Render/Fly.io
- Configure Upstash Redis

---

## Quick Commands

```bash
# Start backend (current)
cd backend
source venv/bin/activate
python3 -c "from app.main_simple import app; import uvicorn; uvicorn.run(app, host='0.0.0.0', port=8000)"

# Or use script
./start-local.sh

# Test API
curl http://localhost:8000/health/

# Submit observation
./scripts/test_observation.sh

# Reset database
rm backend/atmosnet_simple.db
```

---

## File Structure

```
atmosnet/
├── backend/
│   ├── app/
│   │   ├── main.py              # Full version (requires Redis/Kafka)
│   │   ├── main_simple.py       # ✅ Current working version
│   │   ├── api/v1/
│   │   └── services/
│   ├── workers/                 # Validation engine, grid model
│   ├── alembic/
│   └── requirements.txt
├── mobile/                      # React Native app
├── infrastructure/              # Terraform, GitHub Actions
├── docs/                        # Privacy policy
├── docker-compose.yml           # Full stack (needs Docker Compose)
├── start-local.sh               # Quick start script
└── SUPABASE_SETUP.md           # Production database guide
```

---

## Decision: Supabase vs Self-Hosted

| Feature | Supabase | Self-Hosted |
|---------|----------|-------------|
| Setup | 5 min | 1-2 hours |
| Cost | Free tier | AWS ~$300/mo |
| PostGIS | ✅ Built-in | Manual install |
| Real-time | ✅ Included | Kafka needed |
| Maintenance | Managed | You manage |

**Recommendation:** Start with Supabase free tier, migrate to self-hosted at scale.

---

**Status: Backend running locally. Ready for mobile integration or Phase 3.**
