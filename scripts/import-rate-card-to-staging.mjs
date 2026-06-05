import fs from "node:fs"
import crypto from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const STAGING_PROJECT_ID = "zanlunbgupdtqznruzok"
const PRODUCTION_PROJECT_ID = "csltloqbjupxqwbkunsd"

function loadEnvFile(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing ${path}`)
  }

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const [key, ...rest] = trimmed.split("=")
    if (!key || rest.length === 0) continue
    process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "")
  }
}

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

const rows = JSON.parse(fs.readFileSync("scripts/import-rate-card.json", "utf8"))
if (!Array.isArray(rows) || rows.length < 90) {
  throw new Error(`Unexpected rate-card row count: ${rows.length}`)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: {
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(60000) }),
  },
})

const { error: deleteError } = await supabase
  .from("pricing_master")
  .delete()
  .neq("code", "__never_match__")

if (deleteError) throw deleteError

const now = new Date().toISOString()
const payload = rows.map((row) => ({
  id: crypto.randomUUID(),
  code: row.code,
  service_name_en: row.service_en,
  service_name_th: row.service_th,
  category: row.category,
  unit: row.unit,
  rate_thb: Number(row.rate),
  description: row.description,
  notes: row.notes,
  is_active: true,
  created_at: now,
  updated_at: now,
}))

for (let index = 0; index < payload.length; index += 25) {
  const chunk = payload.slice(index, index + 25)
  const { error } = await supabase.from("pricing_master").insert(chunk)
  if (error) throw error
}

const { count, error: countError } = await supabase
  .from("pricing_master")
  .select("*", { count: "exact", head: true })
  .eq("is_active", true)

if (countError) throw countError

console.log(`Imported ${payload.length} active rate-card rows to staging. Verified active rows: ${count}.`)
