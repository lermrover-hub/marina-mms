import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  CUSTOMER_VISIBLE_QUOTATION_STATUSES,
  canApproveQuotationInternally,
  canApproveQuotationForLevel,
  canEditQuotation,
  calculateQuotationLineTotal,
  validateQuotationTransition,
} from "../lib/quotation-workflow.ts"

test("only drafts are editable", () => {
  assert.equal(canEditQuotation("DRAFT"), true)
  assert.equal(canEditQuotation("PENDING_APPROVAL"), false)
  assert.equal(canEditQuotation("SENT"), false)
})

test("quotation line amount is derived from quantity, unit price, and discount", () => {
  assert.equal(calculateQuotationLineTotal({ qty: 2, unit_price: 3500, discount_pct: 0 }), 7000)
  assert.equal(calculateQuotationLineTotal({ qty: 3, unit_price: 120, discount_pct: 10 }), 324)
})

test("draft must be submitted before internal approval", () => {
  assert.equal(validateQuotationTransition("DRAFT", "submit_for_approval", "FINANCE"), null)
  assert.match(
    validateQuotationTransition("SENT", "submit_for_approval", "FINANCE"),
    /Only a DRAFT/,
  )
})

test("approval level is separate from customer delivery", () => {
  assert.equal(canApproveQuotationInternally("SUPER_ADMIN"), true)
  assert.equal(canApproveQuotationInternally("MANAGING_DIRECTOR"), true)
  assert.equal(canApproveQuotationInternally("FINANCE"), false)
  assert.equal(canApproveQuotationForLevel("MARINA_MANAGER", "MANAGER"), true)
  assert.equal(canApproveQuotationForLevel("MARINA_MANAGER", "GENERAL_MANAGER"), false)
  assert.equal(canApproveQuotationForLevel("SUPER_ADMIN", "GENERAL_MANAGER"), true)
  assert.equal(validateQuotationTransition("PENDING_APPROVAL", "approve_internal", "MARINA_MANAGER"), null)
  assert.equal(validateQuotationTransition("APPROVED", "send_to_customer", "FINANCE"), null)
})

test("customers cannot see internal quotation states", () => {
  assert.equal(CUSTOMER_VISIBLE_QUOTATION_STATUSES.includes("DRAFT"), false)
  assert.equal(CUSTOMER_VISIBLE_QUOTATION_STATUSES.includes("PENDING_APPROVAL"), false)
  assert.equal(CUSTOMER_VISIBLE_QUOTATION_STATUSES.includes("APPROVED"), false)
  assert.equal(CUSTOMER_VISIBLE_QUOTATION_STATUSES.includes("SENT"), true)
})

test("quotation UI and API enforce the internal approval gate", () => {
  const detailPage = readFileSync("app/(dashboard)/quotations/[id]/page.tsx", "utf8")
  const editorPage = readFileSync("app/(dashboard)/quotations/new/page.tsx", "utf8")
  const apiRoute = readFileSync("app/api/db/quotations/[id]/route.ts", "utf8")

  assert.match(detailPage, /Submit for Approval/)
  assert.match(detailPage, /Approve Internally/)
  assert.match(detailPage, /Send Approved Quotation/)
  assert.match(detailPage, /href=\{`\/quotations\/\$\{id\}\/edit`\}/)
  assert.doesNotMatch(detailPage, /> Send to Customer</)
  assert.match(editorPage, /status:\s+"DRAFT"/)
  assert.match(editorPage, /action: "submit_for_approval"/)
  assert.match(apiRoute, /"MANAGING_DIRECTOR", "SUPER_ADMIN"/)
  assert.match(apiRoute, /target_role: targetRole/)
  assert.match(apiRoute, /isRealCustomerMessagesEnabled\(\)/)
  assert.match(apiRoute, /roleAllowed\(access\.actor\.role, QUOTATION_PRICE_EDIT_ROLES\)/)
  assert.match(detailPage, /roleAllowed\(actorRole, QUOTATION_PRICE_EDIT_ROLES\)/)
})

test("print quotation uses the root document instead of nesting html and body", () => {
  const printLayout = readFileSync("app/print/layout.tsx", "utf8")
  const printPage = readFileSync("app/print/quotations/[id]/page.tsx", "utf8")
  const signatureRoute = readFileSync("app/api/settings/signature/route.ts", "utf8")
  assert.doesNotMatch(printLayout, /<html|<body/)
  assert.match(printPage, /calculateQuotationLineTotal\(item\)/)
  assert.match(signatureRoute, /isMissingWorkflowSchema/)
  assert.match(signatureRoute, /url: null, unavailable: true/)
})

test("quotation approval migration stores audit and targeted notification fields", () => {
  const migration = readFileSync(
    "supabase/migrations/20260919193000_add_quotation_internal_approval.sql",
    "utf8",
  )
  assert.match(migration, /internal_approval_status/)
  assert.match(migration, /internal_approved_by/)
  assert.match(migration, /internal_approved_at/)
  assert.match(migration, /customer_sent_at/)
  assert.match(migration, /target_role/)
  assert.match(migration, /internal_approval_status IN \('NOT_SUBMITTED', 'PENDING', 'APPROVED'\)/)
  assert.match(migration, /NOTIFY pgrst, 'reload schema'/)
})
