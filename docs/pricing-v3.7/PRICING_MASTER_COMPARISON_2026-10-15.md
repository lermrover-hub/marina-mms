# ORM v3.7 vs Staging Pricing Master

วันที่ตรวจสอบ: 15 ตุลาคม 2026  
แหล่งอ้างอิง v3.7: `ORM_Quote_Tidal_v3_7_Tier3_41_50_Tier4_51_60_APPROVED.xlsx`  
ฐานข้อมูลที่ตรวจ: Supabase staging project `zanlunbgupdtqznruzok` (อ่านอย่างเดียว)

## Executive result

- v3.7 Rate Card มี 99 รายการ: 66 รายการอยู่ในกลุ่ม `APPROVED*` และ 33 รายการยังเป็น Review / Manager Review / Proposed / Not auto-priced
- Pricing Master staging มี 156 รายการ: Active 132 และ Retired 24
- Active Pricing Master ยังเป็น v3.5 จำนวน 104 รายการ และ v3.6 จำนวน 28 รายการ
- Active Pricing Master ที่ระบุ source เป็น v3.7: **0 รายการ**
- รหัส v3.7 ที่อนุมัติและตรงกับ Pricing Master แบบ exact code: **0 จาก 66 รายการ**
- สรุป: **Pricing Master ปัจจุบันยังไม่ตรงกับ v3.7** แม้บางบริการจะมีราคาเท่ากันแต่ใช้รหัส/ขอบเขตงานคนละแบบ

## ราคา Speedboat: Storage และ Service Yard

ราคา v3.7 ของ Dry Storage และ Service Yard เท่ากัน แต่ต้องแยก GL และห้ามคิดซ้ำในช่วงวัน/พื้นที่เดียวกัน

| Tier | ขอบเขต v3.7 | v3.7 วัน / สัปดาห์ / 30 วัน | Pricing Master ปัจจุบัน | ผลต่างสำคัญ |
|---|---|---:|---:|---|
| T1 | 15–27 ft | 500 / 3,150 / 11,250 | Storage effective 300 / 1,800 / 6,375; Yard มีเฉพาะเดือน 11,000 | v3.7 สูงขึ้นและเพิ่ม Yard รายวัน/สัปดาห์ |
| T2 | 28–40 ft | 700 / 4,410 / 15,750 | Storage effective 412.50 / 2,475 / 10,500; Yard เดือน 18,000 | v3.7 Storage สูงขึ้น แต่ Yard เดือนลดลง 2,250 |
| T3 | 41–50 ft | 1,200 / 7,560 / 27,000 | Storage 600 / 3,600 / 14,250 และขอบเขตเดิม 41–47 ft; Yard เดือน 25,000 | เปลี่ยนทั้งราคาและ boundary เป็น 41–50 ft |
| T4 | 51–60 ft, สูตรตาม LOA | 51 ft: 1,550 / 9,770 / 39,530; 55 ft: 1,750 / 11,030 / 44,630; 60 ft: 2,000 / 12,600 / 51,000 | W4: 700 / 4,200 / 18,000; B1: 900 / 5,400 / 19,500; Yard 48–55 ft เดือน 35,000 | v3.7 เปลี่ยนจาก slot-specific เป็น LOA formula และยังต้อง Capacity Review |

## Service items ใหม่หรือโครงสร้างต่างจากปัจจุบัน

| กลุ่ม | v3.7 | Pricing Master ปัจจุบัน |
|---|---|---|
| Sport & Cruiser | เพิ่ม Tier 1–4 แยก Dry Storage และ Service Yard รวม 24 รายการ | ไม่มีรหัสชุดนี้ |
| Speedboat Service Yard | เพิ่ม Day / Week / Month ทุก Tier | ปัจจุบันมี hardstand/repair แบบรายเดือนเป็นหลัก |
| Yacht monohull storage | 35/ft/day, 220/ft/week, 790/ft/30 days | 30/ft/day, ไม่มี weekly, 525/ft/month |
| Yacht monohull haul + launch | 350/ft/round trip, Capacity Review | Effective 315/ft; Full 420/ft ใน v3.6 |
| Large speedboat 51–60 ft | สูตร 1,500 + 50 × (LOA−50) ต่อวัน พร้อมตัวอย่าง 51/55/60 ft | ไม่มีสูตร v3.7; ใช้ W4/B1 และรายการเดิม 48–55 ft |
| Fishing boat ≤15 ft | Ramp self-tow paired up+down 500; Storage 30 วัน 3,000 | `RAMP_FISHING` ราคา 0 และไม่มี monthly code ที่ตรงกัน |
| Tow truck | With ORM follow-on 1,500; standalone 2,500 | มีราคา 1,500/2,500 แต่แยกตาม mini/big truck และช่วงเวลา ขอบเขตไม่ตรงกัน |
| Trailer rental | 2,500/day | `TRAILER_GENERAL` 2,500/day ราคาเท่ากัน แต่รหัสต่างกัน; `TRAILER_REPAIR` 3,000/day ยังเป็นอีก scope |

## รายการที่ห้ามเปิดใช้อัตโนมัติ

- Ramp และ Haul-Out ของ Speedboat/Cruiser ที่สถานะ `V35_*_REVIEW` ยังไม่ใช่ราคาอนุมัติสำหรับ deploy
- Speedboat Tier 4 Ramp/Haul เป็น `MANAGER_REVIEW_NOT_AUTOPRICED`
- Power/Sailing Catamaran เป็น Manager Review ตาม beam/weight/capacity
- Sport & Cruiser 2 outboards 41–42 ft เป็น `PROPOSED_EXTENSION_REVIEW`
- Boat stand 3 รายการเป็น `REVIEW` และค่าที่ workbook cache แสดง 3,780 / 13,500 / 600 ไม่สอดคล้องกับ Pricing Master ปัจจุบัน 150 / 500 / 700 จึงต้องแก้สูตร/ยืนยันราคาใน workbook ก่อนนำเข้า

## ข้อเสนอแนะก่อน Migration

1. อนุมัติ mapping รหัส v3.7 → รหัสเดิมหรือรหัส canonical ใหม่
2. ยืนยันว่าจะยกเลิก W4/B1 slot pricing หรือเก็บเป็น exception เพราะ v3.7 ใช้ LOA formula
3. แก้และอนุมัติรายการ Ramp/Haul/Boat Stand ที่ยังเป็น Review
4. ทำ staging migration แบบ versioned โดยไม่แก้ quotation/invoice เก่า และเก็บ rate snapshot เดิม
5. รัน regression test เรื่องไม่คิด Dry Storage + Service Yard ซ้ำ และ Tow/Trailer แยกจาก Ramp/Haul

การตรวจครั้งนี้ไม่มีการแก้ข้อมูล Pricing Master หรือฐานข้อมูลใด ๆ
