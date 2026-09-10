/**
 * One-time seed: import Ko Samui 2026 hourly tide data into mms_tide_records.
 *
 * Usage:
 *   node scripts/seed-tide-records.js
 *
 * Uses DATABASE_URL from .env — safe to re-run (ON CONFLICT DO NOTHING).
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import pg from "pg"
import { config } from "dotenv"

config({ path: resolve(process.cwd(), ".env") })
config({ path: resolve(process.cwd(), ".env.local"), override: true })

const CSV_PATH =
  "G:\\My Drive\\02_COMMAND_CENTER06_ARCHIVE_ORIGINAL_FILES\\Ocean Rover Marina\\Ai doc\\GPT tide table\\CSV Ocean_Rover_Marina_Quote_Tide_Automation_2026_v2.csv"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env")
  process.exit(1)
}

function parseCSV(text) {
  const lines = text.trim().split("\n")
  const headers = lines[0].split(",").map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(",")
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? ""]))
  })
}

async function seed() {
  console.log("Reading CSV...")
  const text = readFileSync(CSV_PATH, "utf-8")
  const rows = parseCSV(text)
  console.log(`Parsed ${rows.length} rows`)

  const records = rows
    .map((row) => ({
      date: row.Date,
      hour: parseInt(row.Hour, 10),
      tide_m: parseFloat(row.Tide_m),
      source: row.Source || "Ko Samui tide table 2026 PDF",
    }))
    .filter((r) => !isNaN(r.hour) && !isNaN(r.tide_m) && r.date)

  console.log(`Valid records: ${records.length}`)

  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log("Connected to database")

  // Bulk insert via multi-row VALUES — batches of 500
  const CHUNK = 500
  let inserted = 0

  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const placeholders = chunk.map((_, j) => {
      const base = j * 4
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`
    }).join(", ")
    const values = chunk.flatMap((r) => [r.date, r.hour, r.tide_m, r.source])

    await client.query(
      `INSERT INTO public.mms_tide_records (date, hour, tide_m, source)
       VALUES ${placeholders}
       ON CONFLICT (date, hour) DO NOTHING`,
      values
    )
    inserted += chunk.length
    process.stdout.write(`\rInserted ${inserted}/${records.length}`)
  }

  console.log("\nVerifying...")
  const { rows: countRows } = await client.query("SELECT COUNT(*) AS n FROM public.mms_tide_records")
  console.log(`Total rows in mms_tide_records: ${countRows[0].n}`)

  // Sample today's data
  const today = new Date().toISOString().slice(0, 10)
  const { rows: sample } = await client.query(
    "SELECT hour, tide_m FROM public.mms_tide_records WHERE date = $1 ORDER BY hour LIMIT 6",
    [today]
  )
  if (sample.length) {
    console.log(`\nSample for ${today}:`)
    sample.forEach((r) => console.log(`  ${String(r.hour).padStart(2, "0")}:00 → ${r.tide_m} m`))
  } else {
    console.log(`(No records found for today ${today} — CSV may not cover this date)`)
  }

  await client.end()
  console.log("Done.")
}

seed().catch((e) => { console.error(e); process.exit(1) })
