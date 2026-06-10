# AI Agent Rollback Plan — Ocean Rover Marina

This document describes how to stop, limit, or reverse AI agent activity without touching application code.

Last updated: 2026-06-11

---

## 1. Disable AI Writes

Set the following environment variables in Vercel (or in the agent process `.env`) and redeploy / restart the agent process.

### Agent process (ai-agents/)

```
AI_AGENT_DRY_RUN=true
```

When `true`, all agents log their intended actions but make no API calls that write data.
No quotations, invoices, notifications, messages, or audit log entries are created.

### Web app (Vercel)

```
ENABLE_AI_AGENT_WRITES=false
```

When `false`, the web app refuses writes originating from agent API calls even if the agent process bypasses the dry-run flag.

**Apply both together for full write isolation.**

To re-enable after confirming stability:

```
AI_AGENT_DRY_RUN=false
ENABLE_AI_AGENT_WRITES=true
```

> **Note:** Changing Vercel env vars requires a redeployment. Do not change Vercel env vars without explicit approval from the Managing Director or system owner.

---

## 2. Disable Live API Tests

Live API smoke tests are controlled by a single env var in the agent test environment.

Default (safe — tests are skipped):
```
ENABLE_LIVE_AGENT_API_TESTS=    ← not set, or any value other than "true"
```

To disable after having been enabled:
```
ENABLE_LIVE_AGENT_API_TESTS=false
```

Or delete the value from `ai-agents/.env.test.live`.

Live tests also require `MARINA_API_BASE` and `MARINA_AGENT_API_KEY` to be set.
Removing either of these also prevents live tests from running.

---

## 3. Stop Outbound Customer Messages

AI-generated customer messages are saved as `PENDING_APPROVAL` drafts in `mms_messages`.
No message is delivered unless a staff member explicitly approves it in the web app UI.

### Immediate stop — do not approve any pending drafts

1. Go to **Messages → Pending Approval** in the web app.
2. Do not click Approve on any draft marked `agent_generated = true`.
3. Reject or delete drafts as needed.

### Block new drafts from being created

Set in the agent process:
```
AI_AGENT_DRY_RUN=true
```

This prevents `comms-agent.js` from calling `POST /api/db/messages` entirely.

### Block LINE / WhatsApp sends at the channel level

Remove the following env vars from Vercel or the agent `.env`:
```
LINE_CHANNEL_ACCESS_TOKEN      ← LINE sends will fail / mock
WHATSAPP_PHONE_NUMBER_ID       ← WhatsApp sends will fail / mock
WHATSAPP_ACCESS_TOKEN
```

When these are absent, `lib/messaging.js` logs the intended message and returns `{ success: true, mock: true }` without making any network call.

---

## 4. Database Rollback — Supabase Point-in-Time Recovery

Supabase maintains continuous WAL-based backups with point-in-time recovery (PITR).

### Recovery steps

1. Go to the Supabase dashboard:
   `https://supabase.com/dashboard/project/zanlunbgupdtqznruzok/database/backups`

2. Select **Point in Time Recovery**.

3. Choose the timestamp immediately before the unintended write occurred.

4. Initiate restore. The database is restored to the selected point in time.
   **This replaces the current database — all changes after the recovery point are lost.**

### Before initiating a restore

- Export any data created after the target recovery point that should be preserved (e.g. legitimate customer payments recorded after the bad agent write).
- Notify all active users that the system will be unavailable during restore.
- Confirm the restore point with the Managing Director.

### Scope of agent-created records

AI agents only write to these tables:

| Table | Written by | Reversible via PITR |
|---|---|---|
| `mms_quotations` | quotation-agent (via execute route) | Yes |
| `mms_messages` | comms-agent (drafts only) | Yes |
| `mms_notifications` | marina-agent, finance-agent, escalation-agent | Yes |
| `ai_orders` | all agents (approval orders) | Yes |
| `approval_queue` | approval workflow | Yes |
| `mms_agent_audit_log` | audit-trail agent | Yes |

No AI agent writes to financial tables (`mms_invoices`, `mms_payments`, `mms_receipts`) without an approved `ai_order_id` and manager action.

---

## 5. Scope Limitation Rule

**No AI agent in this system can drop tables, truncate tables, or bulk-delete records.**

This is enforced by design:

- All agents communicate with the database **through the web app REST API only**. No agent has a direct database connection or Supabase service role key.
- The web app API routes only expose `INSERT`, `SELECT`, and `UPDATE` operations for agent-accessible endpoints. No `DELETE` route exists for agent use.
- Status changes (cancel, close, reject) are implemented as field updates (`status = 'CANCELLED'`), not row deletions.
- The `AI_AGENT_DRY_RUN` flag provides a second layer: when `true`, no write API calls are made regardless of agent logic.

If a future agent or API route needs delete capability, it must go through a separate approval review before implementation.

---

## Quick Reference

| Situation | Action |
|---|---|
| Stop all agent writes immediately | Set `AI_AGENT_DRY_RUN=true` in agent `.env`, restart agent process |
| Block writes at the web app level | Set `ENABLE_AI_AGENT_WRITES=false` in Vercel, redeploy |
| Stop outbound messages | Do not approve drafts in UI; set `AI_AGENT_DRY_RUN=true` |
| Disable LINE/WhatsApp sends | Remove `LINE_CHANNEL_ACCESS_TOKEN` and WhatsApp vars |
| Undo agent-created records | Use Supabase PITR to restore to a point before the unintended write |
| Prevent live API tests | Ensure `ENABLE_LIVE_AGENT_API_TESTS` is not set to `"true"` |
