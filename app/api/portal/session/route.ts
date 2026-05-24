import { NextResponse } from "next/server"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const user = session.user as { id: string; name?: string | null; email?: string | null; role?: string; customerId?: string | null }
  return NextResponse.json({
    id:         user.id,
    name:       user.name,
    email:      user.email,
    role:       user.role ?? "CUSTOMER",
    customerId: user.customerId ?? null,
  })
}
