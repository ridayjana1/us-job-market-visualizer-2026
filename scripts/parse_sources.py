"""Facade that joins the official BLS + O*NET parsers for build_dataset.

The heavy lifting lives in two focused modules:

  * ``bls_parse``  – OEWS employment/wages + Employment-Projections growth.
  * ``onet_parse`` – Skills, Knowledge, Work Activities (the AI-exposure task
    axes), and Job Zones.

This module exposes the small, stable surface ``build_dataset.py`` consumes
and assembles the per-SOC O*NET bundle (including the four real task axes)
that ``occupation_seed.build_official_record`` turns into exposure scores.

Requires pandas + openpyxl (see scripts/requirements.txt).
"""
from __future__ import annotations

from pathlib import Path

from config import RAW_DIR
import bls_parse
import onet_parse

# Raw file locations written by the fetch scripts.
OEWS_ZIP = RAW_DIR / "oews_national.zip"
EP_XLSX = RAW_DIR / "ep_occupation.xlsx"
ONET_ZIP = RAW_DIR / "onet_database.zip"


def parse_oews(zip_path: Path = OEWS_ZIP):
    """SOC-keyed DataFrame of employment + wage distribution."""
    return bls_parse.read_oews(zip_path)


def parse_projections(xlsx_path: Path = EP_XLSX):
    """SOC-keyed DataFrame of growth, openings, and typical education."""
    return bls_parse.read_projections(xlsx_path)


def parse_onet(zip_path: Path = ONET_ZIP) -> dict[str, dict]:
    """Return ``{soc_code: {skills, knowledge, axes, education, description}}``.

    ``axes`` holds the four real O*NET work-activity task axes
    (information / routine / manual / social) that drive AI exposure.
    """
    onet_dir = onet_parse.extract_onet(zip_path)

    axes_df = onet_parse.compute_work_axes(onet_dir)
    skills = onet_parse.top_elements(onet_dir, "Skills.txt", n=4)
    knowledge = onet_parse.top_elements(onet_dir, "Knowledge.txt", n=4)
    education = onet_parse.education_by_soc(onet_dir)
    descriptions = onet_parse.occupation_descriptions(onet_dir)

    bundle: dict[str, dict] = {}
    for rec in axes_df.to_dict("records"):
        soc = rec["soc_code"]
        bundle[soc] = {
            "axes": {
                "info": rec["info"],
                "routine": rec["routine"],
                "manual": rec["manual"],
                "social": rec["social"],
            }
        }
    # Attach the descriptive fields (some SOCs may have these without axes).
    for soc, sk in skills.items():
        bundle.setdefault(soc, {})["skills"] = sk
    for soc, kn in knowledge.items():
        bundle.setdefault(soc, {})["knowledge"] = kn
    for soc, edu in education.items():
        bundle.setdefault(soc, {})["education"] = edu
    for soc, desc in descriptions.items():
        bundle.setdefault(soc, {})["description"] = desc
    return bundle


def all_present() -> bool:
    """True when both required BLS files exist (O*NET is optional/enriching)."""
    return OEWS_ZIP.exists() and EP_XLSX.exists()


def onet_present() -> bool:
    return ONET_ZIP.exists()


def oews_year() -> int | None:
    # Preferred: the year recorded by fetch_bls.py (the saved zip uses a
    # generic name, so the year isn't recoverable from it directly).
    year_file = RAW_DIR / "oews_year.txt"
    if year_file.exists():
        try:
            return int(year_file.read_text().strip())
        except ValueError:
            pass
    return bls_parse.detect_oews_year(OEWS_ZIP) if OEWS_ZIP.exists() else None


def onet_version() -> str | None:
    # Preferred: the version recorded by fetch_onet.py (the saved zip uses a
    # generic name, so the version isn't recoverable from it directly).
    version_file = RAW_DIR / "onet_version.txt"
    if version_file.exists():
        return version_file.read_text().strip() or None
    # Fallback: infer from the extracted db_XX_X_text/ directory name.
    extracted = RAW_DIR / "onet_extracted"
    if extracted.exists():
        for child in extracted.iterdir():
            v = onet_parse.detect_onet_version(child)
            if v:
                return v
    return None
