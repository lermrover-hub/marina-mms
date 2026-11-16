import { NextResponse } from "next/server"
import { STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const workOrderId = new URL(req.url).searchParams.get("work_order_id")
    const client = createServerClient({ requireServiceRole: true })
    let query = client.from("mms_material_usage").select("*").order("created_at", { ascending: false }).limit(300)
    if (workOrderId) query = query.eq("work_order_id", workOrderId)
    const { data, error } = await query
    if (error) throw error
    const workOrderIds = [...new Set((data ?? []).map((row) => String(row.work_order_id)))]
    const { data: workOrders, error: workOrderError } = workOrderIds.length
      ? await client.from("mms_work_orders").select("id,reference,title,customer_name").in("id", workOrderIds)
      : { data: [], error: null }
    if (workOrderError) throw workOrderError
    const byId = new Map((workOrders ?? []).map((row) => [String(row.id), row]))
    return NextResponse.json((data ?? []).map((row) => ({ ...row, mms_work_orders: byId.get(String(row.work_order_id)) ?? null })))
  } catch (error) { return apiServerError("inventory-usage-report.get", error) }
}
