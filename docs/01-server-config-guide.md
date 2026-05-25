# Marina MMS — Server Configuration Guide
**Ocean Rover Marina & Boat Yard Management System**
Version 1.0 | May 2026

---

## 1. Overview

Marina MMS is deployed as a modern cloud-native application using three primary services: **Vercel** for application hosting and serverless functions, **Supabase** for the PostgreSQL database and file storage, and **GitHub** for source control and CI/CD automation.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET / USERS                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js 15.5 Application                   │   │
│  │   ┌────────────┐  ┌────────────┐  ┌────────────────┐   │   │
│  │   │  App Router│  │  API Routes│  │  Cron Jobs     │   │   │
│  │   │  (Pages)   │  │ (/api/*) │  │  (billing, etc)│   │   │
│  │   └────────────┘  └────────────┘  └────────────────┘   │   │
│  │         │                │                              │   │
│  │   NextAuth v5 (JWT)      │                              │   │
│  └──────────────────────────┼──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS / REST / Realtime
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE CLOUD                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │  PostgreSQL 16   │  │  Storage Buckets│  │  Auth Service │  │
│  │  (mms_* tables) │  │  marina-photos  │  │  (optional)   │  │
│  │  RLS Enabled     │  │  marina-docs    │  │               │  │
│  └─────────────────┘  └─────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ git push
┌─────────────────────────────────────────────────────────────────┐
│                         GITHUB                                  │
│   Repository: lermrover-hub/marina-mms                          │
│   main branch → auto-deploy to Vercel Production                │
│   PR branches → Vercel Preview deployments                      │
└─────────────────────────────────────────────────────────────────┘
```

This architecture provides high availability, automatic scaling, zero-maintenance infrastructure, and a generous free tier suitable for most marina deployments. All components are managed services — no server administration is required.

---

## 2. Prerequisites

Before setting up the system, ensure the following accounts and tools are available:

- **GitHub account** — for source code hosting and CI/CD. Create at github.com if needed. The repository is already available at `lermrover-hub/marina-mms`.
- **Vercel account** — for application hosting. Register at vercel.com using your GitHub account for easiest setup. The Hobby (free) plan supports most marina operations; Pro plan ($20/month) adds team collaboration and higher limits.
- **Supabase account** — for PostgreSQL database and file storage. Register at supabase.com. The Free plan includes 500 MB database and 1 GB file storage, suitable for initial deployment.
- **Node.js 20 LTS or later** — required only for local development. Download from nodejs.org. Not needed for cloud-only deployment.
- **Domain name (optional but recommended)** — a custom domain such as `marina.yourdomain.com` provides a professional URL. Can be purchased from GoDaddy, Namecheap, Cloudflare, or similar registrars for approximately $10-15/year.
- **Resend account (optional)** — for sending automated emails such as invoice notifications and quote approvals. Register at resend.com. Free tier allows 3,000 emails/month.

---

## 3. Supabase Setup

### 3.1 Create Project

1. Log in to supabase.com and click **New Project**.
2. Select your organization (or create one for your marina).
3. Fill in the project details:
   - **Name:** `marina-mms`
   - **Database Password:** Choose a strong password with uppercase, lowercase, numbers, and symbols. Minimum 20 characters. Example: `MarinaOcean2026!Secure#DB`. **Write this down and store it securely — it cannot be recovered.**
   - **Region:** `Southeast Asia (Singapore) — ap-southeast-1` — this is the closest region to Ko Samui and will give the best performance for Thai-based operations.
4. Click **Create new project** and wait 2-3 minutes for provisioning.

### 3.2 Get API Keys

1. In your Supabase project dashboard, go to **Project Settings** (gear icon in left sidebar) → **API**.
2. Under **Project URL**, copy the URL. It will look like: `https://csltloqbjupxqwbkunsd.supabase.co`
3. Under **Project API Keys**, copy:
   - **`anon` public key** — starts with `eyJ...`. This is safe to expose in frontend code.
   - **`service_role` key** — starts with `eyJ...`. This has full database access. **NEVER expose this in frontend code or commit it to Git.** It is used only in server-side API routes.
4. Store these keys in a secure password manager. You will need them for the Vercel environment variables in Section 4.2.

**Security note:** The `service_role` key bypasses all Row Level Security policies. If it is ever accidentally exposed, immediately regenerate it from **Project Settings → API → Rotate keys**.

### 3.3 Database Tables

The Marina MMS database schema is maintained as migration files in the repository under `/database/migrations/`. To apply the schema:

1. In Supabase Dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open each migration file from the repository in order (they are numbered, e.g., `001_initial_schema.sql`, `002_add_rls.sql`).
4. Copy the file contents and paste into the SQL Editor.
5. Click **Run** (or press `Ctrl+Enter`).
6. Verify success: no red error messages should appear.
7. Repeat for each migration file in numerical order.

All tables use the prefix `mms_` to avoid conflicts with Supabase system tables. Core tables include:
- `mms_customers`, `mms_boats`, `mms_berths`, `mms_storage_slots`
- `mms_service_requests`, `mms_work_orders`, `mms_job_tasks`
- `mms_quotations`, `mms_invoices`, `mms_payments`, `mms_receipts`
- `mms_boat_movements`, `mms_ramp_bookings`, `mms_tide_records`
- `mms_inventory_items`, `mms_stock_movements`
- `mms_users`, `mms_roles`, `mms_audit_logs`

**Enable Row Level Security (RLS):** After running migrations, verify RLS is enabled:
```sql
-- Check RLS status for all mms_ tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'mms_%';
```
All tables should show `rowsecurity = true`. If any show `false`, run:
```sql
ALTER TABLE mms_tablename ENABLE ROW LEVEL SECURITY;
```

### 3.4 Storage Setup

Supabase Storage is used for file uploads including work order photos, boat documents, insurance certificates, and payment slips.

1. In Supabase Dashboard, click **Storage** in the left sidebar.
2. Click **Create a new bucket**.
3. Create the following buckets:

**Bucket 1: `marina-documents`**
- Name: `marina-documents`
- Public: **No** (private — access controlled by signed URLs)
- Used for: contracts, insurance documents, boat registration papers, quotations, invoices

**Bucket 2: `marina-photos`**
- Name: `marina-photos`
- Public: **No** (private — access controlled)
- Used for: work order before/after photos, boat condition photos, completion evidence, ramp operation photos

4. Set storage policies to allow authenticated users to upload to their own folders:
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('marina-documents', 'marina-photos'));

-- Allow authenticated users to view files
CREATE POLICY "Users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('marina-documents', 'marina-photos'));
```

---

## 4. Vercel Deployment

### 4.1 Connect GitHub Repository

1. Log in to vercel.com.
2. Click **Add New → Project**.
3. Under **Import Git Repository**, click **Continue with GitHub**.
4. Authorize Vercel to access your GitHub account.
5. Find and select the repository: `lermrover-hub/marina-mms`.
6. Click **Import**.
7. Vercel will auto-detect **Next.js** as the framework — no changes needed.
8. Do NOT click Deploy yet — first set up environment variables in the next step.

### 4.2 Environment Variables

Before deploying, configure all required environment variables. In the Vercel project setup screen, click **Environment Variables** and add each of the following:

| Variable | Example Value | Description | Required |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://csltloqbjupxqwbkunsd.supabase.co` | Supabase project URL from Project Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase anon/public key — safe for frontend | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase service_role key — server-side only | Yes |
| `AUTH_SECRET` | `k9Xm2pQr7nYjL4vBsT8wUcA3dFhE6iOZ` | Random 32+ character string for NextAuth JWT signing | Yes |
| `AUTH_URL` | `https://marina-mms.vercel.app` | Full production URL (no trailing slash) | Yes |
| `NEXTAUTH_URL` | `https://marina-mms.vercel.app` | Same as AUTH_URL — required for some NextAuth compatibility | Yes |
| `AUTH_TRUST_HOST` | `1` | Must be set to `1` when deployed behind Vercel's proxy | Yes |
| `RESEND_API_KEY` | `re_AbCdEfGhIjKlMn...` | Resend API key for sending emails | No (disables email) |
| `EMAIL_FROM` | `Marina MMS <noreply@yourdomain.com>` | Sender name and email for outgoing messages | No |
| `EMAIL_TEST_TO` | `admin@yourmarina.com` | Email address for test delivery verification | No |

**Environment scope:** Set all variables to apply to **Production**, **Preview**, and **Development** environments unless otherwise noted. `AUTH_URL` and `NEXTAUTH_URL` should be set to different values for Production vs Preview if you use different domains.

**Sensitive variables:** Mark `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, and `RESEND_API_KEY` as **sensitive** in Vercel — this hides them from the dashboard after saving.

### 4.3 Generate AUTH_SECRET

The `AUTH_SECRET` must be a cryptographically random string of at least 32 characters. Use one of these methods:

**Method 1 — OpenSSL (Linux/Mac/WSL):**
```bash
openssl rand -base64 32
```

**Method 2 — Node.js (any platform):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Method 3 — PowerShell (Windows):**
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**Method 4 — Online (for convenience only, not recommended for production):**
Visit https://generate-secret.vercel.app/32

Copy the output and paste it as the value for `AUTH_SECRET`. Do not use a simple password or guessable string — this secret protects all user sessions.

### 4.4 Deploy

1. After setting all environment variables, click **Deploy**.
2. Vercel will build the Next.js application. This typically takes 2-4 minutes.
3. Watch the build log for errors. Common issues:
   - Missing environment variables — check all required vars are set
   - TypeScript errors — check the build output for `Type error:` messages
   - Module not found — ensure `npm install` completed in the build
4. On successful deployment, you will see a green checkmark and a URL like `https://marina-mms.vercel.app`.
5. Verify the deployment:
   - Open the URL in a browser — the login page should appear
   - Try logging in with admin credentials
   - Navigate to Dashboard — KPI cards should load
   - Check Customers and Boats pages load correctly

---

## 5. Custom Domain Setup

A custom domain provides a professional URL for your marina staff and customers, such as `marina.oceanrover.com` or `mms.yourmarina.com`.

### On Vercel

1. Go to your Vercel project → **Settings** → **Domains**.
2. Click **Add Domain**.
3. Enter your desired domain, e.g., `marina.yourmarina.com`.
4. Vercel will display a **CNAME record** to add to your DNS provider. Note the values shown — they will look like:
   - Type: `CNAME`
   - Name: `marina`
   - Value: `cname.vercel-dns.com`

### On Your DNS Provider

Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and navigate to DNS settings for your domain.

**Cloudflare:**
1. DNS → Records → Add Record
2. Type: `CNAME`, Name: `marina`, Target: `cname.vercel-dns.com`, Proxy: **DNS only** (grey cloud, NOT orange/proxied)
3. Save

**GoDaddy:**
1. My Products → Your Domain → DNS → Add
2. Type: `CNAME`, Host: `marina`, Points to: `cname.vercel-dns.com`, TTL: 3600
3. Save Changes

**Namecheap:**
1. Domain List → Manage → Advanced DNS → Add New Record
2. Type: `CNAME Record`, Host: `marina`, Value: `cname.vercel-dns.com`, TTL: Automatic
3. Save All Changes

DNS propagation typically takes 5-60 minutes. You can monitor it at dnschecker.org.

### Update Environment Variables

After DNS propagates, update the following Vercel environment variables to use your custom domain:
- `AUTH_URL` → `https://marina.yourmarina.com`
- `NEXTAUTH_URL` → `https://marina.yourmarina.com`

Redeploy the application for changes to take effect (or Vercel may auto-redeploy on env var change).

### SSL Certificate

Vercel automatically provisions a free **Let's Encrypt SSL certificate** for all connected domains. This happens within minutes of DNS propagation — no manual steps are needed. Verify by checking that your domain shows a padlock icon (`https://`) in the browser. The certificate auto-renews every 90 days without any action required.

---

## 6. Vercel Cron Jobs

Marina MMS uses Vercel Cron Jobs for automated background tasks. These are already configured in the `vercel.json` file in the repository root.

Current cron jobs:

| Job | Schedule | Description |
|---|---|---|
| Recurring Billing | `0 8 1 * *` | Runs on the 1st of every month at 08:00 UTC (15:00 Bangkok time) — auto-generates monthly invoices for berth and storage contracts |
| Insurance Expiry Alerts | `0 9 * * *` | Daily at 09:00 UTC — checks for insurance documents expiring within 30/60/90 days and sends alerts |
| Contract Renewal Alerts | `0 9 15 * *` | 15th of each month — checks for contracts expiring within 30/60 days |

To verify cron jobs are active:
1. Vercel Dashboard → your project → **Cron Jobs** tab
2. All configured jobs should appear with their schedule and last execution time
3. You can manually trigger a cron job by clicking **Run Now** for testing

**Security:** Cron endpoint API routes are protected by verifying the `x-vercel-cron: 1` header, which is only set by Vercel's cron system. Direct external calls to these endpoints are rejected.

---

## 7. Email Setup (Resend)

Automated email is used for sending quotations, invoice notifications, payment receipts, and expiry alerts to customers.

### Setup Steps

1. Go to resend.com and create a free account.
2. Navigate to **Domains** → **Add Domain**.
3. Enter your marina's email domain (e.g., `yourmarina.com`).
4. Resend will provide DNS records to add (SPF, DKIM, DMARC). Add these to your DNS provider:
   - SPF TXT record: `v=spf1 include:_spf.resend.com ~all`
   - DKIM CNAME records (3 records provided by Resend)
   - DMARC TXT record: `v=DMARC1; p=none; rua=mailto:admin@yourmarina.com`
5. Wait for DNS verification (usually 5-30 minutes). Resend Dashboard will show "Verified" when complete.
6. Go to **API Keys** → **Create API Key**.
   - Name: `marina-mms-production`
   - Permission: Sending access
   - Domain: Select your verified domain
7. Copy the API key starting with `re_...`. You will only see it once.
8. In Vercel Dashboard → your project → **Settings** → **Environment Variables**:
   - `RESEND_API_KEY` = `re_your_api_key`
   - `EMAIL_FROM` = `Marina MMS <noreply@yourmarina.com>`
9. Redeploy the application.

### Test Email Sending

1. Log in to Marina MMS as Super Admin.
2. Navigate to **Settings** → **Email Settings** → **Send Test Email**.
3. A test email should arrive at the `EMAIL_TEST_TO` address within 1-2 minutes.
4. If not received, check: Vercel function logs for errors, Resend dashboard for sent/failed status, spam folder.

---

## 8. Monitoring and Alerts

### Vercel Analytics

Enable built-in performance monitoring:
1. Vercel Dashboard → your project → **Analytics** tab.
2. Click **Enable Analytics**.
3. Provides: page load times, Core Web Vitals, traffic overview, error rates.
4. No code changes needed — analytics are injected automatically.

### Uptime Monitoring (Free Options)

Set up external uptime checks to be alerted if the system goes down:

**UptimeRobot (Recommended — Free tier: 50 monitors, 5-minute checks):**
1. Register at uptimerobot.com
2. New Monitor → HTTP(s)
3. URL: `https://marina-mms.vercel.app`
4. Check interval: 5 minutes
5. Alert contacts: add admin email (`admin@yourmarina.com`)
6. Optionally add Telegram or Slack notifications

**BetterStack (Free tier: 10 monitors, 3-minute checks):**
1. Register at betterstack.com
2. Uptime → New Monitor
3. Similar setup to UptimeRobot with nicer dashboard

**StatusPage:**
Consider creating a public status page at status.yourmarina.com using BetterStack's free status page feature — this lets you communicate outages to customers professionally.

### Error Monitoring

**Vercel Function Logs (Built-in):**
1. Vercel Dashboard → your project → **Deployments** → select latest deployment
2. Click **Functions** tab to see real-time serverless function logs
3. Click **Runtime Logs** for live streaming

**Sentry (Optional — recommended for production):**
1. Register at sentry.io (free tier: 5,000 errors/month)
2. Create new project → Next.js
3. Follow Sentry's Next.js setup guide to add the SDK
4. Errors will appear in Sentry dashboard with stack traces and user context

### Recommended Alert Thresholds

| Metric | Warning | Critical | Action |
|---|---|---|---|
| Response time | > 3 seconds | > 8 seconds | Check DB queries, function timeouts |
| Error rate | > 1% | > 5% | Check function logs, Sentry |
| Uptime | < 99.9% | < 99% | Check Vercel/Supabase status pages |
| DB size | > 400 MB | > 480 MB | Upgrade Supabase plan |

---

## 9. Database Backup

### Supabase Automatic Backups

Supabase provides automated daily backups:
- **Free plan:** 7 days of point-in-time recovery
- **Pro plan ($25/month):** 30 days of point-in-time recovery with daily snapshots

To restore from backup:
1. Supabase Dashboard → **Database** → **Backups**
2. Select a backup date
3. Click **Restore** (this will restore to a new project — you then update env vars)

### Manual SQL Export

For additional safety, export your data manually on a regular schedule:

```sql
-- Run in Supabase SQL Editor to export as CSV
COPY (SELECT * FROM mms_customers) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM mms_boats) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM mms_invoices) TO STDOUT WITH CSV HEADER;
-- Repeat for each critical table
```

Or using `pg_dump` from a machine with PostgreSQL client tools:
```bash
# Get connection string from: Supabase → Settings → Database → Connection string (URI)
pg_dump "postgresql://postgres:[password]@db.csltloqbjupxqwbkunsd.supabase.co:5432/postgres" \
  --no-owner --no-acl -F c \
  -f backup-marina-mms-$(date +%Y-%m-%d).dump
```

### Recommended Backup Schedule

| Backup Type | Frequency | Method | Storage Location |
|---|---|---|---|
| Automatic (Supabase) | Daily | Supabase built-in | Supabase cloud |
| Manual SQL export | Weekly | pg_dump or SQL Editor | Google Drive / OneDrive |
| Critical tables export | Monthly | CSV via SQL Editor | External hard drive |
| File storage backup | Monthly | Supabase Storage download | External hard drive |

Store backups in at least two separate locations following the **3-2-1 rule:** 3 copies, 2 different media, 1 off-site.

---

## 10. Security Hardening

### Environment Variable Security

- **Never commit `.env.local` to Git.** This file is already in `.gitignore` but double-check: `git status` should not show `.env.local`.
- **Rotate `AUTH_SECRET` every 6 months.** Generate a new secret, update it in Vercel, and redeploy. Users will be logged out and need to log in again — schedule this during off-peak hours.
- **Rotate `SUPABASE_SERVICE_ROLE_KEY`** if it is ever accidentally exposed. Go to Supabase → Project Settings → API → Regenerate key.
- **Use a strong Supabase database password.** Minimum 20 characters with mixed case, numbers, and symbols.
- **Never share API keys via email, Slack, or messaging apps** — use a password manager or secure vault.

### Supabase Row Level Security

RLS ensures database-level access control so even if the application code has a bug, users cannot access other users' data.

Key RLS policies to verify:
```sql
-- Customers can only see their own data
CREATE POLICY "customer_own_data" ON mms_invoices
  FOR ALL TO authenticated
  USING (customer_id = (SELECT customer_id FROM mms_users WHERE id = auth.uid()));

-- Staff can see all data (their role is checked in app layer)
CREATE POLICY "staff_full_access" ON mms_invoices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM mms_users WHERE id = auth.uid() AND role IN ('admin','manager','finance')));
```

Test RLS by:
1. Creating a test customer account
2. Logging in as that customer
3. Attempting to access `/api/customers` — should only return the customer's own record
4. Attempting to access `/api/invoices/[other-customer-invoice-id]` — should return 403 Forbidden

### Vercel Security Settings

- **DDoS Protection:** Automatically provided by Vercel's edge network — no configuration needed.
- **Password Protection for Staging:** In Vercel → Project → Settings → Deployment Protection, add password protection to Preview deployments so staging URLs are not publicly accessible.
- **Vercel Firewall (Pro):** Upgrade to Vercel Pro to use the WAF (Web Application Firewall) for advanced threat protection.

### API Security

- All admin API routes validate the session role server-side using `auth()` from NextAuth
- Cron endpoints check for the `x-vercel-cron: 1` header
- Customer portal API routes filter all queries by the authenticated user's `customer_id`
- Rate limiting is applied to auth endpoints to prevent brute force attacks
- File upload endpoints validate file types and sizes before accepting uploads

---

## 11. CI/CD Pipeline

Marina MMS uses a fully automated deployment pipeline:

### How It Works

```
Developer writes code
    ↓
git push to GitHub
    ↓
Vercel webhook triggered (within seconds)
    ↓
Vercel pulls latest code
    ↓
npm install → npm run build (TypeScript compile, Next.js build)
    ↓
Build passes? → Deploy to production (main branch)
            → Deploy to preview URL (other branches/PRs)
Build fails?  → Deployment blocked, email notification sent
```

### Branch Strategy

| Branch | Deployment | URL |
|---|---|---|
| `main` | Production | `https://marina-mms.vercel.app` |
| `develop` | Preview | `https://marina-mms-git-develop-[team].vercel.app` |
| `feature/*` | Preview | `https://marina-mms-git-feature-[team].vercel.app` |
| Pull Requests | Preview | Unique URL per PR, posted as GitHub comment |

### Rollback

If a deployment causes issues:
1. Vercel Dashboard → your project → **Deployments** tab
2. Find the last known-good deployment
3. Click the three-dot menu → **Promote to Production**
4. The previous version is live within 30 seconds

### Zero-Downtime Deployments

Vercel performs blue-green deployments — the new version is fully built before traffic is switched. There is no downtime during normal deployments. Database migrations, however, should be backward-compatible (add columns before removing old ones) to avoid errors during the switchover period.

---

## 12. Troubleshooting

| Problem | Symptoms | Solution |
|---|---|---|
| Login not working | "Configuration error" or redirect loop | Check `AUTH_URL`, `NEXTAUTH_URL`, and `AUTH_TRUST_HOST=1` are set correctly in Vercel |
| 500 Internal Server Error | Blank page or error page | Open Vercel Dashboard → Deployments → Functions → check error logs for stack trace |
| Cannot connect to database | "relation does not exist" or connection timeout | Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct; check Supabase project is not paused (free projects pause after 7 days of inactivity) |
| Email not sending | Quotations/invoices not received by customers | Verify `RESEND_API_KEY` is correct; check Resend dashboard for delivery status; verify domain DNS records are set |
| Middleware/auth error | "AUTH_SECRET is not set" in logs | Ensure `AUTH_SECRET` is set in Vercel env vars without invisible characters (copy-paste from a plain text source) |
| Supabase project paused | "Project is paused" error | Log in to supabase.com, click on the project, click **Restore project** (takes 1-2 minutes) |
| File upload failing | Photos or documents not saving | Check Supabase Storage buckets exist with correct names; verify storage RLS policies; check file size limits (50 MB default) |
| Cron jobs not running | Recurring billing not generating | Check `vercel.json` is present and correctly formatted; verify in Vercel Dashboard → Cron Jobs tab; check cron endpoint logs |
| Build failing after code change | Red X on GitHub commit | Click the failing check → View build log; fix TypeScript/ESLint errors shown; do not skip the type check |
| Slow page loads | Pages taking > 5 seconds | Check Supabase query performance in Dashboard → Database → Query Performance; add database indexes as needed |

### Supabase Free Tier Limitations

If your project is on the Supabase free tier, be aware of these limits:
- **Database pauses after 7 days of inactivity** — set up UptimeRobot to ping the app daily to prevent this
- **500 MB database storage** — upgrade to Pro ($25/month) when approaching this limit
- **1 GB file storage** — marina photo uploads can accumulate quickly; monitor usage and upgrade as needed
- **50,000 monthly active users** — more than sufficient for marina operations
- **2 GB bandwidth/month** — sufficient for most marinas; monitor in Supabase Dashboard → Settings → Usage

---

## 13. Self-Hosting Alternative

For marinas that prefer on-premise hosting due to data privacy requirements, unreliable internet, or regulatory compliance, see the companion document:

**`02-hardware-spec.md`** — Complete on-premise server hardware specification and installation guide

Self-hosting provides full data control but requires ongoing server maintenance, backup management, security patching, and local IT expertise. The cloud deployment (Vercel + Supabase) is recommended for most marinas as it eliminates infrastructure overhead and provides enterprise-grade reliability at low cost.

---

*Document prepared for Ocean Rover Marina & Boat Yard Management System*
*Technical support: See GitHub repository at github.com/lermrover-hub/marina-mms*
