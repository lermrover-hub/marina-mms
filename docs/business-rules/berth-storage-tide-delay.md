# Berth and Storage Billing Rule: Tide-delayed Launch

Status: Superseded by the controlled-discount policy below  
Superseded by: Product owner decision, 2026-11-04  
Original approved date: 2026-10-03

## Purpose

Separate the customer's chargeable storage period from the vessel's actual physical occupancy when launch is delayed only because the sea-water level is unsafe.

## Required dates

- **Customer Requested Launch Date**: the date the customer asks the marina to launch the vessel. This becomes the normal billing end date.
- **Tide-safe Launch Date**: the first suitable date/time when the predicted tide and operating conditions permit a safe launch.
- **Actual Launch Date**: the date/time the vessel is physically launched.
- **Billing End Date**: the last chargeable storage day. For a tide-only delay, this must equal the Customer Requested Launch Date.
- **Non-billable Tide Delay**: the interval after the Customer Requested Launch Date through the Actual Launch Date when the vessel remains ashore only because the tide is insufficient.

## Historical rule (retained for audit only)

1. The Berth/Dry Storage Map must continue to show the vessel as physically occupying its location until the Actual Launch Date.
2. Quotation, invoice, recurring billing and final proration must use the Billing End Date, not the map occupancy end date.
3. The former automatic non-billable tide-delay rule is no longer active.
4. Historical records using `TIDE_CONSTRAINT` remain readable for audit; do not apply the old rule to new quotations or invoices.
5. The requested, tide-safe, actual and billing dates, the non-chargeable interval, the reason and the approving user must be retained in the audit trail.
6. If the delay is caused by the customer, missing documents, unpaid amounts, vessel readiness, a customer date change, or another customer-controlled cause, storage billing continues under the normal rule. The responsible delay reason must be recorded.

## Current policy: controlled discount, not automatic waiver

If a launch is delayed because the tide is too low, Operations records the tide condition and the actual launch date, while the map continues to show physical occupancy until the vessel leaves. Billing follows the approved quotation or storage contract. If management decides to provide relief, an authorised user applies the normal quotation/invoice discount workflow and records the reason (for example `TIDE_DELAY_DISCOUNT`). The system must not automatically remove storage days, create a credit, or invent a discount amount.

The normal discount authority, approval thresholds and audit trail apply. This keeps the workflow simple and avoids a second billing exception model.

## Historical example (not a current pricing instruction)

- Customer Requested Launch Date: 2026-09-30
- Tide-safe / Actual Launch Date: 2026-10-03
- Berth/Dry Storage Map occupancy ends: 2026-10-03
- Billing End Date: governed by the approved quotation or contract
- Any customer relief: an explicitly approved discount, if granted

## User-manual requirements

The next program manual must explain that:

- the launch date shown on a quotation or invoice can legitimately differ from the date shown in the Berth/Dry Storage Map;
- Finance must verify the tide note, actual launch date and any approved discount before generating the final invoice;
- Operations must record the tide-safe window and Actual Launch Date; physical occupancy and billing are reviewed separately;
- any discount must be entered by an authorised user and remain visible in the quotation/invoice audit history.

## Implementation note

This document records the approved rule. It does not by itself confirm that the current application already enforces every field, proration and audit requirement above.
