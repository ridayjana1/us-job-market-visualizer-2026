#!/usr/bin/env python3
"""Generate the committed sample dataset using the standard library only.

This is the zero-dependency path: it turns the curated seed in
``occupation_seed.py`` into the JSON files the Next.js app reads. Run it
with nothing more than a Python 3.9+ interpreter:

    python scripts/generate_sample_data.py

Outputs (also mirrored into ``public/data/`` for the app build):
    data/occupations.json   – full occupation records
    data/states.json        – per-state aggregates + top occupations
    data/meta.json          – dataset provenance and summary stats
"""
from __future__ import annotations

import json
import shutil
from datetime import date

from config import (
    BLS_OEWS_RELEASE_DEFAULT,
    DATA_SOURCES,
    META_JSON,
    OCCUPATIONS_JSON,
    ONET_VERSION_DEFAULT,
    PROJECTION_BASE_YEAR,
    PROJECTION_TARGET_YEAR,
    PUBLIC_DATA_DIR,
    REFERENCE_YEAR,
    STATES_JSON,
)
from occupation_seed import all_records, build_states


def summarize(records: list[dict]) -> dict:
    n = len(records)
    return {
        "occupation_count": n,
        "total_employment": sum(r["employment"] for r in records),
        "median_wage_overall": int(
            sorted(r["median_wage"] for r in records)[n // 2]
        ),
        "high_exposure_count": sum(
            1 for r in records if r["exposure_band"] == "high"
        ),
        "moderate_exposure_count": sum(
            1 for r in records if r["exposure_band"] == "moderate"
        ),
        "low_exposure_count": sum(
            1 for r in records if r["exposure_band"] == "low"
        ),
    }


def main() -> None:
    records = all_records()
    states = build_states(records)
    meta = {
        "generated_on": date.today().isoformat(),
        "reference_year": REFERENCE_YEAR,
        "dataset_kind": "curated-sample",
        "bls_oews_release": BLS_OEWS_RELEASE_DEFAULT,
        "onet_version": ONET_VERSION_DEFAULT,
        "sources": DATA_SOURCES,
        "stats": summarize(records),
        "disclaimer": (
            "AI exposure measures task overlap with current AI capabilities. "
            "It is not a prediction of job loss. Exposure is split into "
            "augmentation and automation potential following the Anthropic "
            "Economic Index framing."
        ),
    }

    OCCUPATIONS_JSON.write_text(json.dumps(records, indent=2))
    STATES_JSON.write_text(json.dumps(states, indent=2))
    META_JSON.write_text(json.dumps(meta, indent=2))

    # Mirror into the app's public dir so Server Components can read it and
    # the data ships with the static build.
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for src in (OCCUPATIONS_JSON, STATES_JSON, META_JSON):
        shutil.copy(src, PUBLIC_DATA_DIR / src.name)

    print(f"✓ {len(records)} occupations -> {OCCUPATIONS_JSON.relative_to(OCCUPATIONS_JSON.parent.parent)}")
    print(f"✓ {len(states)} states -> {STATES_JSON.relative_to(STATES_JSON.parent.parent)}")
    print(f"✓ meta -> {META_JSON.name}")
    print(f"✓ mirrored to {PUBLIC_DATA_DIR}")


if __name__ == "__main__":
    main()
