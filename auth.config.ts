import type { NextAuthConfig } from "next-auth"

// Preview deployments must derive their public origin from the incoming Vercel
// request. A local NEXTAUTH_URL is valid for development, but if it is copied
// into a Preview deployment Auth.js will persist localhost in its callback
// cookie and mobile users will be redirected back to their own device.
if (process.env.VERCEL === "1") {
  if (process.env.AUTH_URL?.includes("localhost")) delete process.env.AUTH_URL
  if (process.env.NEXTAUTH_URL?.includes("localhost")) delete process.env.NEXTAUTH_URL
}

const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.customerId = (user as { customerId?: string | null }).customerId ?? null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { customerId?: string | null }).customerId = token.customerId as string | null
      }
      return session
    },
  },
} satisfies NextAuthConfig

export default authConfig
