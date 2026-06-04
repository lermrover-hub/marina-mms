/**
 * Marina MMS AI Agent Runner
 *
 * Usage:
 *   node run.js
 *   node run.js --agent=quotation
 *   node run.js --agent=operations
 *   node run.js --agent=finance
 *   node run.js --agent=customer-service --customer=<id> --inquiry="..."
 */

import "dotenv/config"

if (!process.env.ANTHROPIC_API_KEY && process.env.AI_AGENT_SKIP_CLAUDE !== "true") {
  console.error("ERROR: ANTHROPIC_API_KEY is not set.")
  process.exit(1)
}
if (!process.env.MARINA_AGENT_API_KEY) {
  console.error("ERROR: MARINA_AGENT_API_KEY is not set. It must match the web app environment.")
  process.exit(1)
}
if (!process.env.MARINA_API_BASE) {
  console.warn("WARNING: MARINA_API_BASE not set; defaulting to http://localhost:3000")
}

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, ...value] = arg.slice(2).split("=")
      return [key, value.join("=") || true]
    })
)

const agentFilter = args.agent ?? "all"
console.log(`\nMarina MMS AI Agents - ${new Date().toLocaleString("en-GB")}`)
console.log(`   API base : ${process.env.MARINA_API_BASE ?? "http://localhost:3000"}`)
console.log(`   Running  : ${agentFilter === "all" ? "all agents" : agentFilter + " agent"}`)
console.log(`   Dry run  : ${process.env.AI_AGENT_DRY_RUN === "true" ? "yes" : "no"}`)

async function loadAndRun(name, importPath, runArgs = {}) {
  if (agentFilter !== "all" && agentFilter !== name) return
  console.log(`\n${"-".repeat(60)}`)
  console.log(`> ${name.toUpperCase()} AGENT`)
  console.log("-".repeat(60))
  try {
    const mod = await import(importPath)
    const result = await mod.run(runArgs)
    console.log(`OK ${name} agent completed.`, result ? `(${JSON.stringify(result).slice(0, 120)})` : "")
  } catch (err) {
    console.error(`FAILED ${name} agent: ${err.message}`)
    if (process.env.DEBUG) console.error(err.stack)
    process.exitCode = 1
  }
}

await loadAndRun("quotation",        "./agents/quotation-agent.js")
await loadAndRun("operations",       "./agents/operations-agent.js")
await loadAndRun("finance",          "./agents/finance-agent.js")
await loadAndRun("customer-service", "./agents/customer-service-agent.js", {
  customerId: args.customer,
  inquiry:    args.inquiry,
})
await loadAndRun("messaging",        "./agents/messaging-agent.js")

console.log(`\nAll requested agents finished - ${new Date().toLocaleString("en-GB")}\n`)
