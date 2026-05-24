// Prisma singleton — prevents multiple connections in development (hot reload)
// Import path matches generator output in schema.prisma
import { PrismaClient } from "@/app/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaOptions = {
  datasourceUrl: process.env.DATABASE_URL,
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
} as unknown as ConstructorParameters<typeof PrismaClient>[0]

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
