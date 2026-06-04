# Marina MMS — AI Agent Team

Standalone AI agent system for Marina & Boat Yard Management.
Does NOT modify the web app. Communicates via REST APIs only.

## Agents

| Agent | Role | Triggers |
|---|---|---|
| `quotation-agent` | Drafts quotations from service requests | New service request with no quotation |
| `customer-service-agent` | Handles customer inquiries, generates replies | New notification / portal message |
| `operations-agent` | Monitors berths, alerts for expiry / overdue | Daily scheduled run |
| `finance-agent` | Overdue invoice alerts, payment reminders | Daily scheduled run |

## Setup

```bash
cd ai-agents
npm install
cp .env.example .env      # fill in ANTHROPIC_API_KEY, MARINA_API_BASE, MARINA_AGENT_API_KEY
node run.js               # run all agents once
node run.js --agent=quotation   # run specific agent
```

The web app and agent process must use the same `MARINA_AGENT_API_KEY`.

For a safe workflow test that reads real API data but does not call Claude or write records:

```bash
AI_AGENT_SKIP_CLAUDE=true AI_AGENT_DRY_RUN=true node run.js
```

## Architecture

Each agent:
1. Calls Marina MMS REST API to fetch work items
2. Uses Claude to reason about the data and generate output
3. Posts results back via REST API (create quotation, send notification, etc.)
4. Never touches the web app codebase

## Business Rules

All agents follow the same business rules as the web app (see CLAUDE.md at project root).
