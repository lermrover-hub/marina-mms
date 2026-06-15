import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"

const baseUrl = process.argv[2] ?? "https://marina-mms.vercel.app"

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    if (!process.env[key]) process.env[key] = match[2].trim().replace(/^["']|["']$/g, "")
  }
}

const smokeEmail = process.env.SMOKE_AUTH_EMAIL
const smokePassword = process.env.SMOKE_AUTH_PASSWORD
if (!smokeEmail || !smokePassword) {
  throw new Error("Set SMOKE_AUTH_EMAIL and SMOKE_AUTH_PASSWORD before running this script.")
}

function mergeCookies(existing, response) {
  const setCookie = response.headers.getSetCookie?.() ?? []
  const jar = new Map(existing.split(";").filter(Boolean).map((part) => {
    const [key, ...rest] = part.trim().split("=")
    return [key, rest.join("=")]
  }))
  for (const cookie of setCookie) {
    const [pair] = cookie.split(";")
    const [key, ...rest] = pair.split("=")
    jar.set(key, rest.join("="))
  }
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ")
}

let cookies = ""
const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`)
cookies = mergeCookies(cookies, csrfResponse)
const { csrfToken } = await csrfResponse.json()

const form = new URLSearchParams({
  csrfToken,
  email: smokeEmail,
  password: smokePassword,
  redirect: "false",
  callbackUrl: `${baseUrl}/dashboard`,
  json: "true",
})

const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    cookie: cookies,
  },
  body: form,
  redirect: "manual",
})
cookies = mergeCookies(cookies, loginResponse)

const checks = []
for (const path of [
  "/api/auth/session",
  "/api/db/notifications",
  "/api/db/customers",
  "/api/db/berth-assignments",
  "/service-requests",
  "/service-requests/new",
]) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { cookie: cookies }, redirect: "manual" })
  checks.push({ path, status: response.status, location: response.headers.get("location") })
}

let created = null
let createStatus = null
let reference = null
if (process.env.ENABLE_PRODUCTION_SMOKE_WRITES === "true") {
  const customersResponse = await fetch(`${baseUrl}/api/db/customers`, { headers: { cookie: cookies } })
  const boatsResponse = await fetch(`${baseUrl}/api/db/boats`, { headers: { cookie: cookies } })
  const customers = await customersResponse.json()
  const boats = await boatsResponse.json()
  const customer = customers.find((item) => item.company_name === "Happy Samui company") ?? customers[0]
  const boat = boats.find((item) => item.owner_id === customer?.id) ?? boats[0]
  reference = `SR-SMOKE-${Date.now()}`
  const createResponse = await fetch(`${baseUrl}/api/db/service-requests`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookies },
    body: JSON.stringify({
      reference,
      customer_id: customer?.id ?? null,
      customer_name: customer?.company_name ?? null,
      boat_id: boat?.id ?? null,
      boat_name: boat?.name ?? null,
      category: "Engine",
      title: "Smoke test service request",
      description: "Smoke test verifies service request creation path.",
      priority: "MEDIUM",
      status: "NEW_REQUEST",
      location: "On Hard - Repair Yard",
      requires_inspection: true,
      estimated_budget: 1000,
      notes: "Created by smoke-production-auth.mjs and deleted after verification.",
    }),
  })
  createStatus = createResponse.status
  created = await createResponse.json().catch(() => null)
}

let cleanup = null
if (created?.id && process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  )
  const { error } = await supabase.from("mms_service_requests").delete().eq("id", created.id)
  cleanup = error ? { ok: false, error: error.message } : { ok: true, deletedId: created.id }
}

console.log(JSON.stringify({
  loginStatus: loginResponse.status,
  checks,
  createServiceRequest: { enabled: process.env.ENABLE_PRODUCTION_SMOKE_WRITES === "true", status: createStatus, id: created?.id ?? null, reference, error: created?.error ?? null },
  cleanup,
}, null, 2))
