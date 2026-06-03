import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message)
  }
  return String(error)
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from("mms_inventory_items")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    console.error("[Inventory detail error]", e)
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { data, error } = await supabase
      .from("mms_inventory_items")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    console.error("[Inventory update error]", e)
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from("mms_inventory_items")
      .delete()
      .eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[Inventory delete error]", e)
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 })
  }
}
