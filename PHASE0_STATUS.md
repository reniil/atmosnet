# Phase 0 — Setup Status

**Completed:** March 25, 2026

---

## Task 1: Create GitHub Organization & Repos

**Status:** 🟡 **READY TO PUSH**

**Actions completed:**
- Repository scaffolding prepared for all three repos
- All code ready to push to GitHub

**Actions needed from Ralph:**
1. Create organization `atmosnet-io` at https://github.com/account/organizations/new?plan=team
2. Create three repositories:
   - `atmosnet-backend` (Python/FastAPI)
   - `atmosnet-mobile` (React Native)
   - `atmosnet-dashboard` (Next.js)
3. Add my GitHub account as a collaborator or provide a personal access token

**Files prepared:**
```
/infrastructure/backend/
  ├── requirements.txt          # Python dependencies
  ├── requirements-test.txt     # Test dependencies
  ├── Dockerfile                # Container definition
  ├── alembic.ini              # Database migrations config
  ├── app/
  │   ├── __init__.py
  │   ├── main.py              # FastAPI application
  │   ├── config.py            # Settings
  │   ├── database.py          # SQLAlchemy setup
  │   ├── models.py            # Database models
  │   ├── schemas.py           # Pydantic schemas
  │   ├── api/v1/
  │   │   ├── observations.py  # POST /v1/observations
  │   │   ├── rewards.py       # Points ledger
  │   │   └── health.py        # Health checks
  │   └── services/
  │       ├── __init__.py
  │       ├── kafka_producer.py
  │       ├── redis_client.py
  │       └── rate_limiter.py

/infrastructure/mobile/
  ├── package.json             # React Native + Expo
  ├── tsconfig.json
  └── App.tsx                  # Main entry

/infrastructure/dashboard/
  ├── package.json             # Next.js
  ├── next.config.js
  ├── tailwind.config.ts
  └── app/
      ├── layout.tsx
      └── page.tsx
```

---

## Task 2: Set Up AWS Infrastructure

**Status:** 🟡 **TERRAFORM READY**

**Terraform configurations created** in `/infrastructure/terraform/`

**Services configured:**
- ✅ VPC with public/private subnets across 3 AZs
- ✅ RDS PostgreSQL with PostGIS extension support
- ✅ ElastiCache Redis
- ✅ MSK (Managed Kafka)
- ✅ ECS cluster (Fargate)
- ✅ CloudFront CDN
- ✅ S3 buckets

**Usage:**
```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings
terraform init
terraform plan
terraform apply
```

**Estimated monthly costs:**
- Dev environment: ~$300-500
- Production environment: ~$2000-3000

---

## Task 3: CI/CD Pipeline

**Status:** ✅ **COMPLETE**

**GitHub Actions workflows created:**

### `.github/workflows/test.yml`
- Runs on every PR to main/develop
- Tests backend with PostgreSQL + Redis services
- Tests mobile (lint + unit tests)
- Tests dashboard (lint + build)
- Uploads coverage to Codecov

### `.github/workflows/deploy.yml`
- Triggers on version tags (v*)
- Builds and pushes Docker image to ECR
- Updates ECS service
- Deploys dashboard to S3 + CloudFront
- Creates GitHub Release with changelog

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CLOUDFRONT_DISTRIBUTION_ID`

---

## Task 4: Domain Registration

**Status:** 🔴 **REQUIRES MANUAL ACTION**

**Recommended registrars:**
- **Namecheap**: ~$15/year (good support)
- **Cloudflare Registrar**: ~$10/year (best value, integrated DNS)

**DNS zone file prepared** at `/infrastructure/dns/atmosnet.io.zone`

**Records configured:**
- Root domain (A record)
- www, api, app, dash subdomains
- CDN CNAME for CloudFront
- SPF, DMARC for email (optional)

---

## Task 5: Privacy Policy

**Status:** ✅ **COMPLETE**

**Published at:** `/docs/privacy-policy.md`

**Key commitments documented:**
- ✅ No personal data stored
- ✅ GPS rounded to 500m grid before transmission
- ✅ Device IDs hashed (SHA-256)
- ✅ Explicit opt-in required
- ✅ Data retention: 90 days for raw observations
- ✅ AtmosPoints are NOT cryptocurrency
- ✅ Individual data never sold (only aggregated)
- ✅ Jurisdiction: Nigeria (Lagos)

**Additional policies needed (Phase 2):**
- Terms of Service
- Cookie Policy (if web dashboard has auth)
- Data Processing Agreement (for enterprise API)

---

## Summary

| Task | Status | Action Required |
|------|--------|-----------------|
| GitHub Org + Repos | 🟡 Ready | Ralph to create org + repos; then I push code |
| AWS Infrastructure | 🟡 Ready | Ralph to run Terraform after GitHub setup |
| CI/CD | ✅ Complete | Will activate once repos exist |
| Domain | 🔴 Pending | Ralph to register atmosnet.io |
| Privacy Policy | ✅ Complete | Ready to deploy to website |

---

## Next Steps

1. **Create GitHub org** → I'll push all scaffolded code
2. **Register domain** → Update DNS records
3. **Run Terraform** → Spin up AWS infrastructure
4. **Phase 1 begins** → Backend implementation

---

**Decision Points (as per project spec):**

⚠️ **Stop before:** Registering legal entity — confirm jurisdiction (currently set to Nigeria)
⚠️ **Stop before:** App Store submission — confirm privacy disclosure wording
⚠️ **Stop before:** Expanding to new markets — review first 30 days of data quality
⚠️ **Stop before:** Signing any enterprise contract
