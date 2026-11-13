import { createClient } from "@supabase/supabase-js"

/** Strip leading UTF-8 BOM (U+FEFF) if present — defensive against env-var storage edge cases. */
function clean(s: string | undefined): string {
  if (!s) return ""
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

/**
 * Server-side Supabase client — uses service role key when available.
 * NEVER import this in client components ("use client").
 * Server operations always require SUPABASE_SERVICE_ROLE_KEY and fail closed.
 * Browser/public access must use the separate lib/supabase.ts client.
 */
export function createServerClient(_options: { requireServiceRole?: boolean } = {}) {
  void _options
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!url) throw new Error("Supabase URL is not configured")
  if (!serviceRoleKey) throw new Error("Supabase service role key is required for server operations")

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
