import { NextResponse } from "next/server"
import { ADMIN_ROLES, STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const params = new URL(req.url).searchParams
    let query = createServerClient({ requireServiceRole: true }).from("mms_audit_log").select("*").order("created_at", { ascending: false }).limit(300)
    if (params.get("entity_type")) query = query.eq("entity_type", params.get("entity_type")!)
    if (params.get("user_name")) query = query.ilike("user_name", `%${params.get("user_name")!}%`)
    if (params.get("action")) query = query.eq("action", params.get("action")!)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) { return apiServerError("audit-log.get", error) }
}

export async function POST(req: Request) {
  const access = await requireApiActor(ADMIN_ROLES)
  if ("error" in access) return access.error
  try {
    const body = await req.json()
    const action = String(body.action ?? "").trim()
    if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 })
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_audit_log").insert({
      action, entity_type: body.entity_type || "system", entity_id: body.entity_id || null, entity_ref: body.entity_ref || null,
      user_name: access.actor.userId, user_role: access.actor.role, notes: body.notes || null, changes: body.changes ?? null,
      ip_address: forwarded || null,
    }).select().single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) { return apiServerError("audit-log.post", error) }
}
