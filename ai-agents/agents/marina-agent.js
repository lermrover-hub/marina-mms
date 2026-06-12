/**
 * Marina Agent — L2 Specialist
 * Berth/storage monitor, contract & insurance expiry alerts.
 * Renamed from operations-agent.js; operations-agent.js re-exports for back-compat.
 */
import { getContracts, getBoats, getWorkOrders, createNotification } from "../lib/api-client.js"
import { ask } from "../lib/claude-client.js"
import { getAgentConfig } from "../lib/agent-config.js"

// FORBIDDEN — this agent must NEVER:
// - Confirm, cancel, or modify any berth or storage booking
// - Authorise a vessel launch or haul-out (dockmaster confirmation required)
// - Clear a vessel for departure before payment confirmation
// - Override a tide safety calculation result
// - Change boat location records without a physical movement log
// All actions are alerts and notifications only.

const TODAY = new Date()
function daysUntil(d) { return d ? Math.ceil((new Date(d) - TODAY) / 86400000) : null }

export async function run({ customerId } = {}) {
  const cfg = await getAgentConfig("marina")
  console.log("[MarinaAgent] Starting…")
  const alerts = []

  // Contracts expiring ≤30d
  try {
    const data = await getContracts(customerId ? `customer_id=${customerId}` : "")
    const list = Array.isArray(data) ? data : data?.data ?? []
    for (const c of list) {
      const d = daysUntil(c.end_date ?? c.expires_at)
      if (d !== null && d >= 0 && d <= Number(cfg.contract_expiry_warn_days))
        alerts.push({ type: "contract_expiry", subject: `Contract expiring in ${d}d`, detail: `${c.contract_number ?? c.id} — customer ${c.customer_id}`, customerId: c.customer_id, refId: c.id, daysLeft: d })
    }
  } catch (e) { console.warn("[MarinaAgent] contracts:", e.message) }

  // Insurance expiring ≤30d
  try {
    const boats = await getBoats()
    for (const b of (Array.isArray(boats) ? boats : [])) {
      const d = daysUntil(b.insurance_expiry)
      if (d !== null && d >= 0 && d <= Number(cfg.insurance_expiry_warn_days))
        alerts.push({ type: "insurance_expiry", subject: `Insurance expiring in ${d}d`, detail: `Boat "${b.name}" owner ${b.owner_id}`, customerId: b.owner_id, refId: b.id, daysLeft: d })
    }
  } catch (e) { console.warn("[MarinaAgent] insurance:", e.message) }

  // Work orders overdue >14d
  try {
    const wos = await getWorkOrders()
    const list = Array.isArray(wos) ? wos : wos?.data ?? []
    for (const wo of list) {
      const active = ["in_progress","IN_PROGRESS","waiting_parts","WAITING_PARTS"].includes(wo.status)
      const age = daysUntil(wo.created_at)
      if (active && age !== null && age < -Number(cfg.work_order_overdue_days))
        alerts.push({ type: "work_order_overdue", subject: `WO overdue ${Math.abs(age)}d`, detail: `${wo.id} — "${wo.title ?? wo.id}"`, refId: wo.id })
    }
  } catch (e) { console.warn("[MarinaAgent] work orders:", e.message) }

  if (alerts.length > 0) {
    const summary = await ask(
      "You are a marina operations manager. Summarise these alerts as a prioritised daily briefing, bullet points only.",
      JSON.stringify(alerts)
    ).catch(() => "See individual alerts.")
    console.log("\n─── Marina Briefing ───\n" + summary + "\n───────────────────────\n")

    for (const a of alerts) {
      await createNotification({
        type: a.type, title: a.subject, message: a.detail,
        customer_id: a.customerId ?? null, reference_id: a.refId ?? null,
        priority: (a.daysLeft !== undefined && a.daysLeft <= 7) ? "HIGH" : "MEDIUM",
        created_at: new Date().toISOString(),
      }).catch(e => console.warn("[MarinaAgent] notify:", e.message))
    }
  } else {
    console.log("[MarinaAgent] No alerts.")
  }

  return { alerts: alerts.length, breakdown: alerts.map(a => ({ type: a.type, subject: a.subject })) }
}
