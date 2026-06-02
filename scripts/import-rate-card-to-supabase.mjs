import "dotenv/config"
import crypto from "crypto"
import fs from "fs"
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error("Supabase URL/key is not configured")
}

const rows = JSON.parse(fs.readFileSync("scripts/import-rate-card.json", "utf8"))
const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: {
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(60000) }),
  },
})

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
  updated_at: new Date().toISOString(),
}))

for (let index = 0; index < payload.length; index += 25) {
  const chunk = payload.slice(index, index + 25)
  const { error: upsertError } = await supabase
    .from("pricing_master")
    .upsert(chunk, { onConflict: "code" })

  if (upsertError) {
    throw upsertError
  }
}

const { error: deactivateOldPaintError } = await supabase
  .from("pricing_master")
  .update({ is_active: false, updated_at: new Date().toISOString() })
  .eq("category", "Paint Service")

if (deactivateOldPaintError) {
  throw deactivateOldPaintError
}

const { count, error: countError } = await supabase
  .from("pricing_master")
  .select("*", { count: "exact", head: true })
  .eq("is_active", true)

if (countError) {
  throw countError
}

console.log(`Imported ${rows.length} rate-card rows. Active rows now: ${count}.`)
