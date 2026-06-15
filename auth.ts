import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { findActiveAuthUser, mapDatabaseRole } from "@/lib/auth-user"

if (process.env.VERCEL === "1") {
  if (process.env.AUTH_URL?.includes("localhost")) delete process.env.AUTH_URL
  if (process.env.NEXTAUTH_URL?.includes("localhost")) delete process.env.NEXTAUTH_URL
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim()
        const password = String(credentials?.password ?? "")
        if (!email || !password) return null

        const user = await findActiveAuthUser(email)
        if (!user?.password_hash || !await bcrypt.compare(password, user.password_hash)) return null

        return {
          id: user.user_id,
          name: user.name,
          email: user.email,
          role: mapDatabaseRole(user.role),
          customerId: null,
        }
      },
    }),
  ],
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
})
