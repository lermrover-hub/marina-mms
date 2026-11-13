import { auth } from "@/auth"

export const PRICING_WRITE_ROLES = new Set(["SUPER_ADMIN", "FINANCE"])

type PricingAccessResult =
  | {
      allowed: true
      actorId: string
      actorName: string
      role: string
    }
  | {
      allowed: false
      status: 401 | 403
      error: string
    }

export async function getPricingWriteAccess(): Promise<PricingAccessResult> {
  const session = await auth()
  const user = session?.user as
    | { id?: string; name?: string | null; email?: string | null; role?: string }
    | undefined

  if (!user) {
    return { allowed: false, status: 401, error: "Authentication required" }
  }

  const role = String(user.role ?? "").toUpperCase()
  if (!PRICING_WRITE_ROLES.has(role)) {
    return { allowed: false, status: 403, error: "Admin or Finance role required" }
  }

  return {
    allowed: true,
    actorId: user.id ?? user.email ?? "unknown-user",
    actorName: user.name ?? user.email ?? user.id ?? "Unknown user",
    role,
  }
}
