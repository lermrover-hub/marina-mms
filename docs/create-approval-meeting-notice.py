from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from pathlib import Path


OUT = Path(__file__).parent / "meetings" / "ORM_Marina_MMS_v3_7_Approval_Meeting_Notice.docx"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, color="D9D9D9", size="6"):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = "w:" + edge
        el = borders.find(qn(tag))
        if el is None:
            el = OxmlElement(tag)
            borders.append(el)
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), size)
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def set_run_font(run, name="Aptos", size=10.5, bold=False, color="000000"):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), name)
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)


def add_text(paragraph, text, bold=False, color="000000", size=10.5):
    run = paragraph.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color)
    return run


def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    p.paragraph_format.space_after = Pt(3)
    add_text(p, text)
    return p


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ""
        set_cell_shading(hdr[i], "0B2F5B")
        set_cell_border(hdr[i])
        set_cell_margins(hdr[i])
        hdr[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = hdr[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        add_text(p, h, bold=True, color="FFFFFF", size=9.4)
        if widths:
            hdr[i].width = Inches(widths[i])
    for row_i, row in enumerate(rows):
        cells = table.add_row().cells
        for i, value in enumerate(row):
            cells[i].text = ""
            set_cell_border(cells[i])
            set_cell_margins(cells[i])
            set_cell_shading(cells[i], "F5F8FB" if row_i % 2 else "FFFFFF")
            cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cells[i].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            add_text(p, str(value), size=9.2)
            if widths:
                cells[i].width = Inches(widths[i])
    return table


doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.62)
section.bottom_margin = Inches(0.62)
section.left_margin = Inches(0.68)
section.right_margin = Inches(0.68)

styles = doc.styles
styles["Normal"].font.name = "Aptos"
styles["Normal"]._element.rPr.rFonts.set(qn("w:eastAsia"), "Aptos")
styles["Normal"].font.size = Pt(10.5)
for style_name, size in (("Title", 20), ("Heading 1", 14), ("Heading 2", 11.5)):
    s = styles[style_name]
    s.font.name = "Aptos Display" if style_name == "Title" else "Aptos"
    s._element.rPr.rFonts.set(qn("w:eastAsia"), s.font.name)
    s.font.size = Pt(size)
    s.font.bold = True
    s.font.color.rgb = RGBColor(0, 0, 0)

title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.LEFT
add_text(title, "ORM Marina MMS v3.7 Approval Meeting Notice", bold=True, size=20)

intro = doc.add_paragraph()
intro.paragraph_format.space_after = Pt(8)
add_text(intro, "วัตถุประสงค์: ", bold=True)
add_text(intro, "ขอประชุมเพื่อยืนยันเรทราคา ต้นทุน การเกษียณรายการซ้ำ กฎบัญชี และสิทธิ์อนุมัติก่อนเปิดใช้งาน Pricing v3.7 ในงานจริง โดยใช้ Staging/Preview เป็นหลักฐานประกอบ และยังไม่เปลี่ยน Production")

doc.add_heading("รายละเอียดการประชุม", level=1)
add_table(doc, ["รายการ", "รายละเอียด"], [
    ("วันและเวลา", "รอยืนยัน"),
    ("สถานที่หรือช่องทาง", "รอยืนยัน"),
    ("ประธานการประชุม", "รอยืนยันโดยผู้บริหารโครงการ"),
    ("ผู้บันทึก", "รอยืนยัน"),
    ("ขอบเขต", "ORM Marina MMS v3.7, Pricing Master, Quotation, Recurring Billing, Finance และ Operational Approval"),
], widths=[1.75, 5.65])

doc.add_heading("ผู้เข้าร่วมตามตำแหน่ง", level=1)
add_table(doc, ["ลำดับ", "ตำแหน่ง", "บทบาทในการประชุม"], [
    ("1", "Project developer", "นำเสนอ implementation, rate mode, test evidence และรายการที่ต้องแก้"),
    ("2", "Group Chief engineer", "ยืนยันข้อจำกัดอุปกรณ์ น้ำหนัก ความยาวเรือ และการยก/ลาก"),
    ("3", "Financial control", "อนุมัติราคา ต้นทุน ส่วนลด margin และการจัดหมวดต้นทุน"),
    ("4", "Accounting auditor", "ตรวจ VAT, invoice, recurring billing, payment และการปิดบัญชี"),
    ("5", "Boat yard manager", "ยืนยันช่องจอด ความพร้อมพื้นที่ และ manager review หน้างาน"),
    ("6", "Reservation officer", "ยืนยันข้อมูลลูกค้า เรือ ใบเสนอราคา การแจ้งเตือน และการจอง"),
], widths=[0.55, 1.75, 5.1])

doc.add_heading("หัวข้อที่ต้องขออนุมัติหรือยืนยัน", level=1)
approval_rows = [
    ("A1", "Canonical rate set", "ยืนยัน v3.7 จำนวน 126 rate codes เป็นชุดอ้างอิงหลัก", "Financial control + Accounting auditor", "รออนุมัติ"),
    ("A2", "Full rate / Pilot rate", "ให้ Project developer เลือกโหมดผ่านการตั้งค่าระบบ; controlled pilot ใช้ Pilot เป็นค่าเริ่มต้น", "Project developer; แจ้ง Financial control", "หลักการกำหนดแล้ว"),
    ("A3", "Tier 3 / Tier 4", "Tier 3 = 41–50 ft, Tier 4 = 51–60 ft; Tier 4 ไม่ใช่ operational approval", "Group Chief engineer + Boat yard manager", "รอยืนยัน"),
    ("A4", "Direct cost and outsourced cost", "แยกแรงงาน วัสดุ ผู้รับเหมา รถลาก เครน และค่าใช้จ่ายพิเศษ ไม่รวมซ้ำ", "Financial control + Accounting auditor", "รออนุมัติ"),
    ("A5", "Duplicate and legacy rates", "ยืนยันการเกษียณ legacy active 39 รายการ; ไม่ลบข้อมูลที่ถูกอ้างอิงในเอกสารเก่า", "Financial control + Accounting auditor", "รอรับรอง"),
    ("A6", "Recurring billing basis", "ใช้ Calendar month สำหรับ SPACE_LEASE; repair hold 30 วันใช้เฉพาะ workflow ที่ระบุ", "Accounting auditor + Financial control", "หลักการกำหนดแล้ว"),
    ("A7", "Wet berth", "ปิดการเสนอราคาและการออกบิลจนกว่าจะเปิดบริการจริง", "Boat yard manager + Financial control", "หลักการกำหนดแล้ว"),
    ("A8", "Tide delay relief", "ไม่มี waiver อัตโนมัติ หากจำเป็นให้ใช้ส่วนลดที่มีอำนาจอนุมัติและบันทึกเหตุผล", "Boat yard manager + Financial control", "หลักการกำหนดแล้ว"),
    ("A9", "P&L and GL mapping", "ยืนยัน mapping รายได้ VAT ต้นทุนงาน และรายการที่ยังไม่ mapped ก่อนปิดเดือนจริง", "Financial control + Accounting auditor", "รออนุมัติ"),
    ("A10", "Payment and account close", "ยืนยันหลักฐานรับเงิน สถานะ PAID ยอดคงเหลือศูนย์ และการส่งต่อ Work Order", "Accounting auditor + Reservation officer", "รอรับรอง"),
]
add_table(doc, ["ID", "หัวข้อ", "ข้อเสนอหรือหลักฐาน", "ผู้อนุมัติหลัก", "สถานะ"], approval_rows, widths=[0.45, 1.45, 3.25, 1.55, 0.7])

doc.add_heading("ประเด็นที่ต้องตรวจในที่ประชุม", level=1)
for item in [
    "Rate ที่เลือกต้องมีสถานะอนุญาตให้ออกใบเสนอราคา และรายการ MANUAL หรือ MANAGER REVIEW ต้องไม่ถูกคิดอัตโนมัติ",
    "เรือเกินขีดความสามารถมาตรฐาน 12 ตัน หรืออยู่นอกพื้นที่ที่ยืนยันแล้ว ต้องส่ง manual handling assessment",
    "ห้ามคิดค่าจอด รถลาก ขาตั้ง haul-out หรือบริการที่รวมอยู่แล้วซ้ำกัน",
    "ใบเสนอราคาและใบแจ้งหนี้เดิมต้องคงราคา snapshot เดิม ไม่ถูก re-price ย้อนหลัง",
    "P&L Preview ใช้เพื่อบริหารและตรวจสอบ ไม่ใช่การรับรองงบการเงินตามกฎหมาย",
    "ไม่เปิดใช้งาน Production จนกว่าจะมีมติอนุมัติและผู้รับผิดชอบลงชื่อครบ",
]:
    add_bullet(doc, item)

doc.add_heading("ผลลัพธ์ที่ต้องได้จากการประชุม", level=1)
add_table(doc, ["ผลลัพธ์", "ผู้รับผิดชอบ", "กำหนดส่ง"], [
    ("Approved rate list และ rate mode", "Project developer + Financial control", "หลังประชุม"),
    ("ต้นทุนและ GL/P&L mapping", "Financial control + Accounting auditor", "หลังประชุม"),
    ("รายการ duplicate/legacy ที่รับรองแล้ว", "Project developer + Accounting auditor", "หลังประชุม"),
    ("Operational capacity and slot approval", "Group Chief engineer + Boat yard manager", "หลังประชุม"),
    ("ขั้นตอน reservation และ customer quotation", "Reservation officer", "หลังประชุม"),
    ("มติอนุมัติเปิดใช้งาน Production หรือคง Preview", "ผู้มีอำนาจตามที่ประชุมกำหนด", "หลังตรวจครบ"),
], widths=[3.25, 2.45, 1.7])

doc.add_heading("เอกสารประกอบ", level=1)
for item in [
    "docs/pricing-v3.7/SOURCE_MANIFEST.md",
    "docs/handoffs/2026-11-04-phase-progress-and-decisions.md",
    "docs/pricing-v3.7/SERVICE_REQUEST_PRICING_AUDIT_2026-11-02.md",
    "Vercel Preview ของ branch codex/v37-catalog-admin",
]:
    add_bullet(doc, item)

closing = doc.add_paragraph()
closing.paragraph_format.space_before = Pt(8)
add_text(closing, "หมายเหตุการควบคุมความเสี่ยง: ", bold=True)
add_text(closing, "เอกสารนี้เป็นหนังสือแจ้งประชุมและ approval checklist ไม่ใช่คำสั่งเปิดใช้งาน Production การเปลี่ยนแปลงราคา ฐานข้อมูล การส่งข้อความลูกค้า หรือการรับเงินจริงต้องมีมติและผู้รับผิดชอบตามที่อนุมัติ")

doc.save(OUT)
print(OUT)
