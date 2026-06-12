import { readFileSync } from "fs"
import { resolve } from "path"
import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: resolve(process.cwd(), "../.env") })
dotenv.config({ path: resolve(process.cwd(), "../.env.local"), override: true })

const CSV_PATH =
  "G:\\My Drive\\02_COMMAND_CENTER06_ARCHIVE_ORIGINAL_FILES\\Ocean Rover Marina\\Ai doc\\GPT tide table\\CSV Ocean_Rover_Marina_Quote_Tide_Automation_2026_v2.csv"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error("Missing DATABASE_URL"); process.exit(1) }

const text = readFileSync(CSV_PATH, "utf-8")
const lines = text.trim().split("\n")
const records = lines.slice(1).map((line) => {
  const [date, hour,,tide_m] = line.split(",")
  return { date: date.trim(), hour: parseInt(hour.trim(), 10), tide_m: parseFloat(tide_m.trim()) }
}).filter((r) => !isNaN(r.hour) && !isNaN(r.tide_m) && r.date)

console.log(`Valid records: ${records.length}`)

const client = new pg.Client({ connectionString: DATABASE_URL })
await client.connect()

const CHUNK = 500
let inserted = 0
for (let i = 0; i < records.length; i += CHUNK) {
  const chunk = records.slice(i, i + CHUNK)
  const placeholders = chunk.map((_, j) => `($${j*3+1}::date,$${j*3+2}::smallint,$${j*3+3}::numeric,'Ko Samui tide table 2026 PDF')`).join(",")
  const values = chunk.flatMap((r) => [r.date, r.hour, r.tide_m])
  await client.query(
    `INSERT INTO public.mms_tide_records (date,hour,tide_m,source) VALUES ${placeholders} ON CONFLICT (date,hour) DO NOTHING`,
    values
  )
  inserted += chunk.length
  process.stdout.write(`\r${inserted}/${records.length}`)
}

const { rows } = await client.query("SELECT COUNT(*) AS n FROM public.mms_tide_records")
console.log(`\nDone. Total rows: ${rows[0].n}`)

// Sample today
const { rows: s } = await client.query(
  "SELECT hour, tide_m FROM public.mms_tide_records WHERE date='2026-06-12' ORDER BY hour LIMIT 6"
)
s.forEach((r) => console.log(`  ${String(r.hour).padStart(2,"0")}:00 → ${r.tide_m} m`))
await client.end()
