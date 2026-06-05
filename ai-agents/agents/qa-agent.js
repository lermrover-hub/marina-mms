/**
 * QA Agent — L4 Validator
 * Validates agent output before it reaches the web app.
 * Pure sync — no Claude, no API calls.
 */

const REQUIRED = {
  quotation:  ["customer_id", "title", "items", "grand_total", "status"],
  invoice:    ["customer_id", "invoice_number", "total_amount", "status"],
  marina:     ["alerts"],
  finance:    ["overdueCount"],
  hr:         ["task"],
  comms:      ["reply"],
  tide:       ["safeWindows"],
  "doc-writer": ["ok"],
}

/**
 * @param {string} route
 * @param {object} result
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function validate(route, result) {
  const issues = []

  if (!result) {
    issues.push("result is null or undefined")
    return { ok: false, issues }
  }

  // Required fields check
  const required = REQUIRED[route] ?? []
  for (const f of required) {
    if (result[f] === undefined || result[f] === null) {
      issues.push(`missing required field: ${f}`)
    }
  }

  // Quotation-specific: validate totals
  if (route === "quotation" && result.results) {
    for (const r of result.results) {
      if (r.error) { issues.push(`quotation draft failed for request ${r.requestId}: ${r.error}`); continue }
      if (r.grandTotal !== undefined && r.grandTotal <= 0) issues.push(`grand_total <= 0 for request ${r.requestId}`)
    }
  }

  // Finance: flag if overdue total is suspiciously large
  if (route === "finance" && result.overdueTotal > 10_000_000) {
    issues.push(`overdueTotal ${result.overdueTotal} exceeds 10M THB — verify data`)
  }

  // Tide: warn if no safe windows
  if (route === "tide" && result.ok && (!result.safeWindows || result.safeWindows.length === 0)) {
    issues.push("no safe launch windows found for this date — escalate to operations")
  }

  // Comms: reply must not be empty
  if (route === "comms" && result.reply !== undefined && String(result.reply).trim().length < 10) {
    issues.push("reply is too short — possible Claude failure")
  }

  return { ok: issues.length === 0, issues }
}
