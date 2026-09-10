# Marina MMS V1 controlled pilot runbook

สถานะ: Draft พร้อมให้ Operations และ Accounting ตรวจ

ระยะเวลาแนะนำ: 2-4 สัปดาห์ หลัง staging sign-off และ production deployment approval แยกต่างหาก

## เป้าหมาย

พิสูจน์ว่า workflow ตั้งแต่รับลูกค้าและเรือ ไปจนถึง Service Request, Work Order, Quotation, Invoice, Payment, Haul-out/Launch และ Job Margin ใช้กับงานจริงได้ โดยยังจำกัดผลกระทบและย้อนกลับได้

## Entry gates

- [ ] Accounting อนุมัติ Cost GL, Cost P&L และ Cost Basis ที่ยังค้าง 28 รหัส
- [ ] Rate Card v3.5 ผ่าน staging preview/import และ reconciliation ครบ 127 รหัส
- [x] Apply pricing-history hardening ใน staging และตรวจว่าสิทธิ์ `service_role` เหลือ `SELECT, INSERT`
- [ ] Full staging E2E ผ่านซ้ำหลัง **Rate Card import** (technical E2E ก่อน import ผ่านแล้ว)
- [ ] Security/performance advisor findings ถูกจัดประเภทเป็น blocker, accepted risk หรือ follow-up พร้อมเจ้าของงาน
- [ ] Production migration, deployment และ pilot scope ได้รับอนุมัติ ณ เวลาทำจริง
- [ ] ระบุรายชื่อลูกค้า/เรือ/ผู้ใช้ pilot และผู้มีอำนาจหยุด pilot

## Safe defaults

- Operational discount เริ่มที่ `0%`; Source Discount ใช้อ้างอิงเท่านั้น
- `ENABLE_AI_AGENT_WRITES=false`
- `ENABLE_AUTOMATION_WRITES=false`
- `ENABLE_REAL_CUSTOMER_MESSAGES=false` จนกว่าจะอนุมัติช่องทางและข้อความเฉพาะ workflow
- `ENABLE_PRODUCTION_BOOKINGS=false` จนกว่าจะอนุมัติ booking workflow เฉพาะครั้ง
- Finance/Admin เท่านั้นที่แก้ Pricing Master
- ไม่ hard-delete Pricing Master; ใช้ inactive/retired status เพื่อรักษา audit history

## Pilot scope

เริ่มจากผู้ใช้ภายในกลุ่มเล็กและงานจริงจำนวนจำกัด:

1. สัปดาห์ 1: 3-5 งานบริการที่ไม่มี automation และไม่มีการส่งข้อความอัตโนมัติ
2. สัปดาห์ 2: เพิ่มเป็น 5-10 งาน ถ้า reconciliation และ audit ผ่านทุกวัน
3. สัปดาห์ 3-4: เพิ่มประเภทงาน/ผู้ใช้ทีละกลุ่มเฉพาะเมื่อ Accounting ยืนยันรายงานสัปดาห์ก่อนหน้า

ทุก record ใน pilot ต้องมีผู้รับผิดชอบและ reference ไปยัง Service Request/Work Order ต้นทาง หลีกเลี่ยงการสร้างข้อมูลซ้ำเพื่อแก้สถานะ

## Daily checks

- [ ] Quotation subtotal, discount, VAT และ total ตรงกับ invoice
- [ ] Quotation items มี pricing/cost/accounting snapshots ครบ
- [ ] Payment records ตรงกับหลักฐานรับเงินจริง; ห้ามบันทึกแทนการโอนเงิน
- [ ] Work Order labor + material + subcontractor cost ตรงกับ Job Margin
- [ ] Ramp booking/boat movement เชื่อมโยงกับ Service Request และ Work Order ถูกต้อง
- [ ] Pricing history มี record สำหรับทุกการแก้ราคาและไม่ถูกแก้ย้อนหลัง
- [ ] ไม่มีข้อความลูกค้าหรือ automation write ที่หลุดจาก approval gate
- [ ] บันทึก defect, workaround, owner และผลกระทบก่อนจบวัน

## Weekly Accounting review

ส่งชุดข้อมูลเดียวกันทุกสัปดาห์:

- Revenue, direct cost, gross profit และ margin แยกตาม Work Order/service group
- รายการไม่มี Cost GL/P&L หรือ cost snapshot
- รายการ Actual Cost ต่างจาก Rate Card estimate เกินเกณฑ์ที่ Accounting กำหนด
- Discount ที่ไม่ใช่ 0% พร้อมผู้อนุมัติและเหตุผล
- Quotation-to-invoice reconciliation และ payment outstanding
- รายการ manual adjustment, duplicate หรือ orphan relationship

Accounting ต้องตอบว่า `accept`, `correct before continue` หรือ `new requirement for V2`; ห้ามเริ่ม V2 จากข้อเสนอที่ยังไม่ผ่าน pilot evidence

## Stop conditions

หยุดเพิ่มงานใหม่ใน pilot ทันทีเมื่อพบข้อใดข้อหนึ่ง:

- ตัวเลข invoice/payment หรือ Job Margin ผิดและยังระบุขอบเขตไม่ได้
- pricing snapshot หายหรือเปลี่ยนตาม master ย้อนหลัง
- audit history ถูกลบ/แก้ หรือไม่มี approver ที่ตรวจสอบได้
- เกิด duplicate invoice/payment หรือ record เชื่อมโยงผิดลูกค้า/เรือ
- มี real customer message, booking หรือ automation write โดยไม่มี approval
- พบสิทธิ์เข้าถึงข้อมูลการเงินเกินบทบาทที่อนุมัติ

ผู้หยุด pilot: Operations lead หรือ Accounting lead คนใดคนหนึ่ง ไม่ต้องรออนุมัติร่วมเมื่อเป็นเหตุด้านข้อมูลหรือการเงิน

## Recovery sequence

1. ปิด workflow-specific write flag ที่เกี่ยวข้องก่อน
2. เก็บรหัส record, เวลา, user และ audit evidence; ห้ามลบหลักฐาน
3. ระงับ record ด้วยสถานะที่ย้อนกลับได้แทน hard delete
4. reconcile กับเอกสาร/หลักฐานเงินจริงนอกระบบ
5. แก้ใน staging, รัน focused regression และ Full E2E
6. เปิด pilot ต่อเมื่อ Operations และ Accounting ลงชื่อรับผลแก้

## Exit criteria

- ใช้งานต่อเนื่องอย่างน้อย 2 สัปดาห์และผ่าน weekly review อย่างน้อย 2 รอบ
- ไม่มี unresolved severity-high defect หรือ financial mismatch
- Accounting ยืนยันว่า export/reports ใช้ reconcile ได้
- audit/snapshot/role controls ผ่านการสุ่มตรวจ
- Operations ยืนยันว่า workflow ใช้งานจริงได้โดยไม่พึ่ง workaround ที่เสี่ยง
- รายการ V2 แยกจาก V1 พร้อม evidence และ priority; ไม่แทรก V2 ก่อน V1 sign-off

## Technical readiness evidence — 2026-09-10

- Full tests 80/80, TypeScript passed, ESLint 0 errors/22 warnings, diff-check passed และ staging-configured build 79/79 pages
- Protected Preview runtime ผ่าน authenticated Operations/Accounting read/write smoke; PO totals 200/14/214 และ stock 10 เป็น 13
- Staging RLS/FORCE RLS และ service-role-only grants ผ่าน; temporary verification rows ถูก cleanup เหลือ 0
- Entry gates ที่ยังไม่ผ่าน: Accounting mapping 28 รหัส, Rate Card import/reconciliation 127 รหัส, role/customer-isolation runtime matrix และ production action-time approvals
