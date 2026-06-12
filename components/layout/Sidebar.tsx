"use client"
import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Ship, Anchor, Navigation, Wrench,
  FileText, Receipt, BarChart3, Settings, ChevronDown,
  Waves, ClipboardList, ChevronRight, Package, UserCog,
  ShieldAlert, CreditCard, FolderOpen, Globe, Bell, CalendarDays, Zap, Database, HelpCircle, Bot,
  HardHat, Truck, ShoppingCart, ArrowLeftRight, Clock, Shield,
} from "lucide-react"

interface NavItem {
  label:    string
  href?:    string
  icon:     React.ElementType
  badge?:   string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: "Dashboard",       href: "/dashboard",   icon: LayoutDashboard },
  { label: "Customers",       href: "/customers",   icon: Users },
  { label: "Boats",           href: "/boats",       icon: Ship },
  { label: "Boat Spec DB",     href: "/boat-specs",  icon: Database },
  {
    label: "Marina Operations", icon: Anchor,
    children: [
      { label: "Berth Map",         href: "/berths",            icon: Anchor },
      { label: "Berth Management",  href: "/berths/management", icon: CalendarDays },
      { label: "Boat Movements",    href: "/movements",         icon: Navigation },
      { label: "Contracts",         href: "/contracts",         icon: FileText },
      { label: "Utility Readings",  href: "/utility-readings",  icon: Zap },
    ],
  },
  {
    label: "Ramp & Launch", icon: Waves,
    children: [
      { label: "Ramp Bookings",     href: "/ramp-bookings",                  icon: Waves },
      { label: "Tide Calculator",   href: "/ramp-bookings/tide-calculator",  icon: Waves },
    ],
  },
  {
    label: "Boat Yard", icon: Wrench,
    children: [
      { label: "Service Requests",  href: "/service-requests", icon: ClipboardList },
      { label: "Work Orders",       href: "/work-orders",      icon: Wrench },
    ],
  },
  {
    label: "Pricing & Quotations", icon: FileText,
    children: [
      { label: "Quotations",      href: "/quotations",       icon: FileText },
      { label: "Pricing Master",  href: "/pricing-master",   icon: BarChart3 },
    ],
  },
  { label: "Invoices",        href: "/invoices",    icon: Receipt },
  { label: "Payments",        href: "/payments",    icon: CreditCard },
  {
    label: "Inventory", icon: Package,
    children: [
      { label: "Stock Items",         href: "/inventory",             icon: Package },
      { label: "Stock Movements",     href: "/inventory/movements",   icon: ArrowLeftRight },
      { label: "Purchase Requests",   href: "/purchase-requests",     icon: ClipboardList },
      { label: "Purchase Orders",     href: "/purchase-orders",       icon: ShoppingCart },
      { label: "Suppliers",           href: "/suppliers",             icon: Truck },
    ],
  },
  {
    label: "People & Safety", icon: UserCog,
    children: [
      { label: "Staff",         href: "/staff",       icon: UserCog },
      { label: "Contractors",   href: "/contractors", icon: HardHat },
      { label: "Timesheets",    href: "/timesheets",  icon: Clock },
      { label: "Incidents",     href: "/incidents",   icon: ShieldAlert },
    ],
  },
  {
    label: "Reports", icon: BarChart3,
    children: [
      { label: "Reports Overview",   href: "/reports",            icon: BarChart3 },
      { label: "Revenue Report",     href: "/reports/revenue",    icon: BarChart3 },
      { label: "Occupancy Report",   href: "/reports/occupancy",  icon: Anchor },
      { label: "Customer Aging",     href: "/reports/aging",      icon: Receipt },
    ],
  },
  { label: "Documents",       href: "/documents",    icon: FolderOpen },
  { label: "Notifications",   href: "/notifications",icon: Bell       },
  { label: "AI Agents",       href: "/ai-agents",    icon: Bot        },
  { label: "Customer Portal", href: "/portal",       icon: Globe      },
  { label: "Audit Log",       href: "/audit-log",    icon: Shield     },
  { label: "User Guide",      href: "/help",         icon: HelpCircle },
  { label: "Settings",        href: "/settings",     icon: Settings   },
]

function NavGroup({ item, depth = 0, onNavigate }: { item: NavItem; depth?: number; onNavigate?: () => void }) {
  const pathname = usePathname() ?? ""
  const [open, setOpen] = useState(() =>
    item.children?.some((c) => c.href && pathname.startsWith(c.href)) ?? false
  )

  if (!item.children) {
    const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false
    return (
      <Link
        href={item.href ?? "#"}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors group",
          depth > 0 ? "pl-9" : "",
          isActive
            ? "border-l-[3px] border-ocean-turquoise bg-[#e8fbf9] text-[#123338]"
            : "text-[#647076] hover:bg-[#f8f6f0] hover:text-[#1f2933]"
        )}
      >
        <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#13988f]" : "text-[#25BDB3] group-hover:text-[#13988f]")} />
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="ml-auto rounded-full bg-marina-gold px-1.5 py-0.5 text-xs text-[#121212] font-medium">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  const hasActiveChild = item.children.some((c) => c.href && (pathname === c.href || pathname.startsWith(c.href + "/")))

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          hasActiveChild ? "text-[#1f2933]" : "text-[#647076] hover:bg-[#f8f6f0] hover:text-[#1f2933]"
        )}
      >
        <item.icon className={cn("h-4 w-4 shrink-0", hasActiveChild ? "text-[#13988f]" : "text-[#25BDB3]")} />
        <span className="truncate flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavGroup key={child.label} item={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[#d7efed] shadow-[10px_0_28px_rgba(19,152,143,0.08)] bg-white"
           style={{ backgroundColor: "var(--color-sidebar)" }}>

      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-[#e5dfd2] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean-turquoise">
          <Anchor className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#1f2933] leading-tight">Marina MMS</p>
          <p className="text-xs text-[#13988f]">Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavGroup key={item.label} item={item} onNavigate={onClose} />
        ))}
      </nav>

      {/* Bottom info */}
      <div className="border-t border-[#e5dfd2] px-4 py-3">
        <p className="text-xs text-[#13988f]">Marina MMS v1.0</p>
        <p className="text-xs text-[#647076]">Ko Samui, Thailand</p>
      </div>
    </aside>
  )
}
