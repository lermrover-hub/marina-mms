import { NextResponse } from "next/server"
import { sendEmail, isEmailConfigured } from "@/lib/email"
import { invoiceIssued } from "@/lib/email-templates"

export const dynamic = "force-dynamic"

export async function GET() {
  const configured = isEmailConfigured()

  if (!configured) {
    return NextResponse.json({
      configured: false,
      message:
        "Set RESEND_API_KEY environment variable to enable emails. Add it to your .env.local file or Vercel environment variables.",
    })
  }

  // Determine test recipient
  const testTo =
    process.env.EMAIL_TEST_TO ??
    process.env.EMAIL_FROM?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.at(0) ??
    "admin@marina-mms.com"

  try {
    const html = invoiceIssued({
      customerName:  "Test User",
      invoiceNumber: "INV-TEST-001",
      amount:        12500,
      currency:      "THB",
      dueDate:       new Date(Date.now() + 14 * 86_400_000).toLocaleDateString("en-GB", {
        day:   "2-digit",
        month: "short",
        year:  "numeric",
      }),
      invoiceUrl: process.env.NEXTAUTH_URL ?? "https://marina-mms.vercel.app/invoices",
    })

    const result = await sendEmail({
      to:      testTo,
      subject: "[TEST] Email Configuration — Ocean Rover Marina",
      html,
    })

    return NextResponse.json({
      configured: true,
      sent:       result.success,
      to:         testTo,
      id:         result.id,
      message:    result.success
        ? `Test email sent successfully to ${testTo}`
        : "Email configuration appears correct but sending failed — check Resend dashboard for details",
    })
  } catch (e) {
    return NextResponse.json(
      { configured: true, sent: false, error: String(e) },
      { status: 500 },
    )
  }
}
