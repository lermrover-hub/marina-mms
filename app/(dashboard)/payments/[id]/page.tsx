import React from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FileText, User, CalendarDays, Hash, ArrowLeft, Printer } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getPayment } from "@/lib/db"
import { formatDate, formatTHB } from "@/lib/utils"

export const dynamic = "force-dynamic"

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_CARD: "Credit Card",
  QR_PAYMENT: "QR Payment",
  CHEQUE: "Cheque",
  Cash: "Cash",
  "Bank Transfer": "Bank Transfer",
  "Credit Card": "Credit Card",
  "QR Payment": "QR Payment",
  Cheque: "Cheque",
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-600",
  refunded: "bg-purple-100 text-purple-700",
}

function statusLabel(status: string) {
  return status.toLowerCase()
}

function methodLabel(method: string) {
  return METHOD_LABELS[method] ?? method.replace(/_/g, " ")
}

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon: React.ElementType
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 p-4">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-teal-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <div className="mt-1 text-sm font-medium text-gray-900">{value}</div>
      </div>
    </div>
  )
}

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payment = await getPayment(id)
  if (!payment) notFound()

  const status = statusLabel(payment.status)
  const customer = payment.customer_name ?? "Unknown customer"

  return (
    <div className="space-y-6">
      <PageHeader
        title={payment.reference_no ?? payment.id}
        breadcrumb={[
          { label: "Payments", href: "/payments" },
          { label: payment.reference_no ?? payment.id },
        ]}
        actions={
          <div className="flex gap-2">
            {payment.status === "CONFIRMED" && (
              <Button variant="teal" size="sm" asChild>
                <Link href={`/print/receipts/${payment.id}`} target="_blank" rel="noopener noreferrer">
                  <Printer className="h-4 w-4 mr-1" /> Print Receipt
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/payments">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{formatTHB(payment.amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-600"}`}>
              {status}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Method</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{methodLabel(payment.payment_method)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailRow
            label="Customer"
            icon={User}
            value={
              payment.customer_id ? (
                <Link href={`/customers/${payment.customer_id}`} className="text-teal-700 hover:underline">
                  {customer}
                </Link>
              ) : (
                customer
              )
            }
          />
          <DetailRow
            label="Invoice"
            icon={FileText}
            value={
              payment.invoice_id ? (
                <Link href={`/invoices/${payment.invoice_id}`} className="font-mono text-teal-700 hover:underline">
                  {payment.invoice_id}
                </Link>
              ) : (
                "No invoice linked"
              )
            }
          />
          <DetailRow label="Payment Date" icon={CalendarDays} value={formatDate(payment.payment_date)} />
          <DetailRow label="Reference No." icon={Hash} value={payment.reference_no ?? "-"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{payment.notes || "No notes recorded for this payment."}</p>
        </CardContent>
      </Card>
    </div>
  )
}
