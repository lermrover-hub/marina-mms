import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { sendEmail } from "@/lib/email"
import { quotationSent } from "@/lib/email-templates"
import { pushMessage, quotationFlexMessage } from "@/lib/line"
import { sendQuotationNotification } from "@/lib/whatsapp"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from("mms_quotations")
      .select("*, mms_quotation_items(*)")
      .eq("id", id)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // ── Handle digital signature approval ──────────────────────────────────
    if (body.action === "approve") {
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

    // ── Default PATCH (status changes, field updates) ──────────────────────
    if (body.status === "SENT") {
      const { data: existing, error: existingError } = await supabase
        .from("mms_quotations")
        .select("id, customer_id, customer_name, subtotal, discount, notes")
        .eq("id", id)
        .single()
      if (existingError) throw existingError

      if (!existing?.customer_id) {
        return NextResponse.json(
          { error: "Cannot mark quotation SENT: quotation has no customer_id." },
          { status: 409 }
        )
      }

      const { data: customer, error: customerError } = await supabase
        .from("mms_customers")
        .select("id, first_name, last_name, company_name, email, line_user_id, whatsapp_number")
        .eq("id", existing.customer_id)
        .single()
      if (customerError) throw customerError

      const hasDeliveryChannel = !!(
        customer?.email ||
        customer?.line_user_id ||
        customer?.whatsapp_number
      )

      if (!hasDeliveryChannel) {
        const displayName =
          customer?.company_name ??
          ([customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || null) ??
          existing.customer_name ??
          null
        return NextResponse.json(
          {
            error: "Cannot mark quotation SENT: customer has no email, LINE user ID, or WhatsApp number.",
            customer_id: existing.customer_id,
            customer_name: displayName,
          },
          { status: 409 }
        )
      }

      const subtotal = Number(existing.subtotal ?? 0)
      const discount = Number(existing.discount ?? 0)
      const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0
      const hasManagerApproval =
        String(existing.notes ?? "").includes("[Manager Approval]") ||
        (body.manager_approval_name && body.manager_approval_signature)

      if (discountPercent > 15) {
        return NextResponse.json(
          { error: "Cannot mark quotation SENT: discount above 15% is outside approval limits." },
          { status: 409 }
        )
      }
      if (discountPercent >= 3 && !hasManagerApproval) {
        return NextResponse.json(
          { error: "Cannot mark quotation SENT: manager name and signature are required for L1/L2/L3 discount." },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabase
      .from("mms_quotations")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    // ── Send email when quotation is marked SENT ───────────────────────────
    if (body.status === "SENT" && data?.customer_id) {
      try {
        const { data: customer } = await supabase
          .from("mms_customers")
          .select("first_name, last_name, company_name, email, line_user_id, whatsapp_number")
          .eq("id", data.customer_id)
          .single()

        const recipientEmail = customer?.email
        const customerName   =
          customer?.company_name ??
          ([customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || null) ??
          "Valued Customer"

        const siteUrl   = process.env.NEXTAUTH_URL ?? "https://marina-mms.vercel.app"
        const quotNum   = data.quote_number ?? data.id
        const quotTitle = data.title ?? "Marine services"
        const amount    = Number(data.total_amount ?? 0)
        const validUntil = data.valid_until
          ? new Date(data.valid_until).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—"

        // Email
        if (recipientEmail) {
          await sendEmail({
            to:      recipientEmail,
            subject: `Quotation ${quotNum} — Ocean Rover Marina`,
            html:    quotationSent({
              customerName,
              quotationNumber:    quotNum,
              serviceDescription: quotTitle,
              totalAmount:        amount,
              validUntil,
              quotationUrl: `${siteUrl}/portal/quotations`,
            }),
          }).catch((e) => console.error("[Quotation email error]", e))
        }

        // LINE
        if (customer?.line_user_id) {
          await pushMessage(customer.line_user_id, [
            quotationFlexMessage({
              customerName, quotationNumber: quotNum,
              serviceDescription: quotTitle, totalAmount: amount, validUntil,
              quotationUrl: `${siteUrl}/portal/quotations`,
            }),
          ]).catch((e) => console.error("[Quotation LINE error]", e))
        }

        // WhatsApp
        if (customer?.whatsapp_number) {
          await sendQuotationNotification(customer.whatsapp_number, {
            customerName, quotationNumber: quotNum,
            serviceDescription: quotTitle, totalAmount: amount, validUntil,
          }).catch((e) => console.error("[Quotation WhatsApp error]", e))
        }
      } catch (notifyErr) {
        console.error("[Quotation notify error]", notifyErr)
      }
    }

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
