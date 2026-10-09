#!/usr/bin/env python3
"""Convert docs/07-fc-chief-engineer-pilot-manual.md into a formatted
Word document (docs/07-fc-chief-engineer-pilot-manual.docx).

Usage:
    python docs/build_manual_docx.py

Only this file and the manual/changelog markdown files are touched by this
task; no application code is modified.
"""
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, RGBColor

# Environment-agnostic path resolution: __file__ is not guaranteed to exist
# in every execution context (e.g. some REPL / packaged environments).
ROOT = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()
SOURCE = ROOT / "07-fc-chief-engineer-pilot-manual.md"
OUTPUT = ROOT / "07-fc-chief-engineer-pilot-manual.docx"

FONT_NAME = "Arial"  # Thai/English compatible
NAVY = RGBColor(0x1F, 0x2D, 0x50)
LIGHT_ROW = RGBColor(0xEA, 0xEE, 0xF6)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

TITLE_LINES = [
    "คู่มือทดลองใช้ Marina MMS",
    "สำหรับ FC และ Chief Engineer",
    "Vercel Preview และ Supabase Staging",
    "ฉบับล่าสุด วันที่ 14 กันยายน 2026",
]


def set_run_font(run, size=11, bold=None, color=None):
    """Apply the document font to a run without clobbering bold state.

    bold=None means "leave whatever bold state the run already has" so a
    later styling pass never overwrites bold runs created during markdown
    parsing. Pass bold=True/False explicitly to force a value.
    """
    run.font.name = FONT_NAME
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    rfonts.set(qn("w:ascii"), FONT_NAME)
    rfonts.set(qn("w:hAnsi"), FONT_NAME)
    rfonts.set(qn("w:eastAsia"), FONT_NAME)
    rfonts.set(qn("w:cs"), FONT_NAME)
    run.font.size = Pt(size)
    if bold is not None:
        run.font.bold = bold
    if color is not None:
        run.font.color.rgb = color


BOLD_RE = re.compile(r"\*\*(.+?)\*\*")


def add_markdown_runs(paragraph, text, size=11, bold=None, color=None):
    """Split text on **bold** markers and add runs, preserving bold spans.

    bold=None lets each segment's own markdown-derived bold flag stand;
    pass bold=True/False to force every segment to that state instead.
    """
    pos = 0
    for match in BOLD_RE.finditer(text):
        if match.start() > pos:
            run = paragraph.add_run(text[pos:match.start()])
            set_run_font(run, size=size, bold=bold if bold is not None else False, color=color)
        run = paragraph.add_run(match.group(1))
        set_run_font(run, size=size, bold=bold if bold is not None else True, color=color)
        pos = match.end()
    if pos < len(text):
        run = paragraph.add_run(text[pos:])
        set_run_font(run, size=size, bold=bold if bold is not None else False, color=color)


def style_paragraph(paragraph, size=11, bold=None, color=None, align=None):
    """Apply font styling to every run already in a paragraph.

    bold=None (default) leaves each run's existing bold flag untouched, so
    a styling pass after markdown parsing cannot silently strip bold runs
    that add_markdown_runs already created.
    """
    for run in paragraph.runs:
        set_run_font(run, size=size, bold=bold if bold is not None else run.font.bold, color=color)
    if align is not None:
        paragraph.alignment = align


def set_cell_shading(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tc_pr.append(shd)


def set_table_borders(table):
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "888888")
        borders.append(el)
    tbl_pr.append(borders)


def add_title_page(doc):
    for _ in range(4):
        doc.add_paragraph()
    for i, line in enumerate(TITLE_LINES):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(line)
        set_run_font(run, size=26 if i == 0 else 16, bold=(i == 0), color=NAVY)
    doc.add_page_break()


def add_footer(doc):
    section = doc.sections[0]
    footer = section.footer
    p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Marina MMS Pilot Manual | Internal Training Use")
    set_run_font(run, size=9, bold=False, color=RGBColor(0x60, 0x60, 0x60))


def setup_margins(doc):
    for section in doc.sections:
        section.top_margin = Cm(2.0)
        section.bottom_margin = Cm(2.0)
        section.left_margin = Cm(2.2)
        section.right_margin = Cm(2.2)


def parse_table_block(lines, start):
    """Parse a contiguous markdown table starting at lines[start]. Returns
    (rows, next_index)."""
    rows = []
    i = start
    while i < len(lines) and lines[i].strip().startswith("|"):
        row_line = lines[i].strip()
        if re.match(r"^\|?\s*:?-{2,}", row_line.replace("|", "", 1)) and set(
            row_line.replace("|", "").replace("-", "").replace(":", "").strip()
        ) == set():
            i += 1
            continue
        cells = [c.strip() for c in row_line.strip("|").split("|")]
        rows.append(cells)
        i += 1
    return rows, i


def render_table(doc, rows):
    if not rows:
        return
    table = doc.add_table(rows=len(rows), cols=len(rows[0]))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    set_table_borders(table)
    for r, row in enumerate(rows):
        for c, cell_text in enumerate(row):
            if c >= len(table.columns):
                continue
            cell = table.cell(r, c)
            cell.text = ""
            p = cell.paragraphs[0]
            add_markdown_runs(p, cell_text, size=10, bold=(True if r == 0 else None))
            if r == 0:
                set_cell_shading(cell, "1F2D50")
                for run in p.runs:
                    run.font.color.rgb = WHITE
            elif r % 2 == 0:
                set_cell_shading(cell, "EAEEF6")
    doc.add_paragraph()


CHECKBOX_RE = re.compile(r"^-\s*\[( |x|X)\]\s+(.*)$")
HEADING_RE = re.compile(r"^(#{1,4})\s+(.*)$")
BULLET_RE = re.compile(r"^[-*]\s+(.*)$")
NUM_RE = re.compile(r"^\d+\.\s+(.*)$")
QUOTE_RE = re.compile(r"^>\s?(.*)$")


def build_document():
    if not SOURCE.exists():
        print(f"ERROR: source file not found: {SOURCE}", file=sys.stderr)
        sys.exit(1)

    text = SOURCE.read_text(encoding="utf-8")
    lines = text.splitlines()

    doc = Document()
    setup_margins(doc)
    add_footer(doc)

    style = doc.styles["Normal"]
    style.font.name = FONT_NAME
    style.font.size = Pt(11)

    add_title_page(doc)

    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped.startswith("|"):
            rows, i = parse_table_block(lines, i)
            render_table(doc, rows)
            continue

        heading_match = HEADING_RE.match(stripped)
        if heading_match:
            level = len(heading_match.group(1))
            content = heading_match.group(2).strip()
            p = doc.add_heading(level=min(level, 4))
            add_markdown_runs(p, content, size=max(20 - level * 2, 12), bold=True, color=NAVY)
            i += 1
            continue

        quote_match = QUOTE_RE.match(stripped)
        if quote_match:
            quote_lines = []
            while i < n and QUOTE_RE.match(lines[i].strip()):
                quote_lines.append(QUOTE_RE.match(lines[i].strip()).group(1))
                i += 1
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(1.0)
            add_markdown_runs(p, " ".join(quote_lines), size=11, bold=None)
            for run in p.runs:
                run.font.italic = True
            continue

        checkbox_match = CHECKBOX_RE.match(stripped)
        if checkbox_match:
            checked = checkbox_match.group(1).lower() == "x"
            box = "☑" if checked else "☐"
            p = doc.add_paragraph(style="List Bullet")
            run = p.add_run(f"{box} ")
            set_run_font(run, size=11, bold=False)
            add_markdown_runs(p, checkbox_match.group(2), size=11, bold=None)
            i += 1
            continue

        bullet_match = BULLET_RE.match(stripped)
        if bullet_match:
            p = doc.add_paragraph(style="List Bullet")
            add_markdown_runs(p, bullet_match.group(1), size=11, bold=None)
            i += 1
            continue

        num_match = NUM_RE.match(stripped)
        if num_match:
            p = doc.add_paragraph(style="List Number")
            add_markdown_runs(p, num_match.group(1), size=11, bold=None)
            i += 1
            continue

        if stripped in ("---", "***", "___"):
            i += 1
            continue

        p = doc.add_paragraph()
        add_markdown_runs(p, stripped, size=11, bold=None)
        i += 1

    doc.save(OUTPUT)
    print(f"OK: wrote {OUTPUT}")


if __name__ == "__main__":
    build_document()
