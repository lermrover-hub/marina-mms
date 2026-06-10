/**
 * Finance Agent
 *
 * Daily monitor for:
 * 1. Invoices overdue (past due date, not fully paid)
 * 2. Invoices due in next 3 days (upcoming, not yet paid)
 * 3. Generates a daily AR summary report via Claude
 *
 * Creates notifications for overdue items.
 * Does NOT touch the web app codebase.
 */

import { getInvoices, createNotification } from "../lib/api-client.js"
import { ask } from "../lib/claude-client.js"
import { daysOverdue as calcDaysOverdue } from "../lib/date-utils.js"

// FORBIDDEN — this agent must NEVER:
// - Mark any payment as received (accounting staff only)
// - Cancel or modify any invoice
// - Send a payment demand or late-payment notice directly to a customer
// - Disclose individual invoice amounts to anyone other than the account owner
// - Create, approve, or reject any invoice without FINANCE role approval
// All actions are notifications and briefings only.

const TODAY = new Date()

function daysOverdue(dueDateStr) {
  return calcDaysOverdue(dueDateStr)
}

function formatTHB(n) {
  return `THB ${Number(n ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 0 })}`
}

function outstanding(inv) {
  if (inv.outstanding_balance != null) return Number(inv.outstanding_balance)
  return Number(inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0)
}

export async function run() {
  console.log("[FinanceAgent] Starting daily AR check…")

  const invoices = await getInvoices()
  const list = Array.isArray(invoices) ? invoices : invoices?.data ?? []

  const unpaid = list.filter((inv) =>
    !["paid", "PAID", "cancelled", "CANCELLED"].includes(inv.status)
  )

  const overdue  = []
  const upcoming = []

  for (const inv of unpaid) {
    const days = daysOverdue(inv.due_date)
    if (days === null) continue
    if (days > 0)  overdue.push({ ...inv, daysOverdue: days })
    else if (days >= -3) upcoming.push({ ...inv, daysUntilDue: Math.abs(days) })
  }

  console.log(`[FinanceAgent] ${overdue.length} overdue, ${upcoming.length} due within 3 days`)

  // ── Post notifications for overdue invoices ────────────────────────────────
  for (const inv of overdue) {
    try {
      const priority = inv.daysOverdue > 30 ? "HIGH" : inv.daysOverdue > 7 ? "MEDIUM" : "LOW"
      await createNotification({
        type:         "invoice_overdue",
        title:        `Invoice overdue ${inv.daysOverdue}d — ${formatTHB(outstanding(inv))}`,
        message:      `Invoice ${inv.invoice_number ?? inv.id} for customer ${inv.customer_id} is ${inv.daysOverdue} days overdue. Balance: ${formatTHB(outstanding(inv))}`,
        customer_id:  inv.customer_id ?? null,
        reference_id: inv.id,
        priority,
        created_at:   new Date().toISOString(),
      })
    } catch (e) {
      console.warn(`[FinanceAgent] Notification failed for invoice ${inv.id}: ${e.message}`)
    }
  }

  // ── Ask Claude for AR summary ──────────────────────────────────────────────
  const totalOverdue  = overdue.reduce((s, i)  => s + outstanding(i), 0)
  const totalUpcoming = upcoming.reduce((s, i) => s + outstanding(i), 0)

  const summaryPrompt = `Daily AR summary for Ocean Rover Marina — ${TODAY.toDateString()}

Overdue invoices: ${overdue.length} (total outstanding: ${formatTHB(totalOverdue)})
Upcoming (due in ≤3 days): ${upcoming.length} (total: ${formatTHB(totalUpcoming)})

Top overdue:
${overdue
  .sort((a, b) => b.daysOverdue - a.daysOverdue)
  .slice(0, 5)
  .map((i) => `- Invoice ${i.invoice_number ?? i.id}: ${formatTHB(outstanding(i))} — ${i.daysOverdue}d overdue`)
  .join("\n") || "None"}

Write a concise daily AR briefing (3–5 bullet points) for the Finance Manager. Include recommended follow-up actions.`

  const report = await ask(
    "You are a finance assistant for a marina. Write clear, actionable daily AR briefings.",
    summaryPrompt
  ).catch(() => `${overdue.length} overdue invoices totalling ${formatTHB(totalOverdue)}.`)

  console.log("\n─── Daily Finance Briefing ──────────────────────────────")
  console.log(report)
  console.log("─────────────────────────────────────────────────────────\n")

  return {
    overdueCount:   overdue.length,
    overdueTotal:   totalOverdue,
    upcomingCount:  upcoming.length,
    upcomingTotal:  totalUpcoming,
    report,
  }
}
