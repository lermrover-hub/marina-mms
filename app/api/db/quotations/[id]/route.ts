import { NextResponse } from "next/server"
import { isRealCustomerMessagesEnabled } from "@/lib/safe-mode"
import { createServerClient } from "@/lib/supabase-server"
import { isEmailConfigured, sendEmail } from "@/lib/email"
import { quotationSent } from "@/lib/email-templates"
import { isLineConfigured, pushMessage, quotationFlexMessage } from "@/lib/line"
import { isWhatsAppConfigured, sendQuotationNotification } from "@/lib/whatsapp"
import {
  concealOtherCustomer,
  PORTAL_READ_ROLES,
  QUOTATION_WRITE_ROLES,
  requireApiActor,
} from "@/lib/api-auth"
import { validateQuotationCreateInput } from "@/lib/quotation-validation"
import {
  canApproveQuotationForLevel,
  CUSTOMER_VISIBLE_QUOTATION_STATUSES,
  validateQuotationTransition,
} from "@/lib/quotation-workflow"
import { minimumQuotationApprover } from "@/lib/service-workflow"
import { QUOTATION_PRICE_EDIT_ROLES, roleAllowed } from "@/lib/workflow-access"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

function isMissingApprovalColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === "PGRST204" || error.code === "42703" ||
    String(error.message ?? "").includes("internal_approval_") ||
    String(error.message ?? "").includes("customer_sent_at")
}

async function updateQuotationWorkflow(
  id: string,
  currentStatus: string,
  update: Record<string, unknown>,
  fallback: Record<string, unknown>,
) {
  const first = await supabase.from("mms_quotations")
    .update(update).eq("id", id).eq("status", currentStatus).select().single()
  if (!isMissingApprovalColumn(first.error)) return first
  return supabase.from("mms_quotations")
    .update(fallback).eq("id", id).eq("status", currentStatus).select().single()
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { id } = await params
    const { data: quotation, error: quotationError } = await supabase
      .from("mms_quotations")
      .select("*")
      .eq("id", id)
      .single()
    if (quotationError) throw quotationError
    const concealed = concealOtherCustomer(access.actor, quotation.customer_id)
    if (concealed) return concealed
    if (
      access.actor.role === "CUSTOMER" &&
      !CUSTOMER_VISIBLE_QUOTATION_STATUSES.includes(quotation.status)
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from("mms_quotation_items")
      .select("*")
      .eq("quotation_id", id)
      .order("sort_order")
    if (itemsError) throw itemsError

    return NextResponse.json({
      ...quotation,
      mms_quotation_items: items ?? [],
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { id } = await params
    const body = await req.json()

    const { data: ownedQuotation, error: ownedQuotationError } = await supabase
      .from("mms_quotations")
      .select("*")
      .eq("id", id)
      .single()
    if (ownedQuotationError) throw ownedQuotationError
    const concealed = concealOtherCustomer(access.actor, ownedQuotation.customer_id)
    if (concealed) return concealed

    // Draft content may be edited only by quotation staff and only while DRAFT.
    if (body.action === "edit_draft") {
      if (!roleAllowed(access.actor.role, QUOTATION_PRICE_EDIT_ROLES)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (ownedQuotation.status !== "DRAFT") {
        return NextResponse.json({ error: "Only a DRAFT quotation can be edited." }, { status: 409 })
      }

      const validationError = validateQuotationCreateInput(body)
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

      const customerId = String(body.customer_id ?? "").trim()
      const boatId = body.boat_id ? String(body.boat_id) : null
      const rawItems: Record<string, unknown>[] = Array.isArray(body.items) ? body.items : []
      const normalizedItems = rawItems.map((item: Record<string, unknown>, index: number) => {
        const qty = Number(item.qty ?? item.quantity ?? 1)
        const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0)
        if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`Invalid quantity or unit price at quotation line ${index + 1}`)
        }
        return {
          description: String(item.description ?? ""),
          qty,
          unitPrice,
          unit: String(item.unit ?? "item"),
          pricingCode: String(item.pricingCode ?? item.pricing_code ?? "").trim() || null,
        }
      })
      if (normalizedItems.length === 0) {
        return NextResponse.json({ error: "At least one quotation line is required." }, { status: 400 })
      }

      const subtotal = normalizedItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0)
      const discountType = String(body.discount_type ?? "NONE").toUpperCase()
      const discountValue = Number(body.discount_value ?? 0)
      const discount = discountType === "PERCENT"
        ? Math.round(subtotal * discountValue / 100)
        : discountType === "FIXED" ? discountValue : 0
      const vatRate = Number(body.tax_rate ?? 7)
      const vatAmount = Math.round((subtotal - discount) * vatRate / 100)
      const totalAmount = subtotal - discount + vatAmount
      const depositPct = Number(body.deposit_pct ?? 0)
      const depositAmount = Math.round(totalAmount * depositPct / 100)
      const effectiveDiscountPct = subtotal > 0 ? discount / subtotal * 100 : 0
      const hasNoChargeLine = normalizedItems.some((item) => item.unitPrice === 0)
      if (
        ![subtotal, discount, vatRate, vatAmount, totalAmount, depositAmount].every(Number.isFinite) ||
        subtotal < 0 || discount < 0 || discount > subtotal || vatRate < 0 || vatRate > 100 ||
        depositPct < 0 || depositPct > 100
      ) {
        return NextResponse.json({ error: "Invalid quotation financial values" }, { status: 400 })
      }

      const [{ data: customer }, { data: boat }] = await Promise.all([
        supabase.from("mms_customers").select("company_name,first_name,last_name").eq("id", customerId).maybeSingle(),
        boatId
          ? supabase.from("mms_boats").select("name").eq("id", boatId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 400 })
      const customerName = customer.company_name ??
        ([customer.first_name, customer.last_name].filter(Boolean).join(" ") || null)

      const pricingCodes = [...new Set(normalizedItems.map((item) => item.pricingCode).filter((code): code is string => Boolean(code)))]
      const { data: pricingRows, error: pricingError } = pricingCodes.length
        ? await supabase
            .from("pricing_master")
            .select("id,code,full_rate_thb,rate_thb,direct_cost_thb,revenue_gl_code,cost_gl_code,pnl_category,cost_pnl_category,source_version,effective_date,updated_at")
            .in("code", pricingCodes)
        : { data: [], error: null }
      if (pricingError) throw pricingError
      const pricingByCode = new Map((pricingRows ?? []).map((row) => [row.code, row]))
      const missingCodes = pricingCodes.filter((code) => !pricingByCode.has(code))
      if (missingCodes.length) {
        return NextResponse.json({ error: `Unknown pricing code: ${missingCodes.join(", ")}` }, { status: 400 })
      }

      const itemRows = normalizedItems.map((item, index) => {
        const pricing = item.pricingCode ? pricingByCode.get(item.pricingCode) : null
        return {
          quotation_id: id,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          unit_price: item.unitPrice,
          discount_pct: 0,
          taxable: vatAmount > 0,
          pricing_master_id: pricing?.id ?? null,
          pricing_code: pricing?.code ?? null,
          full_rate_snapshot_thb: pricing?.full_rate_thb ?? null,
          current_rate_snapshot_thb: pricing?.rate_thb ?? null,
          direct_cost_snapshot_thb: pricing?.direct_cost_thb ?? null,
          revenue_gl_code: pricing?.revenue_gl_code ?? null,
          cost_gl_code: pricing?.cost_gl_code ?? null,
          pnl_category: pricing?.pnl_category ?? null,
          cost_pnl_category: pricing?.cost_pnl_category ?? null,
          pricing_source_version: pricing?.source_version ?? null,
          pricing_effective_date: pricing?.effective_date ?? null,
          pricing_updated_at: pricing?.updated_at ?? null,
          sort_order: index + 1,
        }
      })

      const { error: updateError } = await supabase.from("mms_quotations").update({
        customer_id: customerId,
        customer_name: customerName,
        boat_id: boatId,
        boat_name: boat?.name ?? null,
        sr_id: body.service_request_id ?? body.sr_id ?? null,
        title: String(body.title).trim(),
        subtotal,
        discount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        required_approver_role: minimumQuotationApprover(effectiveDiscountPct, hasNoChargeLine),
        max_discount_pct: effectiveDiscountPct,
        has_no_charge_line: hasNoChargeLine,
        payment_mode: String(body.payment_mode ?? (depositAmount > 0 ? "DEPOSIT" : "FULL_PREPAYMENT")),
        valid_until: body.valid_until ?? null,
        notes: body.notes ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("status", "DRAFT")
      if (updateError) throw updateError

      const { data: oldItems, error: oldItemsError } = await supabase
        .from("mms_quotation_items").select("*").eq("quotation_id", id)
      if (oldItemsError) throw oldItemsError
      const { error: deleteError } = await supabase.from("mms_quotation_items").delete().eq("quotation_id", id)
      if (deleteError) throw deleteError
      const { error: insertError } = await supabase.from("mms_quotation_items").insert(itemRows)
      if (insertError) {
        if (oldItems?.length) await supabase.from("mms_quotation_items").insert(oldItems)
        throw insertError
      }

      const { data: updated, error: updatedError } = await supabase
        .from("mms_quotations").select("*").eq("id", id).single()
      if (updatedError) throw updatedError
      return NextResponse.json(updated)
    }

    if (body.action === "submit_for_approval") {
      if (!QUOTATION_WRITE_ROLES.includes(access.actor.role as (typeof QUOTATION_WRITE_ROLES)[number])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const transitionError = validateQuotationTransition(ownedQuotation.status, body.action, access.actor.role)
      if (transitionError) return NextResponse.json({ error: transitionError }, { status: 409 })
      const requiredApprover = ownedQuotation.required_approver_role === "GENERAL_MANAGER"
        ? "GENERAL_MANAGER" : "MANAGER"
      const updatedAt = new Date().toISOString()
      const { data, error } = await updateQuotationWorkflow(id, "DRAFT", {
        status: "PENDING_APPROVAL",
        internal_approval_status: "PENDING",
        updated_at: updatedAt,
      }, { status: "PENDING_APPROVAL", updated_at: updatedAt })
      if (error) throw error
      const targetRoles = requiredApprover === "GENERAL_MANAGER"
        ? ["MANAGING_DIRECTOR", "SUPER_ADMIN"]
        : ["MARINA_MANAGER", "BOAT_YARD_MANAGER", "MANAGING_DIRECTOR", "SUPER_ADMIN"]
      const { error: notificationError } = await supabase.from("mms_notifications").insert(targetRoles.map((targetRole) => ({
          type: "QUOTATION_APPROVAL",
          title: "Quotation approval required",
          message: `${ownedQuotation.quote_number} is waiting for management approval.`,
          reference_id: id,
          target_role: targetRole,
          priority: "HIGH",
          read: false,
          link: `/quotations/${id}`,
        })))
      if (notificationError) console.error("[Quotation approval notification error]", notificationError)
      return NextResponse.json(data)
    }

    if (body.action === "return_to_draft") {
      const transitionError = validateQuotationTransition(ownedQuotation.status, body.action, access.actor.role)
      if (transitionError) return NextResponse.json({ error: transitionError }, { status: 403 })
      const updatedAt = new Date().toISOString()
      const { data, error } = await updateQuotationWorkflow(id, "PENDING_APPROVAL", {
        status: "DRAFT",
        internal_approval_status: "NOT_SUBMITTED",
        internal_approved_by: null,
        internal_approval_role: null,
        internal_approved_at: null,
        updated_at: updatedAt,
      }, { status: "DRAFT", updated_at: updatedAt })
      if (error) throw error
      return NextResponse.json(data)
    }

    if (body.action === "approve_internal") {
      const transitionError = validateQuotationTransition(ownedQuotation.status, body.action, access.actor.role)
      if (transitionError) return NextResponse.json({ error: transitionError }, { status: 403 })
      const requiredApprover = ownedQuotation.required_approver_role === "GENERAL_MANAGER" ? "GENERAL_MANAGER" : "MANAGER"
      if (!canApproveQuotationForLevel(access.actor.role, requiredApprover)) {
        return NextResponse.json({ error: `${requiredApprover === "GENERAL_MANAGER" ? "General Manager / Super Admin" : "Manager"} approval is required for this discount level.` }, { status: 403 })
      }
      const approvedAt = new Date().toISOString()
      const { data, error } = await updateQuotationWorkflow(id, "PENDING_APPROVAL", {
        status: "APPROVED",
        internal_approval_status: "APPROVED",
        internal_approved_by: access.actor.userId,
        internal_approval_role: access.actor.role,
        internal_approved_at: approvedAt,
        updated_at: approvedAt,
      }, { status: "APPROVED", updated_at: approvedAt })
      if (error) throw error
      return NextResponse.json(data)
    }

    if (body.action === "send_to_customer" || body.action === "approve_and_send") {
      if (!QUOTATION_WRITE_ROLES.includes(access.actor.role as (typeof QUOTATION_WRITE_ROLES)[number])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const transitionError = validateQuotationTransition(ownedQuotation.status, "send_to_customer", access.actor.role)
      if (transitionError) return NextResponse.json({ error: transitionError }, { status: 409 })

      const { data: customer, error: customerError } = await supabase.from("mms_customers")
        .select("first_name,last_name,company_name,email,line_user_id,whatsapp_number")
        .eq("id", ownedQuotation.customer_id).single()
      if (customerError) throw customerError
      const channels = [customer.email, customer.line_user_id, customer.whatsapp_number].filter(Boolean)
      if (!channels.length) {
        return NextResponse.json({
          error: "Customer has no email, LINE user ID, or WhatsApp number. Print the quotation for physical signature or add a contact channel before approval.",
        }, { status: 409 })
      }

      if (!isRealCustomerMessagesEnabled()) {
        return NextResponse.json({
          ...ownedQuotation,
          delivery: { safe_mode: true, sent: false, reason: "ENABLE_REAL_CUSTOMER_MESSAGES is not enabled" },
        })
      }

      const customerName = customer.company_name ??
        ([customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Valued Customer")
      const siteUrl = process.env.NEXTAUTH_URL ?? "https://marina-mms.vercel.app"
      const quotationNumber = ownedQuotation.quote_number ?? id
      const validUntil = ownedQuotation.valid_until
        ? new Date(ownedQuotation.valid_until).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—"
      const deliveries: Promise<boolean>[] = []
      if (customer.email && isEmailConfigured()) deliveries.push(sendEmail({
        to: customer.email,
        subject: `Quotation ${quotationNumber} — Ocean Rover Marina`,
        html: quotationSent({
          customerName,
          quotationNumber,
          serviceDescription: ownedQuotation.title ?? "Marine services",
          totalAmount: Number(ownedQuotation.total_amount ?? 0),
          validUntil,
          quotationUrl: `${siteUrl}/portal/quotations`,
        }),
      }).then((result) => result.success))
      if (customer.line_user_id && isLineConfigured()) deliveries.push(pushMessage(customer.line_user_id, [quotationFlexMessage({
        customerName,
        quotationNumber,
        serviceDescription: ownedQuotation.title ?? "Marine services",
        totalAmount: Number(ownedQuotation.total_amount ?? 0),
        validUntil,
        quotationUrl: `${siteUrl}/portal/quotations`,
      })]).then(() => true))
      if (customer.whatsapp_number && isWhatsAppConfigured()) deliveries.push(sendQuotationNotification(customer.whatsapp_number, {
        customerName,
        quotationNumber,
        serviceDescription: ownedQuotation.title ?? "Marine services",
        totalAmount: Number(ownedQuotation.total_amount ?? 0),
        validUntil,
      }).then((result) => result.success))
      const deliveryResults = await Promise.allSettled(deliveries)
      const delivered = deliveryResults.some((result) => result.status === "fulfilled" && result.value)
      if (!delivered) {
        return NextResponse.json({ error: "Customer delivery failed; quotation remains Pending Approval." }, { status: 502 })
      }
      const sentAt = new Date().toISOString()
      const { data, error } = await updateQuotationWorkflow(id, ownedQuotation.status, {
        status: "SENT",
        internal_approval_status: "APPROVED",
        internal_approved_by: ownedQuotation.internal_approved_by ?? access.actor.userId,
        internal_approval_role: ownedQuotation.internal_approval_role ?? access.actor.role,
        internal_approved_at: ownedQuotation.internal_approved_at,
        customer_sent_at: sentAt,
        updated_at: sentAt,
      }, { status: "SENT", updated_at: sentAt })
      if (error) throw error
      return NextResponse.json({ ...data, delivery: { safe_mode: false, sent: true } })
    }

    if (access.actor.role === "CUSTOMER" && body.action !== "approve" && body.status !== "REJECTED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // ── Handle digital signature approval ──────────────────────────────────
    if (body.action === "approve") {
      const transitionError = validateQuotationTransition(
        ownedQuotation.status,
        "customer_approve",
        access.actor.role,
      )
      if (transitionError) return NextResponse.json({ error: transitionError }, { status: 409 })
      const { signature_data, approved_by_name, approved_at } = body as {
        signature_data?: string
        approved_by_name?: string
        approved_at?: string
      }

      // Build the update payload; try to include signature columns, fall back
      // gracefully if those columns don't exist in the database yet.
      const updatePayload: Record<string, unknown> = {
        status: "ACCEPTED",
        updated_at: new Date().toISOString(),
      }

      if (signature_data)    updatePayload.signature_data    = signature_data
      if (approved_by_name)  updatePayload.approved_by_name  = approved_by_name
      if (approved_at)       updatePayload.approved_at        = approved_at

      const { data, error } = await supabase
        .from("mms_quotations")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        // If the error is about unknown columns (signature columns not yet in DB),
        // retry with status-only update so the approval still succeeds.
        const isColumnError =
          error.message?.includes("signature_data") ||
          error.message?.includes("approved_by_name") ||
          error.message?.includes("approved_at") ||
          error.code === "PGRST204" ||
          error.code === "42703"

        if (isColumnError) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("mms_quotations")
            .update({ status: "ACCEPTED", updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single()

          if (fallbackError) throw fallbackError
          // Merge signature data into response even if not persisted
          return NextResponse.json({
            ...fallbackData,
            signature_data: signature_data ?? null,
            approved_by_name: approved_by_name ?? null,
            approved_at: approved_at ?? null,
          })
        }

        throw error
      }

      return NextResponse.json(data)
    }

    const workflowAction = body.status === "ACCEPTED"
      ? "record_customer_acceptance"
      : body.status === "REJECTED" ? "customer_reject" : ""
    const transitionError = validateQuotationTransition(
      ownedQuotation.status,
      workflowAction,
      access.actor.role,
    )
    if (transitionError) return NextResponse.json({ error: transitionError }, { status: 409 })

    const { data, error } = await supabase.from("mms_quotations")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
