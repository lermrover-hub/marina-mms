import { NextResponse } from "next/server"
import { isRealCustomerMessagesEnabled } from "@/lib/safe-mode"
import { createServerClient } from "@/lib/supabase-server"
import { sendEmail } from "@/lib/email"
import { quotationSent } from "@/lib/email-templates"
import {
  V38_SOURCE_VERSION,
  buildV38PricingRuleFromRow,
  calculateV38PricingLine,
  hasV38PackageConflict,
  type VesselPricingContext,
} from "@/lib/pricing-v38"

export const dynamic = "force-dynamic"

type QuotationLineItem = {
  pricingMasterId?: string
  pricing_master_id?: string
  pricingCode?: string
  pricing_code?: string
  pricingInput?: Record<string, unknown>
  pricing_input?: Record<string, unknown>
  description?: string
  qty?: number
  quantity?: number
  unit?: string
  unitPrice?: number
  unit_price?: number
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customer_id")
    const boatId = searchParams.get("boat_id")
    const supabase = createServerClient()

    let query = supabase.from("mms_quotations").select("*").order("created_at", { ascending: false })
    if (customerId) query = query.eq("customer_id", customerId)
    if (boatId) query = query.eq("boat_id", boatId)

    const { data, error } = await query
    if (error) {
      console.error("[Quotation list error]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = createServerClient()

    // APPROVAL GATE: If this is agent-created, require approval order
    if (body.generated_by === "ai-agent" || body.draft_by_agent) {
      if (!body.ai_order_id) {
        return NextResponse.json(
          { error: "AI-generated quotations must have ai_order_id and be created through approval workflow. Use /api/ai/orders instead." },
          { status: 403 }
        )
      }

      // Check order exists and is approved
      const { data: order, error: orderErr } = await supabase
        .from("ai_orders")
        .select("status")
        .eq("id", body.ai_order_id)
        .single()

      if (orderErr || !order) {
        return NextResponse.json({ error: "Invalid ai_order_id" }, { status: 400 })
      }

      if (order.status !== "approved") {
        return NextResponse.json(
          { error: `AI order must be approved first. Current status: ${order.status}` },
          { status: 403 }
        )
      }
    }

    const customerId = body.customer_id || null
    const boatId = body.boat_id || null

    const [{ data: customer }, { data: boat }] = await Promise.all([
      customerId
        ? supabase
            .from("mms_customers")
            .select("company_name, first_name, last_name, email, line_user_id, whatsapp_number")
            .eq("id", customerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      boatId
        ? supabase
            .from("mms_boats")
            .select("id,name,boat_type,usage_type,loa_ft,weight_t,num_engines")
            .eq("id", boatId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const customerName =
      customer?.company_name ??
      ([customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || null)

    const rawItems: QuotationLineItem[] = Array.isArray(body.items) ? body.items : []
    const normalizedItems = rawItems.map((item, index) => {
      const qty = Number(item.qty ?? item.quantity ?? 1)
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0)
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid quantity or unit price at quotation line ${index + 1}`)
      }
      return {
        ...item,
        qty,
        unitPrice,
        pricingMasterId: String(item.pricingMasterId ?? item.pricing_master_id ?? "").trim() || null,
        pricingCode: String(item.pricingCode ?? item.pricing_code ?? "").trim() || null,
        pricingInput: item.pricingInput ?? item.pricing_input ?? null,
      }
    })

    const pricingIds = [...new Set(normalizedItems.map((item) => item.pricingMasterId).filter((id): id is string => Boolean(id)))]
    const pricingCodes = [...new Set(normalizedItems.map((item) => item.pricingCode).filter((code): code is string => Boolean(code)))]
    const pricingSelect = "id,code,service_name_en,unit,rate_thb,full_rate_thb,direct_cost_thb,revenue_gl_code,cost_gl_code,pnl_category,cost_pnl_category,source_version,effective_date,updated_at,quote_allowed,service_group,vessel_category,vessel_tier,loa_min_ft,loa_max_ft,max_weight_t,engine_min,engine_max,duration_code,duration_days,rate_basis,cap_thb,is_package,package_inclusions,capacity_note"
    const [{ data: pricingByIdRows, error: pricingByIdError }, { data: pricingByCodeRows, error: pricingByCodeError }] = await Promise.all([
      pricingIds.length > 0
        ? supabase.from("pricing_master").select(pricingSelect).in("id", pricingIds)
        : Promise.resolve({ data: [], error: null }),
      pricingCodes.length > 0
        ? supabase.from("pricing_master").select(pricingSelect).in("code", pricingCodes).eq("is_active", true).order("effective_date", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ])
    const pricingLookupError = pricingByIdError ?? pricingByCodeError
    if (pricingLookupError) return NextResponse.json({ error: pricingLookupError.message }, { status: 500 })

    const pricingById = new Map((pricingByIdRows ?? []).map((row) => [String(row.id), row]))
    const pricingByCode = new Map<string, NonNullable<typeof pricingByCodeRows>[number]>()
    for (const row of pricingByCodeRows ?? []) if (!pricingByCode.has(String(row.code))) pricingByCode.set(String(row.code), row)

    const missingPricingRefs = normalizedItems
      .filter((item) => (item.pricingMasterId || item.pricingCode) && !(item.pricingMasterId ? pricingById.get(item.pricingMasterId) : item.pricingCode ? pricingByCode.get(item.pricingCode) : null))
      .map((item) => item.pricingMasterId ?? item.pricingCode)
    if (missingPricingRefs.length > 0) {
      return NextResponse.json({ error: `Unknown pricing reference: ${missingPricingRefs.join(", ")}` }, { status: 400 })
    }

    const vessel: VesselPricingContext = {
      boatId: boat?.id ?? boatId,
      boatName: boat?.name ?? null,
      boatType: boat?.boat_type ?? null,
      usageType: boat?.usage_type ?? null,
      loaFt: boat?.loa_ft ?? null,
      weightT: boat?.weight_t ?? null,
      numEngines: boat?.num_engines ?? null,
    }

    const resolvedItems = normalizedItems.map((item) => {
      const pricing = item.pricingMasterId
        ? pricingById.get(item.pricingMasterId)
        : item.pricingCode
          ? pricingByCode.get(item.pricingCode)
          : null
      if (!pricing) return { ...item, pricing: null, pricingRule: null, calculatedRate: item.qty * item.unitPrice, capAppliedThb: null }
      if (item.pricingCode && String(pricing.code) !== item.pricingCode) throw new Error(`Pricing ID/code mismatch for ${item.pricingCode}`)

      const pricingRule = buildV38PricingRuleFromRow(pricing)
      const calculation = calculateV38PricingLine({
        id: String(pricing.id),
        code: String(pricing.code),
        serviceNameEn: String(pricing.service_name_en ?? pricing.code),
        unit: String(pricing.unit ?? item.unit ?? "item"),
        rateThb: Number(pricing.rate_thb ?? 0),
        sourceVersion: pricing.source_version,
        quoteAllowed: pricing.quote_allowed,
        pricingRule,
      }, vessel)
      if (!calculation.eligible) throw new Error(`${pricing.code}: ${calculation.reason ?? "Rate requires manager review"}`)

      return {
        ...item,
        qty: pricing.source_version === V38_SOURCE_VERSION ? calculation.quantity : item.qty,
        unitPrice: pricing.source_version === V38_SOURCE_VERSION ? calculation.unitPrice : item.unitPrice,
        unit: pricing.source_version === V38_SOURCE_VERSION ? calculation.unit : item.unit,
        pricing,
        pricingRule,
        pricingInput: pricing.source_version === V38_SOURCE_VERSION ? calculation.pricingInput : item.pricingInput,
        calculatedRate: calculation.lineTotal,
        capAppliedThb: calculation.capAppliedThb,
      }
    })

    const packageConflict = hasV38PackageConflict(resolvedItems
      .filter((item) => item.pricing)
      .map((item) => ({ code: String(item.pricing!.code), pricingRule: item.pricingRule })))
    if (packageConflict) return NextResponse.json({ error: packageConflict }, { status: 409 })

    const calculatedSubtotal = resolvedItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0)
    const subtotal = normalizedItems.length > 0 ? calculatedSubtotal : Number(body.subtotal ?? 0)
    const hasExplicitDiscountType = body.discount_type !== undefined && body.discount_type !== null
    const discountType = String(body.discount_type ?? "NONE").toUpperCase()
    const discountValue = Number(body.discount_value ?? 0)
    const discount = discountType === "PERCENT"
      ? Math.round(subtotal * discountValue / 100)
      : discountType === "FIXED"
        ? discountValue
        : hasExplicitDiscountType
          ? 0
          : Number(body.discount_amount ?? body.discount ?? 0)
    const vatRate = Number(body.tax_rate ?? 7)
    const afterDiscount = subtotal - discount
    const vatAmount = Math.round(afterDiscount * vatRate / 100)
    const totalAmount = afterDiscount + vatAmount
    const depositPct = Number(body.deposit_pct ?? 0)
    const depositAmount = body.deposit_pct !== undefined
      ? Math.round(totalAmount * depositPct / 100)
      : Number(body.deposit_req ?? body.deposit_amount ?? 0)

    if (
      ![subtotal, discount, vatRate, vatAmount, totalAmount, depositAmount].every(Number.isFinite)
      || subtotal < 0
      || discount < 0
      || discount > subtotal
      || vatRate < 0
      || vatRate > 100
      || depositAmount < 0
      || depositAmount > totalAmount
    ) {
      return NextResponse.json({ error: "Invalid quotation financial values" }, { status: 400 })
    }
    const status = body.status === "SENT" ? "SENT" : "DRAFT"
    const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0
    const discountLevel =
      discountPercent >= 10 && discountPercent <= 15 ? "L1" :
      discountPercent >= 6 && discountPercent < 10 ? "L2" :
      discountPercent >= 3 && discountPercent < 6 ? "L3" :
      discountPercent > 15 ? "BLOCKED" : null
    const customizeBooking = String(body.customize_booking ?? "").trim()
    const managerName = String(body.manager_approval_name ?? "").trim()
    const managerSignature = String(body.manager_approval_signature ?? "").trim()

    if (status === "SENT") {
      if (!customerId) {
        return NextResponse.json({ error: "Cannot send quotation: customer is required." }, { status: 409 })
      }
      const hasDeliveryChannel = !!(customer?.email || customer?.line_user_id || customer?.whatsapp_number)
      if (!hasDeliveryChannel) {
        return NextResponse.json({ error: "Cannot send quotation: customer has no email, LINE user ID, or WhatsApp number." }, { status: 409 })
      }
      if (discountLevel === "BLOCKED") {
        return NextResponse.json({ error: "Cannot send quotation: discount above 15% is outside approval limits." }, { status: 409 })
      }
      if ((customizeBooking || discountPercent >= 3) && (!managerName || !managerSignature)) {
        return NextResponse.json({ error: "Cannot send quotation: manager name and signature are required for customized booking or L1/L2/L3 discount." }, { status: 409 })
      }
    }

    const { data, error } = await supabase
      .from("mms_quotations")
      .insert({
        quote_number: body.quote_number ?? `DRAFT-${Date.now()}`,
        customer_id: customerId,
        customer_name: customerName,
        boat_id: boatId,
        boat_name: boat?.name ?? null,
        sr_id: body.service_request_id ?? body.sr_id ?? null,
        title: body.title ?? null,
        status,
        subtotal,
        discount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        pricing_source_version: (() => {
          const versions = [...new Set(resolvedItems
            .map((item) => item.pricing?.source_version)
            .filter((value): value is string => Boolean(value)))]
          return versions.length === 0 ? null : versions.length === 1 ? versions[0] : "MIXED"
        })(),
        pricing_context: {
          vessel,
          generated_at: new Date().toISOString(),
        },
        valid_until: body.valid_until ?? null,
        notes: body.notes ?? null,
        created_at: body.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (resolvedItems.length > 0) {
      const items = resolvedItems.map((item, index) => {
        const pricing = item.pricing
        return {
          quotation_id: data.id,
          description: item.description ?? "",
          qty: item.qty,
          unit: item.unit ?? "item",
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
          pricing_rule_snapshot: item.pricingRule,
          pricing_input_snapshot: item.pricingInput,
          calculated_rate_thb: item.calculatedRate,
          cap_applied_thb: item.capAppliedThb,
          manual_override_thb: null,
          override_reason: null,
          override_approved_by: null,
          override_approved_at: null,
          // line_total omitted — generated column in production schema
          sort_order: index + 1,
        }
      })

      const { error: itemError } = await supabase
        .from("mms_quotation_items")
        .insert(items)

      if (itemError) {
        console.error("[Quotation item create error]", itemError)
        await supabase.from("mms_quotations").delete().eq("id", data.id)
        return NextResponse.json({ error: itemError.message }, { status: 500 })
      }
    }

    // Email is only sent for explicit Send flow, and only when real messages are enabled.
    if (isRealCustomerMessagesEnabled()) try {
      if (status === "SENT" && data?.customer_id) {
        const recipientEmail = customer?.email
        const recipientName = customerName ?? "Valued Customer"

        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `Quotation ${data.quote_number ?? data.id} - Ocean Rover Marina`,
            html: quotationSent({
              customerName: recipientName,
              quotationNumber: data.quote_number ?? String(data.id),
              serviceDescription: data.title ?? "Marina Services",
              totalAmount: Number(data.total_amount ?? 0),
              currency: "THB",
              validUntil: data.valid_until
                ? new Date(data.valid_until).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-",
              quotationUrl: `${process.env.NEXTAUTH_URL ?? ""}/quotations/${data.id}`,
            }),
          })
        }
      }
    } catch (emailErr) {
      console.error("[Quotation email trigger error]", emailErr)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error("[Quotation API unexpected error]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
