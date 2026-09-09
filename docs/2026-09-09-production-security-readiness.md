# Production security readiness

ตรวจเมื่อ: 2026-09-09

ขอบเขตการตรวจ: Supabase production `csltloqbjupxqwbkunsd` แบบ read-only และ source branch `codex/connected-workflow-v1`

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

ยังไม่มี migration หรือ source remediation ใดในเอกสารนี้ถูก apply/deploy ไป production

## Remaining blockers

- ทำ RBAC allowlist ให้ครบทุก staff API route; ตอนนี้ customer portal routes สำคัญถูก scope แล้ว แต่ staff roles ยังใช้ middleware access กว้างใน route ที่ยังไม่มี `requireApiActor`
- เปลี่ยน invoice และ legacy routes ที่ยังรับ raw request body เป็น explicit field allowlists
- ตัดสินใจเรื่อง `mms-templates`: คง public-read สำหรับ template ที่ไม่ลับ หรือ migrate เป็น private bucket พร้อม signed-download endpoint
- ตรวจ webhook signature/replay protection ของ LINE และ WhatsApp
- ยืนยันว่า production deployment มี `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` และ URL ที่ถูกต้องก่อนเปิด RLS; ห้ามพิมพ์ค่าลง log/report
- Apply และทดสอบ migration ทุกตัวใน staging ก่อน production

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
- [ ] customer A อ่านหรือแก้ record ของ customer B ไม่ได้
- [ ] unauthenticated/public user upload, replace หรือ delete storage object ไม่ได้
- [ ] staff role matrix ผ่าน expected 200/403 tests
- [ ] all write flags ยังเป็น `false`
- [ ] tests, TypeScript, lint, diff-check และ production build ผ่านหลังการเปลี่ยนแปลงครั้งสุดท้าย
- [ ] Supabase security advisors ไม่มี unresolved `ERROR` ที่เกี่ยวกับ production business tables
