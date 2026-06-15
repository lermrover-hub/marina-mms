import { Pool } from "pg"

export type AuthUserRecord = {
  user_id: string
  name: string
  email: string
  password_hash: string
  role: string
  is_active: boolean
}

const globalForAuthDb = globalThis as typeof globalThis & { authDbPool?: Pool }

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured")

  globalForAuthDb.authDbPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 10_000,
  })
  return globalForAuthDb.authDbPool
}

export function mapDatabaseRole(role: string): string {
  const roles: Record<string, string> = {
    owner: "SUPER_ADMIN",
    super_admin: "SUPER_ADMIN",
    managing_director: "MANAGING_DIRECTOR",
    marina_manager: "MARINA_MANAGER",
    boat_yard_manager: "BOAT_YARD_MANAGER",
    finance: "FINANCE",
    staff: "STAFF",
    customer: "CUSTOMER",
  }
  return roles[role.trim().toLowerCase()] ?? "STAFF"
}

export async function findActiveAuthUser(email: string): Promise<AuthUserRecord | null> {
  const result = await getPool().query<AuthUserRecord>(
    `select user_id, name, email, password_hash, role, is_active
       from public.users
      where lower(email) = lower($1)
        and is_active = true
      limit 1`,
    [email.trim()]
  )
  return result.rows[0] ?? null
}
