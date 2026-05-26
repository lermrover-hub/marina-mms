import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

const SOURCE_MARKER = "Short period PDF import 2026-05-26"

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

const sampleCustomerIds = ["cust-001", "cust-002", "cust-003", "cust-004", "cust-005"]

const customers = [
  { key: "rs", name: "RS Reung-sri", type: "PRIVATE_OWNER" },
  { key: "maruza", name: "Maruza", type: "PRIVATE_OWNER" },
  {
    key: "happy",
    name: "Happy Samui company",
    type: "CHARTER_OPERATOR",
    phone: "082-8789149",
    taxId: "84555700591",
    address: "30/146 Moo 4, Bo Phut, Ko Samui, Surat Thani, Thailand",
  },
  {
    key: "speedboat4u",
    name: "บริษัทสปีดโบ๊ท ฟอร์ยู จำกัด",
    type: "SPEEDBOAT_OPERATOR",
    taxId: "0845556004342",
    address: "73/6 ม.6 ต.บ่อผุด อ.เกาะสมุย จ.สุราษฎร์ธานี 84320",
  },
  { key: "jackie", name: "Captain Jackie", type: "PRIVATE_OWNER" },
  {
    key: "complete_marine",
    name: "Complete Marine Services Co., Ltd.",
    type: "CONTRACTOR",
    phone: "0615919777",
    taxId: "0845556006817",
    address: "36/19 Moo 5 T.Bophut Koh Samui Suratthani 84320",
  },
  { key: "petch", name: "เพชรอ่าวไทย", type: "SPEEDBOAT_OPERATOR" },
  { key: "samui_siam", name: "Samui Siam", type: "PRIVATE_OWNER" },
  { key: "saard", name: "Saard Watersport", type: "SPEEDBOAT_OPERATOR" },
  {
    key: "ocean_elite",
    name: "Oceans Elite Co., Ltd.",
    type: "CHARTER_OPERATOR",
    phone: "0892886404",
    taxId: "0845551006665",
    address: "41/21 M.1 Maenam, Koh Samui, Suratthani 84330",
  },
  { key: "ap_marine", name: "พี่ปู AP Marine", type: "SPEEDBOAT_OPERATOR" },
  { key: "papa_ross", name: "Papa Ross", type: "PRIVATE_OWNER", address: "Lipanoi" },
]

const boats = [
  { key: "rs4", customerKey: "rs", name: "RS 4 Engine", type: "SPEEDBOAT", loa: 32 },
  { key: "maruza", customerKey: "maruza", name: "Maruza", type: "SPEEDBOAT", loa: 28 },
  { key: "happy50", customerKey: "happy", name: "Happy Samui 50 ft", type: "SPEEDBOAT", loa: 50 },
  { key: "princess42", customerKey: "speedboat4u", name: "Princess42", type: "MOTOR_YACHT", loa: 42.6 },
  { key: "bw350", customerKey: "jackie", name: "Boston Whaler 350", type: "SPEEDBOAT", loa: 35 },
  { key: "saxdor400", customerKey: "complete_marine", name: "Saxdor 400", type: "MOTOR_YACHT", loa: 39.7 },
  { key: "petch3", customerKey: "petch", name: "เพชรอ่าวไทย 3 engine", type: "SPEEDBOAT", loa: 36 },
  { key: "samui_siam42", customerKey: "samui_siam", name: "Samui Siam 42 ft", type: "SPEEDBOAT", loa: 42 },
  { key: "nimbus11", customerKey: "jackie", name: "NIMBUS 11 : Thai spicy", type: "MOTOR_YACHT", loa: 36 },
  { key: "saard2", customerKey: "saard", name: "Saard Watersport 2 engine", type: "SPEEDBOAT", loa: 28 },
  { key: "ocean_elite_trailer", customerKey: "ocean_elite", name: "Oceans Elite trailer", type: "OTHER", loa: null },
  { key: "ap_marine", customerKey: "ap_marine", name: "AP Marine service boats", type: "SPEEDBOAT", loa: 28 },
  { key: "papa_ross", customerKey: "papa_ross", name: "Papa Ross wooden sailboat", type: "SAILING_YACHT", loa: 32 },
]

const invoices = [
  { no: "INV6801/040", file: "INV040 RS4 engine.pdf", customerKey: "rs", boatKey: "rs4", date: "2026-03-10", due: "2026-03-16", subtotal: 16110, vat: 1127.7, total: 17237.7, items: [["Ramp fee for 4 outboard engine in/out", 1, 3000], ["Tow truck day time", 1, 2500], ["Late night extra charge", 1, 4000], ["7 days hardstand service", 1, 8400], ["Labor overtime", 1, 1050]], serviceStart: "2026-03-10", serviceEnd: "2026-03-16" },
  { no: "INV6801/041", file: "INV041 Maruza.pdf", customerKey: "maruza", boatKey: "maruza", date: "2026-04-10", due: "2026-04-10", subtotal: 2400, vat: 168, total: 2568, items: [["Ramp fee for 2 outboard engine", 1, 2400]] },
  { no: "INV6801/044-R2", file: "INV044 happy samui revised 2 on 05052569.pdf", customerKey: "happy", boatKey: "happy50", date: "2026-05-05", due: "2026-05-05", subtotal: 14822, vat: 870, total: 15692, items: [["9 days haul-out service package", 1, 22500], ["Tow truck", 1, 6500], ["Deposit / prior payment", 1, -14178], ["Withholding tax 3%", 1, -870]], serviceStart: "2026-04-25", serviceEnd: "2026-05-03", preferredBerthCode: "W4" },
  { no: "INV6801/047", file: "INV047 Princess42 3rd.pdf", customerKey: "speedboat4u", boatKey: "princess42", date: "2026-05-19", due: "2026-05-21", subtotal: 35894, vat: 2542.4, total: 38436.4, items: [["Launch & retrieving service 42.6 ft", 1, 14910], ["Towing service haul out", 1, 3500], ["Towing service launch", 1, 3000], ["Weekly hardstand rate", 1, 9372], ["Daily hardstand rate 3 days", 1, 5112]], serviceStart: "2026-05-11", serviceEnd: "2026-05-20" },
  { no: "INV6801/024-1", file: "INV0241 Jackie 03112025 .pdf", customerKey: "jackie", boatKey: "bw350", date: "2025-11-03", due: "2025-11-20", subtotal: 1200, vat: 0, total: 1200, items: [["2 outboard engine ramp fee", 1, 1200]] },
  { no: "INV6801/029", file: "INV029 Nimbus11.pdf", customerKey: "jackie", boatKey: "nimbus11", date: "2025-12-27", due: "2025-12-29", subtotal: 14500, vat: 1015, total: 15515, items: [["Launch & retrieving service", 1, 2000], ["Trailer rent 5 days", 1, 12500]], serviceStart: "2025-12-22", serviceEnd: "2025-12-27" },
  { no: "INV6801/030", file: "INV030 Saard watersport.pdf", customerKey: "saard", boatKey: "saard2", date: "2026-01-11", due: "2026-01-12", subtotal: 4700, vat: 329, total: 5029, items: [["Ramp fee for 2 outboard engine", 1, 2400], ["Hardstand service 5 days", 1, 3500], ["Discount", 1, -1200]] },
  { no: "INV6801/031", file: "Inv031 Ocean elites.pdf", customerKey: "ocean_elite", boatKey: "ocean_elite_trailer", date: "2026-01-14", due: "2026-01-14", subtotal: 3000, vat: 210, total: 3210, items: [["1 month trailer storage", 1, 3000]], longTermNoDates: true },
  { no: "INV6801/032", file: "Inv032 Maruza.pdf", customerKey: "maruza", boatKey: "maruza", date: "2026-01-10", due: "2026-01-14", subtotal: 5564, vat: 389.48, total: 5953.48, items: [["Ramp fee for 2 outboard engine", 1, 2400], ["Hull cleanup 28 ft", 1, 3360], ["Dry storage service 4 days", 1, 2800], ["Discount 35%", 1, -2996]], serviceStart: "2026-01-10", serviceEnd: "2026-01-14" },
  { no: "INV6801/034", file: "Inv034 Ap marine.pdf", customerKey: "ap_marine", boatKey: "ap_marine", date: "2026-01-31", due: "2026-01-31", subtotal: 6150, vat: 430.5, total: 6580.5, items: [["Boat 1 ramp fee for 2 engine", 1, 1200], ["Boat 1 hardstand service 2 days", 1, 1400], ["Boat 2 ramp fee for 2 engine", 1, 1200], ["Boat 2 hardstand service 3 days", 1, 2100], ["Water 2.5 cubic", 1, 250]] },
  { no: "INV6801/036", file: "INV036 Nimbus.pdf", customerKey: "jackie", boatKey: "nimbus11", date: "2026-02-21", due: "2026-03-04", subtotal: 19820, vat: 1387.4, total: 21207.4, items: [["Launch & retrieving service", 1, 2000], ["Trailer rent 7 days", 1, 17500], ["Water usage 1,600 liters", 1, 320]], serviceStart: "2026-02-23", serviceEnd: "2026-03-01" },
  { no: "INV6801/037", file: "INV037 Papa Ross.pdf", customerKey: "papa_ross", boatKey: "papa_ross", date: "2026-02-13", due: "2026-02-19", subtotal: 10600, vat: 742, total: 11342, items: [["Ramp service and towing", 1, 2200], ["Boat hardstand service 14 days", 1, 8400]], serviceStart: "2026-02-01", serviceEnd: "2026-02-19" },
]

const quotations = [
  { no: "QUO6801/044", file: "Quo044 happy samui.pdf", customerKey: "happy", boatKey: "happy50", date: "2026-04-23", due: "2026-04-24", subtotal: 26500, vat: 1855, total: 28355, items: [["8 days haul-out service package", 1, 20000], ["Tow truck", 1, 6500]], serviceStart: "2026-04-25", serviceEnd: "2026-05-02", preferredBerthCode: "W4" },
  { no: "QUO6801/045", file: "Quo045 Saxdor400.pdf", customerKey: "complete_marine", boatKey: "saxdor400", date: "2026-05-20", due: "2026-05-22", subtotal: 37267.5, vat: 0, total: 37267.5, items: [["Haul out & launch 39.7 ft", 1, 15880], ["Tow truck outsource", 1, 6500], ["Weekly hardstand rate", 1, 9528], ["Daily hardstand rate 3 days", 1, 5359.5], ["Boat stand option", 1, 4900]], serviceStart: "2026-05-22", serviceEnd: "2026-05-31" },
  { no: "QUO6801/049", file: "Quo049 เพชรอ่าวไทย.pdf", customerKey: "petch", boatKey: "petch3", date: "2026-05-21", due: "2026-05-26", subtotal: 16000, vat: 0, total: 16000, items: [["Ramp fee up/down", 1, 2000], ["Tow truck up", 1, 3500], ["Tow truck down", 1, 3000], ["Trailer hardstand 3 days", 1, 7500]], serviceStart: "2026-05-24", serviceEnd: "2026-05-29", notes: "Printed PDF total appears as zero; imported service value 16,000 for review." },
  { no: "QUO6801/014", file: "Samui siam quotation 27042025.pdf", customerKey: "samui_siam", boatKey: "samui_siam42", date: "2025-04-28", due: "2025-05-01", subtotal: 22540, vat: 1577.8, total: 24117.8, items: [["Ramp fee in & out", 1, 2400], ["Storage 2 weeks + 3 days", 1, 11100], ["Anti fouling 42 ft", 1, 5040], ["Lifting equipment with labor", 1, 4000]], serviceStart: "2025-04-24", serviceEnd: "2025-05-11" },
]

function sourceNote(file, extra = "") {
  return `${SOURCE_MARKER}; source=${file}${extra ? `; ${extra}` : ""}`
}

async function failOn(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`)
}

async function deleteImportedAndSamples() {
  console.log("Cleaning imported records and sample customers...")
  const { data: sampleInvoices } = await supabase.from("mms_invoices").select("id").in("customer_id", sampleCustomerIds)
  const sampleInvoiceIds = sampleInvoices?.map((row) => row.id) ?? []

  const { data: importedInvoices } = await supabase.from("mms_invoices").select("id").ilike("notes", `%${SOURCE_MARKER}%`)
  const importedInvoiceIds = importedInvoices?.map((row) => row.id) ?? []
  const invoiceIds = [...new Set([...sampleInvoiceIds, ...importedInvoiceIds])]
  if (invoiceIds.length) {
    await failOn((await supabase.from("mms_payments").delete().in("invoice_id", invoiceIds)).error, "delete payments")
    await failOn((await supabase.from("mms_invoice_items").delete().in("invoice_id", invoiceIds)).error, "delete invoice items")
    await failOn((await supabase.from("mms_invoices").delete().in("id", invoiceIds)).error, "delete invoices")
  }

  const { data: sampleQuotes } = await supabase.from("mms_quotations").select("id").in("customer_id", sampleCustomerIds)
  const { data: importedQuotes } = await supabase.from("mms_quotations").select("id").ilike("notes", `%${SOURCE_MARKER}%`)
  const quoteIds = [...new Set([...(sampleQuotes?.map((row) => row.id) ?? []), ...(importedQuotes?.map((row) => row.id) ?? [])])]
  if (quoteIds.length) {
    await failOn((await supabase.from("mms_work_orders").delete().in("quotation_id", quoteIds)).error, "delete quote work orders")
    await failOn((await supabase.from("mms_quotation_items").delete().in("quotation_id", quoteIds)).error, "delete quotation items")
    await failOn((await supabase.from("mms_quotations").delete().in("id", quoteIds)).error, "delete quotations")
  }

  await failOn((await supabase.from("mms_work_orders").delete().in("customer_id", sampleCustomerIds)).error, "delete sample work orders")
  await failOn((await supabase.from("mms_work_orders").delete().ilike("notes", `%${SOURCE_MARKER}%`)).error, "delete imported work orders")
  await failOn((await supabase.from("mms_service_requests").delete().in("customer_id", sampleCustomerIds)).error, "delete sample service requests")
  await failOn((await supabase.from("mms_service_requests").delete().ilike("notes", `%${SOURCE_MARKER}%`)).error, "delete imported service requests")
  const { data: allAssignments, error: allAssignmentsError } = await supabase
    .from("mms_berth_assignments")
    .select("id, notes")
  await failOn(allAssignmentsError, "load assignments for cleanup")
  const assignmentIdsToDelete = (allAssignments ?? [])
    .filter((row) => !(row.notes ?? "").includes("Test assignment from INV044 Happy Samui"))
    .map((row) => row.id)
  if (assignmentIdsToDelete.length) {
    await failOn((await supabase.from("mms_berth_assignments").delete().in("id", assignmentIdsToDelete)).error, "delete legacy/imported assignments except happy")
  }
  const { data: boatsToDeleteByOwner } = await supabase.from("mms_boats").select("id, name").in("owner_id", sampleCustomerIds)
  const { data: boatsToDeleteByMarker } = await supabase.from("mms_boats").select("id, name").ilike("notes", `%${SOURCE_MARKER}%`)
  const boatIdsToDelete = [...new Map([...(boatsToDeleteByOwner ?? []), ...(boatsToDeleteByMarker ?? [])]
    .filter((row) => row.name !== "Happy Samui 50 ft")
    .map((row) => [row.id, row])).keys()]
  if (boatIdsToDelete.length) {
    await failOn((await supabase.from("mms_berths").update({ status: "AVAILABLE", current_boat_id: null }).in("current_boat_id", boatIdsToDelete)).error, "clear berth current boats")
  }
  await failOn((await supabase.from("mms_boats").delete().in("owner_id", sampleCustomerIds)).error, "delete sample boats")
  if (boatIdsToDelete.length) {
    await failOn((await supabase.from("mms_boats").delete().in("id", boatIdsToDelete)).error, "delete imported boats")
  }
  await failOn((await supabase.from("mms_customers").delete().in("id", sampleCustomerIds)).error, "delete sample customers")
  await failOn((await supabase.from("mms_customers").delete().ilike("notes", `%${SOURCE_MARKER}%`).neq("company_name", "Happy Samui company")).error, "delete imported customers except happy")
}

async function upsertCustomer(record) {
  const { data: existing, error: findError } = await supabase
    .from("mms_customers")
    .select("*")
    .eq("company_name", record.name)
    .maybeSingle()
  await failOn(findError, `find customer ${record.name}`)

  const payload = {
    customer_type: record.type,
    company_name: record.name,
    first_name: null,
    last_name: null,
    phone: record.phone ?? null,
    email: null,
    address: record.address ?? null,
    tax_id: record.taxId ?? null,
    preferred_language: "en",
    payment_terms: 0,
    status: "ACTIVE",
    notes: sourceNote("uploaded short-period PDFs", "customer master"),
  }

  if (existing) {
    const { data, error } = await supabase.from("mms_customers").update({
      ...payload,
      notes: [existing.notes, payload.notes].filter(Boolean).join("\n"),
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id).select().single()
    await failOn(error, `update customer ${record.name}`)
    return data
  }

  const { data, error } = await supabase.from("mms_customers").insert(payload).select().single()
  await failOn(error, `insert customer ${record.name}`)
  return data
}

async function insertBoat(record, customer) {
  const { data: existing, error: findError } = await supabase
    .from("mms_boats")
    .select("*")
    .eq("owner_id", customer.id)
    .eq("name", record.name)
    .maybeSingle()
  await failOn(findError, `find boat ${record.name}`)

  const payload = {
    owner_id: customer.id,
    owner_name: customer.company_name,
    name: record.name,
    boat_type: record.type,
    usage_type: "SHORT_PERIOD_HARDSTAND",
    loa_ft: record.loa,
    status: "ACTIVE",
    current_location_code: existing?.current_location_code ?? null,
    notes: sourceNote("uploaded short-period PDFs", `source customer=${customer.company_name}`),
  }

  if (existing) {
    const { data, error } = await supabase.from("mms_boats").update({
      ...payload,
      notes: [existing.notes, payload.notes].filter(Boolean).join("\n"),
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id).select().single()
    await failOn(error, `update boat ${record.name}`)
    return data
  }

  const { data, error } = await supabase.from("mms_boats").insert({
    ...payload,
  }).select().single()
  await failOn(error, `insert boat ${record.name}`)
  return data
}

function compatibleBerths(berths, loa) {
  const allowed = berths.filter((b) => ["C", "W", "B"].some((prefix) => b.code?.startsWith(prefix)))
  return allowed
    .filter((b) => !loa || !b.max_loa_ft || Number(b.max_loa_ft) >= Number(loa))
    .sort((a, b) => {
      const priority = (code) => code === "W4" ? 0 : code.startsWith("C") ? 1 : code.startsWith("W") ? 2 : 3
      return priority(a.code) - priority(b.code) || a.code.localeCompare(b.code)
    })
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd
}

function allocateBerth(doc, boat, customer, berths, allocations) {
  if (!doc.serviceStart || !doc.serviceEnd || doc.longTermNoDates) return null
  const start = doc.serviceStart
  const end = doc.serviceEnd
  const sameBoatOverlap = allocations.find((a) => a.boat_id === boat.id && overlaps(start, end, a.start_date, a.end_date))
  if (sameBoatOverlap) return null
  const candidates = doc.preferredBerthCode
    ? berths.filter((b) => b.code === doc.preferredBerthCode)
    : compatibleBerths(berths, boat.loa_ft)

  for (const berth of candidates) {
    const blocked = allocations.some((a) => a.berth_id === berth.id && overlaps(start, end, a.start_date, a.end_date))
    if (!blocked) {
      const allocation = {
        berth_id: berth.id,
        berth_code: berth.code,
        boat_id: boat.id,
        boat_name: boat.name,
        customer_id: customer.id,
        customer_name: customer.company_name,
        start_date: start,
        end_date: end,
        status: "ACTIVE",
        notes: sourceNote(doc.file, `auto slot allocation for ${doc.no}`),
      }
      allocations.push(allocation)
      return allocation
    }
  }
  throw new Error(`No berth slot available for ${doc.no} ${boat.name} ${start} to ${end}`)
}

async function insertInvoice(doc, customer, boat) {
  const { data: invoice, error } = await supabase.from("mms_invoices").insert({
    invoice_number: doc.no,
    invoice_type: null,
    customer_id: customer.id,
    customer_name: customer.company_name,
    boat_id: boat.id,
    boat_name: boat.name,
    invoice_date: doc.date,
    due_date: doc.due,
    status: "PAID",
    subtotal: doc.subtotal,
    discount: 0,
    vat_amount: doc.vat,
    total_amount: doc.total,
    paid_amount: doc.total,
    notes: sourceNote(doc.file, "invoice imported as paid revenue from uploaded invoice PDF; verify bank settlement if needed"),
  }).select().single()
  await failOn(error, `insert invoice ${doc.no}`)

  const items = doc.items.map(([description, qty, unitPrice], index) => ({
    invoice_id: invoice.id,
    description,
    category: "Hardstand",
    qty,
    unit: "item",
    unit_price: unitPrice,
    discount_pct: 0,
    taxable: true,
    sort_order: index + 1,
  }))
  await failOn((await supabase.from("mms_invoice_items").insert(items)).error, `insert invoice items ${doc.no}`)

  await failOn((await supabase.from("mms_payments").insert({
    invoice_id: invoice.id,
    customer_id: customer.id,
    customer_name: customer.company_name,
    payment_method: "BANK_TRANSFER",
    amount: doc.total,
    payment_date: doc.due ?? doc.date,
    reference_no: `${doc.no} PDF import`,
    status: "CONFIRMED",
    notes: sourceNote(doc.file, "revenue payment record created from invoice PDF import"),
  })).error, `insert payment ${doc.no}`)

  return invoice
}

async function insertQuotation(doc, customer, boat) {
  const { data: quote, error } = await supabase.from("mms_quotations").insert({
    quote_number: doc.no,
    customer_id: customer.id,
    customer_name: customer.company_name,
    boat_id: boat.id,
    boat_name: boat.name,
    title: "Short period hardstand service",
    status: "SENT",
    subtotal: doc.subtotal,
    discount: 0,
    vat_amount: doc.vat,
    total_amount: doc.total,
    deposit_amount: 0,
    valid_until: doc.due,
    notes: sourceNote(doc.file, doc.notes ?? "quotation imported from uploaded PDF"),
  }).select().single()
  await failOn(error, `insert quotation ${doc.no}`)

  const items = doc.items.map(([description, qty, unitPrice], index) => ({
    quotation_id: quote.id,
    description,
    qty,
    unit: "item",
    unit_price: unitPrice,
    discount_pct: 0,
    taxable: true,
    sort_order: index + 1,
  }))
  await failOn((await supabase.from("mms_quotation_items").insert(items)).error, `insert quotation items ${doc.no}`)
  return quote
}

function writeFolio(customer, boat, invoice, quotation) {
  const outDir = path.join("docs", "folios")
  fs.mkdirSync(outDir, { recursive: true })
  const file = path.join(outDir, "happy-samui-folio-2026-05-26.html")
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Happy Samui Customer Folio</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #12323a; }
    header { display: flex; align-items: center; gap: 18px; border-bottom: 3px solid #40e0d0; padding-bottom: 16px; }
    img { width: 92px; height: auto; }
    h1 { margin: 0; color: #0a6f77; }
    h2 { color: #b08a3c; border-bottom: 1px solid #d8eef0; padding-bottom: 6px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0 24px; }
    th, td { border: 1px solid #d6e4e6; padding: 8px; text-align: left; font-size: 14px; }
    th { background: #e8fbfa; }
    .note { background: #fff8e8; border-left: 4px solid #c5a059; padding: 10px 14px; }
  </style>
</head>
<body>
  <header>
    <img src="../../public/orm-logo.bmp" alt="Ocean Rover Marina logo" />
    <div>
      <h1>Ocean Rover Marina - Customer Folio</h1>
      <div>Sample generated folio for document workflow testing</div>
    </div>
  </header>
  <h2>Customer</h2>
  <table>
    <tr><th>Name</th><td>${customer.company_name}</td></tr>
    <tr><th>Phone</th><td>${customer.phone ?? ""}</td></tr>
    <tr><th>Tax ID</th><td>${customer.tax_id ?? ""}</td></tr>
    <tr><th>Address</th><td>${customer.address ?? ""}</td></tr>
  </table>
  <h2>Boat & Berth</h2>
  <table>
    <tr><th>Boat</th><td>${boat.name}</td></tr>
    <tr><th>LOA</th><td>${boat.loa_ft ?? ""} ft</td></tr>
    <tr><th>Assigned Slot</th><td>W4</td></tr>
  </table>
  <h2>Documents</h2>
  <table>
    <tr><th>Quotation</th><td>${quotation.quote_number}</td><td>THB ${Number(quotation.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>
    <tr><th>Invoice</th><td>${invoice.invoice_number}</td><td>THB ${Number(invoice.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>
    <tr><th>Required Forms</th><td>Hardstand service form, berth assignment record, invoice, receipt/payment record</td><td>Generated/imported for workflow test</td></tr>
  </table>
  <div class="note">Missing original sample files for company receipt, berth assignment form, and customer folio template. This folio was designed with the company logo at top-left as requested.</div>
</body>
</html>`
  fs.writeFileSync(file, html, "utf8")
  return file
}

await deleteImportedAndSamples()

const customerByKey = new Map()
for (const record of customers) {
  customerByKey.set(record.key, await upsertCustomer(record))
}

const boatByKey = new Map()
for (const record of boats) {
  boatByKey.set(record.key, await insertBoat(record, customerByKey.get(record.customerKey)))
}

const { data: berths, error: berthError } = await supabase.from("mms_berths").select("*").order("code")
await failOn(berthError, "load berths")

await failOn((await supabase
  .from("mms_berth_assignments")
  .update({
    boat_id: boatByKey.get("happy50").id,
    boat_name: boatByKey.get("happy50").name,
    customer_id: customerByKey.get("happy").id,
    customer_name: customerByKey.get("happy").company_name,
    updated_at: new Date().toISOString(),
  })
  .ilike("notes", "%Test assignment from INV044 Happy Samui%")).error, "repair preserved happy assignment")

const { data: preservedAssignments, error: preservedAssignmentsError } = await supabase
  .from("mms_berth_assignments")
  .select("*")
  .ilike("notes", "%Test assignment from INV044 Happy Samui%")
await failOn(preservedAssignmentsError, "load preserved happy assignments")

const allocations = (preservedAssignments ?? []).map((assignment) => ({
  berth_id: assignment.berth_id,
  berth_code: null,
  boat_id: assignment.boat_id,
  boat_name: assignment.boat_name,
  customer_id: assignment.customer_id,
  customer_name: assignment.customer_name,
  start_date: assignment.start_date,
  end_date: assignment.end_date,
  status: assignment.status,
  notes: assignment.notes,
  preserved: true,
}))
const insertedInvoices = new Map()
const insertedQuotes = new Map()

for (const doc of [...invoices].sort((a, b) => (a.serviceStart ?? a.date).localeCompare(b.serviceStart ?? b.date))) {
  const customer = customerByKey.get(doc.customerKey)
  const boat = boatByKey.get(doc.boatKey)
  insertedInvoices.set(doc.no, await insertInvoice(doc, customer, boat))
  allocateBerth(doc, boat, customer, berths, allocations)
}

for (const doc of [...quotations].sort((a, b) => (a.serviceStart ?? a.date).localeCompare(b.serviceStart ?? b.date))) {
  const customer = customerByKey.get(doc.customerKey)
  const boat = boatByKey.get(doc.boatKey)
  insertedQuotes.set(doc.no, await insertQuotation(doc, customer, boat))
  allocateBerth(doc, boat, customer, berths, allocations)
}

const newAllocations = allocations.filter((allocation) => !allocation.preserved)
if (newAllocations.length) {
  await failOn((await supabase.from("mms_berth_assignments").insert(newAllocations.map((allocation) => ({
    berth_id: allocation.berth_id,
    boat_id: allocation.boat_id,
    boat_name: allocation.boat_name,
    customer_id: allocation.customer_id,
    customer_name: allocation.customer_name,
    start_date: allocation.start_date,
    end_date: allocation.end_date,
    status: allocation.status,
    notes: allocation.notes,
  })))).error, "insert berth assignments")
}

const today = new Date().toISOString().slice(0, 10)
const dryBerthIds = berths
  .filter((berth) => ["C", "W", "B"].some((prefix) => berth.code?.startsWith(prefix)))
  .map((berth) => berth.id)
if (dryBerthIds.length) {
  await failOn((await supabase.from("mms_berths").update({ status: "AVAILABLE", current_boat_id: null }).in("id", dryBerthIds)).error, "reset dry berth statuses")
}
for (const allocation of allocations.filter((a) => a.start_date <= today && today <= a.end_date)) {
  await failOn((await supabase.from("mms_berths").update({ status: "OCCUPIED", current_boat_id: allocation.boat_id }).eq("id", allocation.berth_id)).error, `set berth ${allocation.berth_code}`)
  await failOn((await supabase.from("mms_boats").update({ status: "IN_STORAGE", current_location_code: allocation.berth_code }).eq("id", allocation.boat_id)).error, `set boat ${allocation.boat_name}`)
}

const happyCustomer = customerByKey.get("happy")
const happyBoat = boatByKey.get("happy50")
const folioPath = writeFolio(happyCustomer, happyBoat, insertedInvoices.get("INV6801/044-R2"), insertedQuotes.get("QUO6801/044"))

console.log(JSON.stringify({
  deletedSampleCustomers: sampleCustomerIds.length,
  customersImported: customers.length,
  boatsImported: boats.length,
  invoicesImported: invoices.length,
  quotationsImported: quotations.length,
  berthAssignmentsCreated: allocations.length,
  activeTodayAssignments: allocations.filter((a) => a.start_date <= today && today <= a.end_date).map((a) => ({
    berth: a.berth_code,
    boat: a.boat_name,
    customer: a.customer_name,
    from: a.start_date,
    to: a.end_date,
  })),
  folioPath,
}, null, 2))
