import { SITE_URL } from "./email"

// ─── Shared helpers ────────────────────────────────────────────────────────

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background: #f0f4f5; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.09);">
    <!-- Header -->
    <div style="background: #13988f; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">&#9875; Ocean Rover Marina</h1>
      <p style="color: #ccf0ee; margin: 6px 0 0; font-size: 13px;">Marina &amp; Boat Yard Management</p>
    </div>
    <!-- Body -->
    <div style="padding: 32px 36px;">
      ${body}
    </div>
    <!-- Footer -->
    <div style="background: #f7f9fa; border-top: 1px solid #e8ecee; padding: 16px 32px; text-align: center; color: #9aa5b1; font-size: 11px; line-height: 1.6;">
      <p style="margin: 0;">Ocean Rover Marina &middot; Ko Samui, Surat Thani, Thailand 84330</p>
      <p style="margin: 2px 0 0;">Tel: +66 82 878 9149 &middot; <a href="mailto:info@oceanrovermarina.com" style="color: #13988f; text-decoration: none;">info@oceanrovermarina.com</a></p>
      <p style="margin: 6px 0 0; font-size: 10px; color: #b0bec5;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`
}

function infoBox(rows: { label: string; value: string }[]): string {
  return `<div style="background: #f7f9fa; border: 1px solid #e5eaec; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
    ${rows
      .map(
        (r) =>
          `<p style="margin: 0 0 8px; font-size: 14px; color: #374151;">
        <strong style="color: #1f2937;">${r.label}:</strong>&nbsp;${r.value}
      </p>`,
      )
      .join("")
      .replace(/<p([^>]*)>([^<]*<\/p>)$/, "<p$1 style='margin:0; font-size:14px; color:#374151;'>$2")}
  </div>`
}

function ctaButton(text: string, url: string): string {
  return `<p style="margin: 24px 0 0;">
    <a href="${url}" style="display: inline-block; background: #13988f; color: #ffffff; padding: 13px 28px; border-radius: 7px; text-decoration: none; font-weight: bold; font-size: 14px; letter-spacing: 0.3px;">${text} &#8594;</a>
  </p>`
}

function greeting(customerName: string): string {
  return `<p style="font-size: 15px; color: #374151; margin: 0 0 8px;">Dear <strong>${customerName}</strong>,</p>`
}

// ─── 1. Invoice Issued ─────────────────────────────────────────────────────

export type InvoiceIssuedData = {
  customerName: string
  invoiceNumber: string
  amount: number
  currency?: string
  dueDate: string
  invoiceUrl?: string
}

export function invoiceIssued(data: InvoiceIssuedData): string {
  const currency = data.currency ?? "THB"
  const url = data.invoiceUrl ?? `${SITE_URL}/invoices`
  const body = `
    <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">Invoice Issued</h2>
    ${greeting(data.customerName)}
    <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0;">An invoice has been issued for your account. Please review the details and arrange payment before the due date.</p>
    ${infoBox([
      { label: "Invoice Number", value: data.invoiceNumber },
      { label: "Amount Due", value: `${currency} ${data.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: "Due Date", value: data.dueDate },
    ])}
    <p style="font-size: 13px; color: #9aa5b1; margin: 16px 0 0;">Please use bank transfer or QR payment. Reference your invoice number in the payment description.</p>
    ${ctaButton("View Invoice", url)}
  `
  return baseLayout(`Invoice ${data.invoiceNumber} — Ocean Rover Marina`, body)
}

// ─── 2. Quotation Sent ─────────────────────────────────────────────────────

export type QuotationSentData = {
  customerName: string
  quotationNumber: string
  serviceDescription: string
  totalAmount: number
  currency?: string
  validUntil: string
  quotationUrl?: string
}

export function quotationSent(data: QuotationSentData): string {
  const currency = data.currency ?? "THB"
  const url = data.quotationUrl ?? `${SITE_URL}/quotations`
  const body = `
    <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">Quotation for Your Review</h2>
    ${greeting(data.customerName)}
    <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0;">We have prepared a quotation for the services requested. Please review and approve at your earliest convenience.</p>
    ${infoBox([
      { label: "Quotation Number", value: data.quotationNumber },
      { label: "Service", value: data.serviceDescription },
      { label: "Total Amount", value: `${currency} ${data.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: "Valid Until", value: data.validUntil },
    ])}
    <p style="font-size: 13px; color: #9aa5b1; margin: 16px 0 0;">This quotation is valid until the date shown above. Work will commence only after written approval and any required deposit payment.</p>
    ${ctaButton("View & Approve Quotation", url)}
  `
  return baseLayout(`Quotation ${data.quotationNumber} — Ocean Rover Marina`, body)
}

// ─── 3. Payment Confirmed ──────────────────────────────────────────────────

export type PaymentConfirmedData = {
  customerName: string
  invoiceNumber: string
  paymentAmount: number
  paymentDate: string
  paymentMethod: string
  currency?: string
  receiptUrl?: string
  outstandingBalance?: number
}

export function paymentConfirmed(data: PaymentConfirmedData): string {
  const currency = data.currency ?? "THB"
  const url = data.receiptUrl ?? `${SITE_URL}/invoices`
  const rows: { label: string; value: string }[] = [
    { label: "Invoice Number", value: data.invoiceNumber },
    { label: "Payment Amount", value: `${currency} ${data.paymentAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: "Payment Date", value: data.paymentDate },
    { label: "Payment Method", value: data.paymentMethod },
  ]
  if (data.outstandingBalance !== undefined) {
    rows.push({
      label: "Outstanding Balance",
      value: `${currency} ${data.outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    })
  }
  const body = `
    <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">Payment Confirmed</h2>
    ${greeting(data.customerName)}
    <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0;">We have received your payment. Thank you for settling your account promptly.</p>
    ${infoBox(rows)}
    ${ctaButton("View Receipt", url)}
  `
  return baseLayout(`Payment Confirmed — ${data.invoiceNumber}`, body)
}

// ─── 4. Work Order Update ─────────────────────────────────────────────────

export type WorkOrderUpdateData = {
  customerName: string
  workOrderNumber: string
  boatName: string
  newStatus: string
  statusNote?: string
  workOrderUrl?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved:           { label: "Approved",            color: "#059669" },
  in_progress:        { label: "In Progress",          color: "#2563eb" },
  waiting_parts:      { label: "Waiting for Parts",   color: "#d97706" },
  waiting_contractor: { label: "Waiting for Contractor", color: "#d97706" },
  completed:          { label: "Completed",            color: "#13988f" },
  on_hold:            { label: "On Hold",              color: "#6b7280" },
  cancelled:          { label: "Cancelled",            color: "#dc2626" },
}

export function workOrderUpdate(data: WorkOrderUpdateData): string {
  const url = data.workOrderUrl ?? `${SITE_URL}/work-orders`
  const statusInfo = STATUS_LABELS[data.newStatus.toLowerCase()] ?? {
    label: data.newStatus,
    color: "#374151",
  }
  const statusBadge = `<span style="display:inline-block; background:${statusInfo.color}; color:#fff; border-radius:99px; padding:3px 12px; font-size:12px; font-weight:bold;">${statusInfo.label}</span>`
  const rows: { label: string; value: string }[] = [
    { label: "Work Order", value: data.workOrderNumber },
    { label: "Vessel", value: data.boatName },
    { label: "New Status", value: statusBadge },
  ]
  if (data.statusNote) {
    rows.push({ label: "Note", value: data.statusNote })
  }
  const body = `
    <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">Work Order Status Update</h2>
    ${greeting(data.customerName)}
    <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0;">The status of your repair / service job has been updated. Please see the details below.</p>
    ${infoBox(rows)}
    ${ctaButton("View Work Order", url)}
  `
  return baseLayout(`Work Order Update — ${data.workOrderNumber}`, body)
}

// ─── 5. Contract Expiring Soon ────────────────────────────────────────────

export type ContractExpiringSoonData = {
  customerName: string
  contractNumber: string
  contractType: string
  boatName?: string
  berthOrSlot?: string
  expiryDate: string
  daysRemaining: number
  renewalUrl?: string
}

export function contractExpiringSoon(data: ContractExpiringSoonData): string {
  const url = data.renewalUrl ?? `${SITE_URL}/contracts`
  const rows: { label: string; value: string }[] = [
    { label: "Contract Number", value: data.contractNumber },
    { label: "Contract Type", value: data.contractType },
    { label: "Expiry Date", value: data.expiryDate },
    {
      label: "Days Remaining",
      value: `<span style="font-weight:bold; color:${data.daysRemaining <= 7 ? "#dc2626" : "#d97706"};">${data.daysRemaining} days</span>`,
    },
  ]
  if (data.boatName) rows.splice(2, 0, { label: "Vessel", value: data.boatName })
  if (data.berthOrSlot) rows.splice(3, 0, { label: "Berth / Slot", value: data.berthOrSlot })
  const body = `
    <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">Contract Expiring Soon</h2>
    ${greeting(data.customerName)}
    <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0;">Your marina contract is approaching its expiry date. Please contact us to arrange renewal and avoid any interruption to your berth or storage arrangement.</p>
    ${infoBox(rows)}
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #92400e;">
      &#9888;&nbsp; Please arrange renewal at least 7 days before expiry to keep your current berth or slot.
    </div>
    ${ctaButton("Renew Contract", url)}
  `
  return baseLayout(`Contract Expiry Notice — ${data.contractNumber}`, body)
}

// ─── 6. Welcome to Customer Portal ────────────────────────────────────────

export type WelcomePortalData = {
  customerName: string
  loginEmail: string
  temporaryPassword?: string
  portalUrl?: string
}

export function welcomePortal(data: WelcomePortalData): string {
  const url = data.portalUrl ?? SITE_URL
  const credRows: { label: string; value: string }[] = [
    { label: "Portal URL", value: `<a href="${url}" style="color:#13988f;">${url}</a>` },
    { label: "Login Email", value: data.loginEmail },
  ]
  if (data.temporaryPassword) {
    credRows.push({
      label: "Temporary Password",
      value: `<code style="background:#f3f4f6; padding:2px 6px; border-radius:4px; font-size:13px;">${data.temporaryPassword}</code>`,
    })
  }
  const body = `
    <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">Welcome to Ocean Rover Marina</h2>
    ${greeting(data.customerName)}
    <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0;">Your customer portal account has been created. You can now manage your vessels, view invoices, approve quotations, and submit service requests online.</p>
    ${infoBox(credRows)}
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #15803d;">
      &#128274;&nbsp; For security, please change your password after your first login.
    </div>
    <p style="font-size: 13px; color: #6b7280; margin: 16px 0 0;">Through the portal you can: view your boats &amp; documents, submit service requests, book ramp services, review and approve quotations, and check invoice &amp; payment status.</p>
    ${ctaButton("Access Customer Portal", url)}
  `
  return baseLayout("Welcome to Ocean Rover Marina Customer Portal", body)
}
