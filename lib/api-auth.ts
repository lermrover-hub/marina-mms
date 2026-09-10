import { NextResponse } from "next/server"
import { auth } from "@/auth"

export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "MANAGING_DIRECTOR",
  "MARINA_MANAGER",
  "BOAT_YARD_MANAGER",
  "FINANCE",
  "STAFF",
] as const

export const PORTAL_READ_ROLES = [...STAFF_ROLES, "CUSTOMER"] as const

export const ADMIN_ROLES = ["SUPER_ADMIN", "MANAGING_DIRECTOR"] as const
export const FINANCE_WRITE_ROLES = ["SUPER_ADMIN", "MANAGING_DIRECTOR", "FINANCE"] as const
export const QUOTATION_WRITE_ROLES = [...FINANCE_WRITE_ROLES, "MARINA_MANAGER"] as const
export const OPERATIONS_WRITE_ROLES = [
  "SUPER_ADMIN",
  "MANAGING_DIRECTOR",
  "MARINA_MANAGER",
  "BOAT_YARD_MANAGER",
] as const
export const PROCUREMENT_WRITE_ROLES = [
  "SUPER_ADMIN",
  "MANAGING_DIRECTOR",
  "MARINA_MANAGER",
  "BOAT_YARD_MANAGER",
  "FINANCE",
] as const

export type ApiActor = {
  userId: string
  role: string
  customerId: string | null
}

export async function requireApiActor(allowedRoles: readonly string[]) {
  const session = await auth()
  const user = session?.user as {
    id?: string
    role?: string
    customerId?: string | null
  } | undefined

  if (!user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const
  }

  const role = user.role ?? "CUSTOMER"
  if (!allowedRoles.includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const
  }

  return {
    actor: {
      userId: user.id,
      role,
      customerId: user.customerId ?? null,
    } satisfies ApiActor,
  } as const
}

export function customerScope(actor: ApiActor, requestedCustomerId: string | null) {
  if (actor.role !== "CUSTOMER") return { customerId: requestedCustomerId } as const
  if (!actor.customerId) {
    return { error: NextResponse.json({ error: "Customer account is not linked" }, { status: 403 }) } as const
  }
  return { customerId: actor.customerId } as const
}

export function concealOtherCustomer(actor: ApiActor, rowCustomerId: unknown) {
  return actor.role === "CUSTOMER" && String(rowCustomerId ?? "") !== actor.customerId
    ? NextResponse.json({ error: "Not found" }, { status: 404 })
    : null
}
