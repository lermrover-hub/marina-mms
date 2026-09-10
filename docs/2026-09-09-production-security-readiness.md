# Production security readiness

ตรวจล่าสุด: 2026-09-10

ขอบเขตการตรวจ: Supabase production `csltloqbjupxqwbkunsd` แบบ read-only, staging `zanlunbgupdtqznruzok` และ source branch `codex/accounting-e2e-production-readiness`

## Decision

**ยังห้าม deploy หรือเริ่ม pilot บน production** จนกว่าจะผ่าน deployment sequence และ verification gates ด้านล่าง

## Production evidence

- Supabase project ทำงานปกติ (`ACTIVE_HEALTHY`, PostgreSQL 17)
- Accounting-ready pricing migration ยังไม่ถูก apply ใน production
- 55 ตารางใน exposed `public` schema ยังปิด RLS
- role `anon` มี table privileges บน 56 ตาราง รวม `users`, customers, boats, quotations, invoices, payments และ pricing
- การจำลอง query ด้วย role `anon` ยืนยันว่าอ่านจำนวนแถวของ users, boats และ quotations ได้โดยไม่ต้องมี session
- `marina-files` เป็น private bucket แต่มี Storage policy `marina_files_all_access` ให้ role `public` ทำ `ALL`
- `mms-templates` เป็น public bucket; MIME และขนาดไฟล์ถูกจำกัด แต่เอกสารที่เก็บอยู่จะอ่านได้ด้วย public URL
- production มี active users 2 ราย และ password hash ทั้งหมดเป็น bcrypt 60 characters; ไม่มีการอ่านหรือบันทึกค่า hash ออกมา

## Source remediation completed

1. Auth.js login ตรวจ active database user และ bcrypt hash; ลบรหัสผ่าน mock ที่ commit อยู่ใน source
2. Middleware ตรวจ cryptographically validated Auth.js session แทนการเช็คเพียงชื่อ cookie
3. Edge-safe Auth config แยกออกจาก bcrypt/Node credential verifier
4. Portal-facing API filters customer identity จาก verified session และปิด IDOR สำหรับ quotation detail
5. Customer-created ramp booking ถูกบังคับเป็น `REQUESTED` และไม่สามารถกำหนด revenue/cost/status เอง
6. Server client สามารถ require service-role แบบ fail-closed สำหรับ auth และ storage operations
7. Source migration `20260909150000_harden_public_data_api.sql` เปิด/force RLS และ revoke `anon`/`authenticated` สำหรับ application tables โดยยกเว้น public `inquiries` ที่มี policy เฉพาะ
8. File upload/delete ถูกย้ายไป authenticated `/api/storage`, ตรวจ MIME/10 MB limit, สร้าง server-side UUID filename และใช้ service role
9. Source migration `20260909153000_harden_storage_writes.sql` ถอด `marina_files_all_access` และยืนยัน bucket เป็น private
10. Middleware role matrix จำกัด staff-management/agent-control ให้ Admin, จำกัด pricing และ financial writes ให้ Finance roles และจำกัด report access ให้ Finance/management
11. ตรวจ source แล้ว LINE และ WhatsApp POST webhooks มี signature verification และยังถูกปิด write ด้วย `ENABLE_AUTOMATION_WRITES=false`
12. Public inquiry read ใช้ verified staff session, public submit มี rate limit/validation และ fail closed; staging ไม่มี direct client grants/policies
13. Operations/Accounting APIs 14 routes ใช้ Supabase service role หลัง route-level RBAC และไม่พึ่ง `DATABASE_URL`/direct `pg` อีก
14. Source migration `20260910081433_add_supabase_operations_accounting.sql` เพิ่ม server-only tables, total triggers และ atomic stock/PO RPCs พร้อม revoke execute จาก public/anon/authenticated

ยังไม่มี migration หรือ source remediation ใดในเอกสารนี้ถูก apply/deploy ไป production

## Remaining blockers

- ตรวจ route-level `requireApiActor` ต่อให้ครบทุก legacy sensitive route นอกชุด Operations/Accounting ที่ปิดแล้ว
- เปลี่ยน invoice และ legacy routes ที่ยังรับ raw request body เป็น explicit field allowlists
- ตัดสินใจเรื่อง `mms-templates`: คง public-read สำหรับ template ที่ไม่ลับ หรือ migrate เป็น private bucket พร้อม signed-download endpoint
- เพิ่ม webhook event/message idempotency เพื่อป้องกัน retry สร้างข้อความซ้ำ; signature verification มีอยู่แล้ว
- ยืนยันว่า production deployment มี `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` และ URL ที่ถูกต้องก่อนเปิด RLS; ห้ามพิมพ์ค่าลง log/report
- Apply และทดสอบ migration ทุกตัวใน staging ก่อน production

## Staging verification — 2026-09-10

- Applied only to staging: pricing-history, storage, public Data API, inquiry hardening และ Operations/Accounting migration; production ไม่ถูกแก้
- Operations tables 8 ตารางเปิด RLS/FORCE RLS, มี 0 direct grants สำหรับ `anon`/`authenticated`; RPC execute เหลือ `postgres` และ `service_role`
- Rollback transaction ยืนยัน PO subtotal/VAT/total, timesheet labor, material cost และ stock movement โดยเหลือ test rows 0
- Protected Vercel Preview `marina-ajdab3ru2-lermrover-hubs-projects.vercel.app` ชี้ staging; branch-specific `DATABASE_URL` ถูก block ไม่ให้ fallback ไป production
- Authenticated runtime smoke ผ่าน contractor, supplier, PO, PO item/detail (200/14/214), stock (10 เป็น 13) และ Finance inventory report; cleanup ยืนยัน test rows 0
- Full gates: tests 81/81, TypeScript ผ่าน, ESLint 0 errors/22 warnings, diff-check ผ่าน, staging-configured build ผ่าน 79/79 pages
- Server Supabase client fail closed หากไม่มี service-role key; Preview ล่าสุดยังอ่าน staging ได้ตามปกติ
- Runtime isolation matrix ผ่าน: Customer A ถูก scope กลับ A เมื่อขอ B สำหรับ boats/quotations/invoices; customer broad list 403; Staff report/procurement write 403/403; Finance report/operations write 200/403; Boat Yard report/stock validation 403/400
- Supabase advisors ไม่มี error ใหม่; `RLS enabled no policy` เป็น INFO ที่ตั้งใจสำหรับ service-role-only tables และ performance เหลือ unused-index INFO

## Required deployment sequence

1. Freeze production writes และเก็บ schema/data backup ตามนโยบาย Supabase
2. Deploy source ที่ใช้ DB-backed auth, verified middleware และ authenticated storage API โดยยังไม่เปิด AI/automation/message/booking writes
3. Smoke-test login ด้วยบัญชีทดสอบที่อนุมัติ และยืนยัน server มี service-role โดยไม่เปิดเผยค่า
4. Apply public Data API hardening ใน staging; ยืนยัน anon query ถูกปฏิเสธและ app session ยังทำงาน
5. Apply Storage hardening ใน staging; ทดสอบ upload/view/delete ผ่าน UI และยืนยัน anon upload/delete ถูกปฏิเสธ
6. Apply pricing-history hardening และ Accounting-ready migration/import ตามลำดับที่อนุมัติ
7. รัน Full E2E และ final gates ใน staging
8. ขอ production action-time approval แยกสำหรับ source deploy และแต่ละ migration
9. Deploy production source ก่อน แล้ว apply security migrations ภายใน maintenance window เดียวกัน
10. ยืนยัน anon denial, authenticated login, role access, storage และ core read/write smoke tests
11. เริ่ม pilot ขนาดเล็กตาม controlled pilot runbook เท่านั้น

## Verification gates

- [ ] ไม่มี mock password หรือ plaintext credential ใน source/build output
- [ ] request ที่มี cookie ปลอมถูก redirect/401
- [ ] anon PostgREST อ่าน/เขียนทุก business table ไม่ได้ ยกเว้น public inquiry contract ที่อนุมัติ
- [x] customer A อ่าน list record ของ customer B ไม่ได้ (boats/quotations/invoices บน staging Preview); detail/write isolation ยังต้องสุ่มตรวจใน deployment gate
- [ ] unauthenticated/public user upload, replace หรือ delete storage object ไม่ได้
- [x] staff role matrix ชุด Customer/Staff/Finance/Boat Yard ผ่าน expected 200/403 tests; Admin และ Marina Manager ยังต้องตรวจใน deployment gate
- [ ] all write flags ยังเป็น `false`
- [ ] tests, TypeScript, lint, diff-check และ production build ผ่านหลังการเปลี่ยนแปลงครั้งสุดท้าย
- [ ] Supabase security advisors ไม่มี unresolved `ERROR` ที่เกี่ยวกับ production business tables
