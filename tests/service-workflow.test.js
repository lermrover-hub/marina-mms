import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  calculateDepositRequired,
  canConfirmServiceOrder,
  defaultPaymentMode,
  deriveCreditSchedule,
  minimumQuotationApprover,
  validateDiscount,
} from "../lib/service-workflow.ts"
import {
  INSURANCE_VERIFY_ROLES,
  PAYMENT_GATE_ROLES,
  QUOTATION_PRICE_EDIT_ROLES,
  WORK_ORDER_CREATE_ROLES,
  maxOperationalDiscountForRole,
  roleAllowed,
} from "../lib/workflow-access.ts"
import { readLegacyWorkflowMetadata, writeLegacyWorkflowMetadata } from "../lib/service-workflow-compat.ts"

test("payment mode follows the approved service policy", () => {
  assert.equal(defaultPaymentMode("STORAGE", "OCEAN_ROVER"), "FULL_PREPAYMENT")
  assert.equal(defaultPaymentMode("YARD_SERVICE", "OCEAN_ROVER"), "DEPOSIT")
  assert.equal(calculateDepositRequired(100000, 60000, 50), 60000)
  assert.equal(calculateDepositRequired(100000, 120000, 50), 100000)
})

test("service and work orders remain blocked until the payment gate passes", () => {
  assert.equal(canConfirmServiceOrder("FULL_PREPAYMENT", "AWAITING_PAYMENT"), false)
  assert.equal(canConfirmServiceOrder("FULL_PREPAYMENT", "PAID"), true)
  assert.equal(canConfirmServiceOrder("DEPOSIT", "DEPOSIT_PAID"), true)
  assert.equal(canConfirmServiceOrder("CREDIT", "CREDIT_APPROVED"), true)
  assert.equal(canConfirmServiceOrder("CREDIT", "OVERDUE"), false)
})

test("credit cycle is 30 days and good customers receive at most 7 post-launch days", () => {
  assert.deepEqual(deriveCreditSchedule("2026-09-01", null, false), {
    firstCycleDueDate: "2026-10-01",
    firstReminderDate: "2026-09-26",
    launchWithinFirstCycle: false,
    finalDueDate: "2026-10-01",
  })
  assert.equal(deriveCreditSchedule("2026-09-01", "2026-09-20", true)?.finalDueDate, "2026-09-27")
})

test("discount authority and contractor exclusions are deterministic", () => {
  assert.equal(minimumQuotationApprover(20, false), "MANAGER")
  assert.equal(minimumQuotationApprover(20.01, false), "GENERAL_MANAGER")
  assert.equal(minimumQuotationApprover(0, true), "GENERAL_MANAGER")
  assert.equal(validateDiscount("OCEAN_ROVER", 10, 100), null)
  assert.match(validateDiscount("OCEAN_ROVER_SUBCONTRACTOR", 1, 100) ?? "", /only/)
  assert.match(validateDiscount("BOAT_OWNER_CONTRACTOR", 0, 0) ?? "", /no-charge/)
})

test("pilot roles receive the approved workflow permissions", () => {
  assert.equal(maxOperationalDiscountForRole("STAFF"), 10)
  assert.equal(maxOperationalDiscountForRole("MARINA_MANAGER"), 20)
  assert.equal(maxOperationalDiscountForRole("FINANCE"), 20)
  assert.equal(maxOperationalDiscountForRole("SUPER_ADMIN"), 100)
  assert.equal(roleAllowed("FINANCE", QUOTATION_PRICE_EDIT_ROLES), true)
  assert.equal(roleAllowed("MARINA_MANAGER", QUOTATION_PRICE_EDIT_ROLES), false)
  assert.equal(roleAllowed("FINANCE", PAYMENT_GATE_ROLES), true)
  assert.equal(roleAllowed("STAFF", PAYMENT_GATE_ROLES), false)
  assert.equal(roleAllowed("BOAT_YARD_MANAGER", INSURANCE_VERIFY_ROLES), true)
  assert.equal(roleAllowed("STAFF", INSURANCE_VERIFY_ROLES), false)
  assert.equal(roleAllowed("BOAT_YARD_MANAGER", WORK_ORDER_CREATE_ROLES), true)
  assert.equal(roleAllowed("STAFF", WORK_ORDER_CREATE_ROLES), false)
})

test("service request is created before payment while work order remains server-gated", () => {
  const requestRoute = readFileSync("app/api/db/service-requests/route.ts", "utf8")
  const workOrderRoute = readFileSync("app/api/db/work-orders/route.ts", "utf8")
  const detailPage = readFileSync("app/(dashboard)/service-requests/[id]/page.tsx", "utf8")
  assert.match(requestRoute, /payment_gate_status: "AWAITING_PAYMENT"/)
  assert.match(requestRoute, /status: "QUOTATION_DRAFT"/)
  assert.match(workOrderRoute, /SERVICE_ORDER_CONFIRMED/)
  assert.match(workOrderRoute, /requireApiActor\(WORK_ORDER_CREATE_ROLES\)/)
  assert.match(workOrderRoute, /clear its payment gate before creating a Work Order/)
  assert.match(detailPage, /Work Order is locked until payment clearance/)
  assert.match(detailPage, /HelpHint/)
})

test("legacy staging can preserve workflow state until the migration is installed", () => {
  const notes = writeLegacyWorkflowMetadata("Officer note", { payment_mode: "CREDIT", payment_gate_status: "AWAITING_PAYMENT" })
  assert.match(notes, /Officer note/)
  assert.equal(readLegacyWorkflowMetadata(notes).payment_mode, "CREDIT")
  const updated = writeLegacyWorkflowMetadata(notes, { payment_mode: "CREDIT", payment_gate_status: "CREDIT_APPROVED" })
  assert.equal((updated.match(/__MMS_WORKFLOW__/g) ?? []).length, 1)
  assert.equal(readLegacyWorkflowMetadata(updated).payment_gate_status, "CREDIT_APPROVED")
})

test("legacy staging quotation fallback omits approval columns that are not installed yet", () => {
  const requestRoute = readFileSync("app/api/db/service-requests/route.ts", "utf8")
  const baseStart = requestRoute.indexOf("const baseQuotation =")
  const firstInsert = requestRoute.indexOf("const firstQuotation =", baseStart)
  const baseQuotation = requestRoute.slice(baseStart, firstInsert)
  assert.ok(baseStart >= 0 && firstInsert > baseStart)
  assert.doesNotMatch(baseQuotation, /internal_approval_status|required_approver_role|max_discount_pct|has_no_charge_line/)
  assert.match(requestRoute, /const firstQuotation =[^\n]+internal_approval_status: "NOT_SUBMITTED"/)
  assert.match(requestRoute, /insert\(baseQuotation\)/)
})

test("service workflow migration protects integrity and server-only access", () => {
  const migration = readFileSync("supabase/migrations/20260919153838_add_service_workflow_payment_plans.sql", "utf8")
  assert.match(migration, /service_request_id text NOT NULL REFERENCES public\.mms_service_requests\(id\) ON DELETE CASCADE/)
  assert.match(migration, /quotation_id text REFERENCES public\.mms_quotations\(id\) ON DELETE SET NULL/)
  assert.match(migration, /deposit_required_amount <= total_amount AND paid_amount <= total_amount/)
  assert.match(migration, /mms_service_request_items FORCE ROW LEVEL SECURITY/)
  assert.match(migration, /mms_service_payment_plans FORCE ROW LEVEL SECURITY/)
})

test("service request form accepts two-decimal cost and discount snapshots", () => {
  const page = readFileSync("app/(dashboard)/service-requests/new/page.tsx", "utf8")
  assert.match(page, /<Label>Direct cost<\/Label><Input type="number" min="0" step="0\.01"/)
  assert.match(page, /<Label>Discount %<\/Label><Input type="number" min="0" max=\{maximumDiscount\} step="0\.01"/)
  assert.match(page, /disabled=\{!canEditCost\}/)
})
