# AtmosNet Production Deployment

## Status: ✅ READY FOR RENDER DEPLOYMENT

**Last Updated:** March 29, 2026

---

## What's Deployed

### GitHub Repository
- **URL:** https://github.com/reniil/atmosnet
- **Branch:** main
- **Latest Commit:** d7be259 - Production config: Updated Supabase credentials and Render deployment settings

### Files Updated:
- ✅ `backend/.env.supabase` - New Supabase connection string
- ✅ `backend/render.yaml` - Render deployment config (backend)
- ✅ `render.yaml` - Root Render config

---

## Next Step: Deploy to Render

### Option 1: Manual Deploy (Recommended)

1. **Go to Render Dashboard:**
   - https://dashboard.render.com

2. **Create New Web Service:**
   - Click "New" → "Web Service"
   - Connect GitHub repository: `reniil/atmosnet`
   - Select branch: `main`

3. **Configure Service:**
   - **Name:** atmosnet-backend
   - **Root Directory:** (leave blank for root)
   - **Environment:** Python 3
   - **Build Command:** `cd backend && pip install -r requirements.txt`
   - **Start Command:** `cd backend && uvicorn app.main_simple:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables:**
   ```
   DATABASE_URL=postgresql://postgres:Futonnojutsu1900#@ukeecjqbalqsgtnhmcre.supabase.co:5432/postgres
   SUPABASE_URL=https://ukeecjqbalqsgtnhmcre.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZWVjanFiYWxxc2d0bmhtY3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3Nzg5NzMsImV4cCI6MjA5MDM1NDk3M30.DiAgWF9H-DGgjw1UWqWgumYiGhFRE7Q4g5kXjBc9G-8
   ENVIRONMENT=production
   DEBUG=false
   SECRET_KEY=atmosnet-production-secret-key-2026
   ```

5. **Select Plan:**
   - **Starter:** $7/month (always on, great for API)
   - **Free:** $0 (sleeps after 15 min inactivity)

6. **Create Web Service**

7. **Wait for Deploy** (2-3 minutes)

---

## Post-Deployment Verification

Once deployed, test these endpoints:

```bash
# Health check
curl https://atmosnet-backend.onrender.com/health/

# API info
curl https://atmosnet-backend.onrender.com/

# Submit observation (POST)
curl -X POST https://atmosnet-backend.onrender.com/v1/observations/ \
  -H "Content-Type: application/json" \
  -d '{
    "device_id_hash": "abc123",
    "pressure_hpa": 1013.25,
    "latitude": 6.5244,
    "longitude": 3.3792,
    "altitude_m": 50.0
  }'
```

---

## Troubleshooting

### Build Fails
- Check `requirements.txt` exists in `/backend/`
- Verify Python version compatibility (3.9-3.11)

### Database Connection Fails
- Verify Supabase is running: https://ukeecjqbalqsgtnhmcre.supabase.co
- Check tables exist in Database → Tables
- Confirm password hasn't changed

### API Returns 500
- Check Render logs: Dashboard → Service → Logs
- Verify `main_simple.py` exists and runs locally

---

## Architecture After Deploy

```
┌─────────────────────────────────────────────┐
│           Render (atmosnet-backend)        │
│  ┌───────────────────────────────────────┐  │
│  │  FastAPI (uvicorn)                  │  │
│  │  ┌───────────────────────────────┐  │  │
│  │  │ main_simple.py (no Redis)    │  │  │
│  │  └───────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│        Supabase (PostgreSQL + PostGIS)      │
│  ┌───────────────────────────────────────┐  │
│  │  • observations                       │  │
│  │  • validated_observations             │  │
│  │  • accounts (points ledger)           │  │
│  │  • transactions                       │  │
│  │  • forecast_grids                     │  │
│  │  • api_keys                           │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Cost Breakdown

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Render | Starter | $7 |
| Supabase | Free Tier | $0 |
| **Total** | | **$7/month** |

---

## Next Steps After Deploy

1. ✅ Test API endpoints
2. ⏳ Configure mobile app to use production URL
3. ⏳ Set up custom domain (optional)
4. ⏳ Add monitoring (UptimeRobot)
5. ⏳ Configure Upstash Redis for rate limiting

---

**Ready to deploy? Go to https://dashboard.render.com**