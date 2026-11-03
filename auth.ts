import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { findActiveAuthUser } from "@/lib/auth-user"
import authConfig from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase()
        const password = String(credentials?.password ?? "")
        if (!email || !password) return null

        try {
          const user = await findActiveAuthUser(email)
          if (!user || !(await compare(password, user.passwordHash))) return null

          return {
            id: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            customerId: user.customerId,
          }
        } catch (error) {
          console.error("[Auth] Database credential verification failed", error)
          return null
        }
      },
    }),
  ],
})
