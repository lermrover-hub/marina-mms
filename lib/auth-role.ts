export function mapDatabaseRole(role: string | null | undefined): string {
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
  return roles[String(role ?? "").trim().toLowerCase()] ?? "STAFF"
}
