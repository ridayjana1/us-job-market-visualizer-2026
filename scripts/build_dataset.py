#!/usr/bin/env python3
"""Join all sources into the final dataset (parquet + JSON).

Pipeline position::

    fetch_bls.py ─┐
    fetch_onet.py ┼─► build_dataset.py ─► data/final_dataset.parquet
    fetch_ai_exposure.py ┘                 data/occupations.json
                                           data/states.json + meta.json

Default behaviour is **live**: if the official OEWS + Employment-Projections
files downloaded by the fetch scripts are present in ``data/raw``, they are
parsed and joined on the canonical SOC code (enriched with O*NET skills,
knowledge, and the work-activity task axes that drive AI exposure). The
result is validated and written with ``dataset_kind = "live"``.

The curated 57-occupation sample is used only when ``--sample`` is passed or
the live files are missing - so a fresh clone still produces a working app.

Usage::

    python scripts/build_dataset.py                 # live if files present
    python scripts/build_dataset.py --sample         # force curated sample
    python scripts/build_dataset.py --export-json     # JSON only, skip parquet
    python scripts/build_dataset.py --ai-summaries    # regen narratives (Anthropic)
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timezone

from config import (
    DATA_SOURCES,
    META_JSON,
    OCCUPATIONS_JSON,
    PARQUET_PATH,
    PROJECTION_BASE_YEAR,
    PROJECTION_TARGET_YEAR,
    PUBLIC_DATA_DIR,
    REFERENCE_YEAR,
    STATES_JSON,
)
from occupation_seed import all_records, build_official_record, build_states

# Occupations that MUST appear in any genuine live dataset - a guard against
# silent parsing/join regressions. (label, soc_code).
REQUIRED_OCCUPATIONS = [
    ("Software Developers", "15-1252"),
    ("Data Scientists", "15-2051"),
    ("Registered Nurses", "29-1141"),
    ("Electricians", "47-2111"),
]
MIN_LIVE_OCCUPATIONS = 700


class ValidationError(RuntimeError):
    pass


def load_sample() -> tuple[list[dict], str, dict]:
    from config import BLS_OEWS_RELEASE_DEFAULT, ONET_VERSION_DEFAULT

    extra = {
        "bls_oews_release": BLS_OEWS_RELEASE_DEFAULT,
        "onet_version": ONET_VERSION_DEFAULT,
    }
    return all_records(), "curated-sample", extra


def load_live() -> tuple[list[dict], str, dict]:
    """Parse + join official BLS/O*NET files into validated live records.

    Raises on any failure so the caller can decide whether to fall back to
    the sample; never returns a half-built dataset.
    """
    import pandas as pd
    import parse_sources as ps

    oews = ps.parse_oews()
    proj = ps.parse_projections()
    onet_map = ps.parse_onet() if ps.onet_present() else {}

    merged = oews.merge(proj, on="soc_code", how="left", suffixes=("", "_ep"))

    records: list[dict] = []
    for row in merged.to_dict("records"):
        if not row.get("soc_code") or pd.isna(row.get("median_wage")):
            continue
        records.append(build_official_record(row, onet_map.get(row["soc_code"])))
    records.sort(key=lambda r: r["employment"], reverse=True)

    # ── Join coverage (printed + recorded in meta) ──────────────────────
    oews_socs = set(oews["soc_code"])
    proj_socs = set(proj["soc_code"])
    axes_socs = {s for s, v in onet_map.items() if "axes" in v}
    skills_socs = {s for s, v in onet_map.items() if v.get("skills")}
    n = max(len(oews_socs), 1)
    coverage = {
        "oews_occupations": len(oews_socs),
        "ep_growth_pct": round(100 * len(oews_socs & proj_socs) / n, 1),
        "onet_axes_pct": round(100 * len(oews_socs & axes_socs) / n, 1),
        "onet_skills_pct": round(100 * len(oews_socs & skills_socs) / n, 1),
    }
    print("Join coverage:")
    print(f"  OEWS detailed occupations : {coverage['oews_occupations']}")
    print(f"  with EP growth data       : {coverage['ep_growth_pct']}%")
    print(f"  with O*NET task axes      : {coverage['onet_axes_pct']}%")
    print(f"  with O*NET skills         : {coverage['onet_skills_pct']}%")

    validate_live(records)

    meta_extra = {
        "oews_release_year": ps.oews_year(),
        "bls_oews_release": f"OEWS May {ps.oews_year()}" if ps.oews_year() else None,
        "onet_version": ps.onet_version(),
        "join_coverage": coverage,
        "exposure_from_onet_pct": round(
            100 * sum(1 for r in records if r.get("exposure_source") == "onet-work-activities") / max(len(records), 1),
            1,
        ),
    }
    return records, "live", meta_extra


def validate_live(records: list[dict]) -> None:
    """Assert the live dataset is complete and plausible (Task 8)."""
    n = len(records)
    if n < MIN_LIVE_OCCUPATIONS:
        raise ValidationError(
            f"Live dataset has only {n} occupations (expected >= {MIN_LIVE_OCCUPATIONS}). "
            "The OEWS/EP parse likely failed or filtered too aggressively."
        )

    socs = {r["soc_code"] for r in records}
    titles = " | ".join(r["title"].lower() for r in records)
    missing = [
        f"{label} ({soc})"
        for label, soc in REQUIRED_OCCUPATIONS
        if soc not in socs and label.lower() not in titles
    ]
    if missing:
        raise ValidationError(f"Required occupations missing: {', '.join(missing)}")
    if not any(s.startswith("15-12") for s in socs):
        raise ValidationError("No Computer Occupations (SOC 15-12xx) present")

    wage_ok = sum(1 for r in records if r["median_wage"] and r["median_wage"] > 0) / n
    emp_ok = sum(1 for r in records if r["employment"] and r["employment"] > 0) / n
    if wage_ok < 0.90:
        raise ValidationError(f"Only {wage_ok:.0%} of records have a median wage (need >= 90%)")
    if emp_ok < 0.80:
        raise ValidationError(f"Only {emp_ok:.0%} of records have employment (need >= 80%)")

    print(
        f"Validation OK: {n} occupations, "
        f"{wage_ok:.0%} with wage, {emp_ok:.0%} with employment, "
        f"all required occupations present."
    )


def maybe_regenerate_summaries(records: list[dict]) -> None:
    """Optionally regenerate narrative summaries with the Anthropic API."""
    from config import ANTHROPIC_API_KEY

    if not ANTHROPIC_API_KEY:
        print("ANTHROPIC_API_KEY not set - keeping deterministic summaries.")
        return
    try:
        import anthropic
    except ImportError:
        print("anthropic SDK not installed - keeping deterministic summaries.")
        return

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    for r in records:
        prompt = (
            "Write a neutral two-sentence labor-market summary for the "
            f"occupation '{r['title']}'. Median wage ${r['median_wage']:,}, "
            f"projected growth {r['growth_rate']}%, AI exposure band "
            f"{r['exposure_band']} (augmentation {r['ai_augmentation_score']}, "
            f"automation {r['ai_automation_score']}). Frame AI exposure as task "
            "overlap, never as job loss. Prefer augmentation framing where "
            "augmentation >= automation."
        )
        msg = client.messages.create(
            model="claude-fable-5",
            max_tokens=160,
            messages=[{"role": "user", "content": prompt}],
        )
        r["ai_summary"] = msg.content[0].text.strip()
    print(f"✓ regenerated {len(records)} summaries via Anthropic")


def build_meta(records: list[dict], kind: str, extra: dict) -> dict:
    bands = {"low": 0, "moderate": 0, "high": 0}
    for r in records:
        bands[r["exposure_band"]] += 1
    meta = {
        "dataset_kind": kind,
        "generated_on": date.today().isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "reference_year": REFERENCE_YEAR,
        "sources": DATA_SOURCES,
        "stats": {
            "occupation_count": len(records),
            "total_employment": sum(r["employment"] for r in records),
            "exposure_bands": bands,
        },
        "disclaimer": (
            "AI exposure measures task overlap with current AI capabilities; "
            "it is not a prediction of job loss."
        ),
    }
    meta.update({k: v for k, v in extra.items() if v is not None})
    return meta


def write_outputs(records: list[dict], states: list[dict], meta: dict, *, parquet: bool) -> None:
    OCCUPATIONS_JSON.write_text(json.dumps(records, indent=2))
    STATES_JSON.write_text(json.dumps(states, indent=2))
    META_JSON.write_text(json.dumps(meta, indent=2))
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    import shutil

    for src in (OCCUPATIONS_JSON, STATES_JSON, META_JSON):
        shutil.copy(src, PUBLIC_DATA_DIR / src.name)
    if parquet:
        write_parquet(records)


def write_parquet(records: list[dict]) -> None:
    try:
        import pandas as pd
    except ImportError:
        print(
            "pandas/pyarrow not installed - skipping parquet. "
            "Install scripts/requirements.txt for the full pipeline.",
            file=sys.stderr,
        )
        return
    flat = []
    for r in records:
        row = dict(r)
        row["skills"] = json.dumps(r["skills"])
        row["knowledge"] = json.dumps(r["knowledge"])
        flat.append(row)
    df = pd.DataFrame(flat)
    df.to_parquet(PARQUET_PATH, index=False)
    print(f"✓ {len(df)} rows × {len(df.columns)} cols -> {PARQUET_PATH.name}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--sample", action="store_true", help="force the curated sample dataset")
    ap.add_argument("--export-json", action="store_true", help="JSON only, skip parquet")
    ap.add_argument("--ai-summaries", action="store_true", help="regen summaries via Anthropic")
    args = ap.parse_args()

    try:
        import parse_sources as ps

        live_available = ps.all_present()
    except ImportError:
        live_available = False

    if args.sample or not live_available:
        if args.sample:
            print("Building curated sample dataset (--sample).")
        else:
            print(
                "No live BLS files in data/raw - building curated sample. "
                "Run fetch_bls.py + fetch_onet.py for the live dataset.",
                file=sys.stderr,
            )
        records, kind, extra = load_sample()
    else:
        try:
            records, kind, extra = load_live()
        except Exception as exc:  # noqa: BLE001 - never half-build
            print(f"Live build failed: {exc}", file=sys.stderr)
            print("Falling back to curated sample.", file=sys.stderr)
            records, kind, extra = load_sample()

    if args.ai_summaries:
        maybe_regenerate_summaries(records)

    states = build_states(records)
    meta = build_meta(records, kind, extra)
    write_outputs(records, states, meta, parquet=not args.export_json)

    print(
        f"✓ Build complete - dataset_kind = {kind!r}, "
        f"{len(records)} occupations, {len(states)} states."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
