/**
 * Doc Writer — L3 Executor
 * Generates PDF/DOCX/XLSX via web app API endpoints.
 */
import { apiFetch } from "../lib/api-client.js"

export async function run({ docType, refId, content, format = "pdf" } = {}) {
  console.log(`[DocWriter] type=${docType} ref=${refId} format=${format}`)

  const type = docType ?? inferDocType(content ?? "")

  switch (type) {
    case "quotation":  return generateQuotation(refId, format)
    case "invoice":    return generateInvoice(refId, format)
    case "work_order": return generateWorkOrder(refId, format)
    case "report":     return generateReport(content, format)
    default:
      console.warn(`[DocWriter] Unknown doc type: ${type}`)
      return { ok: false, reason: "unknown_doc_type", type }
  }
}

function inferDocType(text) {
  const t = text.toLowerCase()
  if (t.includes("quotation") || t.includes("quote")) return "quotation"
  if (t.includes("invoice") || t.includes("receipt")) return "invoice"
  if (t.includes("work order") || t.includes("job card")) return "work_order"
  if (t.includes("report")) return "report"
  return "report"
}

async function generateQuotation(id, format) {
  if (!id) return { ok: false, reason: "missing_ref_id" }
  const res = await apiFetch(`/api/quotations/${id}/pdf`, { method: "POST", body: JSON.stringify({ format }) })
  console.log(`[DocWriter] Quotation PDF: ${res?.url ?? "generated"}`)
  return { ok: true, type: "quotation", id, url: res?.url, format }
}

async function generateInvoice(id, format) {
  if (!id) return { ok: false, reason: "missing_ref_id" }
  const res = await apiFetch(`/api/db/invoices/${id}/pdf`, { method: "POST", body: JSON.stringify({ format }) })
  console.log(`[DocWriter] Invoice PDF: ${res?.url ?? "generated"}`)
  return { ok: true, type: "invoice", id, url: res?.url, format }
}

async function generateWorkOrder(id, format) {
  if (!id) return { ok: false, reason: "missing_ref_id" }
  const res = await apiFetch(`/api/db/work-orders/${id}/pdf`, { method: "POST", body: JSON.stringify({ format }) })
  console.log(`[DocWriter] Work Order PDF: ${res?.url ?? "generated"}`)
  return { ok: true, type: "work_order", id, url: res?.url, format }
}

async function generateReport(content, format) {
  const res = await apiFetch(`/api/db/reports`, { method: "POST", body: JSON.stringify({ content, format }) })
  console.log(`[DocWriter] Report: ${res?.url ?? "generated"}`)
  return { ok: true, type: "report", url: res?.url, format }
}
