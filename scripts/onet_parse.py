"""Parsers for the public O*NET text database.

The bulk database (``db_XX_X_text.zip``) extracts to tab-delimited tables
keyed on the **O*NET-SOC** code (e.g. ``15-1252.00``). Several O*NET-SOC
detail codes can roll up to one SOC-2018 code, so every measure is
aggregated to the SOC level (mean across detail occupations) via
``normalize_soc.canonical_soc``.

We read four tables:
  * ``Work Activities.txt`` – 41 Generalized Work Activities (GWAs) with an
    Importance (``IM``, 1–5) rating. These drive the AI-exposure task axes.
  * ``Skills.txt`` / ``Knowledge.txt`` – top elements by importance, shown
    on the occupation detail page.
  * ``Job Zones.txt`` – fallback typical-education signal.

The four task axes (information, routine, manual, social) are computed
from real GWA importance ratings - there are no hard-coded per-occupation
weights here. ``occupation_seed`` only supplies the (separate) curated
demo dataset.
"""
from __future__ import annotations

import re
import zipfile
from pathlib import Path

import pandas as pd

from config import JOB_ZONE_EDUCATION, RAW_DIR
from normalize_soc import canonical_soc

# ── GWA element-name keyword sets (matched case-insensitively) ───────────
# Using stable Element Name substrings rather than IDs keeps the mapping
# legible and resilient to minor ID churn across O*NET releases.
INFO_GWAS = [
    "getting information",
    "processing information",
    "analyzing data or information",
    "interacting with computers",
    "documenting/recording information",
    "updating and using relevant knowledge",
    "making decisions and solving problems",
    "evaluating information to determine compliance",
]
MANUAL_GWAS = [
    "performing general physical activities",
    "handling and moving objects",
    "controlling machines and processes",
    "operating vehicles",
    "repairing and maintaining mechanical",
    "repairing and maintaining electronic",
    "inspecting equipment, structures",
]
SOCIAL_GWAS = [
    "establishing and maintaining interpersonal",
    "assisting and caring for others",
    "selling or influencing others",
    "resolving conflicts and negotiating",
    "performing for or working directly with the public",
    "coordinating the work and activities of others",
    "training and teaching others",
    "communicating with people outside",
    "guiding, directing, and motivating",
    "developing and building teams",
]
STRUCTURED_GWAS = [
    "processing information",
    "documenting/recording information",
    "performing administrative activities",
    "evaluating information to determine compliance",
    "monitor processes, materials",
]
CREATIVITY_GWAS = [
    "thinking creatively",
    "making decisions and solving problems",
    "developing objectives and strategies",
]


def _find(root: Path, name: str) -> Path:
    hits = sorted(root.rglob(name))
    if not hits:
        raise FileNotFoundError(f"{name} not found under {root}")
    return hits[0]


def extract_onet(zip_path: Path) -> Path:
    """Extract the O*NET text DB and return the directory holding the tables."""
    target = RAW_DIR / "onet_extracted"
    target.mkdir(exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(target)
    # The zip contains a single top-level db_XX_X_text/ directory.
    return target


def detect_onet_version(zip_path: Path) -> str | None:
    m = re.search(r"db_(\d+_\d+)_text", zip_path.name)
    return m.group(1).replace("_", ".") if m else None


def _read_table(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, sep="\t", dtype=str)
    df.columns = [c.strip() for c in df.columns]
    return df


def _importance_by_soc(df: pd.DataFrame) -> pd.DataFrame:
    """Filter to Importance rows and average Data Value by (soc, element)."""
    code_col = next(c for c in df.columns if "SOC Code" in c)
    df = df[df["Scale ID"] == "IM"].copy()
    df["soc_code"] = df[code_col].map(lambda c: canonical_soc(c))
    df["value"] = pd.to_numeric(df["Data Value"], errors="coerce")
    df["element"] = df["Element Name"].str.strip()
    return (
        df.groupby(["soc_code", "element"], as_index=False)["value"].mean()
    )


def _axis(values: dict[str, float], keywords: list[str]) -> float | None:
    """Mean of normalised (0–1) importance for elements matching keywords."""
    picked = [
        v
        for name, v in values.items()
        if any(k in name.lower() for k in keywords)
    ]
    if not picked:
        return None
    # O*NET importance is 1–5; normalise to 0–1.
    return max(0.0, min(1.0, (sum(picked) / len(picked) - 1) / 4))


def compute_work_axes(onet_dir: Path) -> pd.DataFrame:
    """Per-SOC information / routine / manual / social task axes."""
    wa = _importance_by_soc(_read_table(_find(onet_dir, "Work Activities.txt")))
    rows = []
    for soc, grp in wa.groupby("soc_code"):
        values = dict(zip(grp["element"], grp["value"]))
        info = _axis(values, INFO_GWAS)
        manual = _axis(values, MANUAL_GWAS)
        social = _axis(values, SOCIAL_GWAS)
        structured = _axis(values, STRUCTURED_GWAS)
        creativity = _axis(values, CREATIVITY_GWAS) or 0.0
        if info is None:
            continue
        routine = None
        if structured is not None:
            routine = max(0.0, min(1.0, structured - 0.25 * creativity + 0.05))
        rows.append(
            {
                "soc_code": soc,
                "info": round(info, 4),
                "routine": round(routine if routine is not None else 0.5, 4),
                "manual": round(manual if manual is not None else 0.0, 4),
                "social": round(social if social is not None else 0.0, 4),
            }
        )
    return pd.DataFrame(rows)


def top_elements(onet_dir: Path, filename: str, n: int = 4) -> dict[str, list[str]]:
    """Top-N elements by importance per SOC (for Skills / Knowledge)."""
    tbl = _importance_by_soc(_read_table(_find(onet_dir, filename)))
    out: dict[str, list[str]] = {}
    for soc, grp in tbl.groupby("soc_code"):
        ranked = grp.sort_values("value", ascending=False)["element"].tolist()
        out[soc] = ranked[:n]
    return out


def education_by_soc(onet_dir: Path) -> dict[str, str]:
    """Fallback typical-education per SOC from Job Zone."""
    jz = _read_table(_find(onet_dir, "Job Zones.txt"))
    code_col = next(c for c in jz.columns if "SOC Code" in c)
    jz["soc_code"] = jz[code_col].map(lambda c: canonical_soc(c))
    jz["zone"] = pd.to_numeric(jz["Job Zone"], errors="coerce")
    grouped = jz.groupby("soc_code")["zone"].mean().round().astype("Int64")
    return {
        soc: JOB_ZONE_EDUCATION.get(int(z))
        for soc, z in grouped.items()
        if pd.notna(z) and int(z) in JOB_ZONE_EDUCATION
    }


def occupation_descriptions(onet_dir: Path) -> dict[str, str]:
    """SOC -> a representative O*NET description (first detail occupation)."""
    od = _read_table(_find(onet_dir, "Occupation Data.txt"))
    code_col = next(c for c in od.columns if "SOC Code" in c)
    desc_col = next((c for c in od.columns if "Description" in c), None)
    out: dict[str, str] = {}
    if not desc_col:
        return out
    for _, r in od.iterrows():
        soc = canonical_soc(str(r[code_col]))
        out.setdefault(soc, str(r[desc_col]).strip())
    return out
