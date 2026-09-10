import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8")

test("authentication uses database password hashes and contains no committed mock passwords", () => {
  const auth = read("../auth.ts")
  assert.match(auth, /findActiveAuthUser/)
  assert.match(auth, /compare\(password, user\.passwordHash\)/)
  assert.doesNotMatch(auth, /MOCK_USERS|admin123|marina123|finance123|customer123/)
})

test("middleware validates an Auth.js session rather than trusting cookie presence", () => {
  const middleware = read("../middleware.ts")
  assert.match(middleware, /export default auth\(/)
  assert.match(middleware, /req\.auth\?\.user/)
  assert.match(middleware, /auth\.config/)
  assert.doesNotMatch(middleware, /from ["']@\/auth["']/)
  assert.doesNotMatch(middleware, /authjs\.session-token|next-auth\.session-token/)
})

test("middleware applies staff RBAC to admin, finance, pricing, and report APIs", () => {
  const middleware = read("../middleware.ts")
  assert.match(middleware, /function staffApiAllowed/)
  assert.match(middleware, /ADMIN_ROLES\.has\(role\)/)
  assert.match(middleware, /FINANCE_ROLES\.has\(role\)/)
  assert.match(middleware, /QUOTATION_ROLES\.has\(role\)/)
  assert.match(middleware, /REPORT_ROLES\.has\(role\)/)
})

test("production data-api hardening revokes anonymous table access", () => {
  const migration = read("../supabase/migrations/20260909150000_harden_public_data_api.sql")
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /FORCE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE %I\.%I FROM anon, authenticated/)
  assert.match(migration, /tablename <> 'inquiries'/)
})

test("portal-facing APIs derive customer scope from the verified session", () => {
  const helper = read("../lib/api-auth.ts")
  assert.match(helper, /actor\.role !== "CUSTOMER"/)
  assert.match(helper, /customerId: actor\.customerId/)

  for (const route of [
    "../app/api/db/boats/route.ts",
    "../app/api/db/invoices/route.ts",
    "../app/api/db/service-requests/route.ts",
    "../app/api/db/ramp-bookings/route.ts",
    "../app/api/db/quotations/route.ts",
  ]) {
    assert.match(read(route), /customerScope\(access\.actor/)
  }

  const quotationDetail = read("../app/api/db/quotations/[id]/route.ts")
  assert.match(quotationDetail, /concealOtherCustomer\(access\.actor/)
  assert.match(quotationDetail, /body\.action !== "approve" && body\.status !== "REJECTED"/)
})

test("storage writes use an authenticated server route and remove the public ALL policy", () => {
  const route = read("../app/api/storage/route.ts")
  assert.match(route, /requireApiActor\(STAFF_ROLES\)/)
  assert.match(route, /requireServiceRole: true/)
  assert.match(route, /MAX_FILE_SIZE = 10 \* 1024 \* 1024/)

  const photoUpload = read("../components/shared/PhotoUpload.tsx")
  assert.match(photoUpload, /fetch\("\/api\/storage"/)
  assert.doesNotMatch(photoUpload, /supabase\.storage/)

  const settings = read("../app/(dashboard)/settings/page.tsx")
  assert.match(settings, /fetch\("\/api\/storage"/)
  assert.doesNotMatch(settings, /supabase\.storage/)

  const migration = read("../supabase/migrations/20260909153000_harden_storage_writes.sql")
  assert.match(migration, /DROP POLICY IF EXISTS marina_files_all_access/)
  assert.match(migration, /SET public = false/)
})

test("public inquiry API is rate-limited, staff-authenticated for reads, and fails closed", () => {
  const route = read("../app/api/inquiries/route.ts")
  assert.match(route, /mms_consume_public_rate_limit/)
  assert.match(route, /createServerClient\(\{ requireServiceRole: true \}\)/)
  assert.match(route, /requireApiActor\(STAFF_ROLES\)/)
  assert.match(route, /RATE_LIMIT_MAX_REQUESTS = 5/)
  assert.doesNotMatch(route, /authHeader\?\.startsWith\("Bearer "\)/)
  assert.doesNotMatch(route, /mock-id|Returning mock response/)
  assert.doesNotMatch(route, /error: error\.message/)

  const migration = read("../supabase/migrations/20260910075627_harden_inquiries_api_access.sql")
  assert.match(migration, /FORCE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.inquiries FROM anon, authenticated/)
  assert.match(migration, /DROP POLICY IF EXISTS "Public can submit inquiry"/)
  assert.match(migration, /inquiries_assigned_to_idx/)
})
