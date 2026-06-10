# Ocean Rover Marina — AI Agent System

Standalone AI agent process for Marina & Boat Yard operations.
Communicates with the web app through REST APIs only. Never imports from `app/` or writes to the database directly.

See `AGENTS.md` for the full agent registry with permissions, forbidden actions, and approval requirements.

---

## Agent Overview

### Active Agents

| Layer | Agent | File | Role |
|---|---|---|---|
| L1 | CEO Agent | `orchestrator/ceo-agent.js` | Receives all jobs, classifies, dispatches, QA-validates, audits |
| L1 | Router | `orchestrator/router.js` | Keyword + Claude intent classification → 7 routes |
| L2 | Quotation Agent | `agents/quotation-agent.js` | Drafts quotations from service requests; creates approval order |
| L2 | Comms Agent | `agents/comms-agent.js` | Handles customer inquiries; saves replies as PENDING_APPROVAL drafts |
| L2 | Marina Agent | `agents/marina-agent.js` | Contract/insurance expiry alerts, overdue work order alerts |
| L2 | Finance Agent | `agents/finance-agent.js` | Daily AR briefing, overdue invoice notifications |
| L2 | HR Agent | `agents/hr-agent.js` | Drafts JDs, KPI frameworks, SOPs, onboarding plans |
| L3 | Tide Agent | `agents/tide-agent.js` | Tide safety calculation for ramp launch/retrieval (advisory) |
| L3 | Doc Writer | `agents/doc-writer.js` | Triggers PDF/DOCX generation via web app API |
| L3 | Calculator | `agents/calculator.js` | Pure-math quotation totals, margin, validation |
| L4 | QA Agent | `agents/qa-agent.js` | Validates L2/L3 output structure before CEO returns result |
| L4 | Escalation Agent | `agents/escalation-agent.js` | Creates HIGH-priority notification on error or QA failure |
| L4 | Audit Trail | `agents/audit-trail.js` | Writes to `mms_agent_audit_log` (Supabase); JSONL fallback |

### Deprecated Shims (re-export only, no logic)

| File | Points to |
|---|---|
| `agents/_deprecated/customer-service-agent.js` | `comms-agent.js` |
| `agents/_deprecated/messaging-agent.js` | `comms-agent.js` |
| `agents/_deprecated/operations-agent.js` | `marina-agent.js` |

---

## Setup

```powershell
cd ai-agents
npm install
Copy-Item .env.example .env
```

Fill in `.env`:

```
ANTHROPIC_API_KEY=
MARINA_API_BASE=https://marina-mms.vercel.app
MARINA_AGENT_API_KEY=
AI_AGENT_DRY_RUN=true
```

The web app and agent process must share the same `MARINA_AGENT_API_KEY`.

---

## Run

```powershell
# All agents (dry run — no DB writes)
$env:AI_AGENT_DRY_RUN = "true"
node run.js

# Single agent
node run.js --agent=quotation

# Skip Claude calls (API read-only test)
$env:AI_AGENT_SKIP_CLAUDE = "true"
$env:AI_AGENT_DRY_RUN = "true"
node run.js
```

From project root:

```powershell
npm.cmd run agents:test
npm.cmd run agents:dry-run
npm.cmd run agents:run
```

---

## Tests

```powershell
node --test tests/approval-workflow.test.js tests/calculator.test.js tests/quotation-agent.test.js tests/qa-agent.test.js tests/customer-service-agent.test.js tests/finance-agent.test.js
```

Live API smoke tests (requires running web app):

```powershell
$env:ENABLE_LIVE_AGENT_API_TESTS = "true"
node --test tests/
```

---

## Architecture

```
Inbound job (LINE / email / web form / scheduled)
    │
    ▼
CEO Agent (L1)
    ├── Router → classify intent
    ├── Dispatch to L2 specialist
    ├── QA Agent validates output
    ├── Escalation Agent (on error / QA fail)
    └── Audit Trail (every dispatch)

L2 Specialists (call Claude + REST APIs)
    ├── Quotation Agent  → POST /api/ai/orders (approval required)
    ├── Comms Agent      → POST /api/db/messages (draft, approval required)
    ├── Marina Agent     → POST /api/db/notifications
    ├── Finance Agent    → POST /api/db/notifications
    └── HR Agent         → Claude document only

L3 Executors (deterministic tools)
    ├── Tide Agent       → POST /api/tide/calculate
    ├── Doc Writer       → POST /api/*/pdf
    └── Calculator       → pure math, no I/O

L4 Validators / Support
    ├── QA Agent         → sync validation, no I/O
    ├── Escalation Agent → POST /api/db/notifications
    └── Audit Trail      → POST /api/db/agent-audit-log
```

---

## Approval Flow

AI agents do not write to `mms_quotations` or `mms_invoices` directly.

```
Agent → POST /api/ai/orders  (status: PENDING_APPROVAL)
Manager approves in UI
→ POST /api/ai/orders/:id/execute
→ Record created with generated_by = "ai-agent"
```

---

## Key Documents

| Document | Purpose |
|---|---|
| `AGENTS.md` | Full agent registry — purpose, tools, forbidden actions, approval requirements |
| `BUSINESS_RULES.md` | Booking, payment, approval, safety rules |
| `PRICING_RULES.md` | Speedboat classification, yacht per-foot, VAT, deposit, valid days, GL mapping |
| `TIDE_RULES.md` | Approved Ko Samui 2026 values, tide formula, dockmaster approval rule |
| `lib/constants.js` | Canonical marina name, phone, URL, default labels |
| `lib/load-prompt.js` | Reads `prompts/<name>.md`; falls back to inline string |
| `prompts/` | Editable system prompts for comms, hr, quotation, router agents |
