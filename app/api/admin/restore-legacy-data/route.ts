import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import snapshot from "@/lib/restore/legacy-snapshot.json"

export const dynamic = "force-dynamic"

const RESTORE_CONFIRMATION = "restore-marina-mms-2026-06-09"

const RESTORE_ORDER = [
  { table: "mms_customers", conflict: "id" },
  { table: "mms_boats", conflict: "id" },
  { table: "mms_berths", conflict: "id" },
  { table: "mms_staff", conflict: "id" },
  { table: "mms_service_requests", conflict: "id" },
  { table: "mms_contracts", conflict: "id" },
  { table: "mms_berth_assignments", conflict: "id" },
  { table: "mms_quotations", conflict: "id" },
  { table: "mms_quotation_items", conflict: "id" },
  { table: "mms_invoices", conflict: "id" },
  { table: "mms_invoice_items", conflict: "id" },
  { table: "mms_payments", conflict: "id" },
  { table: "pricing_master", conflict: "code" },
] as const

type Snapshot = Record<string, Record<string, unknown>[]>

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function sanitizeRows(table: string, rows: Record<string, unknown>[]) {
  if (table !== "mms_staff") return rows

  return rows.map((row) => {
    const next = { ...row }
    if ("active" in next) {
      delete next.active
    }
    if ("name" in next) {
      next.full_name = next.name
      delete next.name
    }
    delete next.is_active
    delete next.phone2
    delete next.hire_date
    return next
  })
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export async function POST(req: Request) {
  const confirmation = req.headers.get("x-restore-confirmation")
  if (confirmation !== RESTORE_CONFIRMATION) {
    return NextResponse.json({ error: "Restore confirmation header required." }, { status: 403 })
  }

  const supabase = createServerClient()
  const data = snapshot as Snapshot
  const result: Record<string, { rows: number; status: "restored" | "skipped"; error?: string }> = {}

  for (const item of RESTORE_ORDER) {
    const rows = sanitizeRows(item.table, data[item.table] ?? [])
    if (rows.length === 0) {
      result[item.table] = { rows: 0, status: "skipped" }
      continue
    }

    try {
      for (const rowsChunk of chunk(rows, 100)) {
        const { error } = await supabase
          .from(item.table)
          .upsert(rowsChunk, { onConflict: item.conflict })

        if (error) throw error
      }

      result[item.table] = { rows: rows.length, status: "restored" }
    } catch (error) {
      result[item.table] = {
        rows: 0,
        status: "skipped",
        error: formatError(error),
      }
    }
  }

  return NextResponse.json({ ok: true, result })
}
