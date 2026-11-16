import { NextResponse } from "next/server"
import { PROCUREMENT_WRITE_ROLES, STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError, finiteNonNegative, pickFields } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
const fields = ["name","company_name","specialty","phone","email","address","tax_id","rate_type","daily_rate","status","notes"] as const

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const { id } = await params
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_contractors").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data ? NextResponse.json(data) : NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) { return apiServerError("contractors.detail.get", error) }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiActor(PROCUREMENT_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const update = pickFields(await req.json(), fields)
    if (!Object.keys(update).length) return NextResponse.json({ error: "No supported fields" }, { status: 400 })
    if ("daily_rate" in update && finiteNonNegative(update.daily_rate) == null) return NextResponse.json({ error: "daily_rate must be non-negative" }, { status: 400 })
    const { id } = await params
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_contractors").update({ ...update, updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle()
    if (error) throw error
    return data ? NextResponse.json(data) : NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) { return apiServerError("contractors.detail.patch", error) }
}
