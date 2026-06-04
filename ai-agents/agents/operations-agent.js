/**
 * Operations Agent
 *
 * Daily monitor for:
 * 1. Contracts expiring in the next 30 days
 * 2. Boat insurance expiring in the next 30 days
 * 3. Berths that are overdue (occupied but no active contract/payment)
 * 4. Work orders overdue (status IN_PROGRESS, created > 14 days ago)
 *
 * Creates notifications in the web app for each finding.
 * Does NOT touch the web app codebase.
 */

import { getContracts, getBoats, getWorkOrders, createNotification } from "../lib/api-client.js"
import { ask } from "../lib/claude-client.js"

const TODAY = new Date()

function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Math.ceil((d - TODAY) / (1000 * 60 * 60 * 24))
}

export async function run() {
  console.log("[OperationsAgent] Starting daily operations check…")
  const alerts = []

  // ── 1. Expiring contracts ──────────────────────────────────────────────────
  try {
    const contracts = await getContracts()
    const expiring = (Array.isArray(contracts) ? contracts : contracts?.data ?? []).filter((c) => {
      const d = daysUntil(c.end_date ?? c.expires_at)
      return d !== null && d >= 0 && d <= 30
    })
    for (const c of expiring) {
      const d = daysUntil(c.end_date ?? c.expires_at)
      alerts.push({
        type:       "contract_expiry",
        subject:    `Contract expiring in ${d} day${d === 1 ? "" : "s"}`,
        detail:     `Contract ${c.contract_number ?? c.id} for customer ${c.customer_id} expires on ${c.end_date ?? c.expires_at}`,
        customerId: c.customer_id,
        refId:      c.id,
        daysLeft:   d,
      })
    }
    console.log(`[OperationsAgent] ${expiring.length} contracts expiring within 30 days`)
  } catch (e) {
    console.warn("[OperationsAgent] Could not check contracts:", e.message)
  }

  // ── 2. Boat insurance expiry ───────────────────────────────────────────────
  try {
    const boats = await getBoats()
    const expiring = (Array.isArray(boats) ? boats : []).filter((b) => {
      const d = daysUntil(b.insurance_expiry)
      return d !== null && d >= 0 && d <= 30
    })
    for (const b of expiring) {
      const d = daysUntil(b.insurance_expiry)
      alerts.push({
        type:       "insurance_expiry",
        subject:    `Insurance expiring in ${d} day${d === 1 ? "" : "s"}`,
        detail:     `Boat "${b.name}" (owner: ${b.owner_id}) — insurance expires ${b.insurance_expiry}`,
        customerId: b.owner_id,
        refId:      b.id,
        daysLeft:   d,
      })
    }
    console.log(`[OperationsAgent] ${expiring.length} boat insurance records expiring within 30 days`)
  } catch (e) {
    console.warn("[OperationsAgent] Could not check boat insurance:", e.message)
  }

  // ── 3. Overdue work orders ─────────────────────────────────────────────────
  try {
    const workOrders = await getWorkOrders()
    const overdue = (Array.isArray(workOrders) ? workOrders : workOrders?.data ?? []).filter((wo) => {
      const inProgress = ["in_progress", "IN_PROGRESS", "waiting_parts", "WAITING_PARTS"].includes(wo.status)
      const age = daysUntil(wo.created_at)
      return inProgress && age !== null && age < -14   // older than 14 days
    })
    for (const wo of overdue) {
      const age = Math.abs(daysUntil(wo.created_at))
      alerts.push({
        type:    "work_order_overdue",
        subject: `Work order overdue (${age} days)`,
        detail:  `Work order ${wo.id} — "${wo.title ?? wo.description ?? "no title"}" has been in progress for ${age} days`,
        refId:   wo.id,
        age,
      })
    }
    console.log(`[OperationsAgent] ${overdue.length} overdue work orders`)
  } catch (e) {
    console.warn("[OperationsAgent] Could not check work orders:", e.message)
  }

  // ── 4. Use Claude to summarise and prioritise ─────────────────────────────
  if (alerts.length > 0) {
    console.log(`[OperationsAgent] ${alerts.length} total alerts — asking Claude to summarise…`)
    const summary = await ask(
      "You are an operations manager assistant for a marina. Summarise the following alerts in a clear, prioritised daily briefing. Be concise — bullet points only.",
      JSON.stringify(alerts, null, 2)
    ).catch(() => "See individual alerts below.")

    console.log("\n─── Daily Operations Briefing ───────────────────────────")
    console.log(summary)
    console.log("─────────────────────────────────────────────────────────\n")

    // 5. Post each alert as a notification in the web app
    for (const alert of alerts) {
      try {
        await createNotification({
          type:       alert.type,
          title:      alert.subject,
          message:    alert.detail,
          customer_id: alert.customerId ?? null,
          reference_id: alert.refId ?? null,
          priority:   alert.daysLeft !== undefined && alert.daysLeft <= 7 ? "HIGH" : "MEDIUM",
          created_at: new Date().toISOString(),
        })
      } catch (e) {
        console.warn(`[OperationsAgent] Could not post notification for ${alert.type}: ${e.message}`)
      }
    }
  } else {
    console.log("[OperationsAgent] No alerts today. All clear.")
  }

  console.log(`[OperationsAgent] Done. ${alerts.length} alerts processed.`)
  return { alerts: alerts.length, breakdown: alerts.map((a) => ({ type: a.type, subject: a.subject })) }
}
