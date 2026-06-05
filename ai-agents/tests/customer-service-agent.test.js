/**
 * Customer Service Agent Tests
 * Verifies report mode detects overdue invoices by due date, not status only.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import { daysOverdue, isOverdueInvoice } from "../agents/customer-service-agent.js"

test("daysOverdue: past due returns positive", () => {
  const past = new Date(Date.now() - 5 * 86400000).toISOString()
  assert.ok(daysOverdue(past) > 0)
})

test("customer service overdue filter includes ISSUED invoices past due", () => {
  const invoices = [
    { id: "1", status: "ISSUED", due_date: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: "2", status: "PAID", due_date: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: "3", status: "OVERDUE", due_date: null },
    { id: "4", status: "ISSUED", due_date: new Date(Date.now() + 5 * 86400000).toISOString() },
  ]

  assert.deepEqual(invoices.filter(isOverdueInvoice).map((i) => i.id), ["1", "3"])
})
