/**
 * Export pricing_master as rate-card-review.csv for offline review.
 * Usage: node scripts/export-rate-card-csv.mjs
 */
import { getPricingMaster } from "../ai-agents/lib/api-client.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const r = await getPricingMaster(null, true)
const rows = r?.data ?? (Array.isArray(r) ? r : [])

const headers = ["code","category","serviceNameEn","serviceNameTh","unit","rate_thb","pilot_rate_thb","notes_for_review"]
const lines = ["﻿" + headers.join(",")]

for (const row of rows) {
  const cols = [
    row.code ?? "",
    row.category ?? "",
    `"${(row.serviceNameEn ?? "").replace(/"/g, '""')}"`,
    `"${(row.serviceNameTh ?? "").replace(/"/g, '""')}"`,
    row.unit ?? "",
    row.rateThb ?? 0,
    row.pilotRateThb ?? "",
    `"${(row.pilotNotes ?? "").replace(/"/g, '""')}"`,
  ]
  lines.push(cols.join(","))
}

const out = path.join(__dirname, "..", "rate-card-review.csv")
fs.writeFileSync(out, lines.join("\r\n"), "utf8")
console.log(`Written: rate-card-review.csv (${rows.length} rows)`)

const check = rows.filter(r => ["BERTH_JETSKI_M","BERTH_SB1_M","BERTH_SB2_M"].includes(r.code))
for (const r of check) console.log(`  ${r.code}: "${r.serviceNameEn}"`)
