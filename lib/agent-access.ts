import { auth } from "@/auth"

const CONTROL_ROLES = new Set([
  "SUPER_ADMIN",
  "MANAGING_DIRECTOR",
  "MARINA_MANAGER",
  "BOAT_YARD_MANAGER",
  "FINANCE",
])

export async function canManageAgents(req?: Request) {
  if (req && hasValidAgentKey(req)) return true
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  return Boolean(role && CONTROL_ROLES.has(role))
}

export function hasValidAgentKey(req: Request) {
  const expected = process.env.MARINA_AGENT_API_KEY
  return Boolean(expected && req.headers.get("x-agent-api-key") === expected)
}
