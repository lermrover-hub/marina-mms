/**
 * Audit Trail — L4
 * Appends every agent action to a JSONL log file + optionally posts to web app.
 */
import fs from "fs"
import path from "path"
import { createNotification } from "../lib/api-client.js"

const LOG_FILE = process.env.AGENT_AUDIT_LOG ?? path.join(process.cwd(), "logs", "agent-audit.jsonl")
const POST_TO_API = process.env.AGENT_AUDIT_API === "true"

export async function log(entry = {}) {
  const record = {
    ts:  new Date().toISOString(),
    pid: process.pid,
    ...entry,
  }

  // Write to local JSONL file
  try {
    const dir = path.dirname(LOG_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(LOG_FILE, JSON.stringify(record) + "\n", "utf8")
  } catch (e) {
    console.warn("[AuditTrail] File write failed:", e.message)
  }

  // Optionally post to web app (sensitive actions only)
  if (POST_TO_API && ["agent_error", "agent_escalation"].includes(entry.action)) {
    try {
      await createNotification({
        type:        "audit_log",
        title:       `[Audit] ${entry.action} — ${entry.route ?? "unknown"}`,
        message:     entry.resultSummary ?? entry.error ?? "",
        customer_id: entry.customerId ?? null,
        priority:    "LOW",
        created_at:  record.ts,
      })
    } catch { /* non-critical */ }
  }

  return record
}
