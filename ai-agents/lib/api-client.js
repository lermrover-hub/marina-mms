/**
 * Marina MMS API client. All agent communication with the web app goes here.
 */

const BASE = process.env.MARINA_API_BASE ?? "http://localhost:3000"
const DRY_RUN = process.env.AI_AGENT_DRY_RUN === "true"

async function apiFetch(path, options = {}) {
  const agentKey = process.env.MARINA_AGENT_API_KEY
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      ...(agentKey ? { "x-agent-api-key": agentKey } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API ${options.method ?? "GET"} ${path} -> ${res.status}: ${text}`)
  }

  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    throw new Error(`API ${options.method ?? "GET"} ${path} returned non-JSON content`)
  }

  return res.json()
}

function dryRunResult(kind, body) {
  console.log(`[ApiClient] DRY RUN: skipped ${kind} write`)
  return { id: `dry-run-${kind}`, ...body }
}

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
