"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Anchor } from "lucide-react"

type PortalUser = {
  id: string
  name: string | null
  email: string | null
  role: string
  customerId: string | null
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null)

  useEffect(() => {
    fetch("/api/portal/session")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) setUser(data)
      })
      .catch(() => {/* silently ignore */})
  }, [])

  const displayName = user?.name ?? "…"
  const initials = displayName !== "…"
    ? displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "…"
  const customerId = user?.customerId ?? "—"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Portal top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500">
              <Anchor className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Ocean Rover Marina</p>
              <p className="text-xs text-gray-500">Customer Portal</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/portal"                className="text-gray-600 hover:text-teal-600 font-medium">Dashboard</Link>
            <Link href="/portal/boats"          className="text-gray-600 hover:text-teal-600 font-medium">My Boats</Link>
            <Link href="/portal/invoices"       className="text-gray-600 hover:text-teal-600 font-medium">Invoices</Link>
            <Link href="/portal/requests"       className="text-gray-600 hover:text-teal-600 font-medium">Requests</Link>
            <Link href="/portal/quotations"     className="text-gray-600 hover:text-teal-600 font-medium">Quotations</Link>
            <Link href="/portal/ramp-booking"   className="text-gray-600 hover:text-teal-600 font-medium">Ramp</Link>
            <Link href="/portal/documents"      className="text-gray-600 hover:text-teal-600 font-medium">Documents</Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">Private Owner · {customerId}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-bold">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="md:hidden bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-1 px-4 py-2">
          {[
            { href: "/portal",               label: "Home"       },
            { href: "/portal/boats",         label: "Boats"      },
            { href: "/portal/invoices",      label: "Invoices"   },
            { href: "/portal/requests",      label: "Requests"   },
            { href: "/portal/quotations",    label: "Quotations" },
            { href: "/portal/ramp-booking",  label: "Ramp"       },
            { href: "/portal/documents",     label: "Documents"  },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-teal-600"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 px-4 py-4 text-center text-xs text-gray-400">
        Ocean Rover Marina — Ko Samui, Thailand · +66 82 878 9149 ·{" "}
        <span className="text-teal-600">Powered by Marina MMS</span>
      </footer>
    </div>
  )
}
