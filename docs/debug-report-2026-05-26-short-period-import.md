# Short Period PDF Import Debug Report - 2026-05-26

## Scope
- Removed legacy sample customer records `cust-001` to `cust-005`.
- Preserved `Happy Samui company` and its current W4 validation assignment.
- Imported the uploaded short-period hardstand invoice/quotation PDFs into live Supabase tables.

## Data Written
- Customers: 12 active records.
- Boats: 13 records.
- Invoices: 12 records.
- Invoice items: created from uploaded invoice line details.
- Payments: 12 confirmed records, matching imported invoice totals, to satisfy revenue recording.
- Quotations: 4 records.
- Quotation items: created from uploaded quotation line details.
- Berth assignments: 11 records.

## Slot Allocation Rule Applied
- Existing/earlier boats keep their assigned berth when dates overlap.
- Later boats move to the next compatible available slot.
- Preserved current W4 assignment for `Happy Samui 50 ft`.
- Current active allocation on 2026-05-26:
  - W4: Happy Samui 50 ft
  - C1: Saxdor 400
  - C2: เพชรอ่าวไทย 3 engine

## Records Requiring Manual Review
- `Oceans Elite Co., Ltd.` has long-term trailer storage without clear service start/end dates, so no berth slot was assigned.
- `INV041 Maruza.pdf`, `INV0241 Jackie 03112025 .pdf`, `INV030 Saard watersport.pdf`, and `Inv034 Ap marine.pdf` did not include complete berth assignment details, so they were imported as customer/boat/finance records without slot assignment.
- `Quo049 เพชรอ่าวไทย.pdf` printed a zero final total, but line items total 16,000 THB; imported as 16,000 THB with a review note.

## Bug Found And Fixed
- `/api/db/notifications` returned 500 when `mms_notifications` does not exist because Supabase returns `PGRST205` for missing table in schema cache.
- Fixed both notification list and mark-read routes to treat `PGRST205` and schema cache errors as table-missing fallback cases.

## Verification
- `npm.cmd run lint`: passed with existing warnings only.
- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run build`: passed.
- Production smoke pages opened after login:
  - `/customers`
  - `/boats`
  - `/berths/management`
  - `/invoices`
  - `/quotations`
- Print document routes for the Happy Samui sample returned 200 in Vercel logs:
  - `/print/invoices/2c0e622d-b3fc-4448-a5cd-7cfb87bbc833`
  - `/print/quotations/89b5f8ef-8dbb-4a4f-b29f-2941dbf313de`

## Generated Folio
- Sample folio generated for Happy Samui:
  - `docs/folios/happy-samui-folio-2026-05-26.html`
- Missing original sample files for receipt, berth assignment form, and folio template, so the folio layout was designed with the company logo at top-left.
