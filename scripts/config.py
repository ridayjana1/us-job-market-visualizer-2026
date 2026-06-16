"""Shared configuration for the ETL pipeline.

Centralises file paths, classification vocabularies, and the scoring
constants used to derive AI-exposure metrics. Imported by every other
script in ``scripts/`` so the pipeline stays internally consistent.
"""
from __future__ import annotations

import os
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent

# Load credentials from a dotenv file if one exists, so keys placed in
# `.env.local` (preferred) or `.env` are picked up by the Python pipeline -
# not just by Next.js. Shell-exported vars still take precedence.
try:
    from dotenv import load_dotenv

    for _name in (".env.local", ".env"):
        _path = ROOT / _name
        if _path.exists():
            load_dotenv(_path, override=False)
except ImportError:
    # python-dotenv is optional; env vars exported in the shell still work.
    pass

DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
DATA_DIR.mkdir(exist_ok=True)
RAW_DIR.mkdir(exist_ok=True)

PARQUET_PATH = DATA_DIR / "final_dataset.parquet"
OCCUPATIONS_JSON = DATA_DIR / "occupations.json"
STATES_JSON = DATA_DIR / "states.json"
META_JSON = DATA_DIR / "meta.json"

# Mirror into the app's public/data so the dataset ships with the build and
# can be read by Server Components without a filesystem round-trip in prod.
PUBLIC_DATA_DIR = ROOT / "public" / "data"

# ── Reference year ───────────────────────────────────────────────────────
# BLS OEWS reference period and the 2024–2034 employment projections cycle.
REFERENCE_YEAR = 2024
PROJECTION_BASE_YEAR = 2024
PROJECTION_TARGET_YEAR = 2034

# Provenance defaults stamped into the curated-sample metadata so the UI can
# always display Dataset Year / O*NET Version / Last Updated. The live build
# overrides these with the actual values discovered during fetch/parse.
BLS_OEWS_RELEASE_DEFAULT = f"OEWS May {REFERENCE_YEAR}"
ONET_VERSION_DEFAULT = "29.0"

# ── Credentials (optional - only the live fetch path uses them) ──────────
BLS_API_KEY = os.environ.get("BLS_API_KEY", "")
ONET_USERNAME = os.environ.get("ONET_USERNAME", "")
ONET_PASSWORD = os.environ.get("ONET_PASSWORD", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ── SOC 2018 major groups ────────────────────────────────────────────────
SOC_MAJOR_GROUPS: dict[str, str] = {
    "11": "Management",
    "13": "Business and Financial Operations",
    "15": "Computer and Mathematical",
    "17": "Architecture and Engineering",
    "19": "Life, Physical, and Social Science",
    "21": "Community and Social Service",
    "23": "Legal",
    "25": "Educational Instruction and Library",
    "27": "Arts, Design, Entertainment, Sports, and Media",
    "29": "Healthcare Practitioners and Technical",
    "31": "Healthcare Support",
    "33": "Protective Service",
    "35": "Food Preparation and Serving Related",
    "37": "Building and Grounds Cleaning and Maintenance",
    "39": "Personal Care and Service",
    "41": "Sales and Related",
    "43": "Office and Administrative Support",
    "45": "Farming, Fishing, and Forestry",
    "47": "Construction and Extraction",
    "49": "Installation, Maintenance, and Repair",
    "51": "Production",
    "53": "Transportation and Material Moving",
}

# ── Typical education levels (BLS "typical entry-level education") ────────
EDUCATION_LEVELS = [
    "No formal educational credential",
    "High school diploma or equivalent",
    "Some college, no degree",
    "Postsecondary nondegree award",
    "Associate's degree",
    "Bachelor's degree",
    "Master's degree",
    "Doctoral or professional degree",
]

# O*NET Job Zone → typical education, used only as a fallback when the BLS
# Employment Projections "typical entry-level education" field is missing.
JOB_ZONE_EDUCATION = {
    1: "No formal educational credential",
    2: "High school diploma or equivalent",
    3: "Associate's degree",
    4: "Bachelor's degree",
    5: "Master's degree",
}

# Canonical education-string normalisation: BLS EP labels mapped onto the
# EDUCATION_LEVELS vocabulary (handles wording/whitespace drift across years).
EDUCATION_ALIASES = {
    "no formal educational credential": "No formal educational credential",
    "high school diploma or equivalent": "High school diploma or equivalent",
    "some college, no degree": "Some college, no degree",
    "postsecondary nondegree award": "Postsecondary nondegree award",
    "associate's degree": "Associate's degree",
    "bachelor's degree": "Bachelor's degree",
    "master's degree": "Master's degree",
    "doctoral or professional degree": "Doctoral or professional degree",
}


def normalize_education(label: str | None) -> str | None:
    """Map a raw BLS education label to the canonical vocabulary."""
    if not label:
        return None
    return EDUCATION_ALIASES.get(str(label).strip().lower())


# ── AI-exposure banding ──────────────────────────────────────────────────
# Thresholds applied to the composite exposure score (0–1).
EXPOSURE_BANDS = {
    "low": (0.0, 0.34),
    "moderate": (0.34, 0.67),
    "high": (0.67, 1.01),
}


def exposure_band(score: float) -> str:
    """Map a 0–1 exposure score to a low/moderate/high band."""
    for band, (lo, hi) in EXPOSURE_BANDS.items():
        if lo <= score < hi:
            return band
    return "high"


def major_group_code(soc_code: str) -> str:
    """Return the two-digit SOC major-group prefix for a detailed code."""
    return soc_code.split("-")[0]


def major_group_title(soc_code: str) -> str:
    return SOC_MAJOR_GROUPS.get(major_group_code(soc_code), "Unclassified")


# ── Dataset provenance, surfaced in the UI footer / methodology page ─────
DATA_SOURCES = [
    {
        "name": "BLS Occupational Employment and Wage Statistics (OEWS)",
        "url": "https://www.bls.gov/oes/",
        "fields": ["employment", "wages", "wage percentiles"],
    },
    {
        "name": "BLS Employment Projections 2024–2034",
        "url": "https://www.bls.gov/emp/",
        "fields": ["growth rate", "annual openings", "typical education"],
    },
    {
        "name": "O*NET 28.x Database",
        "url": "https://www.onetcenter.org/database.html",
        "fields": ["skills", "knowledge", "work activities", "abilities"],
    },
    {
        "name": "Anthropic Economic Index (methodology)",
        "url": "https://www.anthropic.com/economic-index",
        "fields": ["AI exposure", "augmentation vs. automation framing"],
    },
]
