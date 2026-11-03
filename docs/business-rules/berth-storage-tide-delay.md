# Berth and Storage Billing Rule: Tide-delayed Launch

Status: Approved business rule for Marina MMS V1 and the next user-manual revision  
Approved by: Product owner  
Approved date: 2026-10-03

## Purpose

Separate the customer's chargeable storage period from the vessel's actual physical occupancy when launch is delayed only because the sea-water level is unsafe.

## Required dates

- **Customer Requested Launch Date**: the date the customer asks the marina to launch the vessel. This becomes the normal billing end date.
- **Tide-safe Launch Date**: the first suitable date/time when the predicted tide and operating conditions permit a safe launch.
- **Actual Launch Date**: the date/time the vessel is physically launched.
- **Billing End Date**: the last chargeable storage day. For a tide-only delay, this must equal the Customer Requested Launch Date.
- **Non-billable Tide Delay**: the interval after the Customer Requested Launch Date through the Actual Launch Date when the vessel remains ashore only because the tide is insufficient.

## Business rule

1. The Berth/Dry Storage Map must continue to show the vessel as physically occupying its location until the Actual Launch Date.
2. Quotation, invoice, recurring billing and final proration must use the Billing End Date, not the map occupancy end date.
3. If launch is delayed solely because the tide is below the safe operating level, no storage charge may accrue after the Customer Requested Launch Date.
4. The non-chargeable period must carry the reason `TIDE_CONSTRAINT` and display: `Launch delayed due to insufficient tide — no storage charge`.
5. The requested, tide-safe, actual and billing dates, the non-chargeable interval, the reason and the approving user must be retained in the audit trail.
6. If the delay is caused by the customer, missing documents, unpaid amounts, vessel readiness, a customer date change, or another customer-controlled cause, storage billing continues under the normal rule. The responsible delay reason must be recorded.

## Example

- Customer Requested Launch Date: 2026-09-30
- Tide-safe / Actual Launch Date: 2026-10-03
- Berth/Dry Storage Map occupancy ends: 2026-10-03
- Billing End Date: 2026-09-30
- 2026-10-01 through 2026-10-03: non-billable tide delay

## User-manual requirements

The next program manual must explain that:

- the launch date shown on a quotation or invoice can legitimately differ from the date shown in the Berth/Dry Storage Map;
- Finance must verify the Billing End Date and delay reason before generating the final monthly invoice;
- Operations must record the tide-safe window and Actual Launch Date without extending customer charges for a tide-only delay;
- any manual override must require an authorised user and remain visible in the audit history.

## Implementation note

This document records the approved rule. It does not by itself confirm that the current application already enforces every field, proration and audit requirement above.
