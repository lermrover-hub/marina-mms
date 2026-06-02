// Legacy compatibility module.
// This project currently uses Supabase clients for app API routes. Prisma 7 in
// this repo is generated under app/generated/prisma and requires an explicit
// adapter/accelerate configuration, so do not instantiate it from this helper.
export const prisma = new Proxy(
  {},
  {
    get() {
      throw new Error("Prisma helper is not configured. Use Supabase server APIs instead.")
    },
  }
) as never
