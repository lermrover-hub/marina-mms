# Recurring billing scenarios (staging rule)

These rules preserve the existing Service Request → Draft Quotation → approval → customer payment → Service Order → Work Order workflow.

## 1. Repair hold / parts delay (`REPAIR_HOLD_30D`)

Use when a vessel must come up for repair and the launch date is not known, commonly because imported parts take 45 days or longer.

1. Create the quotation before the operation.
2. Require the configured payment gate before confirming the Service Order / Work Order.
3. Record the first haul-out, tow-in, or yard-start date as the billing anchor.
4. The first recurring cycle is due 30 days after that anchor. Do not wait for a final launch date.
5. First reminder is 7 days before the cycle due date; subsequent follow-up remains controlled by Finance.

## 2. Space lease / owner away (`SPACE_LEASE`)

Use when the owner uses the vessel infrequently or will be away for approximately 3–6 months.

1. Quote the storage/hardstand service.
2. After approval, create a clear Dry Storage contract for the slot, period, rate and billing cycle.
3. Recurring invoices are generated from the contract, with a Finance reminder 7 days before the invoice due date.
4. Do not duplicate the same storage charge in both a service-payment plan and the storage contract.

## Wet Berth

Wet Berth is not operational because construction has not started. It is blocked in inquiry, contract creation/update, and recurring invoice generation. Existing historical rows are retained for audit and are not deleted.
