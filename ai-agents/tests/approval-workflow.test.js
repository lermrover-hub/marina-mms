/**
 * Approval Workflow Tests
 * Tests the AI order → approval → execution flow
 */

import { test } from "node:test"
import assert from "node:assert/strict"

// ── Mock data ──────────────────────────────────────────────────────────────────

const mockQuotationOrder = {
  agent_name: "quotation",
  action: "create_quotation",
  entity_type: "quotation",
  input_data: {
    customer_id: "cust-123",
    title: "Engine Service Quotation",
    subtotal: 5000,
    tax_rate: 7,
    tax_amount: 350,
    grand_total: 5350,
    deposit_req: 2675,
    items: [
      {
        description: "Engine Oil Change",
        qty: 1,
        unitPrice: 1000,
      },
      {
        description: "Labor - 4 hours",
        qty: 4,
        unitPrice: 1000,
      },
    ],
  },
  approval_required_role: "MANAGING_DIRECTOR",
}

// ── Status tracking logic ──────────────────────────────────────────────────────

function validateOrderStatus(order) {
  const validStatuses = ["pending", "approved", "rejected", "executed", "cancelled"]
  return validStatuses.includes(order.status)
}

function canExecuteOrder(order) {
  return order.status === "approved"
}

function transitionStatus(order, newStatus) {
  const validTransitions = {
    pending: ["approved", "rejected", "cancelled"],
    approved: ["executed", "cancelled"],
    rejected: ["cancelled"],
    executed: [], // terminal
    cancelled: [], // terminal
  }

  const allowed = validTransitions[order.status] || []
  return allowed.includes(newStatus)
}

// ── Unit tests ─────────────────────────────────────────────────────────────────

test("Order: required fields present", () => {
  const order = mockQuotationOrder
  assert.ok(order.agent_name, "agent_name required")
  assert.ok(order.action, "action required")
  assert.ok(order.entity_type, "entity_type required")
  assert.ok(order.input_data, "input_data required")
})

test("Order: status validation", () => {
  const order = { status: "pending" }
  assert.ok(validateOrderStatus(order), "pending is valid status")

  const invalidOrder = { status: "unknown" }
  assert.ok(!validateOrderStatus(invalidOrder), "unknown is invalid status")
})

test("Order: cannot execute unless approved", () => {
  const pendingOrder = { status: "pending" }
  assert.ok(!canExecuteOrder(pendingOrder), "pending order cannot execute")

  const approvedOrder = { status: "approved" }
  assert.ok(canExecuteOrder(approvedOrder), "approved order can execute")

  const rejectedOrder = { status: "rejected" }
  assert.ok(!canExecuteOrder(rejectedOrder), "rejected order cannot execute")
})

test("Order: state transitions", () => {
  assert.ok(transitionStatus({ status: "pending" }, "approved"), "pending → approved allowed")
  assert.ok(transitionStatus({ status: "pending" }, "rejected"), "pending → rejected allowed")
  assert.ok(!transitionStatus({ status: "pending" }, "executed"), "pending → executed NOT allowed (must approve first)")
  assert.ok(transitionStatus({ status: "pending" }, "cancelled"), "pending → cancelled IS allowed (policy: user can cancel anytime)")

  assert.ok(transitionStatus({ status: "approved" }, "executed"), "approved → executed allowed")
  assert.ok(!transitionStatus({ status: "approved" }, "rejected"), "approved → rejected NOT allowed")

  assert.ok(!transitionStatus({ status: "executed" }, "anything"), "executed is terminal")
})

test("Order: quotation total calculation", () => {
  const input = mockQuotationOrder.input_data
  const expectedTotal = input.subtotal + input.tax_amount
  assert.equal(input.grand_total, expectedTotal, `grand_total must be subtotal + tax`)
})

test("Order: deposit calculation (50% default)", () => {
  const input = mockQuotationOrder.input_data
  const expectedDeposit = Math.round(input.grand_total * 0.5)
  assert.equal(input.deposit_req, expectedDeposit, "deposit should be 50% of grand_total")
})

test("Order: line items sum to subtotal", () => {
  const input = mockQuotationOrder.input_data
  const itemsTotal = input.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0)
  assert.equal(itemsTotal, input.subtotal, "line items should sum to subtotal")
})

test("Order: approval queue entry required", () => {
  const order = mockQuotationOrder
  assert.ok(order.approval_required_role, "approval_required_role must be set")
  assert.equal(order.approval_required_role, "MANAGING_DIRECTOR", "default role should be MANAGING_DIRECTOR")
})

// ── Workflow scenario tests ────────────────────────────────────────────────────

test("Workflow: create → pending", () => {
  const order = {
    ...mockQuotationOrder,
    id: "order-1",
    status: "pending",
    created_at: new Date().toISOString(),
  }
  assert.equal(order.status, "pending", "new order should have status=pending")
})

test("Workflow: pending → approved → executed", () => {
  let order = { id: "order-1", status: "pending" }

  assert.ok(!canExecuteOrder(order), "Step 1: cannot execute pending order")

  // Manager approves
  assert.ok(transitionStatus(order, "approved"), "Step 2: can transition to approved")
  order.status = "approved"
  order.approved_at = new Date().toISOString()

  // System executes
  assert.ok(canExecuteOrder(order), "Step 3: can now execute approved order")
  order.status = "executed"
  order.entity_id = "quot-123"

  assert.equal(order.status, "executed", "order should be executed")
  assert.ok(order.entity_id, "executed order should have entity_id")
})

test("Workflow: pending → rejected (no execution)", () => {
  let order = { id: "order-1", status: "pending" }

  assert.ok(!canExecuteOrder(order), "cannot execute pending order")

  // Manager rejects
  assert.ok(transitionStatus(order, "rejected"), "can transition to rejected")
  order.status = "rejected"
  order.rejection_reason = "Incorrect pricing"

  assert.ok(!canExecuteOrder(order), "rejected order still cannot execute")
})

// ── Integration scenario: quotation agent creates order ───────────────────────

test("Integration: quotation agent flow", () => {
  // 1. Agent creates order
  const createdOrder = {
    id: "order-qa-001",
    agent_name: "quotation",
    action: "create_quotation",
    entity_type: "quotation",
    input_data: mockQuotationOrder.input_data,
    status: "pending",
    created_at: new Date().toISOString(),
  }

  assert.equal(createdOrder.status, "pending", "agent creates pending order")
  assert.ok(!createdOrder.entity_id, "no quotation created yet")

  // 2. Approval queue entry created
  const queueEntry = {
    order_id: createdOrder.id,
    approver_role: "MANAGING_DIRECTOR",
    status: "pending",
  }

  assert.ok(queueEntry.order_id, "approval queue entry created")

  // 3. Manager approves
  queueEntry.status = "approved"
  queueEntry.approved_by = "user-mgr-001"
  queueEntry.approved_at = new Date().toISOString()

  createdOrder.status = "approved"

  assert.ok(canExecuteOrder(createdOrder), "order is now approvable")

  // 4. System executes order (creates quotation in DB)
  const createdQuotation = {
    id: "quot-001",
    quote_number: "QT-2026-001",
    customer_id: createdOrder.input_data.customer_id,
    title: createdOrder.input_data.title,
    total_amount: createdOrder.input_data.grand_total,
    draft_by_agent: true,
    ai_order_id: createdOrder.id,
  }

  createdOrder.status = "executed"
  createdOrder.entity_id = createdQuotation.id

  assert.equal(createdOrder.status, "executed", "order executed")
  assert.ok(createdOrder.entity_id, "quotation created")
  assert.equal(createdQuotation.ai_order_id, createdOrder.id, "quotation linked to order")
})
