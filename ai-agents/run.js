/**
 * Marina MMS AI Agent Runner
 *
 * Usage (scheduled / CLI):
 *   node run.js --agent=quotation                          – staging or dry-run
 *   node run.js --agent=marina
 *   node run.js --agent=finance
 *   node run.js --agent=hr --task=kpi --role="Technician"
 *   node run.js --agent=comms --customer=<id> --inquiry="..."
 *   node run.js --agent=tide --boat=<id> --date=2026-06-10
 *
 * Production write pilot (requires explicit approval env vars):
 *   AI_AGENT_PILOT_MODE=true AI_AGENT_DRY_RUN=false node run.js --agent=quotation --sr=<id>
 *
 * For channel server (LINE / email / web-form):
 *   node server.js
 */

import "dotenv/config"

// ── Safety checks ────────────────────────────────────────────────────────────

if (!process.env.ANTHROPIC_API_KEY && process.env.AI_AGENT_SKIP_CLAUDE !== "true") {
  console.error("ERROR: ANTHROPIC_API_KEY is not set."); process.exit(1)
}
if (!process.env.MARINA_AGENT_API_KEY) {
  console.error("ERROR: MARINA_AGENT_API_KEY is not set."); process.exit(1)
}

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith("--"))
    .map(a => { const [k, ...v] = a.slice(2).split("="); return [k, v.join("=") || true] })
)

const agentFilter  = args.agent ?? "all"
const base         = process.env.MARINA_API_BASE ?? "http://localhost:3000"
const dryRun       = process.env.AI_AGENT_DRY_RUN !== "false"   // default true
const pilotMode    = process.env.AI_AGENT_PILOT_MODE === "true"
const isProduction = base.includes("vercel.app") || base.includes("marina-mms.com")

// ── Production write guard ────────────────────────────────────────────────────
if (isProduction && !dryRun) {
  if (!pilotMode) {
    console.error("BLOCKED: Production writes require AI_AGENT_PILOT_MODE=true.")
    console.error("  Set AI_AGENT_PILOT_MODE=true only after explicit user approval.")
    process.exit(1)
  }
  if (agentFilter === "all") {
    console.error("BLOCKED: Production pilot requires --agent=<name>. Cannot run all agents.")
    console.error("  Specify exactly one agent, e.g. --agent=quotation --sr=<service-request-id>")
    process.exit(1)
  }
  if (agentFilter === "quotation" && !args.sr && !args.customer) {
    console.error("BLOCKED: Production quotation pilot requires --sr=<service-request-id> or --customer=<id>.")
    process.exit(1)
  }
  console.warn("⚠  PRODUCTION PILOT MODE — writes enabled for single agent: " + agentFilter)
}

console.log(`\nMarina MMS AI Agents — ${new Date().toLocaleString("en-GB")}`)
console.log(`  API    : ${base}${isProduction ? " [PRODUCTION]" : ""}`)
console.log(`  Run    : ${agentFilter === "all" ? "all scheduled" : agentFilter}`)
console.log(`  DryRun : ${dryRun ? "yes" : "NO — WRITES ENABLED"}`)
console.log(`  Pilot  : ${pilotMode ? "yes" : "no"}`)

async function load(name, path, runArgs = {}) {
  if (agentFilter !== "all" && agentFilter !== name) return
  console.log(`\n${"─".repeat(55)}\n> ${name.toUpperCase()}\n${"─".repeat(55)}`)
  try {
    const mod = await import(path)
    const result = await mod.run(runArgs)
    const summary = result ? JSON.stringify(result).slice(0, 120) : ""
    console.log(`✓ ${name} done${summary ? " — " + summary : ""}`)
  } catch (err) {
    console.error(`✗ ${name} FAILED: ${err.message}`)
    if (process.env.DEBUG) console.error(err.stack)
    process.exitCode = 1
  }
}

// L2 Specialist scheduled agents
await load("quotation", "./agents/quotation-agent.js", {
  srId:       args.sr,
  customerId: args.customer,
})
await load("marina",    "./agents/marina-agent.js")
await load("finance",   "./agents/finance-agent.js")
await load("comms",     "./agents/comms-agent.js", {
  customerId: args.customer,
  inquiry:    args.inquiry,
})
await load("hr",        "./agents/hr-agent.js", {
  task:    args.task,
  role:    args.role,
  content: args.content,
})
await load("tide",      "./agents/tide-agent.js", {
  boatId: args.boat,
  date:   args.date,
})

console.log(`\nAll agents finished — ${new Date().toLocaleString("en-GB")}\n`)
