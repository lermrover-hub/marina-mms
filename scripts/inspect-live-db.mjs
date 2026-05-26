import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    if (process.env[key]) continue
    process.env[key] = match[2].trim().replace(/^["']|["']$/g, "")
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
)

const tables = [
  "mms_customers",
  "mms_boats",
  "mms_berths",
  "mms_berth_assignments",
  "mms_invoices",
  "mms_invoice_items",
  "mms_payments",
  "mms_quotations",
  "mms_quotation_items",
]

for (const table of tables) {
  const { data, error } = await supabase.from(table).select("*").limit(10)
  console.log(`\nTABLE ${table}: ${error ? `ERR ${error.message}` : `${data.length} rows sample`}`)
  if (data?.[0]) console.log(Object.keys(data[0]).join(","))
  if (table === "mms_customers" && data) {
    console.table(data.map((row) => ({
      id: row.id,
      company_name: row.company_name,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      status: row.status,
    })))
  }
  if (table === "mms_berths" && data) {
    console.table(data.map((row) => ({
      id: row.id,
      code: row.code,
      berth_type: row.berth_type,
      max_loa_ft: row.max_loa_ft,
      status: row.status,
      current_boat_id: row.current_boat_id,
    })))
  }
}
