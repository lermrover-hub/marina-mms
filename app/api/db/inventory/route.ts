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

function stockStatus(onHand: number, minStock: number) {
  if (onHand === 0) return "OUT"
  if (onHand <= minStock) return "LOW"
  return "OK"
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("mms_inventory_items")
      .select("*")
      .order("category")
      .order("name")
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    console.error("[Inventory list error]", e)
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const onHand = Number(body.on_hand ?? 0)
    const minStock = Number(body.min_stock ?? 0)
    const { data, error } = await supabase
      .from("mms_inventory_items")
      .insert({
        ...body,
        on_hand: onHand,
        min_stock: minStock,
        status: stockStatus(onHand, minStock),
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    console.error("[Inventory create error]", e)
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
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
