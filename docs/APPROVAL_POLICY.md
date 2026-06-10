# AI Agent Approval Policy

## Overview

All AI agent write operations go through an **Approval Queue** workflow:

```
Agent Creates Order
  ↓
Order enters PENDING status
  ↓
Approval Queue notifies manager
  ↓
Manager reviews order details
  ↓
Manager APPROVES or REJECTS
  ↓
If APPROVED → Order executes (creates entity in database)
If REJECTED → Order stays rejected, entity is NOT created
```

## Approval Roles & Thresholds

### Quotation Agent → MANAGING_DIRECTOR

| Threshold | Amount | Approval Required |
|-----------|--------|------------------|
| Small quotes | < ฿10,000 | MANAGING_DIRECTOR |
| Medium quotes | ฿10,000–฿50,000 | MANAGING_DIRECTOR |
| Large quotes | > ฿50,000 | MANAGING_DIRECTOR + FINANCE (future) |

**Rule:** All quotations created by AI agent require manager approval before they are finalized.

**Rationale:** Ensures pricing is correct, deposit terms are appropriate, and scope is clear before quotation is sent to customer.

---

### Finance Agent → FINANCE

| Threshold | Amount | Approval Required |
|-----------|--------|------------------|
| All invoices | Any | FINANCE |

**Rule:** All invoices created by AI agent require Finance approval before they are issued.

**Rationale:** Finance controls the official invoice record, tax reporting, and revenue recognition.

---

### Marina Agent → NO APPROVAL

| Item | Type | Approval Required |
|------|------|------------------|
| Notifications | System alerts | NO |
| Contract expiry alerts | Informational | NO |
| Insurance expiry alerts | Informational | NO |

**Rule:** Marina agent notifications do NOT require approval. They are informational only.

**Rationale:** These are alerts, not financial/binding actions. Staff use them to decide what to do next.

---

### Finance Agent (Payment Reminders) → NO APPROVAL

**Rule:** Payment reminder notifications do NOT require approval.

**Rationale:** Reminders are informational. System generates them automatically based on overdue rules.

---

## Order States

```
PENDING
  ├─→ APPROVED (manager clicks Approve)
  │     └─→ EXECUTED (system creates entity)
  └─→ REJECTED (manager clicks Reject)

CANCELLED (user can cancel anytime)

EXECUTED (terminal—entity created)
REJECTED (terminal—entity never created)
```

## Order Fields

Every AI order has:

```json
{
  "id": "order-123",
  "agent_name": "quotation",              // which agent created it
  "action": "create_quotation",           // what it wants to do
  "entity_type": "quotation",             // what entity it creates
  "entity_id": null,                      // set after execution
  "input_data": { ... },                  // the data to create
  "status": "pending",                    // pending, approved, rejected, executed, cancelled
  "approval_required_role": "MANAGING_DIRECTOR",  // who can approve
  "created_at": "2026-06-11T10:30:00Z",
  "updated_at": "2026-06-11T10:30:00Z"
}
```

## Approval Queue

For each pending order, there's an approval queue entry:

```json
{
  "id": "queue-456",
  "order_id": "order-123",
  "approver_role": "MANAGING_DIRECTOR",
  "status": "pending",                    // pending, approved, rejected
  "approved_by": null,                    // user ID when approved
  "approved_at": null,                    // timestamp when approved
  "reason": null,                         // comment on approval/rejection
  "created_at": "2026-06-11T10:30:00Z"
}
```

## Approval API Endpoints

### List Pending Orders
```
GET /api/ai/orders?status=pending&agent=quotation
```

**Response:**
```json
[
  {
    "id": "order-123",
    "agent_name": "quotation",
    "action": "create_quotation",
    "input_data": { ... },
    "created_at": "2026-06-11T10:30:00Z",
    "approval_queue": [
      {
        "id": "queue-456",
        "status": "pending",
        "approver_role": "MANAGING_DIRECTOR"
      }
    ]
  }
]
```

### View Order Detail
```
GET /api/ai/orders/:id
```

### Approve Order
```
PATCH /api/ai/orders/:id
Content-Type: application/json

{
  "action": "approve",
  "approved_by": "user-mgr-001",
  "reason": "Pricing looks correct, customer contacted"
}
```

**Result:** Order status changes to `approved`, system immediately executes it.

### Reject Order
```
PATCH /api/ai/orders/:id
Content-Type: application/json

{
  "action": "reject",
  "approved_by": "user-mgr-001",
  "reason": "Pricing too low. Revise and resubmit."
}
```

**Result:** Order status changes to `rejected`, entity is NOT created. Agent can resubmit a new order with corrected data.

### Execute Approved Order
```
POST /api/ai/orders/:id/execute
```

**Precondition:** Order status must be `approved`.

**Result:** System creates the entity (quotation, invoice, etc.) and sets order status to `executed`.

---

## Validation Rules

### Before Creating Order

Agent must validate input:
- ✅ Customer exists
- ✅ Grand total ≥ 0
- ✅ Deposit % is 0–100
- ✅ VAT % is 0–100
- ✅ Line items sum correctly
- ✅ All required fields present

If validation fails: agent returns error to user, does NOT create order.

### Before Approving Order

Manager should check:
- ✅ Pricing matches rate card
- ✅ Deposit terms are reasonable (usually 50%)
- ✅ Customer name & contact are correct
- ✅ Boat specs match quoted service
- ✅ No discount anomalies
- ✅ Valid until date is reasonable (usually 7 days)

### Before Execution

System checks:
- ✅ Order status is `approved`
- ✅ Approval queue status is `approved`
- ✅ Input data is valid (has not changed)

If any check fails: execution is blocked, error returned.

---

## Business Rules

### Quotation Approval

- **Who:** MANAGING_DIRECTOR (Marina Manager, Boat Yard Manager, or Owner)
- **Timeline:** Within 1–2 hours of agent creation (customer waiting for quote)
- **Rejection reasons:** Pricing incorrect, customer not found, boat specs wrong
- **Re-submission:** Agent receives rejection reason, can create new order with fixes

### Invoice Approval

- **Who:** FINANCE (Accounting staff)
- **Timeline:** Before invoice is sent to customer
- **Rejection reasons:** Amount mismatch, tax error, customer not recognized
- **Re-submission:** Same as quotations

### Notification Approval

- **Who:** None (informational, no approval needed)
- **Timeline:** Sent immediately
- **Cancellation:** Staff can ignore or delete notifications

---

## Audit Trail

All approvals are logged in `audit_logs`:

```
User: manager-001
Action: approve_ai_order
EntityType: ai_order
EntityId: order-123
Changes: { status: "pending" → "approved" }
Timestamp: 2026-06-11T10:35:00Z
```

---

## Troubleshooting

### Order Stuck in PENDING

**Check:** 
1. Is order in the approval queue?
2. Has approval queue entry been created?
3. Is the approver role correct?
4. Is approver user assigned to that role?

**Fix:**
1. Check `/api/ai/orders/:id` response includes approval_queue
2. If approval_queue is empty, re-create it manually
3. Verify approver user role in system settings

### Execution Fails After Approval

**Check:**
1. Is order status actually `approved`?
2. Are input data fields valid? (no NaN, null where required)
3. Does customer/boat still exist?

**Fix:**
1. Review order detail to see input_data
2. Contact IT to check database logs
3. Reject order, ask agent to resubmit

### Agent Rejects Order Automatically

**This should not happen.** AI agents do not have permission to approve/reject—only create orders.

If you see this, it indicates a security bug. Report to IT immediately.

---

## FAQ

**Q: Can agent directly write to database without approval?**
A: No. If agent tries to call API with `draft_by_agent=true` but no `ai_order_id`, request is blocked with 403.

**Q: What if manager never approves?**
A: Order stays in PENDING indefinitely. It will show in the approval queue dashboard. Recommend daily review.

**Q: Can manager edit order before approving?**
A: No. Manager can only APPROVE or REJECT. If edits needed, reject with reason, ask agent to resubmit.

**Q: What happens to customer if order is rejected?**
A: Nothing. Quotation is never created, so customer never sees it. Agent resubmits a new quotation.

**Q: Can we bulk approve multiple orders?**
A: Not yet. Approvals are one-at-a-time via API. Future: add bulk approval button to UI.

**Q: How often are agents run?**
A: Quotation agent: manual trigger or scheduled daily. Finance agent: scheduled daily. Marina agent: manual.

**Q: What if agent crashes mid-execution?**
A: Order stays in APPROVED status but not EXECUTED. System retries on next run or manual trigger.

---

## Related Documents

- [AGENTS.md](./AGENTS.md) — Agent specifications and capabilities
- [BUSINESS_RULES.md](./BUSINESS_RULES.md) — Pricing, calculations, formulas
- [ai-agent-team-integration.md](./ai-agent-team-integration.md) — Local/staging/production runbooks
