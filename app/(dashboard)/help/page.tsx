"use client"
import React, { useMemo, useState } from "react"
import Link from "next/link"
import {
  Anchor, BarChart3, Bell, CalendarDays, CreditCard, Database,
  FileText, FolderOpen, Globe, HelpCircle, LayoutDashboard, Navigation,
  Package, Receipt, Search, Settings, ShieldAlert, Ship, Users, Wrench, Zap,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type GuideItem = {
  section: string
  title: string
  href: string
  icon: React.ElementType
  purpose: string
  steps: string[]
  tips: string[]
}

const guideItems: GuideItem[] = [
  {
    section: "Overview",
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    purpose: "Monitor marina operations, revenue, open work, alerts, and recent activity in one place.",
    steps: ["Review KPI cards first.", "Check alerts and due items.", "Open linked records from activity lists."],
    tips: ["Use Dashboard as the daily start page for manager review."],
  },
  {
    section: "Customer & Boat Records",
    title: "Customers",
    href: "/customers",
    icon: Users,
    purpose: "Create and maintain customer profiles, contact details, billing data, and linked vessels.",
    steps: ["Search for an existing customer.", "Open customer detail before creating duplicates.", "Use New Customer for new owners/operators."],
    tips: ["Keep company name and phone/email complete for finance and service documents."],
  },
  {
    section: "Customer & Boat Records",
    title: "Boats",
    href: "/boats",
    icon: Ship,
    purpose: "Register real customer vessels and track dimensions, ownership, status, insurance, and location.",
    steps: ["Click Register Boat.", "Select owner and fill identity details.", "Use dimensions for berth, ramp, and yard planning."],
    tips: ["Insurance expiry drives operational alerts; keep it current."],
  },
  {
    section: "Customer & Boat Records",
    title: "Boat Spec DB",
    href: "/boat-specs",
    icon: Database,
    purpose: "Use ready-made boat model specs as templates for fast boat registration and ramp/trailer screening.",
    steps: ["Search brand/model.", "Review LOA, beam, draft, weight, and ramp flags.", "Use Add Spec or Bulk Import JSON for future models."],
    tips: ["In Register Boat, select Spec Template to prefill dimensions before saving a real customer boat."],
  },
  {
    section: "Marina Operations",
    title: "Berth Map",
    href: "/berths",
    icon: Anchor,
    purpose: "Understand wet berth layout, berth size groups, availability, depth, and operational zones.",
    steps: ["Use the visual map to identify zone and berth class.", "Check size/depth notes before assignment.", "Open berth records for details."],
    tips: ["Large yacht and speedboat areas should be checked against LOA/beam/draft before booking."],
  },
  {
    section: "Marina Operations",
    title: "Berth Management",
    href: "/berths/management",
    icon: CalendarDays,
    purpose: "Plan berth reservations and occupancy on a Gantt-style timeline.",
    steps: ["Review rows by berth/slot.", "Check date ranges for conflicts.", "Use the visual timeline for reservation planning."],
    tips: ["Use this before confirming long-stay or overlapping bookings."],
  },
  {
    section: "Marina Operations",
    title: "Boat Movements",
    href: "/movements",
    icon: Navigation,
    purpose: "Record vessel movements between berth, yard, ramp, repair area, and temporary holding.",
    steps: ["Create movement when location changes.", "Record from/to locations and reason.", "Keep movement notes for audit trail."],
    tips: ["Movement logs should match physical yard/berth operations."],
  },
  {
    section: "Marina Operations",
    title: "Contracts",
    href: "/contracts",
    icon: FileText,
    purpose: "Manage berth, dry storage, ramp service, and service agreements.",
    steps: ["Create contract from customer/boat.", "Set billing cycle, dates, rate, and deposit.", "Print contract when ready for signature."],
    tips: ["Use status transitions to activate, suspend, or terminate contracts."],
  },
  {
    section: "Marina Operations",
    title: "Utility Readings",
    href: "/utility-readings",
    icon: Zap,
    purpose: "Track electricity and water meter readings per berth, vessel, customer, and billing status.",
    steps: ["Click New Reading.", "Choose electricity or water.", "Enter previous/current meter values and unit price.", "Review calculated usage and amount."],
    tips: ["Filter Unbilled readings before preparing invoices."],
  },
  {
    section: "Ramp & Launch",
    title: "Ramp Bookings",
    href: "/ramp-bookings",
    icon: Anchor,
    purpose: "Schedule launch, retrieval, inspection, and ramp-related services.",
    steps: ["Create new booking.", "Select vessel and operation type.", "Set scheduled date/time and crew notes.", "Print confirmation when needed."],
    tips: ["Check Boat Spec DB for draft/weight before difficult ramp operations."],
  },
  {
    section: "Boat Yard",
    title: "Service Requests",
    href: "/service-requests",
    icon: Wrench,
    purpose: "Capture customer or internal requests before converting to work orders.",
    steps: ["Create request with category and priority.", "Assign staff or team.", "Update status as work is reviewed."],
    tips: ["Use request notes to preserve customer instructions before quoting."],
  },
  {
    section: "Boat Yard",
    title: "Work Orders",
    href: "/work-orders",
    icon: Wrench,
    purpose: "Manage repair, maintenance, labor, material, and completion workflow.",
    steps: ["Create work order from request or directly.", "Add tasks, labor, materials, and notes.", "Track progress until completed."],
    tips: ["Keep material usage updated so job profitability remains accurate."],
  },
  {
    section: "Finance",
    title: "Quotations",
    href: "/quotations",
    icon: FileText,
    purpose: "Prepare service or marina fee quotations for customer approval.",
    steps: ["Create quote for customer/boat.", "Add line items and VAT.", "Send or print quote.", "Convert accepted quote to downstream work/invoice where supported."],
    tips: ["Use clear item descriptions because they appear on customer documents."],
  },
  {
    section: "Finance",
    title: "Invoices",
    href: "/invoices",
    icon: Receipt,
    purpose: "Issue invoices, monitor due dates, and connect payments to billing records.",
    steps: ["Create invoice or review generated invoice.", "Check status and outstanding balance.", "Print invoice/receipt as needed."],
    tips: ["Review overdue invoices from Dashboard and Payments."],
  },
  {
    section: "Finance",
    title: "Payments",
    href: "/payments",
    icon: CreditCard,
    purpose: "Record received payments and reconcile customer balances.",
    steps: ["Open Payments.", "Create payment against invoice/customer.", "Confirm method, date, amount, and reference."],
    tips: ["Use exact bank reference or receipt notes for finance audit."],
  },
  {
    section: "Inventory",
    title: "Stock Items",
    href: "/inventory",
    icon: Package,
    purpose: "Track parts, materials, supplies, minimum stock, and item details.",
    steps: ["Search item.", "Open item detail for stock movement.", "Create new stock item when needed."],
    tips: ["Keep unit cost updated for work order costing."],
  },
  {
    section: "Inventory",
    title: "Purchase Requests",
    href: "/purchase-requests",
    icon: Package,
    purpose: "Request parts/materials before procurement approval.",
    steps: ["Create purchase request.", "Link to job or stock item if relevant.", "Track request status."],
    tips: ["Use clear urgency and reason to speed approval."],
  },
  {
    section: "People & Safety",
    title: "Staff",
    href: "/staff",
    icon: Users,
    purpose: "View staff records, roles, contact details, and operational assignment context.",
    steps: ["Search staff.", "Open detail page.", "Review role and availability information."],
    tips: ["Keep role data aligned with permissions and task assignment."],
  },
  {
    section: "People & Safety",
    title: "Incidents",
    href: "/incidents",
    icon: ShieldAlert,
    purpose: "Record accidents, damage, safety events, and corrective actions.",
    steps: ["Create incident report.", "Add involved boat/customer if applicable.", "Track corrective actions until closed."],
    tips: ["Record photos and exact location when available."],
  },
  {
    section: "Reporting & Documents",
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    purpose: "Review operational and financial summaries for management decisions.",
    steps: ["Open Reports.", "Review KPI sections.", "Use charts/tables to identify follow-up actions."],
    tips: ["Reports depend on clean operational data from other modules."],
  },
  {
    section: "Reporting & Documents",
    title: "Documents",
    href: "/documents",
    icon: FolderOpen,
    purpose: "Open forms and print-ready document templates such as berthing, hardstand, quotations, invoices, and contracts.",
    steps: ["Choose document category.", "Open Preview or linked list.", "Print from generated document pages."],
    tips: ["Use source records for official customer-facing documents where possible."],
  },
  {
    section: "System",
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    purpose: "Review alerts, overdue items, reminders, and operational notifications.",
    steps: ["Open notification list.", "Filter or review latest items.", "Follow links to resolve source records."],
    tips: ["Use notifications as a daily exception list."],
  },
  {
    section: "System",
    title: "Customer Portal",
    href: "/portal",
    icon: Globe,
    purpose: "Preview the customer-facing portal area for boats, invoices, quotations, documents, and requests.",
    steps: ["Open portal home.", "Review customer-visible modules.", "Use for customer experience testing."],
    tips: ["Do not expose internal staff notes through portal pages."],
  },
  {
    section: "System",
    title: "Settings",
    href: "/settings",
    icon: Settings,
    purpose: "Configure company, operational, finance, and system defaults.",
    steps: ["Review company and system values.", "Update settings carefully.", "Re-test related pages after changing defaults."],
    tips: ["Settings can affect documents, finance, and operational defaults."],
  },
]

export default function HelpPage() {
  const [query, setQuery] = useState("")
  const [section, setSection] = useState("All")
  const sections = useMemo(() => ["All", ...Array.from(new Set(guideItems.map((item) => item.section)))], [])
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return guideItems.filter((item) => {
      const matchesSection = section === "All" || item.section === section
      const matchesQuery = !q || [item.title, item.purpose, item.section, ...item.steps, ...item.tips]
        .some((value) => value.toLowerCase().includes(q))
      return matchesSection && matchesQuery
    })
  }, [query, section])

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Guide"
        description="Instructions for every page and menu in Marina MMS"
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search instructions..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sections.map((item) => (
                <button
                  key={item}
                  onClick={() => setSection(item)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    section === item ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filtered.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.href} className="overflow-hidden">
              <CardHeader className="border-b bg-[#f8fbfa]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                      <Icon className="h-5 w-5 text-teal-700" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <Badge className="mt-1 text-xs">{item.section}</Badge>
                    </div>
                  </div>
                  <Link href={item.href} className="shrink-0 text-xs font-medium text-teal-700 hover:underline">
                    Open page
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <p className="text-sm text-gray-700">{item.purpose}</p>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500">How to use</p>
                  <ol className="space-y-1 text-sm text-gray-700">
                    {item.steps.map((step, index) => (
                      <li key={step} className="flex gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-amber-700">Tips</p>
                  <ul className="mt-1 space-y-1 text-sm text-amber-800">
                    {item.tips.map((tip) => <li key={tip}>{tip}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
            <HelpCircle className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium">No guide items match your search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
