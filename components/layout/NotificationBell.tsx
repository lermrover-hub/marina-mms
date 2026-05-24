"use client"
import React, { useState } from "react"
import Link from "next/link"
import {
  Bell, AlertTriangle, Receipt, Wrench, ShieldAlert,
  CheckCircle2, FileText, X, ExternalLink,
} from "lucide-react"

// ── Mock notifications (in real app, fetched from API) ───────────────────────
const INITIAL_NOTIFICATIONS = [
  {
    id: "n-001",
    type: "OVERDUE_INVOICE",
    title: "Overdue Invoice",
    message: "INV-2026-0079 from Coastal Marine Co. is 15 days overdue.",
    href: "/invoices",
    time: "2 hours ago",
    read: false,
    priority: "HIGH",
  },
  {
    id: "n-002",
    type: "INSURANCE_EXPIRY",
    title: "Insurance Expiring Soon",
    message: "Sea Hawk — insurance expires in 103 days (31 Aug 2026). Arrange renewal.",
    href: "/boats/boat-001",
    time: "1 day ago",
    read: false,
    priority: "MEDIUM",
  },
  {
    id: "n-003",
    type: "WORK_ORDER_UPDATE",
    title: "Work Order Update",
    message: "WO-2026-0041: Engine overhaul — starboard engine parts have arrived.",
    href: "/work-orders/wo-001",
    time: "1 day ago",
    read: false,
    priority: "NORMAL",
  },
  {
    id: "n-004",
    type: "QUOTATION_SENT",
    title: "Quotation Sent",
    message: "QT-2026-0041 for Sea Hawk (antifouling) has been sent to James Thornton.",
    href: "/quotations",
    time: "3 days ago",
    read: true,
    priority: "NORMAL",
  },
  {
    id: "n-005",
    type: "PAYMENT_RECEIVED",
    title: "Payment Received",
    message: "฿234,000 received from Blue Horizon Charter — INV-2026-0082.",
    href: "/payments",
    time: "5 days ago",
    read: true,
    priority: "NORMAL",
  },
  {
    id: "n-006",
    type: "SERVICE_REQUEST",
    title: "New Service Request",
    message: "SR-2026-0035: Navigation lights & bilge pump failure — James Thornton.",
    href: "/service-requests",
    time: "1 week ago",
    read: true,
    priority: "NORMAL",
  },
]

type Notification = typeof INITIAL_NOTIFICATIONS[0]

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  OVERDUE_INVOICE:  { icon: Receipt,       color: "text-red-500 bg-red-50"    },
  INSURANCE_EXPIRY: { icon: ShieldAlert,   color: "text-amber-500 bg-amber-50" },
  WORK_ORDER_UPDATE:{ icon: Wrench,        color: "text-teal-500 bg-teal-50"  },
  QUOTATION_SENT:   { icon: FileText,      color: "text-blue-500 bg-blue-50"  },
  PAYMENT_RECEIVED: { icon: CheckCircle2,  color: "text-green-500 bg-green-50"},
  SERVICE_REQUEST:  { icon: AlertTriangle, color: "text-orange-500 bg-orange-50"},
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function dismiss(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-96 rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-teal-600 hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">All caught up!</p>
                <p className="text-xs text-gray-400">No notifications.</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] ?? { icon: Bell, color: "text-gray-500 bg-gray-50" }
                const Icon = cfg.icon
                const [iconColor, bgColor] = cfg.color.split(" ")
                return (
                  <div
                    key={n.id}
                    className={`group flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? "bg-blue-50/30" : ""}`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bgColor}`}>
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold ${!n.read ? "text-gray-900" : "text-gray-600"}`}>
                            {n.title}
                            {!n.read && (
                              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle" />
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.read && (
                            <button
                              onClick={() => markRead(n.id)}
                              title="Mark as read"
                              className="rounded p-0.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => dismiss(n.id)}
                            title="Dismiss"
                            className="rounded p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Link */}
                      <Link
                        href={n.href}
                        onClick={() => { markRead(n.id); setOpen(false) }}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-teal-600 hover:underline font-medium"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-teal-600 hover:underline font-medium"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
