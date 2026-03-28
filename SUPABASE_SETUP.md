# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Choose:
   - **Name:** atmosnet
   - **Database Password:** Generate strong password
   - **Region:** Choose closest to your users (e.g., `us-east-1` for US, `eu-west-1` for EU)
5. Wait for project creation (~2 minutes)

## 2. Enable PostGIS Extension

In Supabase Dashboard:

1. Go to **Database** → **Extensions**
2. Search for "postgis"
3. Click **Enable**

Or run SQL:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 3. Get Connection String

1. Go to **Settings** → **Database**
2. Under **Connection string**, select **URI**
3. Copy the connection string
4. Replace `[YOUR-PASSWORD]` with your actual database password

**Example:**
```
postgresql://postgres:your-actual-password@db.abcdefgh12345678.supabase.co:5432/postgres
```

## 4. Update Environment

```bash
cd backend
cp .env.supabase .env
# Edit .env and paste your connection string
```

## 5. Run Migrations

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

Or manually create tables in Supabase SQL Editor:

```sql
-- Run the SQL from backend/alembic/versions/20240325_2130-001_initial.sql
-- Or use the migration system
```

## 6. For Serverless Deployment

### Option A: Supabase Edge Functions (Recommended)

Deploy FastAPI as Edge Functions:

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link project:
```bash
supabase link --project-ref your-project-ref
```

3. Create edge function:
```bash
supabase functions new observations
```

4. Deploy:
```bash
supabase functions deploy
```

### Option B: Traditional Deployment

Deploy to Render/Railway/Fly.io pointing to Supabase DB:

**Render:**
- Create Web Service
- Connect GitHub repo
- Set environment variables (DATABASE_URL from Supabase)
- Deploy

## 7. Redis Alternative (Upstash)

Since Supabase doesn't include Redis:

1. Go to https://upstash.com
2. Create Redis database
3. Get Redis URL:
```
rediss://default:password@host.upstash.io:6379
```
4. Add to `.env`

## 8. Kafka Alternative (Upstash)

1. Upstash also offers managed Kafka
2. Or use Confluent Cloud free tier
3. Or skip Kafka for MVP (use direct DB writes)

## Migration Commands

```bash
# Initialize alembic (if not done)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial migration"

# Run migration
alembic upgrade head

# Check current version
alembic current

# Rollback
alembic downgrade -1
```

## Real-time Features

Supabase provides real-time subscriptions. To use:

```python
# Instead of Kafka, use Supabase Realtime
# For validation engine notifications, etc.

# Client subscribes to table changes
supabase.table('validated_observations').on('*', callback).subscribe()
```

## Free Tier Limits

- **Database:** 500MB storage, 2GB/month egress
- **Auth:** 100K users/month
- **Realtime:** 200 concurrent connections
- **Edge Functions:** 500K requests/month

Perfect for MVP and early testing.

## Next Steps

1. ✅ Create Supabase project
2. ✅ Enable PostGIS
3. ✅ Copy connection string to `.env`
4. ✅ Run migrations
5. ⏳ Deploy backend to Render/Fly/Edge Functions
6. ⏳ Configure Upstash Redis
7. ⏳ Test endpoints

---

**Need help?**
- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
