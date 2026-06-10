/**
 * Audit Trail — L4
 * PRIMARY: writes to mms_agent_audit_log via Supabase API.
 * FALLBACK: local JSONL file (development / API-unreachable only).
 *
 * Required fields: agent_name, action
 * Optional: user_id, tool_call, payload, result, risk_level, error, duration_ms
 */
import fs from "fs"
import path from "path"
import { createAuditLog, createNotification } from "../lib/api-client.js"

const LOG_FILE = process.env.AGENT_AUDIT_LOG ?? path.join(process.cwd(), "logs", "agent-audit.jsonl")

export async function log(entry = {}) {
  const record = {
    ts:         new Date().toISOString(),
    pid:        process.pid,
    risk_level: "LOW",
    ...entry,
  }

  // ── PRIMARY: Supabase ────────────────────────────────────────────────────────
  let dbWritten = false
  try {
    await createAuditLog({
      agent_name:  record.agent_name  ?? "unknown",
      action:      record.action      ?? "unknown",
      user_id:     record.userId      ?? null,
      tool_call:   record.route       ?? record.tool_call ?? null,
      payload:     record.payload     ?? null,
      result:      record.result != null ? { summary: record.resultSummary, ...record.result } : (record.resultSummary ? { summary: record.resultSummary } : null),
      risk_level:  record.risk_level,
      error:       record.error       ?? null,
      duration_ms: record.duration_ms ?? null,
      created_at:  record.ts,
    })
    dbWritten = true
  } catch (e) {
    console.warn("[AuditTrail] DB write failed, falling back to file:", e.message)
  }

  // ── FALLBACK: local JSONL ────────────────────────────────────────────────────
  if (!dbWritten) {
    try {
      const dir = path.dirname(LOG_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.appendFileSync(LOG_FILE, JSON.stringify(record) + "\n", "utf8")
    } catch (e) {
      console.warn("[AuditTrail] File write also failed:", e.message)
    }
  }

  // ── HIGH/CRITICAL: escalate via notification ─────────────────────────────────
  if (["HIGH","CRITICAL"].includes(record.risk_level) ||
      ["agent_error","agent_escalation"].includes(record.action)) {
    try {
      await createNotification({
        type:        "audit_log",
        title:       `[Audit] ${record.action} — ${record.route ?? record.tool_call ?? "unknown"}`,
        message:     record.resultSummary ?? record.error ?? "",
        customer_id: record.customerId ?? null,
        priority:    record.risk_level === "CRITICAL" ? "HIGH" : "MEDIUM",
        created_at:  record.ts,
      })
    } catch { /* non-critical */ }
  }

  return record
}
