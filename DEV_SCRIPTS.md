# Marina MMS — Dev Scripts & State
_Update this file at the end of every session._

---

## Locations
| What | Path |
|---|---|
| Web app (canonical) | `C:\marina-mms` |
| AI agents | `C:\marina-mms\ai-agents` |
| GitHub | https://github.com/lermrover-hub/marina-mms |
| Live | https://marina-mms.vercel.app |
| Supabase project | `csltloqbjupxqwbkunsd` (orm-marina, ap-south-1) |

---

## Common Commands

```bash
# Run agent tests (safe — dry-run + skip-claude enforced in .env)
cd C:\marina-mms\ai-agents && npm test

# Run all agents (dry-run mode)
cd C:\marina-mms\ai-agents && node run.js

# Run single agent
node run.js --agent=quotation
node run.js --agent=operations
node run.js --agent=finance
node run.js --agent=messaging
node run.js --agent=customer-service --customer=<id> --inquiry="..."

# Git
cd C:\marina-mms && git status
cd C:\marina-mms && git push origin main

# Vercel env vars
npx vercel env ls
npx vercel env add KEY production

# Deploy (only when approved)
cd C:\marina-mms && npx vercel --prod --yes

# Supabase SQL (via MCP — no manual login needed)
# Use: mcp__c39d99e9__execute_sql with project_id=csltloqbjupxqwbkunsd
```

---

## Agent .env Rules
File: `C:\marina-mms\ai-agents\.env`

```
AI_AGENT_SKIP_CLAUDE=true   # always true for tests
AI_AGENT_DRY_RUN=true       # always true until production approved
MARINA_AGENT_API_KEY=marina-agent-ab792f1ad0ca66037bf4ab1c96f53c91719ada2ed64f7b3e
MARINA_API_BASE=https://marina-mms.vercel.app
ANTHROPIC_API_KEY=sk-ant-...  # user must set real key
```
**Do not flip DRY_RUN or SKIP_CLAUDE without explicit user approval.**

---

## Last Test Results (2026-06-05)
```
tests 49 | pass 47 | fail 0 | skip 2
skip reason: /api/db/messages not deployed to Vercel yet
```
Agent run: all 5 complete, exit 0.

---

## What's Built

### Web App (`C:\marina-mms/app`)
| Route | Status |
|---|---|
| `/api/db/*` (all core CRUD) | ✅ deployed |
| `/api/db/messages` GET + PATCH | ✅ committed, ⚠️ not deployed |
| `/api/pricing-master` | ✅ deployed |
| `/api/quotations/ai-generate` | ✅ deployed |
| `/api/billing/recurring` (cron 1st/month 08:00 UTC) | ✅ deployed |
| `/api/webhooks/line` | ✅ deployed |
| `/api/webhooks/whatsapp` | ✅ deployed |
| `/api/tide/calculate` | ✅ deployed |

### Key lib files
| File | Purpose |
|---|---|
| `lib/line.ts` | LINE Messaging API + Flex Message templates |
| `lib/whatsapp.ts` | WhatsApp Cloud API + text notifications |
| `lib/email.ts` + `lib/email-templates.ts` | Resend email (6 templates) |
| `lib/tide-data-2026.ts` | Ko Samui 2026 tide data by month/day |
| `lib/pricing-master.ts` | Supabase CRUD for pricing_master table |

### AI Agents (`C:\marina-mms/ai-agents`)
| Agent | What it does |
|---|---|
| `quotation-agent` | Service requests → Claude → draft quotation via API |
| `operations-agent` | Contract/insurance expiry + overdue WOs → notifications |
| `finance-agent` | Overdue invoices → notifications + AR briefing |
| `customer-service-agent` | Pending quotations/invoices summary; interactive reply |
| `messaging-agent` | Unreplied LINE/WA inbox → Claude reply → send back |

---

## Supabase Tables Created This Project
```sql
-- Run via Supabase MCP if missing:
-- mms_notifications   (type, title, message, priority HIGH/MEDIUM/LOW, read)
-- mms_messages        (channel LINE/WHATSAPP, direction, sender_id, content)
-- mms_customers       columns: line_user_id, whatsapp_number (added via ALTER)
```

---

## Vercel Env Vars Status
| Var | Status |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ set |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ set |
| `AUTH_SECRET` | ✅ set |
| `MARINA_AGENT_API_KEY` | ✅ set |
| `RESEND_API_KEY` | ❌ not set — emails log but don't send |
| `ANTHROPIC_API_KEY` | ❌ not set — AI Generate button won't work |
| `LINE_CHANNEL_ACCESS_TOKEN` | ❌ not set |
| `LINE_CHANNEL_SECRET` | ❌ not set |
| `WHATSAPP_PHONE_NUMBER_ID` | ❌ not set |
| `WHATSAPP_ACCESS_TOKEN` | ❌ not set |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | ❌ not set |
| `ENABLE_AUTOMATION_WRITES` | ❌ not set — webhooks return 503 until set to "true" |

---

## Webhook URLs (register after env vars set)
```
LINE:      https://marina-mms.vercel.app/api/webhooks/line
WhatsApp:  https://marina-mms.vercel.app/api/webhooks/whatsapp
```

---

## Pending / Next Steps
- [ ] Deploy `/api/db/messages` to Vercel (just `git push` → auto-deploy)
- [ ] Set `RESEND_API_KEY` in Vercel
- [ ] Set `ANTHROPIC_API_KEY` in Vercel
- [ ] Set LINE + WhatsApp env vars in Vercel
- [ ] Set `ENABLE_AUTOMATION_WRITES=true` in Vercel (enables webhook writes)
- [ ] Approve agent production writes: flip `.env` DRY_RUN + SKIP_CLAUDE to false
- [ ] Register LINE + WhatsApp webhook URLs
