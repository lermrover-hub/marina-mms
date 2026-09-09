import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import authConfig from "@/auth.config"

const { auth } = NextAuth(authConfig)

function customerApiAllowed(pathname: string, method: string): boolean {
  if (pathname === "/api/portal/session" && method === "GET") return true
  if (/^\/api\/db\/(boats|invoices|service-requests|ramp-bookings|quotations)$/.test(pathname) && method === "GET") return true
  if (pathname === "/api/db/ramp-bookings" && method === "POST") return true
  if (/^\/api\/db\/quotations\/[^/]+$/.test(pathname) && (method === "GET" || method === "PATCH")) return true
  return false
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Always allow auth API, webhooks, and static assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname === "/api/inquiries" ||
    pathname === "/inquiry" ||
    pathname === "/api/billing/recurring" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Standalone AI agents authenticate with a narrowly scoped shared key.
  const agentKey = process.env.MARINA_AGENT_API_KEY
  const suppliedAgentKey = req.headers.get("x-agent-api-key")
  const isAgentApiRoute =
    pathname.startsWith("/api/db/") ||
    pathname.startsWith("/api/pricing-master") ||
    pathname.startsWith("/api/tide/") ||
    (pathname === "/api/ai/orders" && (req.method === "GET" || req.method === "POST")) ||
    (pathname.match(/^\/api\/ai\/orders\/[^/]+$/) && req.method === "GET")

  if (isAgentApiRoute && agentKey && suppliedAgentKey === agentKey) {
    // /api/tide/calculate is pure computation (no DB write) — allow POST in safe mode
    const isTideCalculation = pathname === "/api/tide/calculate"
    const isReadOnlyRequest = req.method === "GET" || req.method === "HEAD" || isTideCalculation
    if (!isReadOnlyRequest && process.env.ENABLE_AI_AGENT_WRITES !== "true") {
      return NextResponse.json(
        { error: "AI agent writes are disabled" },
        { status: 403 }
      )
    }
    return NextResponse.next()
  }

  const isAuthRoute = pathname.startsWith("/login")

  const user = req.auth?.user as { role?: string } | undefined
  const isLoggedIn = !!user

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (user?.role === "CUSTOMER" && pathname.startsWith("/api/") && !customerApiAllowed(pathname, req.method)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
