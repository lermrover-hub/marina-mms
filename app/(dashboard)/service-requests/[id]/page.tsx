"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AlertCircle, CheckCircle2, ClipboardList, CreditCard, Loader2, Lock, Ship, ShieldCheck, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { HelpHint } from "@/components/shared/HelpHint"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ServiceRequest } from "@/lib/supabase"
import { formatDate, formatTHB } from "@/lib/utils"
import { INSURANCE_VERIFY_ROLES, PAYMENT_GATE_ROLES, SERVICE_ORDER_CONFIRM_ROLES, WORK_ORDER_CREATE_ROLES, roleAllowed } from "@/lib/workflow-access"

type RequestItem = { id: string; description: string; pricing_code: string | null; operator_type: string; qty: number; unit: string; unit_price: number; direct_cost: number; discount_pct: number }
type PaymentPlan = { payment_mode: string; status: string; total_amount: number; deposit_required_amount: number; first_cycle_due_date: string | null; post_launch_due_date: string | null; good_credit_customer: boolean }
type Detail = ServiceRequest & { items: RequestItem[]; payment_plan: PaymentPlan | null }

const stepOrder = ["SERVICE_REQUEST", "DRAFT_QUOTATION", "APPROVAL_PAYMENT", "SERVICE_ORDER", "WORK_ORDER"]

export default function ServiceRequestDetailPage() {
  const id = useParams<{ id: string }>()?.id ?? ""
  const router = useRouter()
  const { data: session } = useSession()
  const actorRole = (session?.user as { role?: string } | undefined)?.role ?? ""
  const canVerifyInsurance = roleAllowed(actorRole, INSURANCE_VERIFY_ROLES)
  const canUpdatePayment = roleAllowed(actorRole, PAYMENT_GATE_ROLES)
  const canConfirmService = roleAllowed(actorRole, SERVICE_ORDER_CONFIRM_ROLES)
  const canCreateWorkOrder = roleAllowed(actorRole, WORK_ORDER_CREATE_ROLES)
  const [request, setRequest] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState("PAID")

  const load = useCallback(async () => {
    if (!id) return
    const response = await fetch(`/api/db/service-requests/${id}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error ?? "Service request not found")
    setRequest(data)
  }, [id])

  useEffect(() => {
    load().catch((e) => setError(String(e))).finally(() => setLoading(false))
  }, [load])

  async function action(payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/db/service-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Update failed")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function createWorkOrder() {
    if (!request) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/db/work-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        reference: `WO-${Date.now().toString().slice(-6)}`, sr_id: request.id, service_request_id: request.id, quotation_id: request.quotation_id,
        customer_id: request.customer_id, customer_name: request.customer_name, boat_id: request.boat_id, boat_name: request.boat_name,
        title: request.title, category: request.category, priority: request.priority, execution_type: request.execution_type, status: "NEW_REQUEST",
        notes: "Work Order created only after payment clearance and Service Order confirmation.",
      }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Work Order creation failed")
      router.push(`/work-orders/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  if (loading) return <div className="flex justify-center py-32 text-gray-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading workflow…</div>
  if (!request) return <div className="py-24 text-center text-red-600">{error ?? "Service request not found"}</div>

  const paymentCleared = ["PAID", "DEPOSIT_PAID", "CREDIT_APPROVED"].includes(request.payment_gate_status ?? "")
  const serviceConfirmed = request.status === "SERVICE_ORDER_CONFIRMED"
  const completedStep = serviceConfirmed ? 3 : paymentCleared ? 2 : request.quotation_id ? 1 : 0

  return <div className="space-y-6">
    <PageHeader title={request.reference} description={request.title} breadcrumb={[{ label: "Service Requests", href: "/service-requests" }, { label: request.reference }]} actions={<Button variant="outline" asChild><Link href="/service-requests">Back</Link></Button>} />
    {error && <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

    <Card><CardHeader><CardTitle>Workflow <HelpHint title="Why is Work Order locked?">A Service Request may exist before payment. The Draft quotation is reviewed and approved first. Finance then clears payment/deposit/credit, an officer confirms the Service Order, and only then can the Work Order be created.</HelpHint></CardTitle></CardHeader><CardContent>
      <div className="grid gap-2 md:grid-cols-5">{stepOrder.map((step, index) => <div key={step} className={`rounded-lg border p-3 text-center text-xs font-semibold ${index <= completedStep ? "border-teal-400 bg-teal-50 text-teal-800" : "border-gray-200 bg-gray-50 text-gray-400"}`}>{index <= completedStep ? <CheckCircle2 className="mx-auto mb-1 h-4 w-4" /> : <Lock className="mx-auto mb-1 h-4 w-4" />}{index + 1}. {step.replaceAll("_", " ")}</div>)}</div>
    </CardContent></Card>

    <div className="grid gap-6 lg:grid-cols-3"><div className="space-y-5 lg:col-span-2">
      <Card><CardHeader><CardTitle>Request & Operation</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm md:grid-cols-2">
        <Info label="Customer" value={request.customer_name ?? "—"} /><Info label="Boat" value={request.boat_name ?? "—"} /><Info label="Request menu" value={request.request_type?.replaceAll("_", " ") ?? request.category} /><Info label="Operator" value={request.operator_type?.replaceAll("_", " ") ?? request.execution_type} />
        <Info label="Haul-out" value={request.confirmed_haul_out_date ? formatDate(request.confirmed_haul_out_date) : "—"} /><Info label="Launch" value={request.confirmed_launch_date ? formatDate(request.confirmed_launch_date) : "Open / not confirmed"} />
        {request.operator_type === "BOAT_OWNER_CONTRACTOR" && <Info label="Contractor insurance" value={request.insurance_status ?? "REQUESTED"} />}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Ordered Rate-card Items <HelpHint title="Quotation order">These rows are the source order used to auto-generate the Draft quotation. Rates and direct costs are snapshotted on the quotation.</HelpHint></CardTitle></CardHeader><CardContent className="space-y-2">{request.items?.map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-md border p-3 text-sm"><div><p className="font-medium">{item.description}</p><p className="text-xs text-gray-500">{item.pricing_code ?? "Custom"} · {item.operator_type.replaceAll("_", " ")} · cost {formatTHB(item.direct_cost)}</p></div><div className="text-right"><p>{item.qty} {item.unit} × {formatTHB(item.unit_price)}</p><p className="text-xs text-gray-500">Discount {item.discount_pct}%</p></div></div>)}</CardContent></Card>

      {request.execution_type !== "INTERNAL" && <Card className="border-purple-200"><CardHeader><CardTitle>External Work Controls</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p>Procurement: <b>{request.procurement_status}</b></p>{request.operator_type === "BOAT_OWNER_CONTRACTOR" ? <><p>Insurance must be verified before the Service Order can be confirmed.</p>{canVerifyInsurance ? <Button disabled={busy || request.insurance_status === "VERIFIED"} onClick={() => action({ action: "verify_insurance" })}><ShieldCheck className="mr-2 h-4 w-4" />Verify Insurance</Button> : <p className="rounded-md bg-gray-50 p-2 text-xs text-gray-600">Manager or Chief Engineer verifies contractor insurance.</p>}</> : <Button variant="outline" asChild><Link href={`/subcontractor-sourcing/new?service_request_id=${request.id}`}>Open Subcontractor Sourcing</Link></Button>}</CardContent></Card>}
    </div>

    <div className="space-y-5">
      <Card><CardHeader><CardTitle className="text-base">Draft Quotation</CardTitle></CardHeader><CardContent className="space-y-3">{request.quotation_id ? <><p className="text-sm text-gray-600">Created automatically; no customer message has been sent.</p><Button className="w-full" variant="outline" asChild><Link href={`/quotations/${request.quotation_id}`}><ClipboardList className="mr-2 h-4 w-4" />Review Draft</Link></Button></> : <p className="text-sm text-amber-700">Draft not generated.</p>}</CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Payment Gate <HelpHint title="Finance-controlled step">Only Finance, Managing Director, or Super Admin can mark payment/deposit or approve credit. This does not record a bank transfer; use the Invoice/Payment records for the accounting evidence.</HelpHint></CardTitle></CardHeader><CardContent className="space-y-3">
        <Info label="Mode" value={request.payment_mode?.replaceAll("_", " ") ?? "—"} /><Info label="Status" value={request.payment_gate_status?.replaceAll("_", " ") ?? "AWAITING PAYMENT"} />
        {request.payment_plan && <><Info label="Total" value={formatTHB(request.payment_plan.total_amount)} /><Info label="Initial required" value={formatTHB(request.payment_plan.deposit_required_amount)} />{request.payment_plan.first_cycle_due_date && <Info label="First credit cycle due" value={formatDate(request.payment_plan.first_cycle_due_date)} />}</>}
        {canUpdatePayment ? <><select className="w-full rounded-md border p-2 text-sm" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}><option value="PAID">Paid in full</option><option value="DEPOSIT_PAID">Required deposit paid</option><option value="CREDIT_APPROVED">Credit approved</option><option value="OVERDUE">Overdue</option><option value="CREDIT_HOLD">Credit hold</option></select>
        <Button className="w-full" variant="outline" disabled={busy} onClick={() => action({ action: "set_payment_gate", status: paymentStatus })}><CreditCard className="mr-2 h-4 w-4" />Finance: Update Gate</Button></> : <p className="rounded-md bg-gray-50 p-2 text-xs text-gray-600">Finance controls payment, deposit, and credit clearance.</p>}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Service / Work Order</CardTitle></CardHeader><CardContent className="space-y-3">
        {!paymentCleared && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800"><Lock className="mr-1 inline h-4 w-4" />Work Order is locked until payment clearance.</p>}
        {canConfirmService && <Button className="w-full" variant="teal" disabled={busy || !paymentCleared || serviceConfirmed} onClick={() => action({ action: "confirm_service_order" })}><CheckCircle2 className="mr-2 h-4 w-4" />Confirm Service Order</Button>}
        {canCreateWorkOrder ? <Button className="w-full" disabled={busy || !serviceConfirmed} onClick={createWorkOrder}><Wrench className="mr-2 h-4 w-4" />Create Work Order</Button> : <p className="rounded-md bg-gray-50 p-2 text-xs text-gray-600">Chief Engineer or Operations Manager creates the Work Order after Service Order confirmation.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Boat</CardTitle></CardHeader><CardContent><Button variant="outline" className="w-full" asChild><Link href={`/boats/${request.boat_id}`}><Ship className="mr-2 h-4 w-4" />{request.boat_name}</Link></Button></CardContent></Card>
    </div></div>
    <p className="pb-2 text-center text-xs text-gray-400">Live database · {request.reference}</p>
  </div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wide text-gray-400">{label}</p><p className="font-medium text-gray-800">{value}</p></div>
}
