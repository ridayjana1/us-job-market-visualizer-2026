"""Parsers for the public BLS bulk releases.

Two products, two flat files:

  OEWS national  – ``oesmYYnat.zip`` -> ``national_MYYYY_dl.xlsx``
      One row per occupation (and per aggregate group). We keep the
      ``detailed`` rows and read employment + the wage distribution.

  Employment Projections – ``occupational-projections-and-characteristics
      .xlsx`` (Table 1.2). One row per occupation with 10-year growth,
      annual openings, and typical entry-level education.

Both files use text sentinels for suppressed/withheld cells:
    ``*``  estimate not released        -> NaN
    ``**`` wage not released            -> NaN
    ``#``  wage at or above the annual cap (e.g. >= $239,200) -> capped
    ``~``  rounds to zero               -> 0

Everything is keyed on the canonical SOC-2018 code via ``normalize_soc``.
"""
from __future__ import annotations

import re
import zipfile
from pathlib import Path

import pandas as pd

from config import RAW_DIR, normalize_education
from normalize_soc import canonical_soc

# BLS publishes the top-coded annual wage as the cap value in the data
# dictionary; May 2023/2024 use $239,200. Cells marked ``#`` are mapped to
# this so high-earning occupations keep a usable (if floored) figure.
HIGH_WAGE_CAP = 239200

_NUM_RE = re.compile(r"[-+]?\d*\.?\d+")


def _to_num(val: object, *, cap: bool = False) -> float | None:
    """Coerce a BLS cell to a number, honouring suppression sentinels."""
    if val is None:
        return None
    s = str(val).strip().replace(",", "").replace("$", "")
    if s in ("", "*", "**", "N/A", "n/a", "nan", "NaN"):
        return None
    if s == "#":
        return float(HIGH_WAGE_CAP) if cap else None
    if s == "~":
        return 0.0
    m = _NUM_RE.search(s)
    return float(m.group()) if m else None


def _is_detailed_code(code: str) -> bool:
    """Detailed SOC occupations only - drop major/broad aggregates."""
    if not re.fullmatch(r"\d{2}-\d{4}", code):
        return False
    if code.endswith("0000") or code == "00-0000":
        return False
    return True


# ── OEWS ─────────────────────────────────────────────────────────────────

def _extract_oews(zip_path: Path) -> Path:
    """Extract the national OEWS workbook from the release zip."""
    target = RAW_DIR / "oews_extracted"
    target.mkdir(exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(target)
    candidates = sorted(target.rglob("*.xlsx"))
    if not candidates:
        candidates = sorted(target.rglob("*.xls"))
    if not candidates:
        raise FileNotFoundError(f"No OEWS workbook found inside {zip_path}")
    # Prefer the national "dl" data file if multiple are present.
    for c in candidates:
        if "nat" in c.name.lower() or "dl" in c.name.lower():
            return c
    return candidates[0]


def _col(df: pd.DataFrame, *names: str) -> str | None:
    """Resolve a column name case-insensitively from candidates."""
    lower = {c.lower(): c for c in df.columns}
    for n in names:
        if n.lower() in lower:
            return lower[n.lower()]
    return None


def read_oews(zip_path: Path) -> pd.DataFrame:
    """Parse OEWS national employment + wage data into a tidy frame."""
    workbook = _extract_oews(zip_path)
    raw = pd.read_excel(workbook, dtype=str)
    raw.columns = [str(c).strip() for c in raw.columns]

    c_code = _col(raw, "OCC_CODE", "occ_code")
    c_title = _col(raw, "OCC_TITLE", "occ_title")
    c_group = _col(raw, "O_GROUP", "o_group", "group")
    c_emp = _col(raw, "TOT_EMP", "tot_emp")
    c_mean = _col(raw, "A_MEAN", "a_mean")
    c_median = _col(raw, "A_MEDIAN", "a_median")
    c_p10 = _col(raw, "A_PCT10", "a_pct10")
    c_p25 = _col(raw, "A_PCT25", "a_pct25")
    c_p75 = _col(raw, "A_PCT75", "a_pct75")
    c_p90 = _col(raw, "A_PCT90", "a_pct90")
    if not (c_code and c_emp and c_median):
        raise ValueError(
            f"Unexpected OEWS schema; columns were: {list(raw.columns)[:20]}"
        )

    # Keep detailed occupations. When O_GROUP is present use it; otherwise
    # fall back to the code-shape heuristic.
    if c_group:
        raw = raw[raw[c_group].astype(str).str.lower() == "detailed"]

    rows = []
    for _, r in raw.iterrows():
        code = str(r[c_code]).strip()
        if not _is_detailed_code(code):
            continue
        rows.append(
            {
                "soc_code": canonical_soc(code),
                "title": str(r[c_title]).strip() if c_title else "",
                "employment": _to_num(r[c_emp]),
                "mean_wage": _to_num(r[c_mean], cap=True) if c_mean else None,
                "median_wage": _to_num(r[c_median], cap=True),
                "wage_p10": _to_num(r[c_p10], cap=True) if c_p10 else None,
                "wage_p25": _to_num(r[c_p25], cap=True) if c_p25 else None,
                "wage_p75": _to_num(r[c_p75], cap=True) if c_p75 else None,
                "wage_p90": _to_num(r[c_p90], cap=True) if c_p90 else None,
            }
        )
    df = pd.DataFrame(rows).drop_duplicates("soc_code")
    return df.reset_index(drop=True)


def detect_oews_year(zip_path: Path) -> int | None:
    m = re.search(r"oesm(\d{2})nat", zip_path.name)
    return 2000 + int(m.group(1)) if m else None


# ── Employment Projections (Table 1.2) ───────────────────────────────────

def _find_header_row(df: pd.DataFrame) -> int:
    """Locate the row that holds the real column headers."""
    for i in range(min(15, len(df))):
        joined = " ".join(str(x).lower() for x in df.iloc[i].tolist())
        if "matrix code" in joined or ("employment" in joined and "education" in joined):
            return i
    return 0


def read_projections(xlsx_path: Path) -> pd.DataFrame:
    """Parse EP Table 1.2 growth, openings, and typical education."""
    book = pd.ExcelFile(xlsx_path)
    sheet = next(
        (s for s in book.sheet_names if "1.2" in s or "occupation" in s.lower()),
        book.sheet_names[0],
    )
    probe = pd.read_excel(xlsx_path, sheet_name=sheet, header=None, dtype=str, nrows=15)
    header_row = _find_header_row(probe)
    df = pd.read_excel(xlsx_path, sheet_name=sheet, header=header_row, dtype=str)
    df.columns = [re.sub(r"\s+", " ", str(c)).strip() for c in df.columns]

    def find(*subs: str) -> str | None:
        for c in df.columns:
            cl = c.lower()
            if all(s in cl for s in subs):
                return c
        return None

    c_code = find("matrix", "code") or find("soc", "code") or find("code")
    c_title = find("matrix", "title") or find("title")
    c_growth = find("change", "percent") or find("percent", "change")
    c_open = find("openings")
    c_edu = find("entry-level", "education") or find("typical", "education")
    c_base = find("employment", "2023") or find("employment", "2024")
    c_proj = find("employment", "2033") or find("employment", "2034")
    if not c_code:
        raise ValueError(f"EP code column not found in: {list(df.columns)[:20]}")

    rows = []
    for _, r in df.iterrows():
        code = str(r[c_code]).strip()
        if not _is_detailed_code(code):
            continue
        rows.append(
            {
                "soc_code": canonical_soc(code),
                "title_ep": str(r[c_title]).strip() if c_title else "",
                "growth_rate": _to_num(r[c_growth]) if c_growth else None,
                "annual_openings": _to_num(r[c_open]) if c_open else None,
                "education": normalize_education(r[c_edu]) if c_edu else None,
                "base_employment": _to_num(r[c_base]) if c_base else None,
                "projected_employment": _to_num(r[c_proj]) if c_proj else None,
            }
        )
    out = pd.DataFrame(rows).drop_duplicates("soc_code")
    # EP employment is in thousands; scale to persons for consistency.
    for col in ("base_employment", "projected_employment", "annual_openings"):
        if col in out:
            out[col] = out[col] * 1000
    return out.reset_index(drop=True)
