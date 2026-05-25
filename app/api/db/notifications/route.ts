/**
 * GET  /api/db/notifications          — list notifications (unread first)
 * GET  /api/db/notifications?unread=true — return only unread count
 *
 * Falls back to mock data when the mms_notifications table does not exist.
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// ─── mock data ────────────────────────────────────────────────────────────────

const MOCK_NOTIFICATIONS = [
  {
    id: "mock-1",
    title: "Invoice Overdue",
    message: "Invoice INV-2026-001 is overdue by 15 days",
    type: "warning",
    read: false,
    created_at: new Date().toISOString(),
    link: "/invoices",
  },
  {
    id: "mock-2",
    title: "Contract Expiring",
    message: "Berth contract for Blue Horizon I expires in 30 days",
    type: "info",
    read: false,
    created_at: new Date().toISOString(),
    link: "/contracts",
  },
  {
    id: "mock-3",
    title: "New Service Request",
    message: "James Thornton submitted a new service request",
    type: "info",
    read: true,
    created_at: new Date().toISOString(),
    link: "/service-requests",
  },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

/** True if the Supabase error indicates the table does not exist */
function isTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.code === "42P01" ||
    (typeof error.message === "string" && error.message.includes("does not exist"))
  )
}

// ─── handler ─────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get("unread") === "true"

  // Try real table first
  let query = supabase
    .from("mms_notifications")
    .select("*")
    .order("read", { ascending: true })
    .order("created_at", { ascending: false })

  if (unreadOnly) {
    query = query.eq("read", false)
  }

  const { data, error } = await query

  if (isTableMissing(error)) {
    // Table not yet created — serve mock data
    const notifications = unreadOnly
      ? MOCK_NOTIFICATIONS.filter(n => !n.read)
      : MOCK_NOTIFICATIONS
    if (unreadOnly) {
      return NextResponse.json({ count: notifications.length })
    }
    return NextResponse.json(notifications)
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (unreadOnly) {
    return NextResponse.json({ count: (data ?? []).length })
  }

  return NextResponse.json(data ?? [])
}
