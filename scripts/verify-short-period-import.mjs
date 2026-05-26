import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    if (!process.env[key]) process.env[key] = match[2].trim().replace(/^["']|["']$/g, "")
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
)

const tables = ["mms_customers", "mms_boats", "mms_invoices", "mms_quotations", "mms_berth_assignments", "mms_payments"]
for (const table of tables) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
  if (error) throw error
  console.log(`${table}: ${count}`)
}

const { data: customers } = await supabase
  .from("mms_customers")
  .select("id, company_name, phone, tax_id, status")
  .order("company_name")
console.table(customers)

const { data: assignments } = await supabase
  .from("mms_berth_assignments")
  .select("berth_id, boat_name, customer_name, start_date, end_date, status, notes")
  .order("start_date")
console.table(assignments)

const { data: berths } = await supabase
  .from("mms_berths")
  .select("code, status, current_boat_id")
  .in("code", ["W4", "C1", "C2", "C3"])
  .order("code")
console.table(berths)

const { data: happyInvoice } = await supabase
  .from("mms_invoices")
  .select("id, invoice_number, customer_name, boat_name, total_amount")
  .eq("invoice_number", "INV6801/044-R2")
  .maybeSingle()
const { data: happyQuote } = await supabase
  .from("mms_quotations")
  .select("id, quote_number, customer_name, boat_name, total_amount")
  .eq("quote_number", "QUO6801/044")
  .maybeSingle()
console.log("happyInvoice", happyInvoice)
console.log("happyQuote", happyQuote)
