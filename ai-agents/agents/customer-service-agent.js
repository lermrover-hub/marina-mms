/**
 * Customer Service Agent
 *
 * Reads unread notifications / portal messages tagged for customer service,
 * then drafts a reply using Claude with knowledge of:
 * - The customer profile
 * - Their boats
 * - Their open quotations and invoices
 *
 * Outputs suggested replies to stdout (or posts back as a notification draft).
 * Does NOT touch the web app codebase.
 * Does NOT send emails automatically — staff must review and approve.
 */

import {
  getCustomers, getBoats, getQuotations, getInvoices,
} from "../lib/api-client.js"
import { ask } from "../lib/claude-client.js"

const SYSTEM_PROMPT = `You are a professional customer service representative for a marina and boat yard in Ko Samui, Thailand.
You assist boat owners with:
- Questions about their berth or storage
- Service request status inquiries
- Quotation and invoice questions
- General marina information

Your tone is:
- Warm, professional, and helpful
- Clear and jargon-free for non-technical customers
- Bilingual awareness (many customers are Thai or expat)

Always:
- Address the customer by name
- Reference their specific boat when relevant
- Give a direct answer, then offer next steps
- Keep replies concise (under 150 words unless detail is essential)
- Never commit to prices or timelines without confirming with operations`

export function daysOverdue(dueDateStr) {
  if (!dueDateStr) return null
  const d = new Date(dueDateStr)
  return Math.ceil((new Date() - d) / (1000 * 60 * 60 * 24))
}

export function isOverdueInvoice(invoice) {
  if (["paid", "PAID", "cancelled", "CANCELLED"].includes(invoice.status)) {
    return false
  }
  if (invoice.status === "overdue" || invoice.status === "OVERDUE") {
    return true
  }
  const days = daysOverdue(invoice.due_date)
  return days !== null && days > 0
}

export async function run({ inquiry, customerId } = {}) {
  if (!inquiry || !customerId) {
    console.log("[CustomerServiceAgent] Requires { inquiry, customerId } to run interactively.")
    console.log("[CustomerServiceAgent] Running in report mode — listing customers with open items…")
    return await reportMode()
  }

  console.log(`[CustomerServiceAgent] Drafting reply for customer ${customerId}…`)

  // Load customer context
  const [customers, boats, quotations, invoices] = await Promise.all([
    getCustomers().catch(() => []),
    getBoats().catch(() => []),
    getQuotations(`customer_id=${customerId}`).catch(() => []),
    getInvoices(`customer_id=${customerId}`).catch(() => []),
  ])

  const customer  = (Array.isArray(customers) ? customers : []).find((c) => c.id === customerId)
  const custBoats = (Array.isArray(boats)     ? boats     : []).filter((b) => b.owner_id === customerId)
  const custQuots = Array.isArray(quotations) ? quotations : []
  const custInvs  = Array.isArray(invoices)   ? invoices   : []

  if (!customer) {
    console.error(`[CustomerServiceAgent] Customer ${customerId} not found.`)
    return null
  }

  const customerName = customer.company_name
    ?? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    ?? customerId

  const context = `Customer: ${customerName}
Boats: ${custBoats.map((b) => `${b.name} (${b.boat_type}, LOA ${b.loa_ft ?? "?"}ft)`).join(", ") || "none on record"}
Open quotations: ${custQuots.filter((q) => !["PAID","CANCELLED","CONVERTED"].includes(q.status)).length}
Unpaid invoices: ${custInvs.filter((i) => !["paid","PAID"].includes(i.status)).length}

Customer inquiry:
"${inquiry}"`

  const reply = await ask(SYSTEM_PROMPT, context)

  console.log(`\n─── Draft Reply for ${customerName} ─────────────────────`)
  console.log(reply)
  console.log("─────────────────────────────────────────────────────────\n")

  return { customerName, reply }
}

async function reportMode() {
  const [customers, invoices, quotations] = await Promise.all([
    getCustomers().catch(() => []),
    getInvoices().catch(() => []),
    getQuotations().catch(() => []),
  ])

  const custList   = Array.isArray(customers)  ? customers  : []
  const invList    = Array.isArray(invoices)   ? invoices   : []
  const quotList   = Array.isArray(quotations) ? quotations : []

  const overdueInvoices = invList.filter(isOverdueInvoice)
  const pendingQuots    = quotList.filter((q) => ["SENT","sent"].includes(q.status))

  console.log(`[CustomerServiceAgent] ${overdueInvoices.length} customers with overdue invoices`)
  console.log(`[CustomerServiceAgent] ${pendingQuots.length} quotations awaiting customer approval`)

  const summary = await ask(
    "You are a customer service manager. Give a brief daily summary of open customer items.",
    `Marina MMS Customer Service Summary — ${new Date().toDateString()}
Overdue invoices: ${overdueInvoices.length}
Quotations pending customer approval: ${pendingQuots.length}
Total active customers: ${custList.length}

List the top 3 priority actions for the customer service team today. Be concise.`
  ).catch(() => "Could not generate summary.")

  console.log("\n─── Customer Service Daily Summary ──────────────────────")
  console.log(summary)
  console.log("─────────────────────────────────────────────────────────\n")

  return { overdueInvoices: overdueInvoices.length, pendingQuotations: pendingQuots.length, summary }
}
