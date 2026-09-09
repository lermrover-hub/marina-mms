import type { NextAuthConfig } from "next-auth"

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
