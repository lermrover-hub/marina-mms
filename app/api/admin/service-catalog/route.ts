import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createServerClient } from "@/lib/supabase-server"
import { catalogAdmin, catalogCreate, catalogUpdate, catalogWritesEnabled } from "@/lib/catalog-validation"

export const dynamic = "force-dynamic"
async function access(write = false) {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) }
  const user = session.user as { id?: string; role?: string }
  if (!catalogAdmin(user.role) || !user.id) return { error: NextResponse.json({ error: "Super Admin required" }, { status: 403 }) }
  if (write && !catalogWritesEnabled(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.ENABLE_CATALOG_ADMIN_WRITES)) return { error: NextResponse.json({ error: "Catalog writes are disabled; approved staging only" }, { status: 403 }) }
  return { actor: user.id }
}
function failure(code?: string) {
  if (code === "23505") return NextResponse.json({ error: "Code already exists; reuse or retire the original record" }, { status: 409 })
  if (["23514", "23503", "P0001"].includes(code ?? "")) return NextResponse.json({ error: "Invalid catalog relationship or state transition" }, { status: 409 })
  return NextResponse.json({ error: "Catalog unavailable; verify the staging migration" }, { status: 503 })
}
export async function GET() {
  const a = await access(); if (a.error) return a.error
  try {
    const { data, error } = await createServerClient().from("mms_service_catalog").select("*").order("kind").order("code")
    if (error) return failure(error.code)
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } })
  } catch { return failure() }
}
export async function POST(request: Request) {
  const a = await access(true); if (a.error) return a.error
  let body: unknown; try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  const parsed = catalogCreate.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  try {
    const { data, error } = await createServerClient().from("mms_service_catalog").insert({ ...parsed.data, changed_by: a.actor }).select().single()
    if (error) return failure(error.code)
    return NextResponse.json({ data }, { status: 201 })
  } catch { return failure() }
}
export async function PATCH(request: Request) {
  const a = await access(true); if (a.error) return a.error
  const id = new URL(request.url).searchParams.get("id")
  if (!id || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Valid id required" }, { status: 400 })
  let body: unknown; try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  const parsed = catalogUpdate.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  try {
    const db = createServerClient()
    const { data: old, error: readError } = await db.from("mms_service_catalog").select("code,kind").eq("id", id).maybeSingle()
    if (readError) return failure(readError.code)
    if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const { expected_version, ...fields } = parsed.data
    const checked = catalogCreate.safeParse({ ...fields, code: old.code, kind: old.kind })
    if (!checked.success) return NextResponse.json({ error: checked.error.issues }, { status: 400 })
    const { data, error } = await db.from("mms_service_catalog").update({ ...fields, changed_by: a.actor }).eq("id", id).eq("version", expected_version).select().maybeSingle()
    if (error) return failure(error.code)
    if (!data) return NextResponse.json({ error: "Record changed; reload before saving" }, { status: 409 })
    return NextResponse.json({ data })
  } catch { return failure() }
}
// No DELETE: retired records remain available for historical references.
