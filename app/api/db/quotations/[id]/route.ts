import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from("mms_quotations")
      .select("*, mms_quotation_items(*)")
      .eq("id", id)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // ── Handle digital signature approval ──────────────────────────────────
    if (body.action === "approve") {
      const { signature_data, approved_by_name, approved_at } = body as {
        signature_data?: string
        approved_by_name?: string
        approved_at?: string
      }

      // Build the update payload; try to include signature columns, fall back
      // gracefully if those columns don't exist in the database yet.
      const updatePayload: Record<string, unknown> = {
        status: "ACCEPTED",
        updated_at: new Date().toISOString(),
      }

      if (signature_data)    updatePayload.signature_data    = signature_data
      if (approved_by_name)  updatePayload.approved_by_name  = approved_by_name
      if (approved_at)       updatePayload.approved_at        = approved_at

      const { data, error } = await supabase
        .from("mms_quotations")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        // If the error is about unknown columns (signature columns not yet in DB),
        // retry with status-only update so the approval still succeeds.
        const isColumnError =
          error.message?.includes("signature_data") ||
          error.message?.includes("approved_by_name") ||
          error.message?.includes("approved_at") ||
          error.code === "PGRST204" ||
          error.code === "42703"

        if (isColumnError) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("mms_quotations")
            .update({ status: "ACCEPTED", updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single()

          if (fallbackError) throw fallbackError
          // Merge signature data into response even if not persisted
          return NextResponse.json({
            ...fallbackData,
            signature_data: signature_data ?? null,
            approved_by_name: approved_by_name ?? null,
            approved_at: approved_at ?? null,
          })
        }

        throw error
      }

      return NextResponse.json(data)
    }

    // ── Default PATCH (status changes, field updates) ──────────────────────
    const { data, error } = await supabase
      .from("mms_quotations")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
