/**
 * Marina MMS AI Agent Runner
 *
 * Usage (scheduled / CLI):
 *   node run.js                          – run all scheduled agents
 *   node run.js --agent=quotation
 *   node run.js --agent=marina
 *   node run.js --agent=finance
 *   node run.js --agent=hr --task=kpi --role="Technician"
 *   node run.js --agent=comms --customer=<id> --inquiry="..."
 *   node run.js --agent=tide --boat=<id> --date=2026-06-10
 *
 * For channel server (LINE / email / web-form):
 *   node server.js
 */

import "dotenv/config"

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

const agentFilter = args.agent ?? "all"
console.log(`\nMarina MMS AI Agents — ${new Date().toLocaleString("en-GB")}`)
console.log(`  API    : ${process.env.MARINA_API_BASE ?? "http://localhost:3000"}`)
console.log(`  Run    : ${agentFilter === "all" ? "all scheduled" : agentFilter}`)
console.log(`  DryRun : ${process.env.AI_AGENT_DRY_RUN === "true" ? "yes" : "no"}`)

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
await load("quotation",  "./agents/quotation-agent.js")
await load("marina",     "./agents/marina-agent.js")
await load("finance",    "./agents/finance-agent.js")
await load("comms",      "./agents/comms-agent.js", {
  customerId: args.customer,
  inquiry:    args.inquiry,
})
await load("hr",         "./agents/hr-agent.js", {
  task:    args.task,
  role:    args.role,
  content: args.content,
})
await load("tide",       "./agents/tide-agent.js", {
  boatId: args.boat,
  date:   args.date,
})

console.log(`\nAll agents finished — ${new Date().toLocaleString("en-GB")}\n`)
