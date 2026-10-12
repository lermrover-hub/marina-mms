# Ocean Rover Marina Pricing Structure v3.6 — Audit Report

**Audit date:** 11 October 2026
**Repository state:** branch `codex/accounting-e2e-production-readiness`, commit `7a15326`
**Mode:** Audit → Simulate → Report
**Implementation status:** Not authorized; no application code, database data, migration, deployment, quotation, or invoice may be changed until this audit is explicitly approved.

**Terminology clarification:** `W4` and `B1` are physical boat-storage slot/area codes. They are not vessel classes, service categories, or rate codes. A storage price is selected from the combination of vessel class, assigned slot code, storage method, and billing period.

## Executive summary (Thai)

ระบบ Marina MMS มีโครงสร้างพื้นฐานที่รองรับ Pricing v3.6 ได้บางส่วน ได้แก่ Pricing Master, ราคาเต็ม/ราคาทดลอง, ส่วนลดเริ่มต้น 0%, ต้นทุนและ GL/P&L, snapshot ราคาในใบเสนอราคา, approval gate และการส่งยอดใบเสนอราคาไป invoice โดยคงราคาที่อนุมัติแล้ว แต่ **ยังไม่พร้อมใช้ Pricing v3.6 จริง** เพราะกฎสำคัญยังไม่ถูกบังคับในระบบ

ประเด็นวิกฤตมีดังนี้:

1. ตัวจำแนก Speedboat ยังระบุ SB4 เดิมว่า 48–55 ฟุต และไม่มีขอบบน จึงจัดเรือ 61 ฟุตเป็น SB4 แทนที่จะส่ง Manager Review / Outside configured range
2. ระบบยังไม่แยก `storage eligibility` ออกจาก `haul-out eligibility` อย่างเป็นกฎบังคับ แม้หน้า Service Request จะแยกข้อมูลการเคลื่อนย้ายและรายการบริการแล้ว
3. ยังไม่มี policy engine สำหรับ W4 trailer-only, B1 boat-stands-only, การตรวจพื้นที่ซ้ำ และการบล็อกเรือ 60 ฟุตบนขาตั้งในพื้นที่อื่น
4. ยังไม่มีตัวคำนวณแพ็กเกจราคาต่ำสุด Daily/Weekly/Monthly
5. ราคาปัจจุบันมาจาก v3.5 และมีรายการซ้ำ/ล้าสมัย รวมทั้ง Wet Berth ที่ไม่สอดคล้องกับสถานะหน้างาน
6. ราคายกรถเครนขัดกันในระบบปัจจุบัน: เอกสาร hardstand 10,000 บาท, rate card เดิม 13,500 บาท และไฟล์ v3.6 ระบุ reference cost 12,000 บาท คำสั่งล่าสุดของผู้ใช้กำหนด **ราคาขาย 12,000 บาทต่อ lifting event** สำหรับ SB4 ที่ลงขาตั้ง และต้องใช้รถเครนเท่านั้น
7. ยังไม่มีโมดูล Night OT และ External Haul-out costing ที่บังคับรายการต้นทุนและ unknown-cost approval ก่อนเสนอราคาลูกค้า

ผล Test Matrix เดิมจำนวน 29 กรณี: **PASS 4, FAIL 9, NOT IMPLEMENTED 16, BLOCKED 0** และเพิ่ม boundary acceptance cases สำหรับ 55, 56, 60 และ 61 ฟุตอีก 4 กรณีในสถานะ **SPECIFIED / NOT EXECUTED** โดย PASS เดิมเป็น source-level behavior เท่านั้น ไม่ใช่ staging หรือ production E2E

ข้อเสนอคือคง workflow ล่าสุดไว้ และเพิ่มเฉพาะ pricing domain, eligibility gate, rate-card import v3.6, package optimizer และ validation tests ใน branch แยก หลังได้รับอนุมัติ implementation คาดการณ์งานพัฒนาและทดสอบประมาณ **14–22 developer-days** หรือราว **3–5 สัปดาห์ปฏิทินสำหรับนักพัฒนา 1 คน** รวม review และ staging UAT แต่ไม่รวมเวลารออนุมัติราคา/วิศวกรรม/กฎหมาย

## Source of truth reviewed

Audit นี้ใช้ `ORM_Rate_Structure_v3_6_FINAL_MERGED.xlsx` เพียงฉบับเดียวเป็น source of truth:

- SHA-256: `AAA63443ABD839508D063B5029159B0E1A05A31A7621A73D5B8D6073C6243203`
- ขนาด: 20,532 bytes
- ชีต: `README`, `RATE_CARD`, `POLICY`, `NIGHT_OT`, `SPECIAL_OPERATION`, `PRICING_RULES`, `QUOTE_EXAMPLE`, `STORAGE_V36`, `SB4_SLOT_POLICY`, `DURATION_SIM`, `V36_CHANGELOG`, `QUOTE_CODE_MAP`

ไฟล์ FINAL_MERGED ระบุ SB4 เป็น 48–60 ฟุต และระบุชัดว่าการจัดประเภทราคาไม่อนุญาต standard haul/launch โดยอัตโนมัติ กฎ slot policy ยังแยกสิทธิ์เก็บเรือออกจากสิทธิ์ haul/launch และยืนยันขีดจำกัดอุปกรณ์มาตรฐาน 12 ตัน

### Source precedence

ลำดับการใช้ข้อมูลสำหรับ Audit นี้:

1. คำสั่งล่าสุดโดยตรงจากผู้ใช้
2. `ORM_Rate_Structure_v3_6_FINAL_MERGED.xlsx`
3. ราคาที่ได้รับอนุมัติและ price snapshot ในเอกสารที่ออกแล้ว ซึ่งต้องคงเดิม

ไฟล์ DRAFT และ CONSOLIDATED รุ่นก่อนหน้าใช้ได้เฉพาะเป็นหลักฐานย้อนหลัง ไม่ใช่ source of truth สำหรับ audit รอบนี้

ข้อจำกัดของแหล่งข้อมูล:

- Workbook ระบุสถานะ Proposed/Draft และห้าม production import
- Full Rate ของ W4 ยังว่างและต้องคงว่าง ห้ามย้อนคำนวณจาก Soft Rate
- การขยายช่วง SB4 จาก 55 เป็น 60 ฟุตไม่อนุญาตให้สร้างราคาใหม่หรือส่วนลดใหม่สำหรับ 56–60 ฟุตโดยอัตโนมัติ
- หากไม่มีราคาเดิมที่ได้รับอนุมัติและครอบคลุมบริการ/ขนาดดังกล่าว ต้อง block quotation line และส่งอนุมัติราคา ไม่ให้ยืมราคาจาก tier ใกล้เคียง
- กฎรถเครน SB4 ราคา 12,000 บาท/ครั้งมาจากคำสั่งล่าสุดของผู้ใช้ และมีลำดับเหนือข้อความทั่วไปใน `SB4_SLOT_POLICY` ที่ระบุเพียงว่า special handling ต้องอนุมัติแยก
- คำว่า “ครั้ง” ในรายงานนี้หมายถึง **หนึ่ง lifting event**; หากมีทั้งยกลงขาตั้งและยกออกจากขาตั้ง ให้คิดสองครั้ง เว้นแต่ฝ่ายบริหารอนุมัติให้เป็นราคา round trip

## Audit scope and evidence

ตรวจเส้นทาง:

`Pricing Master → Vessel Classification → Service Request / Booking → Draft Quotation → Approval → Invoice`

ตรวจไฟล์หลักตามโจทย์และ dependency ที่เกี่ยวข้อง ได้แก่:

- `lib/pricing-master.ts`
- `lib/speedboat-classification.ts`
- `lib/service-rate-card.ts`
- `ai-agents/PRICING_RULES.md`
- `ai-agents/lib/speedboat-classification.js`
- `ai-agents/agents/quotation-agent.js`
- `app/(dashboard)/service-requests/new/page.tsx`
- `app/api/db/service-requests/route.ts`
- `app/api/db/berth-assignments/route.ts`
- Pricing Master, Quotation และ Invoice API/UI
- `prisma/schema.prisma`
- `scripts/import-rate-card.json` และ rate-card import scripts
- migrations ที่เกี่ยวกับ pricing snapshot และ quotation-to-invoice conversion
- automated tests ปัจจุบัน

ไม่ดำเนินการ:

- ไม่เชื่อม live/staging database
- ไม่แก้ Pricing Master หรือข้อมูลจริง
- ไม่รัน migration
- ไม่ deploy
- ไม่แก้ quotation/invoice เดิม
- ไม่ทดสอบ authenticated browser E2E หรือ availability จริงของ W4/B1

## Executed verification

| Verification | Result | Meaning |
|---|---:|---|
| Workbook import and all-sheet inspection | PASS | อ่าน 11 ชีตและสูตรได้ครบ |
| Workbook formula error scan | PASS | ไม่พบ Excel formula error ที่ระบุ |
| `npm.cmd test` | 110 passed, 0 failed | Source regression tests ผ่าน |
| `AI_AGENT_DRY_RUN=true`, `AI_AGENT_SKIP_CLAUDE=true`, `npm.cmd run agents:test` | 132 passed, 0 failed, 20 skipped | Agent unit tests ผ่าน; live API tests ถูกข้าม |
| Direct classifier simulation at 25/35/45/55/60/61 ft | 25→SB1, 35→SB2, 45→SB3, 55→SB4, 60→SB4, 61→SB4 | พบ defect ที่ 61 ft และไม่มี upper-bound gate |
| Independent package simulation | W4: 7=4,200, 10=6,300, 30=18,000; B1: 7=5,400, 10=8,100, 30=19,500 | ตรงกับ workbook แต่ยังไม่มี engine ในแอป |
| Independent OT simulation, 5 staff | 2h=1,750; 3h=2,000; 4h=2,500; 5h+=3,250 | ตรงกับ workbook แต่ยังไม่มี engine ในแอป |

Automated tests ที่ผ่านไม่ได้แปลว่า Pricing v3.6 ผ่าน เพราะชุดทดสอบปัจจุบันยังยืนยัน v3.5 และยังไม่มี acceptance tests แยกสำหรับ 55, 56, 60 และ 61 ฟุต รวมถึง hard block เมื่อเกิน 12 ตัน

## Compatibility by layer

### 1. Pricing Master — partially compatible

จุดที่รองรับแล้ว:

- เก็บ full/current/pilot rate, default discount, source discount, direct cost, GL, P&L, source version และ effective date
- operational discount เริ่มที่ 0%
- มี role guard สำหรับ pricing writes และ audit history

ช่องว่าง:

- ไม่มีชนิดราคาแบบบังคับชัดเจนสำหรับ `FULL`, `SOFT_OPENING`, `DIRECT_COST`, `OUTSOURCED_COST`, `SPECIAL_OPERATION_COST`, `APPROVED_SELLING_PRICE`
- Service Request ใช้ `rate_thb` โดยตรง ไม่ใช้ `effectiveRate`; pilot/soft override จึงไม่สม่ำเสมอระหว่าง UI/API
- ปุ่ม bulk pilot reduction สามารถสร้างความเสี่ยงลดซ้ำบนราคา Soft Opening ถ้าไม่มี rate-type guard
- rate card ใน source ยังเป็น `ORM-PRICE-2026-v3.5`

### 2. Speedboat classification — incompatible at upper boundary

- ช่วง SB1–SB3 ตรงกับ v3.6
- SB4 ยังมี comment เดิม `>47–55 ft`
- ฟังก์ชันใช้ `else return 4` ทำให้ทุกขนาดเกิน 47 ฟุต รวม 61 ฟุตขึ้นไป เป็น SB4
- engine count mismatch มี warning แล้ว แต่ยังไม่มีสถานะ `OUTSIDE_CONFIGURED_RANGE`
- SB4 ถูก map ไป `RAMP_3OB` ซึ่งทำให้การจัดประเภทราคาปะปนกับสิทธิ์ใช้อุปกรณ์ ramp
- missing LOA ถูกตีความเป็น 0 และจัดเป็น SB1 ซึ่งควร fail closed

### 3. Storage and berth allocation — incompatible with W4/B1 policy

- schema มี max LOA, beam, draft และ status แต่ไม่มี weight, storage method, trailer ownership, stand policy, engineering approval หรือ explicit slot restriction
- berth-assignment POST รับ body ไป insert โดยตรง ไม่มี server-side overlap/capacity/policy validation
- mock data ระบุ W4 max 51 ft แต่ v3.6 ให้ W4 รองรับ SB4 ถึง 60 ft แบบ trailer-only; B1 ระบุ max 60 ft
- ไม่มีบล็อก “60 ft + stands + slot อื่น”
- ไม่มีบังคับ “B1 + SB4 stands ⇒ crane-only + 12,000 บาทต่อ event”

### 4. Service Request and workflow — compatible foundation; retain current workflow

จุดที่ถูกต้องและไม่ควรรื้อ:

- Customer/Boat, Tow In/Tow Out, Haul-out/Launch, Storage/Yard Service และ Rate Card selection แยกเป็นส่วน
- Service Request เกิดก่อนชำระเงิน และ Work Order ถูก payment gate ควบคุม
- Draft Quotation สร้างจากรายการ Rate Card และต้องผ่าน approval ก่อนส่งลูกค้า
- Open Rate ถูกจำกัด role
- quotation items เก็บ price/cost/accounting snapshots

ช่องว่างเฉพาะ pricing integration:

- ยังไม่มี lowest-package calculation
- UI เลือก period และ quantity เอง จึงสามารถเลือกแพ็กเกจที่แพงกว่าได้
- ไม่มี automatic mandatory companion item เช่น SB4 stands crane 12,000/event
- ไม่มี location-aware item filtering สำหรับ W4/B1

### 5. Quotation, approval and invoice — mostly compatible

- Draft/edit/submit/internal approval/customer delivery gates มี automated tests
- Quotation line items เก็บ unit price และ snapshot metadata
- quotation-to-invoice RPC คัดลอก unit price, discount และ line total จึงรักษายอดที่อนุมัติแล้ว
- ราคาประวัติไม่ควรถูกคำนวณใหม่จาก Pricing Master

ข้อควรเสริม:

- ห้าม final quotation เมื่อ mandatory technical/cost inputs ของ special operation ยังไม่ครบ
- invoice item ควรเก็บ source snapshot identifiers เพิ่มถ้าต้องการ traceability เท่ากับ quotation

### 6. Night OT and special operation — simulation only

- Workbook คำนวณ OT ตาม cumulative table ถูกต้อง และ 5 คน × 5 ชั่วโมง = 3,250 บาท
- fractional-hour rounding ยังไม่มีนโยบาย
- ระบบปัจจุบันไม่มี dedicated OT calculator/gate
- External haul-out ยังไม่มี structured breakdown และ mandatory unknown-cost approval
- ห้ามนำ target gross margin หรือ outsource markup ไปใช้เป็นราคาขายอัตโนมัติโดยไม่มี approval

### 7. Wet berth — conflicts with current operation

Workbook ระบุไม่มี wet berth แต่ source ยังมี:

- active `BERTH_*` rate-card rows
- Wet Berth contract option, quotation category, help text, dashboard/report labels และ mock records

ควรปิดการ “เสนอราคา/สร้างสัญญาใหม่” สำหรับ Wet Berth โดยไม่ลบประวัติเดิม

## High-risk pricing conflicts

| Area | v3.6 / latest rule | Current source | Risk |
|---|---|---|---|
| SB4 range | 48–60 ft; 61 ft outside | 48–55 label; no upper bound | 61+ ft may be priced/approved incorrectly |
| SB4 56–60 pricing | Preserve approved rates; do not derive a new rate or discount | No explicit no-synthesis guard | A new tier or discount could be introduced without approval |
| Standard ramp capacity | Over 12 tonnes must block automatic standard haul-out quotation | Weight only raises a risk label and may still return a ramp code | Unsafe or invalid automatic quotation |
| SB3 weekly | Full 4,800 / Soft 3,600 | Current import 4,500 / source reference 3,375 | Under/incorrect pricing |
| W4 slot | Trailer-only: 700/4,200/18,000 Soft | No approved price mapping tied to slot W4 | Cannot quote correctly |
| B1 slot | Stands-only: 900/5,400/19,500 Soft | No approved price mapping tied to slot B1 | Cannot quote correctly |
| SB4 stands crane | Mandatory crane, selling price 12,000/event | Hardstand form 10,000; rate card 13,500; workbook special-operation 12,000 cost then 13,800 sale | Conflicting customer price and duplicate charge risk |
| Boat stands | Included in B1 storage | Separate `STAND_DAY/WEEK/MONTH` items active | Double billing risk |
| Soft Opening | No second 25% discount | Generic pilot and quotation discount mechanisms | Double-discount risk without rate-type lock |
| Wet berth | Unavailable | Multiple active UI/rate options | Invalid service may be quoted |

## Recommendation

Do not import or deploy v3.6 yet. Approve a narrow implementation branch that leaves the current workflow intact and changes only:

1. pricing/rate type model and v3.6 rate codes
2. independent storage and haul-out eligibility services
3. W4/B1 allocation policies and overlap checks
4. mandatory SB4-stands crane item at 12,000 THB per event
5. package optimizer and server-side recalculation
6. OT/special-operation cost schema and approval gates
7. comprehensive unit/integration/staging UAT

Implementation must stop before production migration/import/deployment and await separate approval.
