import fs from "node:fs"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

const STAGING_PROJECT = "zanlunbgupdtqznruzok"
const args = process.argv.slice(2)
const option = (name, fallback = null) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}
const apply = args.includes("--apply")
const envFile = option("--env-file", ".env.staging.local")
const confirmedProject = option("--confirm-project")
if (!fs.existsSync(envFile)) throw new Error(`Staging environment file is unavailable: ${envFile}`)
dotenv.config({ path: envFile, override: true, quiet: true })
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error("Staging Supabase URL and service-role key are required.")
const projectRef = new URL(url).hostname.split(".")[0]
if (projectRef !== STAGING_PROJECT) throw new Error(`This script is staging-only. Expected ${STAGING_PROJECT}; received ${projectRef}.`)
if (apply && confirmedProject !== STAGING_PROJECT) throw new Error(`--confirm-project must equal ${STAGING_PROJECT}.`)
const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: before, error: readError } = await supabase.from("mms_berths").select("*").in("code", ["W4", "B1"])
if (readError) throw readError
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", projectRef, before }, null, 2))
if (apply) {
  const w4 = before.find((row) => row.code === "W4")
  if (!w4) throw new Error("W4 is missing; refusing to invent a replacement for an existing operational slot.")
  const { error: w4Error } = await supabase.from("mms_berths").update({
    max_loa_ft: 60,
    max_loa_m: 18.29,
    notes: "Workshop 4 / physical slot W4 — SB4 trailer storage only; max 60 ft subject to technical and availability checks; v3.6 staging configuration",
  }).eq("id", w4.id)
  if (w4Error) throw w4Error

  const b1 = before.find((row) => row.code === "B1")
  if (!b1) {
    const { error: b1Error } = await supabase.from("mms_berths").insert({
      id: "b-01",
      code: "B1",
      berth_type: "DRY_STORAGE",
      zone: "B",
      location_section: "Hardstand B1",
      max_loa_ft: 60,
      max_loa_m: 18.29,
      max_beam_ft: null,
      depth_m: null,
      short_period_only: false,
      status: "AVAILABLE",
      current_boat_id: null,
      monthly_rate: null,
      notes: "Physical slot B1 — SB4 boat stands only; standard stands included; technical and availability checks required; v3.6 staging configuration",
    })
    if (b1Error) throw b1Error
  }

  const { data: after, error: verifyError } = await supabase.from("mms_berths").select("*").in("code", ["W4", "B1"]).order("code")
  if (verifyError) throw verifyError
  console.log(JSON.stringify({ after }, null, 2))
}
