const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_SECRET",
]

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const authSecret = process.env.AUTH_SECRET || ""

const missing = required.filter((name) => !process.env[name])
const errors = []

if (missing.length) errors.push(`missing: ${missing.join(", ")}`)
if (url !== "https://zanlunbgupdtqznruzok.supabase.co") {
  errors.push("NEXT_PUBLIC_SUPABASE_URL must point to the approved staging project")
}
if (anonKey.length < 100) errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is too short")
if (serviceRoleKey.length < 100) errors.push("SUPABASE_SERVICE_ROLE_KEY is too short")
if (authSecret.length < 32) errors.push("AUTH_SECRET must be at least 32 characters")

const requiredSafeFlags = {
  ENABLE_REAL_CUSTOMER_MESSAGES: "false",
  ENABLE_PRODUCTION_BOOKINGS: "false",
  ENABLE_AUTOMATION_WRITES: "false",
  ENABLE_AI_AGENT_WRITES: "false",
  AI_AGENT_DRY_RUN: "true",
}

for (const [name, expected] of Object.entries(requiredSafeFlags)) {
  if ((process.env[name] || "") !== expected) {
    errors.push(`${name} must be ${expected}`)
  }
}

if (errors.length) {
  console.error("Preview environment check: FAIL")
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log("Preview environment check: PASS")
  console.log("- Approved staging Supabase project configured")
  console.log("- Auth secrets present")
  console.log("- Production/customer/automation writes remain disabled")
}
