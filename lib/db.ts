/**
 * Marina MMS — Database query helpers
 * All functions return data from Supabase mms_* tables
 */
import { supabase } from "./supabase"
import type { Customer, Boat, Berth, ServiceRequest, Quotation, WorkOrder, Invoice, Payment, MaterialUsage } from "./supabase"

// ── Customers ─────────────────────────────────────────────────────────────────
export async function getCustomers() {
  const { data, error } = await supabase
    .from("mms_customers")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as Customer[]
}

export async function getCustomer(id: string) {
  const { data, error } = await supabase
    .from("mms_customers")
    .select("*")
    .eq("id", id)
    .single()
  if (error) throw error
  return data as Customer
}

export async function createCustomer(customer: Omit<Customer, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("mms_customers")
    .insert(customer)
    .select()
    .single()
  if (error) throw error
  return data as Customer
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  const { data, error } = await supabase
    .from("mms_customers")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as Customer
}

// ── Boats ─────────────────────────────────────────────────────────────────────
export async function getBoats() {
  const { data, error } = await supabase
    .from("mms_boats")
    .select("*")
    .order("name")
  if (error) throw error
  return data as Boat[]
}

export async function getBoat(id: string) {
  const { data, error } = await supabase
    .from("mms_boats")
    .select("*")
    .eq("id", id)
    .single()
  if (error) throw error
  return data as Boat
}

export async function getBoatsByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from("mms_boats")
    .select("*")
    .eq("owner_id", ownerId)
    .order("name")
  if (error) throw error
  return data as Boat[]
}

// ── Berths ────────────────────────────────────────────────────────────────────
export async function getBerths() {
  const { data, error } = await supabase
    .from("mms_berths")
    .select("*")
    .order("code")
  if (error) throw error
  return data as Berth[]
}

// ── Service Requests ──────────────────────────────────────────────────────────
export async function getServiceRequests() {
  const { data, error } = await supabase
    .from("mms_service_requests")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as ServiceRequest[]
}

export async function getServiceRequest(id: string) {
  const { data, error } = await supabase
    .from("mms_service_requests")
    .select("*")
    .eq("id", id)
    .single()
  if (error) throw error
  return data as ServiceRequest
}

// ── Quotations ────────────────────────────────────────────────────────────────
export async function getQuotations() {
  const { data, error } = await supabase
    .from("mms_quotations")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as Quotation[]
}

export async function getQuotation(id: string) {
  const { data, error } = await supabase
    .from("mms_quotations")
    .select("*, mms_quotation_items(*)")
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

// ── Work Orders ───────────────────────────────────────────────────────────────
export async function getWorkOrders() {
  const { data, error } = await supabase
    .from("mms_work_orders")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as WorkOrder[]
}

export async function getWorkOrder(id: string) {
  const { data, error } = await supabase
    .from("mms_work_orders")
    .select("*")
    .eq("id", id)
    .single()
  if (error) throw error
  return data as WorkOrder
}

// ── Invoices ──────────────────────────────────────────────────────────────────
export async function getInvoices() {
  const { data, error } = await supabase
    .from("mms_invoices")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as Invoice[]
}

export async function getInvoice(id: string) {
  const { data, error } = await supabase
    .from("mms_invoices")
    .select("*, mms_invoice_items(*)")
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

// ── Payments ──────────────────────────────────────────────────────────────────
export async function getPayments() {
  const { data, error } = await supabase
    .from("mms_payments")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as Payment[]
}

export async function getPayment(id: string) {
  const { data, error } = await supabase
    .from("mms_payments")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as Payment | null
}

export async function createPayment(payment: Omit<Payment, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("mms_payments")
    .insert(payment)
    .select()
    .single()
  if (error) throw error
  return data as Payment
}

export async function updateInvoiceAfterPayment(invoiceId: string, newPaidAmount: number) {
  // Fetch current invoice totals
  const { data: inv, error: fetchErr } = await supabase
    .from("mms_invoices")
    .select("total_amount, paid_amount")
    .eq("id", invoiceId)
    .single()
  if (fetchErr) throw fetchErr

  const totalPaid = (inv.paid_amount ?? 0) + newPaidAmount
  const outstanding = Math.max(0, (inv.total_amount ?? 0) - totalPaid)
  const status = outstanding <= 0 ? "PAID" : totalPaid > 0 ? "PARTIALLY_PAID" : "ISSUED"

  const { data, error } = await supabase
    .from("mms_invoices")
    .update({ paid_amount: totalPaid, outstanding_balance: outstanding, status })
    .eq("id", invoiceId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Material Usage ────────────────────────────────────────────────────────────
export async function getMaterialUsage(workOrderId: string) {
  const { data, error } = await supabase
    .from("mms_material_usage")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("created_at")
  if (error) throw error
  return data as MaterialUsage[]
}

export async function createMaterialUsage(item: Omit<MaterialUsage, "id" | "total_cost" | "created_at" | "updated_at">) {
  const total_cost = item.quantity * item.unit_cost
  const { data, error } = await supabase
    .from("mms_material_usage")
    .insert({ ...item, total_cost })
    .select()
    .single()
  if (error) throw error
  return data as MaterialUsage
}

export async function deleteMaterialUsage(id: string) {
  const { error } = await supabase
    .from("mms_material_usage")
    .delete()
    .eq("id", id)
  if (error) throw error
}

// ── Report Stats ──────────────────────────────────────────────────────────────
export async function getReportStats() {
  const [invoices, workOrders, customers, boats, quotations, payments] = await Promise.all([
    supabase.from("mms_invoices").select("id, status, total_amount, paid_amount, outstanding_balance, invoice_date"),
    supabase.from("mms_work_orders").select("id, status, total_revenue, total_labor_cost, total_material_cost, total_contractor_cost"),
    supabase.from("mms_customers").select("id, status"),
    supabase.from("mms_boats").select("id, status"),
    supabase.from("mms_quotations").select("id, status, total_amount"),
    supabase.from("mms_payments").select("id, amount, payment_date, status"),
  ])

  const invData  = invoices.data    ?? []
  const woData   = workOrders.data  ?? []
  const custData = customers.data   ?? []
  const boatData = boats.data       ?? []
  const quoteData= quotations.data  ?? []
  const payData  = payments.data    ?? []

  const now           = new Date()
  const thisMonth     = now.getMonth()
  const thisYear      = now.getFullYear()
  const lastMonth     = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

  const invoiceStats = {
    total:            invData.length,
    paid:             invData.filter(i => i.status === "PAID").length,
    overdue:          invData.filter(i => i.status === "OVERDUE").length,
    partiallyPaid:    invData.filter(i => i.status === "PARTIALLY_PAID").length,
    totalRevenue:     invData.filter(i => i.status === "PAID").reduce((s, i) => s + (i.paid_amount ?? 0), 0),
    outstandingBalance: invData.filter(i => !["PAID","CANCELLED"].includes(i.status)).reduce((s, i) => s + (i.outstanding_balance ?? 0), 0),
    overdueAmount:    invData.filter(i => i.status === "OVERDUE").reduce((s, i) => s + (i.outstanding_balance ?? 0), 0),
  }

  const woTotalRevenue = woData.reduce((s, w) => s + (w.total_revenue ?? 0), 0)
  const woTotalCost    = woData.reduce((s, w) => s + (w.total_labor_cost ?? 0) + (w.total_material_cost ?? 0) + (w.total_contractor_cost ?? 0), 0)
  const woMargin       = woTotalRevenue > 0 ? Math.round(((woTotalRevenue - woTotalCost) / woTotalRevenue) * 100) : 0

  const quoteSent     = quoteData.filter(q => ["SENT","ACCEPTED","REJECTED"].includes(q.status)).length
  const quoteAccepted = quoteData.filter(q => q.status === "ACCEPTED").length

  const payThisMonth = payData
    .filter(p => {
      const d = new Date(p.payment_date)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && p.status === "CONFIRMED"
    })
    .reduce((s, p) => s + (p.amount ?? 0), 0)

  const payLastMonth = payData
    .filter(p => {
      const d = new Date(p.payment_date)
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear && p.status === "CONFIRMED"
    })
    .reduce((s, p) => s + (p.amount ?? 0), 0)

  return {
    invoiceStats,
    workOrderStats: {
      total:               woData.length,
      inProgress:          woData.filter(w => w.status === "IN_PROGRESS").length,
      completed:           woData.filter(w => w.status === "COMPLETED").length,
      closed:              woData.filter(w => w.status === "CLOSED").length,
      totalRevenue:        woTotalRevenue,
      totalCost:           woTotalCost,
      averageMarginPercent: woMargin,
    },
    customerStats: {
      total:    custData.length,
      active:   custData.filter(c => c.status === "ACTIVE").length,
      prospect: custData.filter(c => c.status === "PROSPECT").length,
      inactive: custData.filter(c => c.status === "INACTIVE").length,
    },
    boatStats: {
      total:     boatData.length,
      inWater:   boatData.filter(b => b.status === "IN_WATER").length,
      inStorage: boatData.filter(b => b.status === "IN_STORAGE").length,
      inRepair:  boatData.filter(b => b.status === "IN_REPAIR").length,
    },
    quotationStats: {
      total:          quoteData.length,
      sent:           quoteSent,
      accepted:       quoteAccepted,
      rejected:       quoteData.filter(q => q.status === "REJECTED").length,
      conversionRate: quoteSent > 0 ? Math.round((quoteAccepted / quoteSent) * 100) : 0,
      totalValue:     quoteData.reduce((s, q) => s + (q.total_amount ?? 0), 0),
    },
    paymentStats: {
      totalReceived: payData.filter(p => p.status === "CONFIRMED").reduce((s, p) => s + (p.amount ?? 0), 0),
      thisMonth:     payThisMonth,
      lastMonth:     payLastMonth,
    },
  }
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const [customers, boats, invoices, workOrders, quotations, paymentRows] = await Promise.all([
    supabase.from("mms_customers").select("id, status"),
    supabase.from("mms_boats").select("id, name, status, insurance_expiry"),
    supabase.from("mms_invoices").select("id, status, total_amount, paid_amount, outstanding_balance, due_date, invoice_date"),
    supabase.from("mms_work_orders").select("id, status, total_revenue"),
    supabase.from("mms_quotations").select("id, status, total_amount"),
    supabase.from("mms_payments").select("id, amount, payment_date, status"),
  ])

  const thisYear = new Date().getFullYear()
  const thisMonth = new Date().getMonth()

  // YTD revenue = sum of confirmed payments this calendar year
  const ytdRevenue = paymentRows.data
    ?.filter(p => p.status === "CONFIRMED" && new Date(p.payment_date).getFullYear() === thisYear)
    .reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0

  // This month revenue
  const mtdRevenue = paymentRows.data
    ?.filter(p => {
      const d = new Date(p.payment_date)
      return p.status === "CONFIRMED" && d.getFullYear() === thisYear && d.getMonth() === thisMonth
    })
    .reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0

  const activeCustomers = customers.data?.filter(c => c.status === "ACTIVE").length ?? 0
  const boatsInWater    = boats.data?.filter(b => b.status === "IN_WATER").length ?? 0
  const boatsInRepair   = boats.data?.filter(b => b.status === "IN_REPAIR").length ?? 0
  const boatsInStorage  = boats.data?.filter(b => b.status === "IN_STORAGE").length ?? 0

  const today = new Date()
  const insSoon = boats.data?.filter(b => {
    if (!b.insurance_expiry) return false
    const diff = (new Date(b.insurance_expiry).getTime() - today.getTime()) / 86400000
    return diff >= 0 && diff <= 60
  }) ?? []

  const outstandingInvoices = invoices.data
    ?.filter(i => i.status !== "PAID" && i.status !== "CANCELLED")
    .reduce((s, i) => s + (i.outstanding_balance ?? 0), 0) ?? 0

  const overdueInvoices = invoices.data
    ?.filter(i => i.status === "OVERDUE")
    .reduce((s, i) => s + (i.outstanding_balance ?? 0), 0) ?? 0

  const overdueCount = invoices.data?.filter(i => i.status === "OVERDUE").length ?? 0

  const openWorkOrders = workOrders.data
    ?.filter(w => !["COMPLETED","CLOSED","CANCELLED"].includes(w.status)).length ?? 0

  const openQuotations = quotations.data
    ?.filter(q => ["DRAFT","SENT","PENDING_APPROVAL"].includes(q.status)).length ?? 0

  const openQuotationsValue = quotations.data
    ?.filter(q => ["DRAFT","SENT","PENDING_APPROVAL"].includes(q.status))
    .reduce((s, q) => s + (q.total_amount ?? 0), 0) ?? 0

  return {
    activeCustomers,
    boatsInWater,
    boatsInRepair,
    boatsInStorage,
    totalBoats: boats.data?.length ?? 0,
    outstandingInvoices,
    overdueInvoices,
    overdueCount,
    openWorkOrders,
    openQuotations,
    openQuotationsValue,
    insuranceExpiringSoon: insSoon,
    ytdRevenue,
    mtdRevenue,
  }
}
