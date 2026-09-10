import { NextResponse } from "next/server"
import { PROCUREMENT_WRITE_ROLES, STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError, pickFields } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
const fields = ["code","name","contact_name","phone","email","address","tax_id","payment_terms","status","notes"] as const

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const { id } = await params
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_suppliers").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data ? NextResponse.json(data) : NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) { return apiServerError("suppliers.detail.get", error) }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiActor(PROCUREMENT_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const update = pickFields(await req.json(), fields)
    if (!Object.keys(update).length) return NextResponse.json({ error: "No supported fields" }, { status: 400 })
    const { id } = await params
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_suppliers").update({ ...update, updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle()
    if (error) throw error
    return data ? NextResponse.json(data) : NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) { return apiServerError("suppliers.detail.patch", error) }
}
