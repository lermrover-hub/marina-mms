import { createClient } from "@supabase/supabase-js"

/**
 * Server-side Supabase client — uses service role key when available.
 * NEVER import this in client components ("use client").
 * - With SUPABASE_SERVICE_ROLE_KEY set (Vercel production) → bypasses RLS, full access
 * - Without service role key → falls back to anon key (dev / no regression)
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
