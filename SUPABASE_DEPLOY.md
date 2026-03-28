# Supabase Production Setup Instructions

## Project Details
- **URL:** https://alakazqcztizcbmewfre.supabase.co
- **Region:** EU Central (Frankfurt)
- **Status:** Created, needs configuration

---

## Step 1: Enable PostGIS Extension

1. Go to: https://alakazqcztizcbmewfre.supabase.co/project/sql
2. Run the following SQL:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

3. Click "Run"
4. Verify: `SELECT PostGIS_Version();`

---

## Step 2: Create Tables

1. Go to: https://alakazqcztizcbmewfre.supabase.co/project/sql
2. Copy contents of `backend/supabase_migrations/01_create_tables.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify tables created in Database → Tables

---

## Step 3: Get Database Password

1. Go to: https://alakazqcztizcbmewfre.supabase.co/project/settings/database
2. Under "Connection string", copy the password
3. Update `.env.production` with your password:

```bash
# Replace [YOUR-DB-PASSWORD] with actual password
DATABASE_URL=postgresql://postgres.alakazqcztizcbmewfre:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## Step 4: Test Connection

```bash
cd backend
source venv/bin/activate
cp .env.production .env
# Edit .env and add your password
python3 -c "from app.database import init_db; import asyncio; asyncio.run(init_db())"
```

---

## Step 5: Deploy Backend

### Option A: Render (Recommended)

1. Go to https://render.com
2. Create Web Service
3. Connect GitHub repo: `atmosnet-io/atmosnet-backend`
4. Settings:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Environment: Copy from `.env.production`

### Option B: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
cat .env.production | fly secrets import
fly deploy
```

### Option C: Railway

1. Go to https://railway.app
2. New Project → Deploy from GitHub repo
3. Add environment variables from `.env.production`

---

## Step 6: Configure Custom Domain (Optional)

1. Register atmosnet.io
2. Go to Supabase → Settings → Custom Domains
3. Add domain and verify

---

## Migration Status

| Step | Status | URL |
|------|--------|-----|
| PostGIS Extension | ⏳ Pending | https://alakazqcztizcbmewfre.supabase.co/project/sql |
| Create Tables | ⏳ Pending | Same as above |
| Set Password | ⏳ Pending | Settings → Database |
| Deploy Backend | ⏳ Pending | Render/Fly/Railway |
| Custom Domain | ⏳ Pending | After deployment |

---

## Next Steps

1. ✅ Run SQL migrations in Supabase
2. ⏳ Get database password
3. ⏳ Deploy backend
4. ⏳ Test endpoints
5. ⏳ Configure mobile app for production

**Ready to proceed?**
