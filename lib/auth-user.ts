import { createServerClient } from "./supabase-server"
import { mapDatabaseRole } from "./auth-role"

export { mapDatabaseRole } from "./auth-role"

export type AuthUserRecord = {
  userId: string
  name: string
  email: string
  passwordHash: string
  role: string
  customerId: string | null
}

export async function findActiveAuthUser(email: string): Promise<AuthUserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null

  const supabase = createServerClient({ requireServiceRole: true })
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", normalizedEmail)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const row = data as Record<string, unknown>
  const userId = String(row.user_id ?? row.id ?? "")
  const passwordHash = String(row.password_hash ?? "")
  if (!userId || !passwordHash) return null

  return {
    userId,
    name: String(row.name ?? row.email ?? "Marina user"),
    email: String(row.email ?? normalizedEmail),
    passwordHash,
    role: mapDatabaseRole(String(row.role ?? "")),
    customerId: row.customer_id ? String(row.customer_id) : null,
  }
}
