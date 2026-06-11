import { NextResponse } from "next/server"
import { isRealCustomerMessagesEnabled, safeModeResponse } from "@/lib/safe-mode"
import { sendEmail } from "@/lib/email"
import {
  invoiceIssued,
  quotationSent,
  paymentConfirmed,
  workOrderUpdate,
  contractExpiringSoon,
  welcomePortal,
  type InvoiceIssuedData,
  type QuotationSentData,
  type PaymentConfirmedData,
  type WorkOrderUpdateData,
  type ContractExpiringSoonData,
  type WelcomePortalData,
} from "@/lib/email-templates"

export const dynamic = "force-dynamic"

type EmailType =
  | "invoice_issued"
  | "quotation_sent"
  | "payment_confirmed"
  | "work_order_update"
  | "contract_expiring_soon"
  | "welcome_portal"

type SendEmailBody = {
  type: EmailType
  to: string | string[]
  data: Record<string, unknown>
}

function buildHtml(type: EmailType, data: Record<string, unknown>): string {
  switch (type) {
    case "invoice_issued":
      return invoiceIssued(data as unknown as InvoiceIssuedData)
    case "quotation_sent":
      return quotationSent(data as unknown as QuotationSentData)
    case "payment_confirmed":
      return paymentConfirmed(data as unknown as PaymentConfirmedData)
    case "work_order_update":
      return workOrderUpdate(data as unknown as WorkOrderUpdateData)
    case "contract_expiring_soon":
      return contractExpiringSoon(data as unknown as ContractExpiringSoonData)
    case "welcome_portal":
      return welcomePortal(data as unknown as WelcomePortalData)
    default:
      throw new Error(`Unknown email type: ${type}`)
  }
}

const SUBJECT_MAP: Record<EmailType, (data: Record<string, unknown>) => string> = {
  invoice_issued:        (d) => `Invoice ${d.invoiceNumber ?? ""} — Ocean Rover Marina`,
  quotation_sent:        (d) => `Quotation ${d.quotationNumber ?? ""} — Ocean Rover Marina`,
  payment_confirmed:     (d) => `Payment Confirmed — Invoice ${d.invoiceNumber ?? ""}`,
  work_order_update:     (d) => `Work Order ${d.workOrderNumber ?? ""} — Status Update`,
  contract_expiring_soon:(d) => `Contract Expiry Notice — ${d.contractNumber ?? ""}`,
  welcome_portal:        ()  => `Welcome to Ocean Rover Marina Customer Portal`,
}

export async function POST(req: Request) {
  if (!isRealCustomerMessagesEnabled()) {
    return safeModeResponse("ENABLE_REAL_CUSTOMER_MESSAGES")
  }

  try {
    const body = (await req.json()) as SendEmailBody

    if (!body.type || !body.to || !body.data) {
      return NextResponse.json(
        { error: "Missing required fields: type, to, data" },
        { status: 400 },
      )
    }

    const validTypes: EmailType[] = [
      "invoice_issued",
      "quotation_sent",
      "payment_confirmed",
      "work_order_update",
      "contract_expiring_soon",
      "welcome_portal",
    ]
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      )
    }

    const html    = buildHtml(body.type, body.data)
    const subject = SUBJECT_MAP[body.type](body.data)

    const result = await sendEmail({ to: body.to, subject, html })

    if (!result.success) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
