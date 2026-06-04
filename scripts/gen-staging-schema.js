/**
 * Reads the information_schema query result and emits CREATE TABLE SQL
 * for the staging database. Run with: node scripts/gen-staging-schema.js
 */
import { readFileSync, writeFileSync } from "fs"

const filePath = process.argv[2]
if (!filePath) {
  console.error("Usage: node gen-staging-schema.js <query-result-file>")
  process.exit(1)
}

const raw  = readFileSync(filePath, "utf8")
const m    = raw.match(/\[[\s\S]*\]/)
if (!m) { console.error("No JSON array found in file"); process.exit(1) }
const rows = JSON.parse(m[0])

// Group columns by table, preserving ordinal order
const byTable = {}
for (const r of rows) {
  if (!byTable[r.table_name]) byTable[r.table_name] = []
  byTable[r.table_name].push(r)
}
const tables = Object.keys(byTable).sort()

function pgType(dt) {
  if (dt === "uuid")                     return "uuid"
  if (dt === "text")                     return "text"
  if (dt === "integer")                  return "integer"
  if (dt === "numeric")                  return "numeric"
  if (dt === "boolean")                  return "boolean"
  if (dt === "date")                     return "date"
  if (dt === "timestamp with time zone") return "timestamptz"
  if (dt === "jsonb")                    return "jsonb"
  if (dt === "ARRAY")                    return "text[]"
  return dt
}

let sql = "-- Marina MMS Staging Schema\n"
        + "-- Generated from production information_schema (schema only, no data)\n"
        + "-- Safe to re-run (CREATE TABLE IF NOT EXISTS)\n\n"
        + "CREATE EXTENSION IF NOT EXISTS pgcrypto;\n\n"

for (const tbl of tables) {
  const cols = byTable[tbl]
  sql += `CREATE TABLE IF NOT EXISTS public.${tbl} (\n`
  const defs = cols.map(c => {
    let def = `  ${c.column_name} ${pgType(c.data_type)}`
    if (c.column_default) def += ` DEFAULT ${c.column_default}`
    if (c.is_nullable === "NO") def += " NOT NULL"
    return def
  })
  sql += defs.join(",\n") + "\n);\n\n"
}

const out = "C:/marina-mms/scripts/staging-schema.sql"
writeFileSync(out, sql, "utf8")
console.log(`Written ${sql.length} chars → ${out}`)
console.log(`Tables: ${tables.length}`)
tables.forEach(t => console.log(" ", t))
