# Marina MMS - AI Agent Team

Standalone AI agent system for Marina & Boat Yard Management.
It does not modify the web app directly. It communicates through REST APIs only.

## Agents

| Agent | Role | Triggers |
| --- | --- | --- |
| `quotation-agent` | Drafts quotations from service requests | New service request with no quotation |
| `customer-service-agent` | Handles customer inquiries and generates replies | New notification or portal message |
| `operations-agent` | Monitors berths, expiry alerts, and overdue work | Daily scheduled run |
| `finance-agent` | Overdue invoice alerts and payment reminders | Daily scheduled run |

## Setup

```powershell
cd ai-agents
npm install
Copy-Item .env.example .env
```

Fill in `ANTHROPIC_API_KEY`, `MARINA_API_BASE`, and `MARINA_AGENT_API_KEY`.

The web app and agent process must use the same `MARINA_AGENT_API_KEY`.

## Run

From this folder:

```powershell
node run.js
node run.js --agent=quotation
```

From the project root:

```powershell
npm.cmd run agents:test
npm.cmd run agents:dry-run
npm.cmd run agents:run
```

For a safe workflow test that reads API data but does not call Claude or write records:

```powershell
$env:AI_AGENT_SKIP_CLAUDE = "true"
$env:AI_AGENT_DRY_RUN = "true"
node run.js
```

## Architecture

Each agent:

1. Calls Marina MMS REST APIs to fetch work items.
2. Uses Claude to reason about the data and generate output.
3. Posts results back through REST APIs when writes are explicitly enabled.
4. Never touches the web app codebase directly.

## Business Rules

All agents follow the same business rules as the web app. See `docs/ai-agent-team-integration.md` for the staging and production runbook.
