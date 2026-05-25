/**
 * Recurring Billing Engine
 * POST /api/billing/recurring
 *
 * Generates invoices for all ACTIVE contracts whose billing period has arrived
 * and for which no invoice exists yet for that period.
 *
 * Query params:
 *   ?period=2026-05        Override the target billing period (YYYY-MM).
 *                          Defaults to current month.
 *   ?contract_id=xxx       Run for a single contract only (manual trigger).
 *   ?dry_run=true          Simulate without inserting — returns what would be generated.
 *
 * Returns: { generated: Invoice[], skipped: { contract_number, reason }[] }
 *
 * This route is safe to call multiple times — the unique index on
 * (contract_id, billing_period) prevents duplicate invoices.
 *
 * Typical usage:
 *   - Cron job: call POST /api/billing/recurring once per day
 *   - Manual: call from the Billing Settings page with optional contract_id
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// ─── auth guard ───────────────────────────────────────────────────────────────

/**
 * Returns true when the request is authorised to call this endpoint.
 *
 * Two valid callers:
 *  1. Vercel Cron — sends `x-vercel-cron: 1` header automatically.
 *  2. Internal admin users — authenticated session with role SUPER_ADMIN or
 *     ADMIN (for manual triggers from the UI).
 */
async function isAuthorised(req: Request): Promise<boolean> {
  // 1. Vercel Cron header
  if (req.headers.get("x-vercel-cron") === "1") return true

  // 2. Admin session (NextAuth v5)
  const session = await auth()
  if (!session?.user) return false
  const role = (session.user as { role?: string }).role ?? ""
  return ["SUPER_ADMIN", "ADMIN"].includes(role)
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Returns YYYY-MM for a given date or today */
function billingPeriodKey(date: Date): string {
  return date.toISOString().slice(0, 7) // 'YYYY-MM'
}

/** True if this billing cycle is due in the given period */
function isDueThisPeriod(contract: ContractRow, periodKey: string): boolean {
  const [year, month] = periodKey.split("-").map(Number)
  const periodStart   = new Date(year, month - 1, 1)
  const contractStart = new Date(contract.start_date)

  // Contract not started yet
  if (contractStart > periodStart) return false

  // Contract has ended before this period
  if (contract.end_date) {
    const contractEnd = new Date(contract.end_date)
    if (contractEnd < periodStart) return false
  }

  switch (contract.billing_cycle) {
    case "MONTHLY":
      return true // Every month
    case "QUARTERLY":
      // Due if months since start is multiple of 3
      {
        const months = (year - contractStart.getFullYear()) * 12
                     + (month - (contractStart.getMonth() + 1))
        return months % 3 === 0
      }
    case "ANNUAL":
      // Due once a year on the contract start month
      return month === contractStart.getMonth() + 1
    case "ONE_TIME":
      // Only for the first period (start month)
      return (year === contractStart.getFullYear() && month === contractStart.getMonth() + 1)
    default:
      return false
  }
}

/** Generate a human-readable invoice number */
async function nextInvoiceNumber(): Promise<string> {
  const prefix = `INV-${new Date().toISOString().slice(0, 7).replace("-", "")}-`
  const { data } = await supabase
    .from("mms_invoices")
    .select("invoice_number")
    .ilike("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1)
  const last = data && data.length > 0
    ? parseInt(data[0].invoice_number.split("-").at(-1) ?? "0") || 0
    : 0
  return `${prefix}${String(last + 1).padStart(4, "0")}`
}

/** Payment due days based on billing cycle */
function dueDaysFromCycle(cycle: string): number {
  return cycle === "ANNUAL" ? 30 : 14
}

// ─── types ───────────────────────────────────────────────────────────────────

type ContractRow = {
  id: string
  contract_number: string
  contract_type: string
  customer_id: string | null
  customer_name: string | null
  boat_id: string | null
  boat_name: string | null
  berth_code: string | null
  start_date: string
  end_date: string | null
  billing_cycle: string
  rate_amount: number | null
  rate_currency: string
}

type SkipEntry = { contract_number: string; reason: string }

// ─── handler ─────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!(await isAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const periodParam  = searchParams.get("period")      // YYYY-MM override
    const contractIdP  = searchParams.get("contract_id") // single contract
    const dryRun       = searchParams.get("dry_run") === "true"

    const targetPeriod = periodParam ?? billingPeriodKey(new Date())
    const [tYear, tMonth] = targetPeriod.split("-").map(Number)
    const periodStart     = new Date(tYear, tMonth - 1, 1)
    const today           = new Date()

    // ── 1. Fetch active contracts ──
    let contractQuery = supabase
      .from("mms_contracts")
      .select("id,contract_number,contract_type,customer_id,customer_name,boat_id,boat_name,berth_code,start_date,end_date,billing_cycle,rate_amount,rate_currency")
      .eq("status", "ACTIVE")
      .not("rate_amount", "is", null)

    if (contractIdP) contractQuery = contractQuery.eq("id", contractIdP)

    const { data: contracts, error: contractsErr } = await contractQuery
    if (contractsErr) throw contractsErr

    if (!contracts || contracts.length === 0) {
      return NextResponse.json({ generated: [], skipped: [], period: targetPeriod, message: "No active contracts found" })
    }

    // ── 2. Fetch existing invoices for this period to detect duplicates ──
    const ids = contracts.map((c: ContractRow) => c.id)
    const { data: existingInvoices } = await supabase
      .from("mms_invoices")
      .select("contract_id, billing_period")
      .in("contract_id", ids)
      .eq("billing_period", targetPeriod)

    const alreadyBilled = new Set<string>(
      (existingInvoices ?? []).map((inv: { contract_id: string }) => inv.contract_id)
    )

    // ── 3. Determine which contracts to invoice ──
    const generated: object[] = []
    const skipped: SkipEntry[]  = []

    for (const contract of contracts as ContractRow[]) {
      // Skip if already billed this period
      if (alreadyBilled.has(contract.id)) {
        skipped.push({ contract_number: contract.contract_number, reason: `Already invoiced for ${targetPeriod}` })
        continue
      }

      // Skip if not due this period per billing cycle
      if (!isDueThisPeriod(contract, targetPeriod)) {
        skipped.push({ contract_number: contract.contract_number, reason: `Not due for billing in ${targetPeriod} (${contract.billing_cycle})` })
        continue
      }

      // Skip if rate is missing or zero
      if (!contract.rate_amount || contract.rate_amount <= 0) {
        skipped.push({ contract_number: contract.contract_number, reason: "Rate amount is zero or missing" })
        continue
      }

      // Build invoice data
      const VAT_RATE    = 0.07
      const subtotal    = contract.rate_amount
      const vatAmount   = parseFloat((subtotal * VAT_RATE).toFixed(2))
      const totalAmount = parseFloat((subtotal + vatAmount).toFixed(2))
      const invoiceDate = today.toISOString().slice(0, 10)
      const dueDate     = new Date(today.getTime() + dueDaysFromCycle(contract.billing_cycle) * 86400000).toISOString().slice(0, 10)

      const typeLabel: Record<string, string> = {
        WET_BERTH: "Wet Berth Fee", DRY_STORAGE: "Dry Storage Fee",
        RAMP_SERVICE: "Ramp Service Fee", SERVICE_AGREEMENT: "Service Agreement Fee",
      }
      const periodLabel = `${new Date(periodStart).toLocaleString("en-GB", { month: "long", year: "numeric" })}`
      const description = `${typeLabel[contract.contract_type] ?? "Berth Fee"} — ${periodLabel}${contract.berth_code ? ` (${contract.berth_code})` : ""}`

      if (dryRun) {
        generated.push({
          dry_run:        true,
          contract_number:contract.contract_number,
          customer_name:  contract.customer_name,
          billing_period: targetPeriod,
          description,
          subtotal,
          vat_amount:     vatAmount,
          total_amount:   totalAmount,
          invoice_date:   invoiceDate,
          due_date:       dueDate,
        })
        continue
      }

      // ── Insert invoice ──
      const invoiceNumber = await nextInvoiceNumber()
      const { data: newInvoice, error: invErr } = await supabase
        .from("mms_invoices")
        .insert({
          invoice_number:      invoiceNumber,
          invoice_type:        "RECURRING",
          contract_id:         contract.id,
          billing_period:      targetPeriod,
          customer_id:         contract.customer_id,
          customer_name:       contract.customer_name,
          boat_id:             contract.boat_id,
          boat_name:           contract.boat_name,
          invoice_date:        invoiceDate,
          due_date:            dueDate,
          status:              "ISSUED",
          subtotal,
          discount:            0,
          vat_amount:          vatAmount,
          total_amount:        totalAmount,
          paid_amount:         0,
          outstanding_balance: totalAmount,
          notes:               `Auto-generated recurring invoice for contract ${contract.contract_number}`,
        })
        .select()
        .single()

      if (invErr) {
        // Unique constraint violation = already exists (race condition) — skip gracefully
        if (String(invErr.message).includes("unique") || String(invErr.code) === "23505") {
          skipped.push({ contract_number: contract.contract_number, reason: "Duplicate prevented by unique constraint" })
          continue
        }
        throw invErr
      }

      // ── Insert invoice item ──
      await supabase.from("mms_invoice_items").insert({
        invoice_id:  newInvoice.id,
        description,
        category:    contract.contract_type,
        qty:         1,
        unit:        "month",
        unit_price:  subtotal,
        discount_pct:0,
        taxable:     true,
        line_total:  subtotal,
        sort_order:  1,
      })

      generated.push(newInvoice)
    }

    // ── 4. Handle auto-expiry: mark contracts whose end_date has passed ──
    if (!dryRun) {
      const todayStr = today.toISOString().slice(0, 10)
      await supabase
        .from("mms_contracts")
        .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
        .eq("status", "ACTIVE")
        .lt("end_date", todayStr)
        .not("auto_renew", "is", true)
    }

    return NextResponse.json({
      period:    targetPeriod,
      dry_run:   dryRun,
      generated: generated.length,
      skipped:   skipped.length,
      invoices:  generated,
      skipped_detail: skipped,
      ...(periodStart > today
        ? { warning: `Period ${targetPeriod} is in the future — invoices dated ${today.toISOString().slice(0, 10)}` }
        : {}),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/** GET: preview what would be generated (same as dry_run=true) */
export async function GET(req: Request) {
  if (!(await isAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const url = new URL(req.url)
  url.searchParams.set("dry_run", "true")
  // Pass auth headers to internal call
  return POST(new Request(url.toString(), { method: "POST", headers: req.headers }))
}
