import json
from pathlib import Path

from pypdf import PdfReader


BASE = Path(r"G:\My Drive\Ocean Rover Marina\Marketing\Ocean rover marina fee\customer list\Hardstand service\Short period")
FILES = [
    "INV040 RS4 engine.pdf",
    "INV041 Maruza.pdf",
    "INV044 happy samui revised 2 on 05052569.pdf",
    "INV047 Princess42 3rd.pdf",
    "INV0241 Jackie 03112025 .pdf",
    "Quo044 happy samui.pdf",
    "Quo045 Saxdor400.pdf",
    "Quo049 เพชรอ่าวไทย.pdf",
    "Samui siam quotation 27042025.pdf",
    "INV029 Nimbus11.pdf",
    "INV030 Saard watersport.pdf",
    "Inv031 Ocean elites.pdf",
    "Inv032 Maruza.pdf",
    "Inv034 Ap marine.pdf",
    "INV036 Nimbus.pdf",
    "INV037 Papa Ross.pdf",
]


def extract_text(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages)


records = []
for name in FILES:
    path = BASE / name
    if not path.exists():
        records.append({"file": name, "missing": True, "text": ""})
        continue
    text = extract_text(path)
    records.append({"file": name, "missing": False, "text": text})

out = Path("tmp-short-period-pdf-text.json")
out.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {out} ({len(records)} records)")
