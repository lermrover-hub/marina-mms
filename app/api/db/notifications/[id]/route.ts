/**
 * PATCH /api/db/notifications/[id]  — mark a notification as read
 *
 * Falls back to a mock 200 response when the mms_notifications table
 * does not exist yet (so the UI works during development).
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/** True if the Supabase error indicates the table does not exist */
function isTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.code === "42P01" ||
    (typeof error.message === "string" && error.message.includes("does not exist"))
  )
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from("mms_notifications")
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (isTableMissing(error)) {
    // Table not yet created — return mock success so UI can update optimistically
    return NextResponse.json({ id, read: true, mock: true })
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
