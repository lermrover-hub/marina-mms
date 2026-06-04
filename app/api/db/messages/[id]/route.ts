/**
 * PATCH /api/db/messages/[id]  — mark message as replied
 */
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await req.json()
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_messages")
      .update({ replied: true })
      .eq("id", id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
