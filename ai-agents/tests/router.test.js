import { test } from "node:test"
import assert from "node:assert/strict"
import "dotenv/config"

// Test keyword path only (no Claude call needed)
process.env.AI_AGENT_SKIP_CLAUDE = "true"

const { classifyIntent } = await import("../orchestrator/router.js")

const cases = [
  ["I need a quotation for antifouling",        "quotation"],
  ["ใบเสนอราคา engine service",                 "quotation"],
  ["invoice overdue customer",                   "finance"],
  ["ค้างชำระ ใบแจ้งหนี้",                        "finance"],
  ["berth contract expiry next month",           "marina"],
  ["จอดเรือ contract insurance",                 "marina"],
  ["tide safe launch window tomorrow",           "tide"],
  ["น้ำขึ้น ลงน้ำ",                              "tide"],
  ["generate PDF quotation",                     "doc-writer"],
  ["draft JD for boat yard manager",             "hr"],
  ["kpi report technician",                      "hr"],
]

for (const [input, expected] of cases) {
  test(`router: "${input.slice(0, 40)}" → ${expected}`, async () => {
    const route = await classifyIntent(input)
    assert.equal(route, expected)
  })
}
