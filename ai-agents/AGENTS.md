# AI Agent Registry — Ocean Rover Marina

Canonical registry of all AI agents in `ai-agents/`. Read this before adding, modifying, or routing to any agent.

Last updated: 2026-06-11

---

## Layer Architecture

```
L1 Orchestrator   — receives all jobs, classifies intent, dispatches to specialists
L2 Specialist     — domain expert, calls Claude, reads/writes via REST API only
L3 Executor       — deterministic tool, rarely calls Claude, performs a specific action
L4 Validator/Support — validates, logs, escalates; no Claude calls in hot path
```

All agents communicate with the web app **through REST API only**. No agent imports from `app/` or touches the database directly.

---

## Active Agents

### L1 — Orchestrator

#### `orchestrator/ceo-agent.js`
- **Purpose**: Entry point for all inbound jobs. Classifies intent, dispatches to the correct L2 specialist, runs QA validation, writes audit trail.
- **Trigger**: Any channel — LINE, email, web form, portal, scheduled run, staff request.
- **Inputs**: `{ source, content, customerId?, boatId?, params?, agentHint? }`
- **Outputs**: `{ ok, route, result, qa, durationMs }`
- **Calls**: router → L2 specialist → qa-agent → audit-trail → escalation-agent (on failure)
- **Approval required**: No (orchestration only)
- **Forbidden**:
  - Must not bypass QA validation
  - Must not write to DB directly
  - Must not suppress audit log entries
  - Must not swallow L2 errors silently — always escalate

#### `orchestrator/router.js`
- **Purpose**: Classifies free-text input into one of 7 intent routes using keyword rules, then Claude fallback.
- **Routes**: `marina | finance | hr | comms | quotation | tide | doc-writer`
- **Fallback**: `comms` when classification is ambiguous
- **Approval required**: No
- **Forbidden**: Must not route to a deprecated agent

---

### L2 — Specialists

#### `agents/quotation-agent.js`
- **Purpose**: Finds new/uninspected service requests with no quotation, drafts line-item quotations using the active rate card, creates an AI approval order for manager review.
- **Trigger**: Scheduled daily, or direct call with `srId` / `customerId` for pilot mode.
- **Inputs**: `{ srId?, customerId? }`
- **Outputs**: `{ processed, results: [{ requestId, orderId, grandTotal, status }] }`
- **API calls**: `GET /api/db/service-requests`, `GET /api/db/quotations`, `GET /api/db/boats/:id`, `GET /api/customers/:id`, `GET /api/pricing-master`, `POST /api/ai/orders`
- **Approval required**: Yes — `MANAGING_DIRECTOR` role must approve before quotation is created in DB
- **Config keys**: `vat_pct`, `deposit_pct`, `valid_days` (from `mms_agent_config` → agent_id = "quotation")
- **Forbidden**:
  - Must not apply any discount without manager approval
  - Must not override rate card prices
  - Must not set grand_total ≤ 0
  - Must not confirm a booking or start date
  - Must not send a quotation to a customer (drafts only)
  - Must not create a quotation for a customer with unresolved overdue invoices without flagging it

#### `agents/comms-agent.js` ← **CANONICAL communication agent**
- **Purpose**: Handles customer inquiries from LINE, email, web form, and portal. Saves AI-generated replies as PENDING_APPROVAL drafts. Staff must approve before message is sent.
- **Trigger**: Inbound message event, or scheduled batch processing of unreplied messages.
- **Inputs**: `{ customerId?, inquiry?, source? }`
- **Outputs**: `{ customer, customerId, reply, source, draftId, status: "PENDING_APPROVAL" }`
- **API calls**: `GET /api/customers/:id`, `GET /api/db/boats`, `GET /api/db/quotations`, `GET /api/db/invoices`, `GET /api/db/messages`, `POST /api/db/messages` (draft), `PATCH /api/db/messages/:id`
- **Approval required**: Yes — all outbound replies require staff approval in UI before delivery
- **Config keys**: `max_words`, `language`, `phone`, `tone` (from `mms_agent_config` → agent_id = "comms")
- **Forbidden**:
  - Must not confirm a booking, berth reservation, or launch slot
  - Must not commit to any price, rate, or discount
  - Must not promise a specific completion date or timeline
  - Must not send a payment demand or late-payment notice
  - Must not reference data from a different customer
  - Must not disclose internal cost, margin, or rate card pricing
  - Must not cancel or modify any existing booking
  - Must not approve any quotation, invoice, or work order

#### `agents/marina-agent.js`
- **Purpose**: Daily monitor for contract expiry (≤ 30d), insurance expiry (≤ 30d), and overdue work orders (> 14d active). Creates notifications and a Claude-generated briefing.
- **Trigger**: Daily scheduled run. Optionally scoped to one customer.
- **Inputs**: `{ customerId? }`
- **Outputs**: `{ alerts, breakdown: [{ type, subject }] }`
- **API calls**: `GET /api/db/contracts`, `GET /api/db/boats`, `GET /api/db/work-orders`, `POST /api/db/notifications`
- **Approval required**: No (notifications only)
- **Forbidden**:
  - Must not confirm, cancel, or modify any berth or storage booking
  - Must not authorise a vessel launch or haul-out
  - Must not clear a vessel for departure before payment confirmation
  - Must not override a tide safety calculation result
  - Must not change boat location records without a physical movement log

#### `agents/finance-agent.js`
- **Purpose**: Daily AR check — identifies overdue invoices, invoices due within 3 days, creates notifications, produces a Claude-generated AR briefing.
- **Trigger**: Daily scheduled run.
- **Inputs**: None (reads all invoices)
- **Outputs**: `{ overdueCount, overdueTotal, upcomingCount, upcomingTotal, report }`
- **API calls**: `GET /api/db/invoices`, `POST /api/db/notifications`
- **Approval required**: No (notifications and briefings only)
- **Config keys**: `overdue_warn_days`, `escalation_amount_thb` (from `mms_agent_config` → agent_id = "finance")
- **Forbidden**:
  - Must not mark any payment as received (accounting staff only)
  - Must not cancel or modify any invoice
  - Must not send a payment demand or late-payment notice directly to a customer
  - Must not disclose individual invoice amounts to anyone other than the account owner
  - Must not create, approve, or reject any invoice without FINANCE role approval

#### `agents/hr-agent.js`
- **Purpose**: Drafts HR documents — job descriptions, KPI frameworks, SOPs, 30-day onboarding plans. Returns drafts only; management reviews before use.
- **Trigger**: Direct call with `{ content, task, role, language }`.
- **Tasks**: `jd | kpi | sop | onboard | general`
- **Inputs**: `{ content?, task?, role?, language? }`
- **Outputs**: `{ task, document | kpis | plan | response }`
- **API calls**: Claude only — no DB reads or writes
- **Approval required**: No (all outputs are documents only)
- **Forbidden**:
  - Must not issue, confirm, or terminate any employment contract
  - Must not disclose individual staff salary, performance rating, or disciplinary record
  - Must not make hiring or firing decisions
  - Must not send any document directly to staff
  - Must not include real staff names unless explicitly provided

---

### L3 — Executors

#### `agents/tide-agent.js`
- **Purpose**: Calls `/api/tide/calculate` with boat draft and operational constants, returns safe launch/haul-out windows for a given date. Advisory only — dockmaster confirms on the day.
- **Trigger**: Via CEO Agent (route = "tide") or direct call.
- **Inputs**: `{ boatId?, date?, tideData?, trailerHeight?, safetyClearance?, rampDepthOffset? }`
- **Outputs**: `{ ok, draftM, requiredActualDepth, requiredTideHeight, earliestSafeHour, safeWindows, slots, warning }`
- **API calls**: `GET /api/db/boats/:id`, `GET /api/db/ramp-bookings/tide`, `POST /api/tide/calculate`
- **Approval required**: No (advisory output — dockmaster gives final physical approval)
- **Config keys**: `trailer_height_m`, `safety_clearance_m`, `ramp_offset_m` (from `mms_agent_config` → agent_id = "tide")
- **Operational constants** (Ko Samui 2026, approved):
  - `trailer_height_m = 0.70`
  - `safety_clearance_m = 0.10`
  - `ramp_offset_m = -1.00`
- **Forbidden**:
  - Must not declare a launch or haul-out window SAFE without actual tide data
  - Must not override or suppress the operational safety warning
  - Must not approve a vessel launch (advisory only)
  - Must not change ramp offset or safety clearance values in code (use Settings → AI Agent Rules)

#### `agents/doc-writer.js`
- **Purpose**: Triggers PDF/DOCX/XLSX generation via web app API endpoints for quotations, invoices, work orders, and reports.
- **Trigger**: Via CEO Agent (route = "doc-writer") or direct call.
- **Inputs**: `{ docType?, refId?, content?, format? }`
- **Outputs**: `{ ok, type, id?, url?, format }`
- **API calls**: `POST /api/quotations/:id/pdf`, `POST /api/db/invoices/:id/pdf`, `POST /api/db/work-orders/:id/pdf`, `POST /api/db/reports`
- **Approval required**: No (read-only generation)
- **Forbidden**: Must not generate documents for IDs it has not been given explicitly

#### `agents/calculator.js`
- **Purpose**: Pure-math helper for quotation totals, margin, and validation. No Claude, no API calls.
- **Exports**: `calcQuotation`, `calcMargin`, `validateTotals`
- **Approval required**: No

---

### L4 — Validators & Support

#### `agents/qa-agent.js`
- **Purpose**: Validates L2/L3 output structure before the CEO agent returns a result. Pure sync — no Claude, no API calls.
- **Checks per route**: required fields, grand_total > 0 (quotation), overdueTotal sanity (finance), safe windows present (tide), reply length (comms)
- **Approval required**: No
- **Forbidden**: Must not suppress QA issues — all failures must be returned to CEO for escalation

#### `agents/escalation-agent.js`
- **Purpose**: Creates HIGH-priority notification in the web app when QA fails or an agent throws an unhandled error.
- **Trigger**: Called by CEO agent on error or QA failure.
- **API calls**: `POST /api/db/notifications`
- **Approval required**: No
- **Forbidden**: Must not swallow its own errors silently (logs to console on notification failure)

#### `agents/audit-trail.js`
- **Purpose**: Writes an audit log entry to `mms_agent_audit_log` (Supabase primary) with JSONL file fallback. HIGH/CRITICAL risk entries also trigger a notification.
- **Trigger**: Called by CEO agent after every dispatch, and by agents for sensitive actions.
- **API calls**: `POST /api/db/agent-audit-log`, `POST /api/db/notifications` (HIGH/CRITICAL only)
- **Approval required**: No
- **Forbidden**: Must not be skipped for agent_error or agent_escalation actions

---

## Deprecated Shims

These files re-export from their canonical agent. Do not add new logic here.

| File | Points to | Reason |
|---|---|---|
| `agents/_deprecated/customer-service-agent.js` | `comms-agent.js` | Renamed; shim for backward compat |
| `agents/_deprecated/messaging-agent.js` | `comms-agent.js` | Renamed; shim for backward compat |
| `agents/_deprecated/operations-agent.js` | `marina-agent.js` | Renamed; shim for backward compat |

---

## Approval Flow Summary

```
Agent creates AI Order → POST /api/ai/orders
  └─ Status: PENDING_APPROVAL
     └─ Manager approves/rejects → PATCH /api/ai/orders/:id
        └─ If approved → POST /api/ai/orders/:id/execute
           └─ Creates quotation/invoice in DB with generated_by="ai-agent"
```

Agents may not write to `mms_quotations` or `mms_invoices` directly. All writes go through the approval route.

---

## Configuration

Agent runtime config is stored in `mms_agent_config` (Supabase) and loaded via `lib/agent-config.js`.
Edit via **Settings → AI Agent Rules** in the web app.
In-process cache is cleared on each agent process restart.
