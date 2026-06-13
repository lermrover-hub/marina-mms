import { NextResponse } from "next/server"
import { apiErrorMessage, dbQuery } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workOrderId = searchParams.get("work_order_id")
    const values: unknown[] = []
    const where = workOrderId ? (values.push(workOrderId), "WHERE mu.work_order_id = $1") : ""
    const result = await dbQuery(`SELECT mu.*, CASE WHEN wo.id IS NULL THEN NULL ELSE json_build_object('id',wo.id,'reference',wo.reference,'title',wo.title,'customer_name',wo.customer_name) END AS mms_work_orders FROM mms_material_usage mu LEFT JOIN mms_work_orders wo ON wo.id = mu.work_order_id ${where} ORDER BY mu.created_at DESC LIMIT 300`, values)
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
