import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { requireApiActor, STAFF_ROLES } from "@/lib/api-auth"
import { createServerClient } from "@/lib/supabase-server"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const BUCKET_MIME_TYPES: Record<string, Set<string>> = {
  "marina-files": new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]),
  "mms-templates": new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ]),
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

function cleanFolder(value: FormDataEntryValue | null) {
  return String(value ?? "uploads")
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 80))
    .filter(Boolean)
    .join("/") || "uploads"
}

export async function POST(req: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error

  const form = await req.formData()
  const bucket = String(form.get("bucket") ?? "")
  const file = form.get("file")
  const allowedTypes = BUCKET_MIME_TYPES[bucket]

  if (!allowedTypes || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 })
  }
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File type or size is not allowed" }, { status: 400 })
  }

  const folder = cleanFolder(form.get("folder"))
  const path = `${folder}/${randomUUID()}.${EXTENSIONS[file.type]}`
  const supabase = createServerClient({ requireServiceRole: true })
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = bucket === "mms-templates"
    ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    : (await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60)).data?.signedUrl ?? ""

  return NextResponse.json({
    name: file.name,
    path,
    url,
    type: file.type,
    size: file.size,
    uploadedBy: access.actor.userId,
  }, { status: 201 })
}

export async function DELETE(req: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error

  const body = await req.json() as { bucket?: string; path?: string }
  const bucket = String(body.bucket ?? "")
  const path = String(body.path ?? "")
  if (!BUCKET_MIME_TYPES[bucket] || !path || path.includes("..")) {
    return NextResponse.json({ error: "Invalid delete request" }, { status: 400 })
  }

  const supabase = createServerClient({ requireServiceRole: true })
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
