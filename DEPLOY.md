# AtmosNet Production Deployment

## Supabase Configuration ✅

- **Project:** https://alakazqcztizcbmewfre.supabase.co
- **Region:** EU Central (Frankfurt)
- **Database Password:** Configured
- **Next:** Run SQL migrations

---

## Deployment Options

### Option 1: Render (Recommended - Free Tier)

**Time:** 5 minutes

1. Push code to GitHub repo `atmosnet-io/atmosnet-backend`
2. Go to https://render.com
3. Click "New Web Service"
4. Connect GitHub repo
5. Render will auto-detect `render.yaml`
6. Click "Create Web Service"
7. Done! URL: `https://atmosnet-backend.onrender.com`

**Alternative:** Manual setup
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment: Import from `.env.production`

---

### Option 2: Fly.io

**Time:** 5 minutes

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
cd backend
fly launch --name atmosnet-backend --region fra

# Set secrets
fly secrets set DATABASE_URL="postgresql://postgres.alakazqcztizcbmewfre:g6sv0b03B1VdxYgA@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
fly secrets set SECRET_KEY="$(openssl rand -hex 32)"
fly secrets set OPENWEATHER_API_KEY="your-key"

# Deploy
fly deploy
```

**URL:** `https://atmosnet-backend.fly.dev`

---

### Option 3: Railway

**Time:** 5 minutes
- Cost: $5/month (starter)

1. Go to https://railway.app
2. New Project → Deploy from GitHub repo
3. Select `atmosnet-io/atmosnet-backend`
4. Railway auto-detects Python
5. Add environment variables:
   - DATABASE_URL
   - SECRET_KEY
   - Other vars from `.env.production`
6. Deploy

**URL:** `https://atmosnet-backend.up.railway.app`

---

## Post-Deployment Checklist

### Test API Endpoints

```bash
# Health check
curl https://your-backend-url/health/

# Submit observation
curl -X POST https://your-backend-url/v1/observations/ \
  -H "Content-Type: application/json" \
  -d '{
    "device_id_hash": "test...",
    "timestamp": "2024-03-25T12:00:00Z",
    "pressure_hpa": 1013.25,
    "latitude_grid": 6.5244,
    "longitude_grid": 3.3792
  }'

# Check balance
curl https://your-backend-url/v1/rewards/balance/test...

# Enterprise API
curl "https://your-backend-url/v2/current?lat=6.5244&lon=3.3792&x-api-key=free_demo"
```

### Configure Custom Domain (atmosnet.io)

1. Buy domain at Namecheap/Cloudflare
2. Add DNS records:
   - `api.atmosnet.io` → CNAME to your-backend-url
3. Configure SSL certificate in Render/Fly/Railway

### Mobile App Configuration

Update mobile app API URL:

```typescript
// mobile/services/api.ts
const API_BASE_URL = 'https://api.atmosnet.io'; // Production
// const API_BASE_URL = 'http://localhost:8000'; // Development
```

---

## Monitoring

### Render Dashboard
- URL: https://dashboard.render.com
- View logs, metrics, deployments

### Fly.io Dashboard
- URL: https://fly.io/dashboard
- View metrics, scale, logs

### Supabase Dashboard
- URL: https://alakazqcztizcbmewfre.supabase.co
- Monitor database, query performance

---

## Scaling Strategy

### Phase 1 (Launch): Free Tier
- Render: Free web service (sleeps after 15 min inactivity)
- Supabase: Free tier (500MB, 2GB egress)
- Cost: $0

### Phase 2 (Growth): ~$50/month
- Render: Starter ($7/month)
- Supabase: Pro ($25/month)
- Redis: Upstash (free tier)
- Cost: ~$32/month

### Phase 3 (Scale): ~$200/month
- Render: Standard ($25/month)
- Supabase: Pro + additional storage
- Redis: Upstash paid
- Kong Gateway: Self-hosted or Kong Cloud
- Cost: ~$150/month

---

## Next Steps

1. ⏳ Run SQL migrations in Supabase
2. ⏳ Choose deployment platform (Render/Fly/Railway)
3. ⏳ Deploy backend
4. ⏳ Test endpoints
5. ⏳ Configure mobile app for production
6. ⏳ Submit to App Store / Google Play

**Estimated time to production:** 30 minutes after SQL migrations
