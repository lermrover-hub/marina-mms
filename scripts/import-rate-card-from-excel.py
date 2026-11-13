from __future__ import annotations

import argparse
import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from openpyxl import load_workbook


SECTION_CATEGORY_MAP = {
    "RAMP ACCESS": "Ramp Access",
    "HAUL-OUT": "Haul-out",
    "TOWING TRUCK": "Towing Truck Cost",
    "YARD SERVICES": "Yard Services",
    "STORAGE - SPEEDBOAT": "Storage - Speedboat",
    "STORAGE - SMALL CRAFT": "Storage - Small Craft",
    "REPAIR YARD OCCUPANCY": "Repair Yard",
    "WASH & CLEANING": "Wash & Cleaning",
    "UTILITIES": "Utilities",
    "WET BERTH": "Wet Berth",
    "OT / AFTER-HOURS": "OT / After-Hours Labor",
    "VAT & DISCOUNTS": "VAT & Discounts",
    "ADDITIONAL RATES": "Additional Rates",
    "PAINT SERVICES": "Paint Services",
}


DEFAULT_WORKBOOK = (
    r"G:\My Drive\01 AI COMMAND CENTER\02_OCEAN_ROVER_MARINA\00_MASTER\ARCHIVE_AI_DOC\pricing"
    r"\ORM_Quote_Tidal_v3_5_Updated.xlsx"
)
DEFAULT_COST_REFERENCE = (
    r"G:\My Drive\02_COMMAND_CENTER06_ARCHIVE_ORIGINAL_FILES\Ocean Rover Marina\Ai doc\pricing"
    r"\ORM_Quote_Tidal_v3_4_Rate_Audit_Updated repair.xlsx"
)


def sql(value: object) -> str:
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def normalize_unit(value: object) -> str:
    unit = str(value or "").strip()
    if unit.lower().startswith("thb/"):
        unit = unit[4:]
    return unit or "unit"


def parse_category(section: str) -> str:
    normalized = (
        section.replace("\n", " ")
        .replace("â€”", "-")
        .replace("—", "-")
        .strip()
    )
    for marker, category in SECTION_CATEGORY_MAP.items():
        if marker in normalized:
            return category
    cleaned = re.sub(r"^[-─]+\s*[A-Z0-9.]+\s*", "", normalized)
    return cleaned.split("-")[0].strip().title() or "Other"


def parse_decimal(value: object) -> Decimal:
    if value is None:
        raise ValueError("missing decimal value")
    return Decimal(str(value).replace(",", "").strip())


def parse_optional_decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    text = str(value).replace(",", "").strip()
    if not text:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def is_section_marker(value: str) -> bool:
    return value.startswith("──") or value.startswith("--") or value.startswith("══")


def normalize_header(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\n", " ").strip()).upper()


def locate_header(sheet) -> tuple[int, dict[str, int]]:
    for row_number in range(1, min(sheet.max_row, 12) + 1):
        values = [sheet.cell(row_number, column).value for column in range(1, sheet.max_column + 1)]
        headers = {normalize_header(value): index for index, value in enumerate(values) if value is not None}
        if "CODE" in headers and "SERVICE (EN)" in headers:
            return row_number, headers
    raise ValueError("RATES header row with CODE and SERVICE (EN) was not found")


def value_for(values: list[object], headers: dict[str, int], *names: str) -> object:
    for name in names:
        index = headers.get(normalize_header(name))
        if index is not None and index < len(values):
            return values[index]
    return None


def percentage_points(value: Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0")
    return value * 100 if abs(value) <= 1 else value


def load_rate_rows(workbook_path: Path) -> tuple[str, list[dict[str, object]]]:
    workbook = load_workbook(workbook_path, data_only=True, read_only=True)
    sheet_name = "RATES" if "RATES" in workbook.sheetnames else "Rate"
    sheet = workbook[sheet_name]
    rows: list[dict[str, object]] = []
    category = "Other"
    header_row, headers = locate_header(sheet)
    source_title = str(sheet.cell(1, 1).value or workbook_path.stem)
    version_match = re.search(r"ORM-PRICE-[^|\s]+", source_title)
    source_version = version_match.group(0) if version_match else workbook_path.stem

    for row_number in range(header_row + 1, sheet.max_row + 1):
        values = [sheet.cell(row_number, column).value for column in range(1, sheet.max_column + 1)]
        code = str(value_for(values, headers, "CODE") or "").strip()
        if not code:
            continue
        if is_section_marker(code):
            category = parse_category(code)
            continue

        service_en = str(value_for(values, headers, "SERVICE (EN)") or "").strip()
        if not service_en or service_en.upper() == "SERVICE (EN)":
            continue

        service_th_value = value_for(values, headers, "บริการ (TH)")
        service_th = str(service_th_value).strip() if service_th_value else None
        vessel_value = value_for(values, headers, "VESSEL TYPE")
        vessel_type = str(vessel_value).strip() if vessel_value else None
        source_unit_value = value_for(values, headers, "UNIT")
        source_unit = str(source_unit_value).strip() if source_unit_value else None
        unit = normalize_unit(source_unit)
        full_rate = parse_decimal(value_for(values, headers, "FULL RATE (THB)", "FULL RATE", "RATE (THB)", "RATE"))
        source_discount_pct = percentage_points(parse_optional_decimal(value_for(values, headers, "OPENING DISC %")))
        source_current_rate = parse_optional_decimal(
            value_for(values, headers, "CURRENT RATE (THB)", "CURRENT RATE")
        )
        # Column F (FULL RATE) is the operational selling price. The workbook's
        # opening discount/current-rate columns remain source references only.
        operational_rate = full_rate
        direct_cost = parse_optional_decimal(value_for(values, headers, "DIRECT COST (THB)", "DIRECT COST"))
        gl_value = value_for(values, headers, "GL", "REVENUE GL")
        gl = str(gl_value).strip() if gl_value else None
        pnl_value = value_for(values, headers, "P&L CATEGORY", "REVENUE P&L CATEGORY")
        pnl_category = str(pnl_value).strip() if pnl_value else None
        source_note_value = value_for(values, headers, "NOTES / VERSION", "SOURCE NOTE", "NOTES")
        source_note = str(source_note_value).strip() if source_note_value else None
        audit_value = value_for(values, headers, "AUDIT REMARK")
        audit_remark = str(audit_value).strip() if audit_value else None
        cost_basis_value = value_for(values, headers, "COST BASIS")
        cost_basis = str(cost_basis_value).strip() if cost_basis_value else None
        cost_gl_value = value_for(values, headers, "COST GL")
        cost_gl = str(cost_gl_value).strip() if cost_gl_value else None
        cost_pnl_value = value_for(values, headers, "COST P&L CATEGORY")
        cost_pnl_category = str(cost_pnl_value).strip() if cost_pnl_value else None
        rate_check_value = value_for(values, headers, "RATE CHECK")
        rate_check = str(rate_check_value).strip() if rate_check_value else None
        calc_type_value = value_for(values, headers, "CALC_TYPE")
        service_group_value = value_for(values, headers, "SERVICE GROUP")
        subgroup_value = value_for(values, headers, "SUBGROUP")
        provider_value = value_for(values, headers, "PROVIDER TYPE")
        quote_allowed_value = value_for(values, headers, "QUOTE ALLOWED")
        price_status_value = value_for(values, headers, "PRICE STATUS")

        description_parts = []
        if vessel_type:
            description_parts.append(f"Vessel: {vessel_type}")
        if gl:
            description_parts.append(f"GL: {gl}")
        if pnl_category:
            description_parts.append(f"P&L: {pnl_category}")
        if source_unit:
            description_parts.append(f"Source unit: {source_unit}")
        description_parts.append(f"Source workbook: {workbook_path.name}")
        description_parts.append("Operational rate imported from FULL RATE (THB), column F")

        note_parts = [part for part in [source_note, audit_remark, rate_check] if part]
        note_parts.append(f"Full rate: {full_rate}")
        if source_current_rate is not None:
            note_parts.append(f"Source current rate (reference only): {source_current_rate}")
        note_parts.append(f"Source opening discount: {source_discount_pct}%")
        if direct_cost is not None:
            note_parts.append(f"Direct cost: {direct_cost}")
        if cost_basis:
            note_parts.append(f"Cost basis: {cost_basis}")
        if cost_gl:
            note_parts.append(f"Cost GL: {cost_gl}")
        if cost_pnl_category:
            note_parts.append(f"Cost P&L: {cost_pnl_category}")

        rows.append(
            {
                "code": code,
                "service_en": service_en,
                "service_th": service_th,
                "category": category,
                "unit": unit,
                "rate": operational_rate,
                "full_rate": full_rate,
                "discount_pct": Decimal("0"),
                "source_discount_pct": source_discount_pct,
                "direct_cost": direct_cost,
                "revenue_gl_code": gl,
                "cost_gl_code": cost_gl,
                "pnl_category": pnl_category,
                "cost_pnl_category": cost_pnl_category,
                "cost_basis": cost_basis,
                "calc_type": str(calc_type_value or "FLAT_QTY").strip(),
                "service_group": str(service_group_value).strip() if service_group_value else None,
                "subgroup": str(subgroup_value).strip() if subgroup_value else None,
                "provider_type": str(provider_value).strip() if provider_value else None,
                "quote_allowed": str(quote_allowed_value or "YES").strip(),
                "price_status": str(price_status_value or "ACTIVE").strip(),
                "source_version": source_version,
                "description": " | ".join(description_parts) or None,
                "notes": " | ".join(note_parts) or None,
            }
        )

    return sheet_name, rows


def build_sql(
    workbook_path: Path,
    output_path: Path,
    json_path: Path,
    cost_reference_path: Path | None = None,
    deactivate_missing: bool = False,
) -> int:
    sheet_name, rows = load_rate_rows(workbook_path)

    if cost_reference_path:
        _, cost_reference_rows = load_rate_rows(cost_reference_path)
        cost_reference_by_code = {row["code"]: row for row in cost_reference_rows}
        matched = 0
        for row in rows:
            reference = cost_reference_by_code.get(row["code"])
            if not reference:
                continue
            matched += 1
            for field in ("direct_cost", "cost_gl_code", "cost_pnl_category", "cost_basis"):
                if row[field] is None:
                    row[field] = reference[field]
            reference_note = f"Cost metadata reference: {cost_reference_path.name}"
            row["notes"] = " | ".join(part for part in [row["notes"], reference_note] if part)
        print(f"Matched cost metadata for {matched}/{len(rows)} rows from {cost_reference_path.name}")

    active_codes = ", ".join(sql(row["code"]) for row in rows)
    value_lines = []
    for row in rows:
        value_lines.append(
            "("
            + ", ".join(
                [
                    "gen_random_uuid()",
                    sql(row["code"]),
                    sql(row["service_en"]),
                    sql(row["service_th"]),
                    sql(row["category"]),
                    sql(row["unit"]),
                    str(row["rate"]),
                    str(row["full_rate"]),
                    str(row["discount_pct"]),
                    str(row["source_discount_pct"]),
                    str(row["direct_cost"]) if row["direct_cost"] is not None else "NULL",
                    sql(row["revenue_gl_code"]),
                    sql(row["cost_gl_code"]),
                    sql(row["pnl_category"]),
                    sql(row["cost_pnl_category"]),
                    sql(row["cost_basis"]),
                    sql(row["calc_type"]),
                    sql(row["service_group"]),
                    sql(row["subgroup"]),
                    sql(row["provider_type"]),
                    sql(row["quote_allowed"]),
                    sql(row["price_status"]),
                    sql(row["source_version"]),
                    sql(row["description"]),
                    sql(row["notes"]),
                    "false" if row["price_status"] == "INACTIVE" else "true",
                    sql("rate-card-import"),
                    "NULL",
                    "NULL",
                    "NOW()",
                    "NOW()",
                ]
            )
            + ")"
        )

    deactivation_sql = (
        "UPDATE pricing_master\n"
        "SET is_active = false, price_status = 'INACTIVE', updated_at = NOW(), updated_by = 'rate-card-import'\n"
        f"WHERE code NOT IN ({active_codes});"
        if deactivate_missing
        else "-- Missing database codes are preserved. Use --deactivate-missing only after reviewing the diff."
    )

    output = f"""-- Generated from {workbook_path.name}, sheet {sheet_name}
-- Operational rate_thb is imported from FULL RATE (THB), column F.
-- Operational discount_pct is deliberately 0%. Source opening discounts and current rates are informational only.
{deactivation_sql}

INSERT INTO pricing_master (
  id, code, service_name_en, service_name_th, category, unit, rate_thb,
  full_rate_thb, discount_pct, source_discount_pct, direct_cost_thb,
  revenue_gl_code, cost_gl_code, pnl_category, cost_pnl_category, cost_basis,
  calc_type, service_group, subgroup, provider_type, quote_allowed, price_status,
  source_version, description, notes, is_active, updated_by, approved_by,
  approved_at, created_at, updated_at
)
VALUES
{",\n".join(value_lines)}
ON CONFLICT (code) DO UPDATE SET
  service_name_en = EXCLUDED.service_name_en,
  service_name_th = EXCLUDED.service_name_th,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  rate_thb = EXCLUDED.rate_thb,
  full_rate_thb = EXCLUDED.full_rate_thb,
  discount_pct = 0,
  source_discount_pct = EXCLUDED.source_discount_pct,
  direct_cost_thb = EXCLUDED.direct_cost_thb,
  revenue_gl_code = EXCLUDED.revenue_gl_code,
  cost_gl_code = EXCLUDED.cost_gl_code,
  pnl_category = EXCLUDED.pnl_category,
  cost_pnl_category = EXCLUDED.cost_pnl_category,
  cost_basis = EXCLUDED.cost_basis,
  calc_type = EXCLUDED.calc_type,
  service_group = EXCLUDED.service_group,
  subgroup = EXCLUDED.subgroup,
  provider_type = EXCLUDED.provider_type,
  quote_allowed = EXCLUDED.quote_allowed,
  price_status = EXCLUDED.price_status,
  source_version = EXCLUDED.source_version,
  description = EXCLUDED.description,
  notes = EXCLUDED.notes,
  is_active = EXCLUDED.is_active,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();
    """
    output_path.write_text(output, encoding="utf-8")
    json_path.write_text(
        json.dumps(rows, ensure_ascii=False, default=str, indent=2),
        encoding="utf-8",
    )
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", nargs="?", default=DEFAULT_WORKBOOK)
    parser.add_argument("--cost-reference", default=DEFAULT_COST_REFERENCE)
    parser.add_argument("--out", default="scripts/import-rate-card.sql")
    parser.add_argument("--json-out", default="scripts/import-rate-card.json")
    parser.add_argument(
        "--deactivate-missing",
        action="store_true",
        help="Deactivate database codes absent from the workbook after an explicit diff review.",
    )
    args = parser.parse_args()

    count = build_sql(
        Path(args.workbook),
        Path(args.out),
        Path(args.json_out),
        cost_reference_path=Path(args.cost_reference) if args.cost_reference else None,
        deactivate_missing=args.deactivate_missing,
    )
    print(f"Wrote {count} rate-card rows to {args.out} and {args.json_out}")


if __name__ == "__main__":
    main()
