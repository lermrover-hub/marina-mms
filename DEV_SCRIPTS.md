# Marina MMS - Development State and Safe Commands

Last verified: 2026-06-05

## Canonical Workspace

- Web app: `C:\marina-mms`
- AI agents: `C:\marina-mms\ai-agents`
- GitHub: `https://github.com/lermrover-hub/marina-mms`
- Production: `https://marina-mms.vercel.app`
- Do not work from the old Google Drive clone.

## Current Safety Policy

Production data is read-only until the user explicitly approves production writes.

- Keep `ENABLE_AI_AGENT_WRITES` unset.
- Keep `ENABLE_AUTOMATION_WRITES` unset.
- Keep `AI_AGENT_DRY_RUN=true`.
- Keep `AI_AGENT_SKIP_CLAUDE=true` during tests.
- Never put secrets or real key values in tracked files.
- Do not change Rate Card or other production records during tests.

The server enforces these locks:

- Agent-key GET/HEAD requests are allowed.
- Agent-key POST/PATCH/DELETE requests return HTTP 403 unless `ENABLE_AI_AGENT_WRITES=true`.
- Recurring billing remains dry-run unless `ENABLE_AUTOMATION_WRITES=true`.
- LINE and WhatsApp webhooks reject unsigned requests and do not write while automation writes are disabled.

## Safe Test Workflow

Start a local server with a temporary key:

```powershell
cd C:\marina-mms
$env:MARINA_AGENT_API_KEY="local-test-key"
npm.cmd run dev -- --port 3004
```

In another terminal, run the agent suite against local API:

```powershell
cd C:\marina-mms\ai-agents
$env:MARINA_API_BASE="http://localhost:3004"
$env:MARINA_AGENT_API_KEY="local-test-key"
$env:AI_AGENT_DRY_RUN="true"
$env:AI_AGENT_SKIP_CLAUDE="true"
npm.cmd test
node run.js
```

Run web app verification:

```powershell
cd C:\marina-mms
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

## Last Verified Results

- AI agent tests: `49 passed, 0 failed, 0 skipped`
- Five-agent dry run: quotation, operations, finance, customer service, and messaging passed
- TypeScript: passed
- Lint: passed with existing warnings and no errors
- Production build: passed
- Agent-key read: HTTP 200
- Agent-key write while locked: HTTP 403
- Valid local cron secret: HTTP 200 dry-run
- Spoofed `x-vercel-cron`: HTTP 401
- Unsigned LINE webhook: HTTP 401
- Unsigned WhatsApp webhook: HTTP 401
- Default/fallback WhatsApp verify token: HTTP 403

## AI Agent Commands

```powershell
cd C:\marina-mms\ai-agents
npm.cmd test
node run.js
node run.js --agent=quotation
node run.js --agent=operations
node run.js --agent=finance
node run.js --agent=customer-service
node run.js --agent=messaging
```

## Required Secrets

Manage these only in Vercel or ignored local `.env` files:

- `MARINA_AGENT_API_KEY`
- `CRON_SECRET`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

The agent API key was rotated on 2026-06-05 after an old value was accidentally committed. Never reuse the old value.

## Write Enablement Checklist

Do not enable writes until every item is approved:

1. Confirm all local tests and production read-only smoke tests pass.
2. Configure and verify `CRON_SECRET`, LINE, and WhatsApp secrets.
3. Confirm Rate Card and production records remain unchanged during testing.
4. Receive explicit user approval for the specific write workflow.
5. Enable only the required flag:
   - `ENABLE_AI_AGENT_WRITES=true` for agent API writes.
   - `ENABLE_AUTOMATION_WRITES=true` for cron and webhook writes.
6. Monitor the first live run and verify created records.
7. Disable the flag immediately if results differ from expected behavior.

## Git and Deployment

```powershell
cd C:\marina-mms
git status
git diff --check
git push origin main
```

Do not manually deploy or enable production writes without explicit approval. GitHub pushes may trigger the configured Vercel deployment automatically.
