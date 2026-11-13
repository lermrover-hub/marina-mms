import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createServerClient } from "@/lib/supabase-server"
import { isAutomationWritesEnabled } from "@/lib/safe-mode"
import { addUtcDays } from "@/lib/service-workflow"
import { isMissingWorkflowSchema, readLegacyWorkflowMetadata } from "@/lib/service-workflow-compat"

export const dynamic = "force-dynamic"

type ReminderPlan = Record<string, unknown> & {
  id: string
  service_request_id: string
  status: string
  reminder_count?: number
  legacy_request?: ReminderRequest
}

type ReminderRequest = {
  id: string
  reference: string
  customer_name: string | null
  boat_name: string | null
}

async function authorised(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role ?? ""
  return ["SUPER_ADMIN", "MANAGING_DIRECTOR", "MARINA_MANAGER", "FINANCE"].includes(role)
}

export async function GET(req: Request) {
  if (!(await authorised(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const supabase = createServerClient({ requireServiceRole: true })
    const today = new Date().toISOString().slice(0, 10)
    const now = new Date().toISOString()
    const planResult = await supabase.from("mms_service_payment_plans")
      .select("*").not("next_reminder_at", "is", null).lte("next_reminder_at", now)
      .not("status", "in", "(PAID,CANCELLED)").order("next_reminder_at")
    let plans = (planResult.data ?? []) as ReminderPlan[]
    if (planResult.error && isMissingWorkflowSchema(planResult.error)) {
      const legacyResult = await supabase.from("mms_service_requests").select("id,reference,customer_name,boat_name,notes")
      if (legacyResult.error) throw legacyResult.error
      plans = (legacyResult.data ?? []).flatMap((request): ReminderPlan[] => {
        const metadata = readLegacyWorkflowMetadata(request.notes)
        const plan = metadata.payment_plan
        if (!plan || !plan.next_reminder_at || String(plan.next_reminder_at) > now || ["PAID", "CANCELLED"].includes(String(plan.status))) return []
        return [{ ...plan, id: `legacy-${request.id}`, service_request_id: request.id, status: String(plan.status ?? "AWAITING_PAYMENT"), legacy_request: request as ReminderRequest }]
      })
    } else if (planResult.error) throw planResult.error
    const ids = plans.map((plan) => String(plan.service_request_id))
    const { data: requests, error: requestError } = ids.length
      ? await supabase.from("mms_service_requests").select("id,reference,customer_name,boat_name,quotation_id,payment_mode,payment_gate_status").in("id", ids)
      : { data: [], error: null }
    if (requestError) throw requestError
    const requestById = new Map((requests ?? []).map((row) => [row.id, row as ReminderRequest]))
    const reminders = plans.map((plan) => ({ ...plan, service_request: plan.legacy_request ?? requestById.get(String(plan.service_request_id)) ?? null }))

    if (!isAutomationWritesEnabled() || reminders.length === 0) {
      return NextResponse.json({ dry_run: true, writes_enabled: false, as_of: today, reminders })
    }

    for (const reminder of reminders) {
      await supabase.from("mms_notifications").insert({
        type: "SERVICE_PAYMENT_REMINDER",
        title: `Payment follow-up: ${reminder.service_request?.reference ?? reminder.service_request_id}`,
        message: `${reminder.service_request?.customer_name ?? "Customer"} / ${reminder.service_request?.boat_name ?? "Boat"}: ${reminder.status.replaceAll("_", " ")}`,
        reference_id: reminder.service_request_id,
        target_role: "FINANCE",
        priority: reminder.status === "OVERDUE" || reminder.status === "CREDIT_HOLD" ? "HIGH" : "MEDIUM",
        read: false,
        link: `/service-requests/${reminder.service_request_id}`,
      })
      const nextDate = addUtcDays(today, 3)
      await supabase.from("mms_service_payment_plans").update({
        last_reminder_at: now,
        next_reminder_at: nextDate ? `${nextDate}T01:00:00.000Z` : null,
        reminder_count: Number(reminder.reminder_count ?? 0) + 1,
        updated_at: now,
      }).eq("id", reminder.id)
    }
    return NextResponse.json({ dry_run: false, writes_enabled: true, as_of: today, reminders })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
