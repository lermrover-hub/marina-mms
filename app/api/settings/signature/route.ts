import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

const KEY = "signature_url"

export async function GET() {
  try {
    const sb = createServerClient()
    const { data, error } = await sb
      .from("mms_system_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle()
    if (error) throw error
    return NextResponse.json({ url: data?.value ?? null })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 })
    }
    const sb = createServerClient()
    const { error } = await sb
      .from("mms_system_settings")
      .upsert({ key: KEY, value: url, updated_at: new Date().toISOString() }, { onConflict: "key" })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const sb = createServerClient()
    const { error } = await sb.from("mms_system_settings").delete().eq("key", KEY)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
