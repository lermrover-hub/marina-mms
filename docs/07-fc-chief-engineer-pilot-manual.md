# คู่มือทดลองใช้ Marina MMS
## สำหรับ FC และ Chief Engineer
## Vercel Preview และ Supabase Staging
## Version 07 — Latest Pilot Manual
## อ้างอิงจาก repo/branch ปัจจุบัน และ audit วันที่ 14 กันยายน 2026
## หมายเหตุ: ไม่พบหลักฐาน Codex Task 05 Web App Development Patch September ใน repo

**วันที่จัดทำ:** 14 กันยายน 2026
**สถานะเอกสาร:** ฉบับทดลองใช้งาน (Pilot) — สำหรับทีมภายในเท่านั้น
**Branch:** `claude/marina-mms-setup-cgg7v4` — **HEAD ที่ audit:** `1db7b61` (working tree clean ณ เวลา audit)
**อ้างอิงจาก commit แอปพลิเคชันล่าสุด:** `9126224` (2026-06-17) และ commit เอกสารก่อนหน้า `455e8f9`

---

### 1. ภาพรวมระบบ

Marina MMS (Ocean Rover Marina & Boat Yard Management System) คือระบบบริหารจัดการธุรกิจมารีน่าและอู่เรือแบบครบวงจร พัฒนาด้วย Next.js 15 (App Router) + TypeScript ฐานข้อมูล PostgreSQL ผ่าน Supabase และ Prisma ORM

ระบบครอบคลุมงาน: ท่าเทียบเรือ (wet berth), ลานจอดแห้ง (dry storage), การจองแท่นลาก (ramp booking), งานซ่อมอู่เรือ, ใบเสนอราคา, ใบแจ้งหนี้/การชำระเงิน, คลังพัสดุ, งานพนักงาน, รายงานความปลอดภัย, Customer Portal และระบบตั้งค่า

เวอร์ชันปัจจุบันที่ใช้จัดทำคู่มือนี้คือซอร์สโค้ดล่าสุดในสาขา `main`/`claude/marina-mms-setup-cgg7v4` ซึ่งรวมงานพัฒนาตั้งแต่ AI Agent Control Center, ลายเซ็นดิจิทัล, ใบเสร็จ, contractors/suppliers/POs จนถึงการแก้ไข tide calculation ล่าสุด

---

### 2. ขอบเขตของคู่มือนี้

คู่มือฉบับนี้จัดทำขึ้นเพื่อ:

- **การทดลองใช้งาน (Pilot Testing)** บน Vercel Preview และ Supabase Staging ก่อนใช้งานจริง
- **การตรวจสอบภายใน (Internal Operation)** โดยทีมงานมารีน่า
- **การตรวจสอบโดย FC (Finance/Front Counter)** ก่อนออกเอกสารให้ลูกค้า
- **การตรวจสอบโดย Chief Engineer** ก่อนอนุมัติงานยกเรือ/ปล่อยเรือ
- **การทบทวนโดยเจ้าของกิจการ/ผู้บริหาร** เพื่อประเมินความพร้อมของระบบ

คู่มือนี้ **ไม่ใช่** คู่มือสำหรับลูกค้าภายนอก และไม่ใช่เอกสารรับประกันว่าฟีเจอร์ทั้งหมดพร้อมใช้งานจริงในระบบ production — ทุกฟีเจอร์ถูกระบุสถานะตามหลักฐานจากซอร์สโค้ดจริงเท่านั้น

---

### 3. หลักฐานที่ใช้จัดทำคู่มือ

การค้นหาหลักฐานทำโดยตรวจสอบไฟล์ทั้งหมดในซอร์สโค้ด (ไม่รวม `node_modules`, `.git`) และประวัติ git ทั้งหมด (`git log --all`)

| รายการ | สถานะ |
|---|---|
| `CLAUDE.md` | **ไม่พบในซอร์สโค้ด** ไม่มีไฟล์ชื่อนี้ที่ root หรือ subdirectory ใดของ repository |
| Codex Task 05 / "Web app development patch September" | **ไม่พบหลักฐาน / ไม่สามารถยืนยันได้** — ค้นหาคำว่า "Codex Task 05", "Task 05", "patch 05", "September patch", "web app patch" ทั่วทั้ง repo และ git history ไม่พบผลลัพธ์แม้แต่รายการเดียว commit ล่าสุดของ repo คือ `9126224` ลงวันที่ 2026-06-17 — ไม่มี commit ใดในเดือนกันยายนเลย |
| แหล่งข้อมูลที่ใช้แทน (verified) | โค้ดปัจจุบันของแอป (routes, pages, API handlers, Prisma schema) และเอกสารวิศวกรรมที่มีวันที่กำกับของโปรเจกต์เอง |

**ไฟล์หลักฐานที่ใช้จัดทำคู่มือนี้:**

- `app/(dashboard)/**` — หน้าจอ dashboard ทั้งหมด (routes)
- `app/api/**` — API routes ทั้งหมด
- `prisma/schema.prisma` — โครงสร้างฐานข้อมูล
- `ai-agents/PRICING_RULES.md` — กฎการคิดราคา (last updated 2026-06-11)
- `ai-agents/TIDE_RULES.md` — กฎความปลอดภัยระดับน้ำ (last updated 2026-06-11)
- `lib/speedboat-classification.ts` — การจำแนกประเภทเรือเร็ว
- `scripts/import-rate-card.sql`, `scripts/import-rate-card.json` — รายการราคานำเข้า
- `CLAUDE_HANDOFF.md`, `DEV_SCRIPTS.md` — บันทึกการพัฒนา Claude ↔ Codex
- `docs/USER_MANUAL_LATEST_EN.md`, `docs/USER_MANUAL_LATEST_TH.md` — คู่มือฉบับก่อนหน้าที่จัดทำในรอบเดียวกัน (2026-09-11)

> **หมายเหตุสำคัญ:** เนื่องจากไม่พบหลักฐาน "Codex Task 05" ตามที่ร้องขอ คู่มือนี้จึงใช้หลักฐานจากโค้ดปัจจุบันและเอกสารวิศวกรรมของโปรเจกต์แทน ทุกจุดที่อ้างถึง "Codex Task 05" ในหัวข้อถัดไปจะถูกทำเครื่องหมายว่า **"Codex Task 05 evidence not found / cannot verify"**

---

### 4. Evidence / Documentation Gaps

**Codex Task 05 evidence was not found — this is a documentation gap, not a software limitation.**

- ไม่พบหลักฐาน "Codex Task 05 Web App Development Patch September" ใน filename, content grep, git log, branch หรือ tag
- คู่มือฉบับนี้จึงอ้างอิงจาก version 07 current repo/codebase, CLAUDE.md (ไม่พบ), audit result, และไฟล์ app ปัจจุบัน
- ในอนาคตควรบันทึก patch/task ทุกครั้งในไฟล์ changelog ที่มี task number, patch name, date, branch, commit hash และ affected files (ดู §24 ข้อ 6)

การ audit ซ้ำ (filenames, file contents, `git log --all --grep`, branches, tags) ไม่พบ commit, ไฟล์, branch, tag หรือเอกสารใดที่ระบุชื่อ "Codex Task 05" หรือ "Web App Development Patch September" ในซอร์สโค้ดนี้เลยแม้แต่รายการเดียว คำว่า "Codex" ที่พบในโปรเจกต์ (`DEV_SCRIPTS.md`, `CLAUDE_HANDOFF.md`) หมายถึง **ชื่อของ AI agent อีกตัวหนึ่งในกระบวนการพัฒนาแบบ Claude ↔ Codex** ไม่ใช่ชื่อ task/patch ที่มีหมายเลขกำกับ

**เหตุผลที่จัดเป็นช่องว่างด้านเอกสาร (ไม่ใช่ข้อจำกัดของซอฟต์แวร์):** การไม่พบหลักฐาน "Codex Task 05" ไม่ได้แปลว่าแอปพลิเคชันขาดฟีเจอร์ใด ๆ — มันหมายความเพียงว่าไม่มีบันทึกที่สามารถตรวจสอบย้อนกลับไปยัง task/patch ที่ชื่อนี้ได้ ข้อจำกัดของซอฟต์แวร์จริง (เช่น ไม่มี unified booking wizard) ถูกแยกไว้ต่างหากใน §23

**คู่มือฉบับนี้จึงจัดทำจากหลักฐานที่ตรวจสอบได้จริงเท่านั้น:**

- ซอร์สโค้ด repo/branch ปัจจุบัน (`claude/marina-mms-setup-cgg7v4`, HEAD `1db7b61` ณ วัน audit) — version 07 ของคู่มือฉบับนี้
- ผลการ audit วันที่ 14 กันยายน 2026 (ยืนยัน pwd, git toplevel, branch, git status, git log)
- `CLAUDE.md` — **ไม่พบในซอร์สโค้ด** (ค้นหาทั้ง root และทุก subdirectory)
- ไฟล์แอปพลิเคชันจริง: `app/(dashboard)/**`, `app/api/**`, `prisma/schema.prisma`, `ai-agents/PRICING_RULES.md`, `ai-agents/TIDE_RULES.md`, `lib/speedboat-classification.ts`, `scripts/import-rate-card.sql`/`.json`, `CLAUDE_HANDOFF.md`, `DEV_SCRIPTS.md`

จากหลักฐานเดียวกันนี้ ยังสามารถยืนยัน **ประวัติการพัฒนาล่าสุดของระบบ** (จาก `git log`, `CLAUDE_HANDOFF.md`) ซึ่งครอบคลุมงานตั้งแต่วันที่ 2026-06-11 ถึง 2026-06-17:

- AI Agent Control Center (6 agents พร้อมโหมด preview)
- ลายเซ็นดิจิทัลและประทับอัตโนมัติบนเอกสารทางการ
- ระบบออกใบเสร็จที่จำกัดเฉพาะการชำระเงินสถานะ `CONFIRMED`
- โมดูล Contractors, Suppliers, Purchase Orders, Purchase Requests, Stock Movements, Timesheets, Audit Log
- แท็บ Labor ในใบสั่งงาน (Work Order), UI สำหรับ Recurring Billing
- การแปลงใบเสนอราคาเป็นใบสั่งงาน
- รายงานการใช้พัสดุ (Inventory Usage Report)
- การแก้ไขสูตรคำนวณระดับน้ำ (tide calculation) และการบังคับ `force-dynamic` บน route คำนวณระดับน้ำ (commit ล่าสุด `9126224`)

**ข้อเสนอแนะสำหรับอนาคต:** patch/task รอบถัดไปควรบันทึกหมายเลข task, ชื่อ patch, วันที่, ชื่อ branch, commit hash และไฟล์ที่ได้รับผลกระทบไว้ในไฟล์ changelog รูปแบบเดียวกันอย่างสม่ำเสมอ เพื่อให้การตรวจสอบย้อนหลังทำได้โดยไม่ต้องอาศัยการค้นหาทั้ง repository แบบนี้อีก

รายละเอียดทั้งหมดอยู่ใน `docs/USER_MANUAL_CHANGELOG_FROM_CODEX_TASK_05.md`

---

### 5. สถานะ Feature ล่าสุด

| Feature | Status | Evidence / file path | Notes |
|---|---|---|---|
| Booking Calendar | Implemented | `app/(dashboard)/berths/calendar/page.tsx` | ปฏิทินรายเดือนแสดงการจองตามโซน |
| Floor Plan / Slot Plan | Implemented | `app/(dashboard)/berths/page.tsx` (component `BerthMap`) | แสดงผังภาพช่องจอดพร้อมสถานะ |
| Berth Management (แก้ไขการจอง) | Implemented | `app/(dashboard)/berths/management/page.tsx` | แก้ไขวันที่/สถานะ/ย้ายช่องจอด |
| Customer records | Implemented | `app/(dashboard)/customers/**`, `app/api/db/customers` | CRUD ครบ ไม่ใช่ sample data — เชื่อมฐานข้อมูลจริง |
| Vessel (boat) records | Implemented | `app/(dashboard)/boats/**`, `app/api/db/boats` | รวมฟิลด์ LOA/beam/draft/weight/engine |
| New Ramp Booking Workflow | Implemented | `app/(dashboard)/ramp-bookings/new/page.tsx` | บังคับกรอก draft/trailer height สำหรับ LAUNCH/RETRIEVAL |
| New Quotation Workflow | Implemented | `app/(dashboard)/quotations/new/page.tsx` | สร้างใบเสนอราคาแบบหลายรายการ |
| Multi-service line items (ในใบเสนอราคา) | Implemented | `app/(dashboard)/quotations/new/page.tsx` (`addItem()`) | เพิ่มได้หลายบรรทัด หลายหมวดหมู่ |
| Multi-service line items (ผูกกับ Booking โดยตรง) | Unknown / cannot verify | — | ไม่พบฟอร์มที่ผูกหลายบริการเข้ากับ ramp booking โดยตรง ปัจจุบันบริการหลายรายการอยู่ในใบเสนอราคา ไม่ใช่ตัวการจอง |
| Truck / Trailer / Lifting pricing (รายการราคา) | Implemented | `scripts/import-rate-card.sql` (`TRUCK_*`, `LIFT_HYD_12T` ฯลฯ) | เป็นรายการในใบเสนอราคา ไม่ใช่ฟอร์มการจองแยกต่างหาก |
| Tide Window Calculator | Implemented | `app/(dashboard)/ramp-bookings/tide-calculator/page.tsx`, `app/api/tide/calculate/route.ts` | สูตรตาม `ai-agents/TIDE_RULES.md` |
| Speedboat classification (LOA-based) | Implemented | `lib/speedboat-classification.ts` | จำแนกตาม LOA เป็นหลัก ไม่ใช่จำนวนเครื่องยนต์ |
| Speedboat haul-out flat-rate | Unknown / cannot verify | — | ไม่พบคำว่า "flat rate" ในซอร์สโค้ดเลย ห้ามระบุว่าเป็นราคาเหมาจ่าย |
| Yacht haul-out per-ft pricing | Partial / Unknown | `ai-agents/PRICING_RULES.md` §3 | กฎ per-foot ยืนยันสำหรับ wet berth/dry storage/antifouling เท่านั้น ไม่ได้ระบุเฉพาะ "haul-out" |
| Truck round-trip pricing rule | Implemented | `ai-agents/PRICING_RULES.md` §4 | ค่าเริ่มต้นคิดราคาไป-กลับ (2 เที่ยว) เว้นแต่ผู้จัดการอนุมัติเที่ยวเดียว |
| Hydraulic lift → GL 4140 | Partial | `scripts/import-rate-card.sql` (`LIFT_HYD_12T`) | ยืนยันในข้อความ note ที่นำเข้า ไม่ใช่ฟิลด์ schema ที่บังคับ |
| VAT calculation (7%) | Implemented | `ai-agents/PRICING_RULES.md` §6 | อ่านค่าจาก `mms_agent_config` ค่าเริ่มต้น 7% ไม่ hardcode |
| Deposit rule (50%) | Implemented | `ai-agents/PRICING_RULES.md` §7 | ค่าเริ่มต้น 50% ของยอดรวม |
| Quotation validity (7 วัน) | Implemented | `ai-agents/PRICING_RULES.md` §8 | ตั้งวันหมดอายุอัตโนมัติ |
| Invoice | Implemented | `app/(dashboard)/invoices/**`, `app/api/db/invoices` | รวมสถานะ `OVERDUE` |
| Payment | Implemented | `app/(dashboard)/payments/**`, `app/api/db/payments` | ฟอร์มบันทึกการชำระเงิน |
| Receipt generation | Implemented | `app/print/receipts/[id]/page.tsx` | จำกัดเฉพาะการชำระเงินสถานะ `CONFIRMED` เท่านั้น |
| Late Payment Flag | Implemented | `types/index.ts`, `components/shared/StatusBadge.tsx`, `app/api/db/reports/aging/route.ts` | มีสถานะ `OVERDUE` และ Aging Report |
| Digital Signature | Implemented | `app/api/settings/signature`, commit `228f622` | อัปโหลดและประทับอัตโนมัติบนเอกสาร |
| AI Agent Control Center | Implemented (preview only) | `app/(dashboard)/ai-agents/page.tsx` | การเขียนข้อมูลจริงถูกปิดกั้นด้วย environment flag |
| Recurring Billing | Partial | `app/(dashboard)/billing/recurring/page.tsx` | มี UI/API แต่กลไกตั้งเวลาจริงยังไม่ได้ตรวจสอบครบ |
| Wet Berth Expansion โครงการ | Not applicable | — | ไม่มีการอ้างถึงโครงการนี้ในซอร์สโค้ดเลย |

---

### 6. การเข้าใช้งานระบบ

- **Production URL:** `https://marina-mms.vercel.app` (ยืนยันจาก `README.md`)
- **Vercel Preview:** เมื่อมี Pull Request หรือ branch ใหม่ Vercel จะสร้าง preview URL อัตโนมัติ (ยืนยันจากการทำงานของ Vercel GitHub integration ที่พบในประวัติ PR ของโปรเจกต์)
- **Local Development:** รันด้วย `npm run dev` (Next.js dev server) — ยืนยันจาก `package.json` scripts
- **Supabase Staging:** มีสคริปต์ `npm run dev:staging` ที่เรียก PowerShell script `scripts/start-staging.ps1` เพื่อรันเซิร์ฟเวอร์ local ที่ชี้ไปยัง Supabase staging — ยืนยันจาก `package.json`

**หมายเหตุ:** การเข้าถึงต้องมีบัญชีผู้ใช้ที่สร้างโดย Super Admin ผ่าน Supabase Auth / NextAuth (`auth.ts`) session หมดอายุค่าที่แน่นอนไม่สามารถยืนยันได้จากโค้ด — Unknown / cannot verify

---

### 7. Dashboard

Dashboard หลักอยู่ที่ `app/(dashboard)/dashboard/page.tsx` และมี API สนับสนุนที่ `app/api/db/dashboard/analytics` (ยืนยันจากรายการ route)

**ข้อจำกัด:** รายละเอียดของ widget/metric แต่ละตัวในหน้า dashboard ไม่ได้ถูกตรวจสอบทีละรายการในรอบนี้ — สามารถยืนยันได้เพียงว่าหน้า dashboard และ analytics API มีอยู่จริงและเชื่อมต่อกัน หากต้องการรายละเอียด widget เฉพาะ ควรตรวจสอบเพิ่มเติมกับทีมพัฒนา (Unknown / needs further verification)

---

### 8. Booking Calendar

เส้นทาง: `app/(dashboard)/berths/calendar/page.tsx`

- แสดงปฏิทินรายเดือน พร้อมปุ่มเลื่อนเดือนก่อนหน้า/ถัดไป
- แบ่งกลุ่มช่องจอดตามโซน: `C` (Hardstand/Cradle), `W` (Workshop Bays), `B` (Beach Storage), `WB` (Wet Berths)
- แต่ละแถบการจอง (booking bar) แสดงชื่อเรือ ชื่อลูกค้า วันที่เริ่ม-สิ้นสุด
- สีของแถบแสดงสถานะ: `ACTIVE` (สีน้ำเงิน) และ `RESERVED` (สีเหลือง) — ยืนยันจากค่าคงที่ `ASGN_CELL` ในโค้ด
- สถานะที่มีในระบบ (จาก type `Assignment`): `ACTIVE`, `RESERVED`, `COMPLETED`, `CANCELLED`
- อ่านข้อมูลจากฐานข้อมูลจริง (footer ของหน้าระบุ "Live database")
- คลิกที่ช่องจอด/การจองเพื่อดูรายละเอียดเพิ่มเติมได้ผ่านหน้าเบิร์ธ (`/berths/[id]`)

**ข้อจำกัด:** ไม่มีฟังก์ชันลาก-วาง (drag and drop) เพื่อย้ายการจองในปฏิทินนี้ — เป็นปฏิทินแสดงผลเท่านั้น

---

### 9. Floor Plan / Slot Plan

เส้นทาง: `app/(dashboard)/berths/page.tsx` (component `BerthMap`)

- ผังภาพแสดงตำแหน่งช่องจอดจริง (absolutely-positioned slots) ตามข้อความในหน้า "Phase 2 hardstand, workshop, speedboat, and big-yacht berth layout"
- **โซน C (Hardstand/Cradle):** ลานจอดบก/ขาตั้งเรือ
- **โซน W (Workshop Bays):** อู่ซ่อม
- **โซน B (Beach Storage):** ที่เก็บชายหาด
- **โซน WB (Wet Berths):** ท่าเทียบเรือน้ำลึก
- แต่ละช่องคลิกได้และเชื่อมไปยังหน้ารายละเอียด `/berths/[id]`
- สีของแต่ละช่องแสดงสถานะการใช้งานปัจจุบัน (จากฟังก์ชัน `slotFill()`)
- ท้ายหน้าระบุ "Live database - N berths loaded" ยืนยันว่าอ่านข้อมูลจริงจากฐานข้อมูล ไม่ใช่ sample data

**ข้อจำกัดจำนวนช่องจอด (slot limits):** ไม่พบค่าคงที่หรือ config ที่ระบุ "จำนวนช่องสูงสุด" ของแต่ละโซนอย่างชัดเจนในโค้ดที่ตรวจสอบรอบนี้ — Unknown / cannot verify จำนวนที่แน่นอนควรตรวจสอบกับฐานข้อมูล `berths` จริง

หน้าที่สองสำหรับแก้ไขข้อมูลแบบตาราง: `app/(dashboard)/berths/management/page.tsx` — มี modal แก้ไขวันที่ สถานะ ย้ายช่องจอด หมายเหตุ และลบรายการจองได้

---

### 10. Customers & Vessels

- **ลูกค้า (Customers):** `app/(dashboard)/customers/**` — รายการ, รายละเอียด, สร้างใหม่, แก้ไข พร้อมหน้าแบ่งกลุ่มลูกค้า (segmentation) API: `app/api/db/customers`
- **เรือ (Boats/Vessels):** `app/(dashboard)/boats/**` — รายการ, รายละเอียด, สร้างใหม่, แก้ไข พร้อมฟิลด์ LOA, beam, draft, weight, engine type/brand API: `app/api/db/boats`

**ข้อมูลเป็นข้อมูลจริงจากฐานข้อมูล ไม่ใช่ sample data** — ยืนยันจากโครงสร้าง API route ที่เชื่อมต่อกับ Supabase/Prisma โดยตรง (ไม่พบการ hardcode ข้อมูลตัวอย่างในหน้าเหล่านี้)

ประเภทลูกค้าที่รองรับ (จาก `types/index.ts`): `PRIVATE_OWNER`, `CHARTER_OPERATOR`, `SPEEDBOAT_OPERATOR`, `YACHT_BROKER`, `CONTRACTOR`, `SUPPLIER`

หน้ารายละเอียดลูกค้าแสดงแท็บรายการเรือของลูกค้ารายนั้นโดยตรง (`Tabs defaultValue="boats"`)

---

### 11. New Booking Workflow

> ระบบปัจจุบันยังไม่มี Unified New Booking Wizard แบบหน้าจอเดียวที่รวม operation/tide + service/price เข้าด้วยกัน
>
> **Current verified flows:**
> - **ramp-bookings/new:** ใช้สำหรับ operation และ tide workflow แต่ไม่มี service/price selection
> - **quotations/new:** ใช้สำหรับ multi-service และ price calculation แต่ไม่มี tide workflow
>
> ทั้งสอง flow ยังไม่เชื่อมกันเป็น booking-to-quotation-to-invoice workflow เดียว

รายละเอียดเพิ่มเติมที่ยืนยันแล้วจากการตรวจสอบโค้ดจริง มี **2 workflow แยกกัน** ตามวัตถุประสงค์:

| Flow | เส้นทาง | มี | ไม่มี |
|---|---|---|---|
| A. Ramp Booking | `app/(dashboard)/ramp-bookings/new/page.tsx` | operation type + tide workflow (คำนวณระดับน้ำแบบเรียลไทม์) | **ไม่มี** service/price selection |
| B. Quotation | `app/(dashboard)/quotations/new/page.tsx` | multi-service + price calculation workflow (VAT/ส่วนลด/เงินมัดจำ) | **ไม่มี** tide workflow |

**ทั้งสอง flow นี้ยังไม่ถูกเชื่อมต่อกันเป็น booking → quotation → invoice workflow เดียวที่สมบูรณ์** — หน้า ramp-bookings/new ไม่เรียก API ของ quotations และหน้า quotations/new ก็ไม่เรียก API ของ ramp-bookings เลย (ยืนยันจากการอ่านโค้ดทั้งสองไฟล์โดยตรง ไม่พบการอ้างอิงข้ามกัน)

**A. การจองแท่นลากเรือ (Ramp Booking)** — `app/(dashboard)/ramp-bookings/new/page.tsx`

ขั้นตอนที่ยืนยันได้จากฟอร์มจริง:

1. เลือกประเภทปฏิบัติการ (Operation Type) — Launch / Retrieval / Haul-out (จาก `OPERATION_TYPES`)
2. กรอกชื่อเรือ/เลือกเรือที่ลงทะเบียนไว้แล้ว
3. กรอก **Boat Draft** (กินน้ำลึก) — บังคับกรอกสำหรับ LAUNCH/RETRIEVAL
4. กรอก **Trailer Height** (ความสูงรถพ่วง) — บังคับกรอกสำหรับ LAUNCH/RETRIEVAL
5. ระบบคำนวณ Tide Window แบบเรียลไทม์ทันทีที่กรอกข้อมูลครบ
6. เลือกวันที่และเวลาปฏิบัติการ
7. บันทึกการจอง

**หมายเหตุ:** ระบบ**บังคับ** (validation) ให้กรอก draft และ trailer height ก่อนบันทึกสำหรับ LAUNCH/RETRIEVAL — ยืนยันจากโค้ด `if ((opType === "LAUNCH" || opType === "RETRIEVAL") && (draft <= 0 || trailer <= 0)) ...`

**B. การสร้างใบเสนอราคา (Quotation)** — `app/(dashboard)/quotations/new/page.tsx`

1. เลือกลูกค้า
2. เลือก/กรอกเรือ
3. กรอกคำอธิบายบริการ (free text)
4. เพิ่มรายการบริการ (multi-line) — เลือกจากรายการราคามาตรฐานหรือกรอกเอง
5. ตรวจสอบยอดรวม (VAT, ส่วนลด)
6. บันทึกใบเสนอราคา

**สิ่งที่ยืนยันไม่ได้จากขั้นตอนที่ผู้ใช้ระบุมา (LOA, weight, vessel class, truck/trailer selection ในฟอร์มการจองโดยตรง, price summary รวมในฟอร์มการจองเดียว, save quote/confirm booking แบบขั้นตอนเดียว):**

ระบบปัจจุบัน **ไม่มีฟอร์มการจองเดียว** ที่รวมทุกขั้นตอน (เลือกช่อง → กรอกเรือ → เลือก vessel class → LOA/draft/weight → เลือกวันฮอลเอาท์/ปล่อยเรือ → เลือก truck/lift → เลือกบริการ → price summary → save) ในหน้าเดียวตามที่ระบุใน checklist ของงานนี้ — ข้อมูลเรือ (LOA/draft/weight) กรอกแยกในหน้า "New Boat" ส่วนบริการ/ราคาทำในหน้า "New Quotation" แยกต่างหาก **ทำเครื่องหมายเป็น Unknown / Partial** สำหรับ flow แบบรวมศูนย์เดียว

---

### 12. Service Selection

- ระบบรองรับ **multi-service line items** ในหน้าสร้างใบเสนอราคา (`quotations/new/page.tsx`) — ผู้ใช้กดปุ่ม "Add Item" (`addItem()`) เพื่อเพิ่มบรรทัดบริการใหม่ได้ไม่จำกัดจำนวน แต่ละบรรทัดมีหมวดหมู่ (category) หน่วย จำนวน และราคาต่อหน่วยของตนเอง
- หมวดหมู่ที่รองรับ: `Ramp Access`, `Haul-out`, `Towing Truck Cost`, `Yard Services`, `Storage - Speedboat`, `Storage - Small Craft`, `Repair Yard`, `Wash & Cleaning`, `Utilities`, `Wet Berth`, `OT / After-Hours Labor` และอื่น ๆ
- ระบบ AI ช่วยร่างใบเสนอราคา (`app/api/quotations/ai-generate/route.ts`) ก็สร้างได้หลายรายการเช่นกัน (3–10 รายการ)

**เรื่องการบันทึกข้อมูล (backend persistence):** รายการที่เพิ่มในฟอร์มจะถูกส่งไปบันทึกผ่าน API `app/api/db/quotation-items` เมื่อกด save ใบเสนอราคา — ยืนยันจากการมี API route นี้อยู่จริง แต่ **ไม่ได้ตรวจสอบ transaction/edge case ทุกกรณี** ในรอบนี้ — ถือว่า Implemented ในระดับพื้นฐาน แต่ไม่รับประกันความสมบูรณ์ 100%

---

### 13. Truck / Trailer / Lifting Service

บริการเหล่านี้ **ไม่ใช่ฟอร์มแยกต่างหาก** แต่เป็นรายการราคาที่เลือกได้ในใบเสนอราคา ภายใต้หมวดหมู่ `Towing Truck Cost` และ `Yard Services`

**รายการราคาที่ยืนยันได้ (`scripts/import-rate-card.sql`):**

| รหัส | รายการ | หน่วย |
|---|---|---|
| `TRUCK_MINI_DAY` | รถมินิทรัค กลางวัน | trip |
| `TRUCK_MINI_NIGHT` | รถมินิทรัค กลางคืนก่อนเที่ยงคืน | trip |
| `TRUCK_MINI_LATE` | รถมินิทรัค กลางคืนหลังเที่ยงคืน | trip |
| `TRUCK_BIG_DAY` | รถใหญ่ กลางวัน | trip |
| `LIFT_HYD_12T` | ยกไฮดรอลิก ≤12 ตัน | event |
| `LIFT_CRANE_12_18` | รถเครน 12–18 ตัน | event |
| `LIFT_CRANE_OVER18` | รถเครน >18 ตัน (ต้องขอใบเสนอราคา) | quotation |
| `TRAILER_GENERAL` / `TRAILER_REPAIR` | เช่าพ่วง | day |
| `STAND_DAY/WEEK/MONTH` | ขาตั้งเรือ | stand/day-wk-mo |

**กฎธุรกิจที่ต้องรักษาไว้ (ยืนยันแล้ว):**

- **ค่ารถบรรทุกคิดราคาแบบไป-กลับ (round trip / 2 เที่ยว) เป็นค่าเริ่มต้น** — ยืนยันจาก `ai-agents/PRICING_RULES.md` §4: *"Truck and crane services for boat transportation are priced as a round trip unless the booking is explicitly one-way"* การคิดราคาเที่ยวเดียวต้องได้รับอนุมัติจากผู้จัดการและบันทึกเป็นลายลักษณ์อักษร
- **งานยกไฮดรอลิก (`LIFT_HYD_12T`) ผูกกับรหัสบัญชี GL 4140** — ยืนยันในข้อความ description ที่นำเข้าจริง (`"Vessel: ≤12T vessel | GL: 4140 | P&L: E.Equipment & Yard..."`) **แต่ไม่ใช่ฟิลด์ schema ที่บังคับ** — ปัจจุบัน `PricingMaster` model ใน `prisma/schema.prisma` ไม่มีคอลัมน์ `gl_code` แยกต่างหาก รหัส GL อยู่ในข้อความ `notes`/`description` เท่านั้น
- **กฎรถเครน/ยกอื่น ๆ:** ยืนยันเฉพาะตามตารางด้านบน ไม่มีกฎเพิ่มเติมอื่นที่ยืนยันได้จากโค้ด

---

### 14. Tide Window Calculator

เส้นทาง: หน้าเดี่ยว `app/(dashboard)/ramp-bookings/tide-calculator/page.tsx` และฝังอยู่ในฟอร์มจองแท่นลากเรือ (`ramp-bookings/new/page.tsx`)
API: `app/api/tide/calculate/route.ts` (ตั้งเป็น `force-dynamic` ตั้งแต่ commit `9126224` เพื่อป้องกันผลลัพธ์ที่ถูกแคชค้าง)

**วิธีใช้:**
1. เลือกวันที่ต้องการปฏิบัติงาน
2. กรอกกินน้ำลึกเรือ (Draft)
3. ระบบคำนวณและแสดงผลรายชั่วโมง

**สูตรคำนวณ (ยืนยันจาก `ai-agents/TIDE_RULES.md`):**

```
minimum_required_actual_depth_m = boat_draft_m + trailer_height_m + safety_clearance_m
minimum_required_tide_table_height_m = minimum_required_actual_depth_m − ramp_offset_m
ปลอดภัย (SAFE) เมื่อ predicted_tide_height_m ≥ minimum_required_tide_table_height_m
```

ค่าเริ่มต้นที่ได้รับอนุมัติ: `trailer_height_m = 0.70`, `safety_clearance_m = 0.10`, `ramp_offset_m = −1.00` (เปลี่ยนได้เฉพาะผ่าน Settings → AI Agent Rules → Tide Agent)

**การตีความ Safe/Unsafe:** ระบบแสดงสถานะรายชั่วโมงเป็น SAFE (ปลอดภัย) หรือไม่ปลอดภัย พร้อมชั่วโมงที่ปลอดภัยเร็วที่สุด (earliest safe hour) และช่วงเวลาปลอดภัย (safe windows)

> ### ⚠️ ข้อความบังคับ (ต้องอ่านและปฏิบัติตามทุกครั้ง)
>
> **Tide Window เป็นเพียงเครื่องมือช่วยวางแผนเท่านั้น (planning aid only) การอนุมัติขั้นสุดท้ายสำหรับการยกเรือขึ้นอู่หรือปล่อยเรือ ต้องได้รับการยืนยันด้วยตนเองจาก Dockmaster/ผู้จัดการเสมอ เนื่องจากระดับน้ำทะเลจริงอาจได้รับผลกระทบจากสภาพอากาศ ทิศทาง/ความเร็วลม ความกดอากาศ สภาพคลื่น และสภาพทางลาด**
>
> ข้อความนี้สอดคล้องกับกฎในซอร์สโค้ด (`ai-agents/TIDE_RULES.md` §4 "Dockmaster Final Approval Rule"): *"The system's SAFE classification is advisory only... No AI agent may issue a 'vessel cleared for launch' confirmation."* และผลลัพธ์จาก API มีฟิลด์ `warning` บังคับที่ต้องแสดงเสมอ ห้ามซ่อน

**เมื่อไม่มีข้อมูลระดับน้ำ:** ระบบต้องคืนค่า `no_tide_data` และห้ามดำเนินการจองต่อ ต้องให้เจ้าหน้าที่จัดหาและกรอกข้อมูลด้วยตนเอง (`ai-agents/TIDE_RULES.md` §5)

---

### 15. Quotation / Pricing

ใบเสนอราคา: `app/(dashboard)/quotations/**` API: `app/api/db/quotations`, `app/api/db/quotation-items`
แหล่งข้อมูลราคา: `PricingMaster` model ใน `prisma/schema.prisma` เข้าถึงผ่าน `GET /api/pricing-master?isActive=true`

**กฎธุรกิจที่ยืนยันแล้วและต้องรักษาไว้:**

- **Speedboat haul-out flat-rate:** ⚪ **ไม่สามารถยืนยันได้** ไม่พบคำว่า "flat rate" ที่ใดในซอร์สโค้ดเลย รายการราคาที่เกี่ยวข้องกับการยกเรือขึ้นอู่คิดราคาแยกตามเที่ยว/วัน/ครั้ง ไม่ใช่ค่าธรรมเนียมเหมาจ่ายรายการเดียว **ห้ามระบุในเอกสารที่ใช้กับลูกค้าว่าเป็นราคาเหมาจ่าย** จนกว่าฝ่ายการเงินจะยืนยัน
- **Yacht haul-out per-ft:** 🟡 **ยืนยันบางส่วน** กฎ per-foot (`ai-agents/PRICING_RULES.md` §3) ระบุชัดเจนสำหรับ **wet berth, dry storage, และ antifouling** เท่านั้น ไม่ได้ระบุเฉพาะเจาะจงว่า "haul-out" คิดราคา per-foot — หากต้องการยืนยันสำหรับ haul-out โดยตรง ต้องตรวจสอบกับรายการราคาจริงในฐานข้อมูล
- **Haul-out round trip:** ✅ **ยืนยันแล้ว** ผ่านกฎรถบรรทุก/เครนทั่วไป (§13) ซึ่งครอบคลุมการขนส่งที่เกี่ยวข้องกับ haul-out
- **VAT 7%:** ✅ **ยืนยันแล้ว** `taxAmount = round(subtotal × vat_pct / 100)`; ค่าเริ่มต้น `vat_pct = 7` อ่านจาก `mms_agent_config` ไม่ hardcode ในโค้ด (`PRICING_RULES.md` §6)
- **ลำดับส่วนลดและการคำนวณ VAT:** VAT คำนวณจากยอด subtotal **หลังหักส่วนลด** (`PRICING_RULES.md` §6: "VAT is applied to the subtotal after discount") ไม่มีรายละเอียดเพิ่มเติมเกี่ยวกับลำดับส่วนลดหลายชั้นที่ยืนยันได้จากโค้ด
- **ห้ามใส่อัตราราคาที่ไม่มีอยู่ในแอปจริง** — คู่มือนี้ไม่ระบุตัวเลขราคาเฉพาะใด ๆ นอกเหนือจากตัวอย่างในรายการราคาที่ยืนยันแล้วข้างต้น

**กฎเงินมัดจำ:** `depositRequired = round(grandTotal × deposit_pct / 100)` ค่าเริ่มต้น 50%
**กฎอายุใบเสนอราคา:** `validUntil = today + valid_days` ค่าเริ่มต้น 7 วัน

**กฎการจำแนกประเภทเรือเร็ว (ยืนยันแล้ว, ใช้อิง LOA เป็นหลัก ไม่ใช่จำนวนเครื่องยนต์):**

| จำนวนเครื่องยนต์ | ช่วง LOA | ระดับความเสี่ยงพื้นฐาน |
|---|---|---|
| 1 เครื่อง | ≤27 ฟุต | ปกติ |
| 2 เครื่อง | 27–40 ฟุต | ปกติ/ปานกลาง |
| 3 เครื่อง | 40–47 ฟุต | ปานกลาง/สูง |
| 4 เครื่อง | 47–55 ฟุต | สูง/ต้องดูแลพิเศษ |

เงื่อนไขยกระดับความเสี่ยงเพิ่มเติม: ความกว้าง ≥9 ฟุต, กินน้ำลึก ≥2.5 ฟุต, น้ำหนัก ≥4,000 กก. (ยกระดับ +1 ขั้นต่อรายการ)

**งานที่ห้าม AI คิดราคาอัตโนมัติ (ยืนยันแล้ว, `PRICING_RULES.md` §5):** งานเครื่องยนต์/ช่างกล และงานทาสี/ขัดเงา/กันเพรียง/เจลโค้ท ต้องส่งต่อให้ผู้จัดการคิดราคาด้วยตนเองและติดต่อลูกค้าโดยตรง

---

### 16. Invoice / Payment

**สถานะ: Implemented**

- **Invoice:** `app/(dashboard)/invoices/**` API: `app/api/db/invoices`, `app/api/db/invoice-items` — รวมสถานะ `OVERDUE` พร้อมป้ายสีแดงและข้อความเตือนในหน้ารายละเอียด
- **Payment:** `app/(dashboard)/payments/**` API: `app/api/db/payments` — มีฟอร์มบันทึกการชำระเงิน (`payments/new/page.tsx`)
- **Receipt (ใบเสร็จ):** `app/print/receipts/[id]/page.tsx` — ออกได้เฉพาะการชำระเงินสถานะ `CONFIRMED` เท่านั้น (แก้ไขบั๊กที่เคยอนุญาตให้ออกใบเสร็จสำหรับการชำระที่ pending/rejected/refunded — ยืนยันจาก `CLAUDE_HANDOFF.md` วันที่ 2026-06-12)
- **เอกสารพิมพ์อื่น ๆ:** ใบเสนอราคา สัญญา ใบสั่งงาน การจองแท่นลากเรือ (`app/print/**`)

---

### 17. Late Payment Flag

**สถานะ: Implemented**

- สถานะ `OVERDUE` เป็นสถานะหลักของใบแจ้งหนี้ (`types/index.ts`) แสดงเป็นป้ายสีแดง (`components/shared/StatusBadge.tsx`)
- **รายงานอายุหนี้ (Aging Report):** `app/(dashboard)/reports/aging/page.tsx` API: `app/api/db/reports/aging/route.ts` คำนวณ `days_overdue` ต่อใบแจ้งหนี้ และ `max_days_overdue` ต่อลูกค้า
- **การแจ้งเตือน:** `components/layout/NotificationBell.tsx` มีประเภทการแจ้งเตือน `OVERDUE_INVOICE`
- **การตรวจสอบโดย AI Finance Agent:** `app/api/ai/control/route.ts` คำนวณยอดค้างชำระรวมและตั้งค่า `escalation_required` เมื่อเกินเกณฑ์ที่กำหนด — เป็นฟังก์ชัน **อ่านข้อมูล/รายงานเท่านั้น** ไม่พบหลักฐานว่าส่งข้อความทวงหนี้อัตโนมัติโดยไม่ผ่านการอนุมัติ
- ลูกค้าเห็นสถานะ `OVERDUE` ผ่าน Customer Portal ได้เช่นกัน

---

### 18. FC Checking Checklist

รายการตรวจสอบสำหรับ FC ก่อนออกเอกสารให้ลูกค้าหรือปิดงาน:

- [ ] ตรวจสอบชื่อลูกค้าให้ถูกต้องตามข้อมูลในระบบ
- [ ] ตรวจสอบชื่อเรือให้ตรงกับใบเสนอราคา/การจอง
- [ ] ตรวจสอบ LOA / ประเภทเรือ (vessel class) ให้สอดคล้องกับข้อมูลที่บันทึกไว้
- [ ] ตรวจสอบรายการบริการ (service lines) ครบถ้วนทุกรายการ
- [ ] ตรวจสอบค่ารถบรรทุก/ยกเรือ ว่าคิดราคาแบบไป-กลับถูกต้อง (เว้นแต่มีการอนุมัติเที่ยวเดียวเป็นลายลักษณ์อักษร)
- [ ] ตรวจสอบ VAT 7% คำนวณถูกต้องหลังหักส่วนลด
- [ ] ตรวจสอบการอนุมัติส่วนลด (หากมี) ว่าได้รับอนุมัติจากผู้มีอำนาจ
- [ ] ตรวจสอบสถานะการชำระเงิน (Payment Status) ก่อนออกใบเสร็จ
- [ ] ตรวจสอบเลขที่ใบเสนอราคา/ใบแจ้งหนี้ให้ถูกต้องและไม่ซ้ำ
- [ ] ตรวจสอบรหัสบัญชี GL (หากมีการระบุ) — **หมายเหตุ: ปัจจุบันรหัส GL อยู่ในข้อความหมายเหตุ ไม่ใช่ฟิลด์ที่ระบบตรวจสอบอัตโนมัติ ต้องตรวจด้วยตาเปล่า**
- [ ] ตรวจสอบยอดค้างชำระ/สถานะ Overdue ก่อนดำเนินงานเพิ่มเติมกับลูกค้ารายนั้น

---

### 19. Chief Engineer Checking Checklist

รายการตรวจสอบสำหรับ Chief Engineer ก่อนอนุมัติงานยกเรือ/ปล่อยเรือ:

- [ ] ตรวจสอบขนาดเรือ (LOA, beam, draft, weight) ให้ตรงกับข้อมูลจริง ไม่ใช่ค่าประมาณ
- [ ] ตรวจสอบความเหมาะสมของช่องจอด/ลาน (slot suitability) กับขนาดเรือ
- [ ] ตรวจสอบขีดจำกัด LOA/น้ำหนักของอุปกรณ์ยก/ช่องจอดที่เลือก
- [ ] ตรวจสอบความต้องการรถพ่วง/ขาตั้งเรือ (trailer/stand requirement) ให้เหมาะสมกับประเภทเรือ
- [ ] ตรวจสอบวันที่ยกเรือขึ้นอู่/ปล่อยเรือให้ตรงกับตารางงานจริง
- [ ] ตรวจสอบผล Tide Window — **เป็นเพียงข้อมูลช่วยวางแผน ไม่ใช่การอนุมัติอัตโนมัติ**
- [ ] ตรวจสอบความต้องการเครน/อุปกรณ์ยก (lifting/crane requirement) ให้ตรงกับน้ำหนักเรือจริง
- [ ] ตรวจสอบระยะห่างปลอดภัย (safety clearance) รอบเรือและอุปกรณ์
- [ ] ตรวจสอบหมายเหตุปฏิบัติการ (operational notes) จากทีมงานหน้างาน
- [ ] **ยืนยันด้วยตนเองทางกายภาพและอนุมัติขั้นสุดท้ายก่อนปฏิบัติงานทุกครั้ง (final dockmaster approval)** — ไม่มี AI agent หรือระบบใดที่ได้รับอนุญาตให้ออกคำอนุมัติ "พร้อมปล่อยเรือ" แทนมนุษย์

---

### 20. Daily Operation Checklist

รายการตรวจสอบประจำวันสำหรับเจ้าหน้าที่มารีน่าที่ใช้งานระบบ:

1. เปิด **Floor Plan / Berth Map** (`/berths`) — ตรวจสอบช่องจอดที่ใช้งานอยู่ จองไว้ และว่างของวันนี้
2. ตรวจสอบ **Booking Calendar** (`/berths/calendar`) — ทบทวนเรือที่จะเข้า/ออกในสัปดาห์นี้
3. ทบทวนการจองแท่นลากเรือของวันนี้ (`/ramp-bookings`)
4. รัน **Tide Window Calculator** สำหรับทุกการปล่อยเรือ/ยกเรือขึ้นอู่ที่กำหนดไว้ — บันทึกช่วงเวลาปลอดภัยที่คาดการณ์
5. **ยืนยันระดับน้ำจริงด้วยตนเองในสถานที่จริงก่อนปฏิบัติงานทุกครั้ง**
6. ตรวจสอบการแจ้งเตือน (`/notifications`) — ใบแจ้งหนี้ค้างชำระ, สัญญา/ประกันภัยใกล้หมดอายุ
7. ทบทวนคำขอบริการ/ใบสั่งงานที่เปิดอยู่ (`/service-requests`, `/work-orders`)
8. บันทึกเหตุการณ์ทันทีหากเกิดเหตุด้านความปลอดภัยหรือความเสียหาย (`/incidents/new`)
9. บันทึกการเคลื่อนย้ายเรือ (`/movements/new`)
10. สิ้นสุดกะทำงาน: ตรวจสอบว่าใบเสนอราคา ใบแจ้งหนี้ และการชำระเงินของวันนั้นบันทึกครบถ้วน

---

### 21. Common Mistakes

ข้อผิดพลาดที่พบบ่อยที่ควรระวัง:

- **เลือกประเภทเรือ (vessel class) ผิด** — ส่งผลต่อการจำแนกความเสี่ยงและรหัสทางลาด (ramp code)
- **กรอก LOA ผิด** — กระทบการจำแนกประเภทเรือเร็วและระดับความเสี่ยง
- **ลืมกรอกกินน้ำลึก (draft)** — ระบบบังคับกรอกสำหรับ LAUNCH/RETRIEVAL แต่ถ้าข้อมูลเรือที่บันทึกไว้ผิด ผลคำนวณจะผิดตาม
- **เข้าใจว่า Tide Window คือการอนุมัติอัตโนมัติ** — เป็นเพียงเครื่องมือช่วยวางแผนเท่านั้น ต้องยืนยันด้วยตนเองเสมอ
- **เลือกบริการเพียงรายการเดียวทั้งที่ต้องมีหลายบริการ** — เช่น ลืมเพิ่มค่ารถบรรทุกแยกจากค่ายกเรือ
- **ลืมคิดค่ารถบรรทุกแบบไป-กลับ** — ค่าเริ่มต้นคือไป-กลับ (2 เที่ยว) เว้นแต่มีการอนุมัติเที่ยวเดียว
- **ลืม VAT หรือการอนุมัติส่วนลด** ก่อนออกเอกสารให้ลูกค้า
- **สันนิษฐานว่าฟีเจอร์ที่ยังอยู่ในสถานะ Planned/Partial ใช้งานได้จริงแล้ว** — เช่น flow การจองแบบรวมศูนย์เดียว (§11) ที่ยังไม่มีในระบบปัจจุบัน

---

### 22. Troubleshooting

| อาการ | สิ่งที่ควรตรวจสอบ |
|---|---|
| หน้าเว็บไม่โหลด | ตรวจสอบ URL ว่าเป็น Preview/Production ที่ถูกต้อง ตรวจสอบสถานะ deployment บน Vercel dashboard |
| ราคาการจองไม่คำนวณ | ตรวจสอบว่ารายการราคา (Pricing Master) มีรายการที่ active อยู่ ตรวจสอบว่ากรอกหน่วย/จำนวนครบถ้วน |
| Tide Window ไม่แสดงผล | ตรวจสอบว่ากรอกกินน้ำลึกและวันที่ครบ ตรวจสอบว่ามีข้อมูลระดับน้ำสำหรับวันที่เลือก (ระบบควรคืนค่า `no_tide_data` หากไม่มีข้อมูล — ห้ามดำเนินการต่อ) |
| ช่องจอดขึ้นว่า Occupied ทั้งที่ควรว่าง | ตรวจสอบสถานะการจองจริงในฐานข้อมูลผ่านหน้า Berth Management ก่อนแก้ไขด้วยตนเอง |
| ข้อมูลลูกค้า/เรือผิด | ตรวจสอบที่หน้า Customer/Boat detail โดยตรง แก้ไขผ่านฟอร์ม edit ไม่ควรแก้ผ่านฐานข้อมูลโดยตรง |
| Build/Preview error บน Vercel | ตรวจสอบ build log บน Vercel dashboard ตรวจสอบว่า environment variables ครบถ้วน |
| Environment variables หาย/ไม่ครบ | ตรวจสอบว่ามีตัวแปรตาม `.env.staging.example` ครบ (`NEXT_PUBLIC_SUPABASE_URL`, `DATABASE_URL` ฯลฯ) |
| ปัญหาการเชื่อมต่อ Supabase | ตรวจสอบ Supabase project status และ connection string ตรวจสอบว่าไม่ได้ใช้ credentials หมดอายุ |

---

### 23. Known Limitations

ข้อจำกัดที่ยืนยันได้จากหลักฐานในซอร์สโค้ดปัจจุบันเท่านั้น (หมายเหตุ: ความไม่พบหลักฐาน "Codex Task 05" ถูกย้ายไปไว้ที่ §4 Evidence / Documentation Gaps แล้ว เนื่องจากเป็นช่องว่างด้านเอกสาร ไม่ใช่ข้อจำกัดของซอฟต์แวร์):

- **ไม่มี Unified New Booking Wizard** — ระบบปัจจุบันมี flow การจองแท่นลากเรือ (ramp booking) และใบเสนอราคา (quotation) แยกจากกัน ยังไม่รวมเป็นฟอร์มเดียว (§11)
- **ramp-bookings POST ถูกล็อกด้วย `ENABLE_PRODUCTION_BOOKINGS`** — หากไม่เปิดใช้งาน environment variable นี้ การสร้าง production booking จะถูกปฏิเสธแบบ fail-closed ด้วย HTTP 403 (ยืนยันจาก `app/api/db/ramp-bookings/route.ts`, `lib/safe-mode.ts`)
- **ข้อมูลการจองแท่นลากเรือถูกเก็บใน Supabase table ดิบ `mms_ramp_bookings`** — ยังไม่มี Prisma model สำหรับตารางนี้ (ยืนยันจาก `prisma/schema.prisma` ไม่มี model ที่เกี่ยวข้อง และ API route เรียก `supabase.from("mms_ramp_bookings")` โดยตรง)
- **ใบเสนอราคาใช้ Prisma แต่การจองแท่นลากเรือใช้ raw Supabase access** — หมายความว่า data layer ของระบบยังไม่เป็นหนึ่งเดียว (unified) ผู้พัฒนาที่ query ผ่าน Prisma client เพียงอย่างเดียวจะไม่เห็นข้อมูลการจองแท่นลากเรือ
- **`ramp-bookings/new` มีข้อมูล operation และ tide แต่ไม่มี service/price selection** (§11)
- **`quotations/new` มี multi-service และ price calculation แต่ไม่มี tide workflow** (§11)
- **รหัส GL ไม่ใช่ฟิลด์ schema ที่บังคับ** — อยู่ในข้อความหมายเหตุเท่านั้น ไม่สามารถค้นหา/กรองตามรหัส GL ได้อัตโนมัติ
- **Recurring Billing** มี UI/API แต่กลไกตั้งเวลาการเรียกเก็บเงินจริงยังไม่ได้รับการยืนยันครบถ้วน
- **ไม่มีหลักฐานยืนยันการมีปุ่มสลับภาษาไทย/อังกฤษทั้งระบบ** — Unknown

---

### 24. Developer Notes for Next Patch

ข้อเสนอแนะสำหรับการพัฒนารอบถัดไป โดยอิงจากช่องว่างที่พบ:

1. **สร้าง Unified New Booking Wizard** ที่เชื่อมขั้นตอนต่อไปนี้เข้าด้วยกันเป็นหน้าเดียว: vessel info → slot selection → tide check → truck/lift selection → multi-service selection → price summary → save/confirm
2. **เชื่อมต่อ flow ระหว่าง ramp booking และ quotation** ให้เป็น operational workflow เดียวกัน (ปัจจุบันทั้งสอง flow แยกกันโดยสิ้นเชิง ไม่มีการอ้างอิงข้าม API — ดู §11, §23)
3. **ตัดสินใจสถาปัตยกรรมข้อมูล:** ควรย้าย ramp booking (`mms_ramp_bookings`) เข้าสู่ Prisma schema หรือคงไว้เป็น raw Supabase access ต่อไป — หากคงไว้ ต้องกำหนดขอบเขต repository/service ให้ชัดเจนเพื่อไม่ให้ data layer กระจัดกระจาย
4. **เพิ่ม Prisma model สำหรับ `mms_ramp_bookings`** หากทีมยึดมาตรฐาน Prisma-first สำหรับทุกตาราง (สอดคล้องกับข้อ 3)
5. **จัดทำเอกสาร `ENABLE_PRODUCTION_BOOKINGS` ให้ชัดเจน** ครอบคลุม: วัตถุประสงค์ของ flag, พฤติกรรมเริ่มต้น (default = ปิด/fail-closed), พฤติกรรมบน staging, พฤติกรรมบน production, และเหตุผลด้านความปลอดภัยที่ต้อง fail-closed แทนที่จะ fail-open
6. **สร้างไฟล์ changelog ที่เป็นทางการสำหรับทุก patch ของ Codex/Claude ในอนาคต** โดยระบุ: หมายเลข task, วันที่, ชื่อ branch, commit hash, ไฟล์ที่เปลี่ยนแปลง, ผลกระทบต่อฟีเจอร์ (feature impact), และผลกระทบต่อข้อจำกัด (limitation impact) — เพื่อป้องกันปัญหาแบบ "Codex Task 05" ที่ตรวจสอบย้อนหลังไม่ได้ (ดู §4)
7. เพิ่มฟิลด์ `gl_code` ที่เป็นโครงสร้างจริงใน `PricingMaster` model แทนการฝังในข้อความหมายเหตุ เพื่อให้ FC ค้นหา/ตรวจสอบได้อัตโนมัติ
8. ยืนยันและบันทึกเป็นลายลักษณ์อักษรว่า speedboat haul-out เป็นราคาเหมาจ่ายหรือไม่ (ปัจจุบันไม่มีหลักฐาน) เพื่อป้องกันความสับสนในการออกใบเสนอราคา
9. ตรวจสอบและยืนยันกลไกการทำงานจริงของ Recurring Billing ให้ครบวงจร
10. เพิ่มเอกสารอ้างอิงจำนวนช่องจอดสูงสุดต่อโซน (C/W/B/WB) ให้ชัดเจนในระดับ config หรือ schema

---

*คู่มือฉบับนี้จัดทำจากหลักฐานที่ตรวจสอบได้ในซอร์สโค้ดปัจจุบันเท่านั้น ทุกจุดที่ไม่สามารถยืนยันได้ถูกทำเครื่องหมายไว้อย่างชัดเจน แทนที่จะสันนิษฐานว่าใช้งานได้ ดูรายละเอียดหลักฐานทั้งหมดที่ `docs/USER_MANUAL_CHANGELOG_FROM_CODEX_TASK_05.md`*
