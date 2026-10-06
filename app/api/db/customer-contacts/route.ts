import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { customerScope, OPERATIONS_WRITE_ROLES, PORTAL_READ_ROLES, requireApiActor } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

const CHANNELS = new Set(["PHONE", "LINE", "WHATSAPP", "EMAIL"])

export async function GET(req: Request) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { searchParams } = new URL(req.url)
    const scope = customerScope(access.actor, searchParams.get("customer_id"))
    if ("error" in scope) return scope.error
    if (!scope.customerId) return NextResponse.json({ error: "customer_id is required" }, { status: 400 })

    const supabase = createServerClient({ requireServiceRole: true })
    let query = supabase
      .from("mms_customer_contacts")
      .select("*")
      .eq("customer_id", scope.customerId)
      .order("is_active", { ascending: false })
      .order("full_name")
    if (searchParams.get("active") !== "all") query = query.eq("is_active", true)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireApiActor(OPERATIONS_WRITE_ROLES)
    if ("error" in access) return access.error
    const body = await req.json()
    const customerId = String(body.customer_id ?? "").trim()
    const fullName = String(body.full_name ?? "").trim()
    const preferredChannel = String(body.preferred_channel ?? "PHONE").toUpperCase()
    if (!customerId || !fullName) return NextResponse.json({ error: "Customer and contact name are required." }, { status: 400 })
    if (!CHANNELS.has(preferredChannel)) return NextResponse.json({ error: "Invalid preferred channel." }, { status: 400 })

    const supabase = createServerClient({ requireServiceRole: true })
    const { data: customer, error: customerError } = await supabase
      .from("mms_customers")
      .select("id")
      .eq("id", customerId)
      .maybeSingle()
    if (customerError) throw customerError
    if (!customer) return NextResponse.json({ error: "Selected customer was not found." }, { status: 400 })

    const now = new Date().toISOString()
    const { data, error } = await supabase.from("mms_customer_contacts").insert({
      customer_id: customerId,
      full_name: fullName,
      role_title: String(body.role_title ?? "CAPTAIN").trim() || "CAPTAIN",
      phone: String(body.phone ?? "").trim() || null,
      email: String(body.email ?? "").trim() || null,
      line_id: String(body.line_id ?? "").trim() || null,
      whatsapp_number: String(body.whatsapp_number ?? "").trim() || null,
      preferred_channel: preferredChannel,
      operational_notifications: body.operational_notifications === true,
      notes: String(body.notes ?? "").trim() || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    }).select().single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
