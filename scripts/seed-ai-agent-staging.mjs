import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"

const STAGING_PROJECT_ID = "zanlunbgupdtqznruzok"
const PRODUCTION_PROJECT_ID = "csltloqbjupxqwbkunsd"

const IDS = {
  customer: "2fe7332a-4e66-42a5-b882-91293f276515",
  serviceRequest: "b13c8371-20e7-417a-b494-87a290e4d8d1",
  invoice: "60750dac-0d8b-4f37-9d4c-6fdea73d7076",
  contract: "1bcc7739-c325-42b8-b5da-309c8d742a0c",
  message: "2f7e64e9-9f64-4b98-b2d3-08dc368bc0aa",
}

function loadEnvFile(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing ${path}`)
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const [key, ...rest] = trimmed.split("=")
    if (!key || rest.length === 0) continue
    process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "")
  }
}

function isoDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().split("T")[0]
}

function requireStagingEnv() {
  loadEnvFile(".env.staging.local")
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.includes(STAGING_PROJECT_ID)) {
    throw new Error("Blocked: NEXT_PUBLIC_SUPABASE_URL is not the approved staging project.")
  }
  if (url.includes(PRODUCTION_PROJECT_ID)) {
    throw new Error("Blocked: production Supabase URL detected.")
  }
  if (!key || key === "get-from-supabase-dashboard-settings-api") {
    throw new Error("Missing staging SUPABASE_SERVICE_ROLE_KEY.")
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function cleanup(supabase) {
  await supabase.from("mms_notifications").delete().or(`customer_id.eq.${IDS.customer},reference_id.in.(${IDS.invoice},${IDS.contract},${IDS.serviceRequest})`)
  await supabase.from("mms_quotations").delete().eq("customer_id", IDS.customer)
  await supabase.from("mms_messages").delete().eq("id", IDS.message)
  await supabase.from("mms_messages").delete().eq("sender_id", "Utest-ai-line-001")
  await supabase.from("mms_invoices").delete().eq("id", IDS.invoice)
  await supabase.from("mms_contracts").delete().eq("id", IDS.contract)
  await supabase.from("mms_service_requests").delete().eq("id", IDS.serviceRequest)
  await supabase.from("mms_customers").delete().eq("id", IDS.customer)
}

async function insertSeed(supabase) {
  const rows = [
    ["mms_customers", {
      id: IDS.customer,
      customer_type: "PRIVATE_OWNER",
      first_name: "AI",
      last_name: "Test Agent",
      company_name: "AI Test Agent",
      email: "ai-test@marina-mms-test.local",
      phone: "+66000000000",
      preferred_language: "en",
      payment_terms: 30,
      status: "ACTIVE",
      notes: "TEST RECORD - write test plan 2026-06-05, safe to delete",
    }],
    ["mms_service_requests", {
      id: IDS.serviceRequest,
      reference: "TEST-AI-SR-001",
      customer_id: IDS.customer,
      customer_name: "AI Test Agent",
      title: "TEST: Antifouling paint - 45ft sailing yacht",
      description: "TEST: Full bottom antifouling paint, hull wash, zinc anode replacement. Vessel ashore in yard.",
      category: "OTHER",
      priority: "MEDIUM",
      status: "NEW_REQUEST",
      requested_date: isoDate(0),
      notes: "TEST RECORD - safe to delete",
    }],
    ["mms_invoices", {
      id: IDS.invoice,
      invoice_number: "TEST-AI-INV-001",
      customer_id: IDS.customer,
      customer_name: "AI Test Agent",
      invoice_date: isoDate(-30),
      due_date: isoDate(-20),
      status: "ISSUED",
      subtotal: 5000,
      vat_amount: 350,
      total_amount: 5350,
      paid_amount: 0,
      outstanding_balance: 5350,
      invoice_type: "MANUAL",
      notes: "TEST RECORD - safe to delete",
    }],
    ["mms_contracts", {
      id: IDS.contract,
      contract_number: "TEST-AI-CONTRACT-001",
      contract_type: "WET_BERTH",
      customer_id: IDS.customer,
      customer_name: "AI Test Agent",
      status: "ACTIVE",
      billing_cycle: "MONTHLY",
      rate_amount: 8000,
      rate_currency: "THB",
      start_date: isoDate(-180),
      end_date: isoDate(5),
      notes: "TEST RECORD - safe to delete",
    }],
    ["mms_messages", {
      id: IDS.message,
      channel: "LINE",
      direction: "INBOUND",
      sender_id: "Utest-ai-line-001",
      customer_id: IDS.customer,
      message_type: "text",
      content: "TEST: Hi, when will my boat be ready for launch? I need to know before this weekend.",
      replied: false,
    }],
  ]

  for (const [table, row] of rows) {
    const { error } = await supabase.from(table).insert(row)
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

async function verify(supabase) {
  const checks = [
    ["customers", "mms_customers", "id", IDS.customer],
    ["service_requests", "mms_service_requests", "id", IDS.serviceRequest],
    ["invoices", "mms_invoices", "id", IDS.invoice],
    ["contracts", "mms_contracts", "id", IDS.contract],
    ["messages", "mms_messages", "id", IDS.message],
  ]

  for (const [label, table, column, value] of checks) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, value)
    if (error) throw error
    console.log(`${label}: ${count}`)
  }
}

const mode = process.argv[2] ?? "seed"
const supabase = requireStagingEnv()

if (mode === "cleanup") {
  await cleanup(supabase)
  console.log("Cleaned TEST-AI staging records.")
  await verify(supabase)
} else if (mode === "seed") {
  await cleanup(supabase)
  await insertSeed(supabase)
  console.log("Inserted TEST-AI staging records.")
  await verify(supabase)
} else {
  throw new Error("Usage: node scripts/seed-ai-agent-staging.mjs [seed|cleanup]")
}
