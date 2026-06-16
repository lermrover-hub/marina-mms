/**
 * Marina MMS API client. All agent communication with the web app goes here.
 *
 * Uses Node.js built-in https/http modules instead of native fetch so that
 * Windows system certificate store and proxy settings are respected.
 */

import https          from "https"
import http           from "http"
import { appendFileSync } from "fs"
import { resolve }    from "path"

const BASE          = process.env.MARINA_API_BASE ?? "http://localhost:3000"
const DRY_RUN       = process.env.AI_AGENT_DRY_RUN !== "false"
const AUDIT_LOG_PATH = resolve(process.env.AI_AUDIT_LOG_PATH ?? ".ai-audit-log.jsonl")

function nodeRequest(url, options = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("Too many redirects"))
    const parsed  = new URL(url)
    const lib     = parsed.protocol === "https:" ? https : http
    const reqOpts = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method ?? "GET",
      headers:  options.headers ?? {},
    }

    const req = lib.request(reqOpts, (res) => {
      // Follow 3xx redirects (GET only)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString()
        res.resume()
        resolve(nodeRequest(next, { ...options, method: "GET", body: undefined }, redirects + 1))
        return
      }
      let data = ""
      res.on("data", chunk => { data += chunk })
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })

    req.on("error", reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

async function apiFetch(path, options = {}) {
  const agentKey = process.env.MARINA_AGENT_API_KEY
  const url      = `${BASE}${path}`

  const res = await nodeRequest(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(agentKey ? { "x-agent-api-key": agentKey } : {}),
      ...options.headers,
    },
    body: options.body,
  })

  if (res.status >= 300) {
    throw new Error(`API ${options.method ?? "GET"} ${path} -> ${res.status}: ${res.body.slice(0, 200)}`)
  }

  const contentType = res.headers["content-type"] ?? ""
  if (!contentType.includes("application/json")) {
    throw new Error(`API ${options.method ?? "GET"} ${path} returned non-JSON content`)
  }

  return JSON.parse(res.body)
}

function dryRunResult(kind, body) {
  console.log(`[ApiClient] DRY RUN: skipped ${kind} write`)
  return { id: `dry-run-${kind}`, ...body }
}

export const isDryRun = () => DRY_RUN

export const getCustomers = () => apiFetch("/api/db/customers")
export const getCustomer = (id) => apiFetch(`/api/db/customers/${id}`)
export const getBoats = () => apiFetch("/api/db/boats")
export const getBoat = (id) => apiFetch(`/api/db/boats/${id}`)

export const getServiceRequests = (params = "") =>
  apiFetch(`/api/db/service-requests${params ? "?" + params : ""}`)

export const getQuotations = (params = "") =>
  apiFetch(`/api/db/quotations${params ? "?" + params : ""}`)
export const createQuotation = (body) =>
  DRY_RUN
    ? Promise.resolve(dryRunResult("quotation", body))
    : apiFetch("/api/db/quotations", { method: "POST", body: JSON.stringify(body) })

export const getPricingMaster = (category = null, activeOnly = true) => {
  const params = new URLSearchParams()
  if (category) params.set("category", category)
  if (activeOnly) params.set("isActive", "true")
  return apiFetch(`/api/pricing-master?${params.toString()}`)
}

export const getInvoices = (params = "") =>
  apiFetch(`/api/db/invoices${params ? "?" + params : ""}`)
export const getInvoice = (id) => apiFetch(`/api/db/invoices/${id}`)

export const getWorkOrders = (params = "") =>
  apiFetch(`/api/db/work-orders${params ? "?" + params : ""}`)
export const getWorkOrder = (id) => apiFetch(`/api/db/work-orders/${id}`)

export const getBerths = () => apiFetch("/api/db/berths")
export const getContracts = (params = "") =>
  apiFetch(`/api/db/contracts${params ? "?" + params : ""}`)

export const createNotification = (body) =>
  DRY_RUN
    ? Promise.resolve(dryRunResult("notification", body))
    : apiFetch("/api/db/notifications", { method: "POST", body: JSON.stringify(body) })

export const getPayments = (params = "") =>
  apiFetch(`/api/db/payments${params ? "?" + params : ""}`)

export const getDashboard = () => apiFetch("/api/db/dashboard")

// ─── Messages ─────────────────────────────────────────────────────────────────
export const getMessages = (params = "") =>
  apiFetch(`/api/db/messages${params ? "?" + params : ""}`)

export const markMessageReplied = (id) =>
  DRY_RUN
    ? Promise.resolve(dryRunResult("message-replied", { id }))
    : apiFetch(`/api/db/messages/${id}`, { method: "PATCH", body: JSON.stringify({ replied: true }) })

export const getAgentConfigAll = () => apiFetch("/api/db/agent-config")

// ─── Outbound message drafts ──────────────────────────────────────────────────
export const createMessageDraft = (body) =>
  DRY_RUN
    ? Promise.resolve(dryRunResult("message-draft", body))
    : apiFetch("/api/db/messages", { method: "POST", body: JSON.stringify(body) })

export const createAiOrder = (body) =>
  DRY_RUN
    ? Promise.resolve(dryRunResult("ai-order", {
        status: "dry_run",
        approval_required: true,
        ...body,
      }))
    : apiFetch("/api/ai/orders", { method: "POST", body: JSON.stringify(body) })

// ─── Agent audit log ──────────────────────────────────────────────────────────
export const createAuditLog = (body) => {
  if (DRY_RUN) {
    const entry = JSON.stringify({ ...body, dry_run: true, logged_at: new Date().toISOString() })
    try { appendFileSync(AUDIT_LOG_PATH, entry + "\n") } catch { }
    console.log(`[ApiClient] DRY RUN: audit log written locally → ${AUDIT_LOG_PATH}`)
    return Promise.resolve({ id: "dry-run-audit-log", dry_run: true, ...body })
  }
  return apiFetch("/api/db/agent-audit-log", { method: "POST", body: JSON.stringify(body) })
}

// ─── Notifications (read) ─────────────────────────────────────────────────────
export const getNotifications = (params = "") =>
  apiFetch(`/api/db/notifications${params ? "?" + params : ""}`)

export const getStaff = (params = "") =>
  apiFetch(`/api/db/staff${params ? "?" + params : ""}`)
export const getStaffKpi = () => apiFetch("/api/db/staff/kpi")
export const getRampBookings = (params = "") =>
  apiFetch(`/api/db/ramp-bookings${params ? "?" + params : ""}`)
export const createRampBooking = (body) =>
  DRY_RUN
    ? Promise.resolve(dryRunResult("ramp-booking", body))
    : apiFetch("/api/db/ramp-bookings", { method: "POST", body: JSON.stringify(body) })
export const createWorkOrder = (body) =>
  DRY_RUN
    ? Promise.resolve(dryRunResult("work-order", body))
    : apiFetch("/api/db/work-orders", { method: "POST", body: JSON.stringify(body) })
export const updateWorkOrder = (id, body) =>
  DRY_RUN
    ? Promise.resolve(dryRunResult("work-order-update", body))
    : apiFetch(`/api/db/work-orders/${id}`, { method: "PATCH", body: JSON.stringify(body) })

// Export apiFetch for agents that need raw access (e.g. tide-agent, doc-writer)
export { apiFetch }
