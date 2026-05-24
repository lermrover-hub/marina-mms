import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("template_type")

    let query = supabase
      .from("mms_document_templates")
      .select("*")
      .order("template_type", { ascending: true })
      .order("created_at", { ascending: false })

    if (type) query = query.eq("template_type", type)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("mms_document_templates")
      .insert({
        template_type: body.template_type,
        name:          body.name,
        language:      body.language ?? "TH/EN",
        version:       body.version ?? null,
        file_name:     body.file_name ?? null,
        file_url:      body.file_url ?? null,
        file_size:     body.file_size ?? null,
        mime_type:     body.mime_type ?? null,
        notes:         body.notes ?? null,
        is_active:     body.is_active ?? true,
        uploaded_by:   body.uploaded_by ?? null,
        created_at:    now,
        updated_at:    now,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
