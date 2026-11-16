# Accounting review: missing cost mappings

วันที่ตรวจ: 2026-09-09

แหล่งราคา: `ORM_Quote_Tidal_v3_5_Updated.xlsx`

สถานะ: รอ Accounting ยืนยันก่อนนำ Rate Card ไปใช้จริง

## สรุป

- Rate Card ทั้งหมด 127 รหัส
- มี Direct Cost แล้ว 121 รหัส
- มี Revenue GL และ Revenue P&L ครบ 127 รหัส
- มี Cost GL และ Cost P&L แล้ว 99 รหัส
- เหลือ 28 รหัสที่ต้องกำหนด Cost GL, Cost P&L และ Cost Basis
- ระบบตั้ง Operational Discount เป็น 0% ทุกแถว; Source Discount เก็บไว้เป็นข้อมูลอ้างอิงเท่านั้น
- ห้ามเดาหรือคัดลอก Cost GL/P&L จาก Revenue GL/P&L โดยอัตโนมัติ

## รายการรอตรวจ

| Code | Service | Category | Unit | Direct cost (THB) | Revenue GL | Revenue P&L | Cost GL | Cost P&L | Cost basis |
|---|---|---|---|---:|---:|---|---|---|---|
| RAMP_SB_1ENG_15_27 | Speedboat 1 engine 15-27 ft ramp in/out | Ramp | trip | 180 | 4100 | A.Access & Ramp | REVIEW | REVIEW | REVIEW |
| RAMP_SB_2ENG_28_40 | Speedboat 2 engines >27-40 ft ramp in/out | Ramp | trip | 300 | 4100 | A.Access & Ramp | REVIEW | REVIEW | REVIEW |
| RAMP_SB_3ENG_41_47 | Speedboat 3 engines >40-47 ft ramp in/out | Ramp | trip | 450 | 4100 | A.Access & Ramp | REVIEW | REVIEW | REVIEW |
| RAMP_SB_4ENG_48_55 | Speedboat 4 engines >47-51 ft ramp in/out | Ramp | trip | 675 | 4100 | A.Access & Ramp | REVIEW | REVIEW | REVIEW |
| RAMP_SB_SPECIAL | Speedboat >51 ft or >4 engines - manager approval | Ramp | Quotation | 0 | 4100 | A.Access & Ramp | REVIEW | REVIEW | REVIEW |
| HAUL_SB_1ENG_15_27 | Speedboat 1 engine 15-27 ft haul-out round trip | Haul | round trip | 1,650 | 4110 | B.Haul-out | REVIEW | REVIEW | REVIEW |
| HAUL_SB_2ENG_28_40 | Speedboat 2 engines >27-40 ft haul-out round trip | Haul | round trip | 2,550 | 4110 | B.Haul-out | REVIEW | REVIEW | REVIEW |
| HAUL_SB_3ENG_41_47 | Speedboat 3 engines >40-47 ft haul-out round trip | Haul | round trip | 3,750 | 4110 | B.Haul-out | REVIEW | REVIEW | REVIEW |
| HAUL_SB_4ENG_48_55 | Speedboat 4 engines >47-51 ft haul-out round trip | Haul | round trip | 5,400 | 4110 | B.Haul-out | REVIEW | REVIEW | REVIEW |
| HAUL_SB_SPECIAL | Speedboat >51 ft or >4 engines haul-out - manager approval | Haul | Quotation | 0 | 4110 | B.Haul-out | REVIEW | REVIEW | REVIEW |
| HAUL_POWER_CAT_CONTACT | Power catamaran haul-out / launch - manual quote | Haul | Quotation | 0 | 4110 | B.Haul-out | REVIEW | REVIEW | REVIEW |
| HAUL_SAIL_MONO_CONTACT | Sail monohull haul-out / launch - manual quote | Haul | Quotation | 0 | 4110 | B.Haul-out | REVIEW | REVIEW | REVIEW |
| STORE_SB_1ENG_15_27_M | Speedboat 1 engine 15-27 ft passive storage monthly | Storage | month | 956.25 | 4120 | C.Storage | REVIEW | REVIEW | REVIEW |
| STORE_SB_2ENG_28_40_M | Speedboat 2 engines >27-40 ft passive storage monthly | Storage | month | 1,575 | 4120 | C.Storage | REVIEW | REVIEW | REVIEW |
| STORE_SB_3ENG_41_47_M | Speedboat 3 engines >40-47 ft passive storage monthly | Storage | month | 2,137.50 | 4120 | C.Storage | REVIEW | REVIEW | REVIEW |
| STORE_SB_4ENG_48_55_M | Speedboat 4 engines >47-55 ft passive storage monthly | Storage | month | 2,925 | 4120 | C.Storage | REVIEW | REVIEW | REVIEW |
| HARDSTAND_SB_1ENG_15_27_M | Speedboat 1 engine 15-27 ft hardstand/repair monthly | Hardstand & Boat Stand | month | 1,650 | 4130 | D.Repair Yard | REVIEW | REVIEW | REVIEW |
| HARDSTAND_SB_2ENG_28_40_M | Speedboat 2 engines >27-40 ft hardstand/repair monthly | Hardstand & Boat Stand | month | 2,700 | 4130 | D.Repair Yard | REVIEW | REVIEW | REVIEW |
| HARDSTAND_SB_3ENG_41_47_M | Speedboat 3 engines >40-47 ft hardstand/repair monthly | Hardstand & Boat Stand | month | 3,750 | 4130 | D.Repair Yard | REVIEW | REVIEW | REVIEW |
| HARDSTAND_SB_4ENG_48_55_M | Speedboat 4 engines >47-55 ft hardstand/repair monthly | Hardstand & Boat Stand | month | 5,250 | 4130 | D.Repair Yard | REVIEW | REVIEW | REVIEW |
| PAINT_ALL_PENDING | Paint work - price pending | Contractor For Boat Paint | Quotation | 0 | 4130 | D.Repair Yard | REVIEW | REVIEW | REVIEW |
| PAINT_POLISH_PENDING | Polishing - price pending | Contractor For Boat Paint | Quotation | 0 | 4130 | D.Repair Yard | REVIEW | REVIEW | REVIEW |
| PAINT_ANTIFOUL_PENDING | Antifouling - price pending | Contractor For Boat Paint | Quotation | 0 | 4130 | D.Repair Yard | REVIEW | REVIEW | REVIEW |
| PAINT_GELCOAT_PENDING | Gelcoat - price pending | Contractor For Boat Paint | Quotation | 0 | 4130 | D.Repair Yard | REVIEW | REVIEW | REVIEW |
| MECH_ENGINE | Engine specialist - manual quote | Mechanic Specialist | Quotation | 0 | 4170 | G.Specialist Services | REVIEW | REVIEW | REVIEW |
| MECH_MOTOR | Motor specialist - manual quote | Mechanic Specialist | Quotation | 0 | 4170 | G.Specialist Services | REVIEW | REVIEW | REVIEW |
| MECH_ELEC_GEN | Electrical and generator specialist - manual quote | Mechanic Specialist | Quotation | 0 | 4170 | G.Specialist Services | REVIEW | REVIEW | REVIEW |
| MECH_EQUIP_INSTALL | Boat equipment installation - manual quote | Mechanic Specialist | Quotation | 0 | 4170 | G.Specialist Services | REVIEW | REVIEW | REVIEW |

## สิ่งที่ Accounting ต้องตอบ

1. ระบุ Cost GL และ Cost P&L ของแต่ละรหัส หรือยืนยัน mapping แบบกลุ่มที่ใช้กับรหัสทั้งหมดในกลุ่มนั้น
2. ยืนยันว่า Direct Cost ที่มีอยู่ใช้เป็น estimate ชั่วคราวได้หรือไม่ และระบุ Cost Basis ที่ต้องแสดงในรายงาน
3. สำหรับรายการ `Quotation` ที่ Direct Cost เป็น 0 ให้ยืนยันว่าจะบังคับกรอก Actual Cost ที่ Work Order ก่อนปิดงานหรือไม่
4. ยืนยันผู้อนุมัติ Rate Card และวันที่มีผล ก่อนเปิด `--apply`

## Gate ก่อนนำเข้า

- [ ] Accounting เติมและอนุมัติทั้ง 28 mappings
- [ ] อัปเดต source workbook หรือไฟล์ mapping ที่ควบคุมเวอร์ชันได้
- [ ] Regenerate JSON/SQL และรัน automated tests
- [ ] Preview เทียบ staging อีกครั้ง; จำนวน added/changed/missing ต้องได้รับการตรวจ
- [ ] ใช้ `--apply` เฉพาะ staging พร้อม `--approved-by` และ `--confirm-project`
- [ ] ตรวจ Pricing Master, quotation snapshot และ Job Margin ด้วย test records
- [ ] Production migration/import ต้องขออนุมัติแยก ณ เวลาทำจริง
