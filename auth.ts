import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

// Development mock users — replace with Prisma DB lookup after DB is connected
const MOCK_USERS = [
  { id: "user-001", name: "Admin User",       email: "admin@marina.com",   password: "admin123",   role: "SUPER_ADMIN",       customerId: null },
  { id: "user-002", name: "Marina Manager",   email: "marina@marina.com",  password: "marina123",  role: "MARINA_MANAGER",    customerId: null },
  { id: "user-003", name: "Finance Officer",  email: "finance@marina.com", password: "finance123", role: "FINANCE",           customerId: null },
  { id: "user-004", name: "Boat Yard Manager",email: "yard@marina.com",    password: "yard123",    role: "BOAT_YARD_MANAGER", customerId: null },
  { id: "portal-cust-001", name: "James Thornton", email: "customer@marina.com", password: "customer123", role: "CUSTOMER", customerId: "cust-001" },
  { id: "portal-cust-002", name: "Erik Lindström",  email: "erik@marina.com",     password: "customer123", role: "CUSTOMER", customerId: "cust-003" },
]

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages:   { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string }
        if (!email || !password) return null

        // TODO: replace with Prisma DB lookup + bcrypt.compare
        const user = MOCK_USERS.find(
          (u) => u.email === email && u.password === password
        )
        if (!user) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role, customerId: (user as any).customerId ?? null }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id         = user.id
        token.role       = (user as { role?: string }).role
        token.customerId = (user as any).customerId ?? null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as any).customerId = token.customerId ?? null
      }
      return session
    },
  },
})
