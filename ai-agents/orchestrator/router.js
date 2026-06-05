/**
 * Intent Router
 *
 * Classifies an inbound request into one of:
 *   marina | finance | hr | comms | quotation | tide | escalate
 *
 * Uses keyword rules first (fast, free) then falls back to Claude.
 */

import { ask } from "../lib/claude-client.js"

const RULES = [
  // doc-writer first — "pdf" + "docx" are unambiguous output-format signals
  { keywords: ["pdf", "docx", "xlsx", "เอกสาร", "ใบงาน", "generate document", "export report"], route: "doc-writer" },
  { keywords: ["tide", "launch", "retrieval", "ramp", "haul", "น้ำขึ้น", "ลงน้ำ", "ขึ้นฝั่ง"],   route: "tide" },
  { keywords: ["invoice", "payment", "overdue", "accounts receivable", "receivable", "ค้างชำระ", "ใบแจ้งหนี้", "billing"],    route: "finance" },
  { keywords: ["berth", "dock", "storage", "slip", "contract", "expiry", "insurance", "จอดเรือ"], route: "marina" },
  // hr before quotation — "job description" / "jd" are HR signals
  { keywords: ["job description", "jd ", " jd", "onboard", "sop", "kpi", "hire", "ช่าง", " hr ", "hr "], route: "hr" },
  { keywords: ["quotation", "quote", "ใบเสนอราคา", "estimate", "pricing", "ราคา"],               route: "quotation" },
  { keywords: ["staff", "performance", "procedure"],                                               route: "hr" },
]

const SYSTEM_PROMPT = `You are a routing classifier for a Marina & Boat Yard management system.
Classify the following request into exactly one category:
  marina      – berth, storage, boat movement, contracts, insurance
  finance     – invoices, payments, AR, overdue
  hr          – staff, KPI, SOP, job descriptions, onboarding
  comms       – customer inquiry, reply drafting, LINE/email follow-up
  quotation   – create or revise a quotation/estimate
  tide        – tide safety calculation, launch/retrieval time window
  doc-writer  – generate a PDF, DOCX, or Excel document

Reply with ONLY the category name, nothing else.`

export async function classifyIntent(text) {
  const lower = (text ?? "").toLowerCase()

  // Fast keyword match
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.route
    }
  }

  // Claude fallback
  try {
    const result = await ask(SYSTEM_PROMPT, text, { maxTokens: 16 })
    const cleaned = result.trim().toLowerCase().replace(/[^a-z-]/g, "")
    const valid = ["marina", "finance", "hr", "comms", "quotation", "tide", "doc-writer"]
    return valid.includes(cleaned) ? cleaned : "comms"
  } catch {
    return "comms"
  }
}
