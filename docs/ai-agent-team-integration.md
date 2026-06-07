# AI Agent Team Integration

This project includes a standalone AI agent team in `ai-agents/`. The agents do not import or modify the Next.js app directly. They integrate with Marina MMS through authenticated REST API calls to `/api/db/*` and `/api/pricing-master`.

## Current Agent Team

| Agent | Purpose | Typical trigger |
| --- | --- | --- |
| `quotation` | Draft quotations from service requests and pricing master data | New service request needing quote |
| `marina` | Monitor contracts, berths, overdue operational work, and berth alerts | Daily operations review |
| `finance` | Detect overdue invoices and draft payment reminders | Daily finance review |
| `comms` | Draft customer replies and mark messages handled in dry/write modes | Customer message intake |
| `hr` | Draft HR and KPI support material | Management request |
| `tide` | Check launch/retrieval safety windows | Ramp booking or launch request |

## Security Boundary

The web app middleware accepts agent requests only when the request includes:

```text
x-agent-api-key: <MARINA_AGENT_API_KEY>
```

Read requests are allowed with a valid key. Write requests are blocked unless the web app process has:

```text
ENABLE_AI_AGENT_WRITES=true
```

Production write runs have a second guard in `ai-agents/run.js`: production writes require `AI_AGENT_PILOT_MODE=true`, `AI_AGENT_DRY_RUN=false`, one specific agent, and for quotation pilots a specific `--sr=<id>` or `--customer=<id>`.

## Standard Local Staging Flow

Start Marina MMS against the staging Supabase project:

```powershell
npm.cmd run dev:staging
```

Run the agent team in read-only dry-run mode:

```powershell
$env:MARINA_API_BASE = "http://localhost:3004"
$env:MARINA_AGENT_API_KEY = "local-test-key"
$env:AI_AGENT_DRY_RUN = "true"
$env:AI_AGENT_SKIP_CLAUDE = "true"
npm.cmd run agents:test
npm.cmd run agents:dry-run
```

To include live staging API checks in the test run:

```powershell
$env:ENABLE_LIVE_AGENT_API_TESTS = "true"
npm.cmd run agents:test:live
```

Use write-enabled staging only after explicitly approving a write test:

```powershell
npm.cmd run dev:staging:writes
```

Then run one scoped agent with `AI_AGENT_DRY_RUN=false`.

## Production Rules

Production is read-only by default. Do not enable production agent writes for scheduled or broad runs.

Allowed production checks:

```powershell
$env:MARINA_API_BASE = "https://marina-mms.vercel.app"
$env:AI_AGENT_DRY_RUN = "true"
$env:AI_AGENT_SKIP_CLAUDE = "true"
$env:ENABLE_LIVE_AGENT_API_TESTS = "true"
npm.cmd run agents:test:live
```

Allowed production write pilot only after explicit approval:

```powershell
$env:MARINA_API_BASE = "https://marina-mms.vercel.app"
$env:AI_AGENT_DRY_RUN = "false"
$env:AI_AGENT_PILOT_MODE = "true"
$env:AI_AGENT_SKIP_CLAUDE = "false"
npm.cmd --prefix ai-agents run run -- --agent=quotation --sr=<service-request-id>
```

After any approved production pilot, disable `ENABLE_AI_AGENT_WRITES` immediately and verify the created or changed records in the Marina MMS UI.

## Verification Checklist

Before considering the AI agent team integrated:

1. `npm.cmd run dev:staging` starts without pointing at production Supabase.
2. `npm.cmd run agents:test` passes offline-safe agent checks.
3. `npm.cmd run agents:test:live` passes against staging with `ENABLE_LIVE_AGENT_API_TESTS=true`.
4. `npm.cmd run agents:dry-run` completes without creating quotations, notifications, or message updates.
5. A write-enabled staging pilot creates only expected TEST-AI records.
6. Production checks are run in dry-run mode only unless a single scoped pilot has been explicitly approved.
