import { createClient } from "@supabase/supabase-js"

/** Strip leading UTF-8 BOM (U+FEFF) if present — defensive against env-var storage edge cases. */
function clean(s: string | undefined): string {
  if (!s) return ""
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

/**
 * Server-side Supabase client — uses service role key when available.
 * NEVER import this in client components ("use client").
 * - With SUPABASE_SERVICE_ROLE_KEY set (Vercel production) → bypasses RLS, full access
 * - Without service role key → falls back to anon key (dev / no regression)
 */
export function createServerClient() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key =
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
