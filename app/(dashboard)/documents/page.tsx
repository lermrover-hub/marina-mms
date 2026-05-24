"use client"
import React from "react"
import Link from "next/link"
import { FileText, Printer, Anchor, Wrench, ShieldCheck, FileSignature, Receipt, ClipboardList } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"

const DOCS: DocItem[] = [
  {
    title: "Berthing Registration Form",
    description: "ใบลงทะเบียนจอดเรือ (Wet Berth) — พร้อมข้อกำหนดสัญญา",
    href: "/documents/berthing-form",
    icon: <Anchor className="h-6 w-6" />,
    color: "bg-blue-100 text-blue-700",
    category: "Marina Operations",
  },
  {
    title: "Hardstand Service Form",
    description: "ใบขอใช้บริการ Hardstand / ลานจอดบก / ยกเรือขึ้น-ลง",
    href: "/documents/hardstand-form",
    icon: <Wrench className="h-6 w-6" />,
    color: "bg-orange-100 text-orange-700",
    category: "Boat Yard",
  },
  {
    title: "Berth Contract",
    description: "สัญญาจอดเรือ — Wet Berth / Dry Storage / Service Agreement",
    href: "/contracts",
    icon: <FileSignature className="h-6 w-6" />,
    color: "bg-teal-100 text-teal-700",
    category: "Marina Operations",
    listLink: true,
    listLabel: "Open Contracts →",
  },
  {
    title: "Ramp Service Confirmation",
    description: "ยืนยันการจอง Launch / Retrieval — พิมพ์จากรายการ Ramp Booking",
    href: "/ramp-bookings",
    icon: <FileSignature className="h-6 w-6" />,
    color: "bg-cyan-100 text-cyan-700",
    category: "Marina Operations",
    listLink: true,
    listLabel: "Open Ramp Bookings →",
  },
  {
    title: "Service Request Form",
    description: "ใบแจ้งซ่อมเรือ — สำหรับลูกค้าส่งให้ช่างซ่อม",
    href: "/documents/service-request-form",
    icon: <ClipboardList className="h-6 w-6" />,
    color: "bg-purple-100 text-purple-700",
    category: "Boat Yard",
    soon: true,
  },
  {
    title: "Quotation",
    description: "ใบเสนอราคาค่าบริการ — พิมพ์จากรายการ Quotations",
    href: "/quotations",
    icon: <FileText className="h-6 w-6" />,
    color: "bg-amber-100 text-amber-700",
    category: "Finance",
    listLink: true,
    listLabel: "Open Quotations →",
  },
  {
    title: "Invoice / Receipt",
    description: "ใบแจ้งหนี้ / ใบเสร็จรับเงิน — พิมพ์จากรายการ Invoices",
    href: "/invoices",
    icon: <Receipt className="h-6 w-6" />,
    color: "bg-green-100 text-green-700",
    category: "Finance",
    listLink: true,
    listLabel: "Open Invoices →",
  },
  {
    title: "Incident Report",
    description: "แบบรายงานอุบัติเหตุและเหตุการณ์ความปลอดภัย",
    href: "/documents/incident-report",
    icon: <ShieldCheck className="h-6 w-6" />,
    color: "bg-red-100 text-red-700",
    category: "Safety",
    soon: true,
  },
]

type DocItem = {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
  category: string
  soon?: boolean
  listLink?: boolean
  listLabel?: string
}

const CATEGORIES = ["All", "Marina Operations", "Boat Yard", "Finance", "Safety"]

export default function DocumentsPage() {
  const [cat, setCat] = React.useState("All")
  const filtered = DOCS.filter(d => cat === "All" || d.category === cat)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Templates"
        description="แม่แบบเอกสารทางการ Ocean Rover Marina — สำหรับพิมพ์และลงนาม"
      />

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${cat === c ? "bg-navy-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc) => (
          <Card key={doc.title} className={`relative overflow-hidden ${doc.soon ? "opacity-60" : "hover:shadow-md transition-shadow"}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`rounded-xl p-3 ${doc.color}`}>{doc.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{doc.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
                  <span className="text-[10px] text-gray-400 mt-1 inline-block">{doc.category}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {doc.soon ? (
                  <span className="text-xs text-gray-400 italic">— Coming soon —</span>
                ) : doc.listLink ? (
                  <Link href={doc.href}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-medium py-2 hover:bg-teal-100 transition-colors">
                    <FileText className="h-3.5 w-3.5" />{doc.listLabel ?? "Open →"}
                  </Link>
                ) : (
                  <>
                    <Link href={doc.href}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-medium py-2 hover:bg-teal-100 transition-colors">
                      <FileText className="h-3.5 w-3.5" />Preview
                    </Link>
                    <Link href={`${doc.href}?print=1`} target="_blank"
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-xs font-medium px-3 py-2 hover:bg-gray-100 transition-colors">
                      <Printer className="h-3.5 w-3.5" />Print
                    </Link>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
