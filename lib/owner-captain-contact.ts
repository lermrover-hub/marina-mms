import type { SupabaseClient } from "@supabase/supabase-js"

export type OwnerCaptainSource = {
  id: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  phone: string | null
  email: string | null
  line_user_id: string | null
  whatsapp_number: string | null
}

export function ownerDisplayName(owner: OwnerCaptainSource): string {
  const personalName = [owner.first_name, owner.last_name].filter(Boolean).join(" ").trim()
  return personalName || owner.company_name?.trim() || "Boat owner"
}

function preferredChannel(owner: OwnerCaptainSource): "PHONE" | "LINE" | "WHATSAPP" | "EMAIL" {
  if (owner.line_user_id) return "LINE"
  if (owner.whatsapp_number) return "WHATSAPP"
  if (owner.email) return "EMAIL"
  return "PHONE"
}

export async function ensureOwnerCaptainContact(
  supabase: SupabaseClient,
  owner: OwnerCaptainSource,
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from("mms_customer_contacts")
    .select("id")
    .eq("customer_id", owner.id)
    .eq("role_title", "OWNER_CAPTAIN")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError

  const now = new Date().toISOString()
  const contact = {
    customer_id: owner.id,
    full_name: ownerDisplayName(owner),
    role_title: "OWNER_CAPTAIN",
    phone: owner.phone,
    email: owner.email,
    line_id: owner.line_user_id,
    whatsapp_number: owner.whatsapp_number,
    preferred_channel: preferredChannel(owner),
    operational_notifications: true,
    notes: "Auto-linked from boat owner: owner is captain.",
    is_active: true,
    updated_at: now,
  }

  if (existing) {
    const { data, error } = await supabase
      .from("mms_customer_contacts")
      .update(contact)
      .eq("id", existing.id)
      .select("id")
      .single()
    if (error) throw error
    return data.id
  }

  const { data, error } = await supabase
    .from("mms_customer_contacts")
    .insert({ ...contact, created_at: now })
    .select("id")
    .single()
  if (error) throw error
  return data.id
}
