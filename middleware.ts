import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
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
    pathname === "/api/ai/control" ||
    (pathname === "/api/ai/orders" && (req.method === "GET" || req.method === "POST")) ||
    (pathname.match(/^\/api\/ai\/orders\/[^/]+$/) && req.method === "GET")

  if (isAgentApiRoute && agentKey && suppliedAgentKey === agentKey) {
    // /api/tide/calculate is pure computation (no DB write) — allow POST in safe mode
    const isPreviewCalculation = pathname === "/api/tide/calculate" || pathname === "/api/ai/control"
    const isReadOnlyRequest = req.method === "GET" || req.method === "HEAD" || isPreviewCalculation
    if (!isReadOnlyRequest && process.env.ENABLE_AI_AGENT_WRITES !== "true") {
      return NextResponse.json(
        { error: "AI agent writes are disabled" },
        { status: 403 }
      )
    }
    return NextResponse.next()
  }

  const isAuthRoute = pathname.startsWith("/login")

  // NextAuth v5 (auth.js) session cookie names
  const sessionToken =
    req.cookies.get("authjs.session-token") ||
    req.cookies.get("__Secure-authjs.session-token") ||
    req.cookies.get("next-auth.session-token") ||
    req.cookies.get("__Secure-next-auth.session-token")

  const isLoggedIn = !!sessionToken

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
