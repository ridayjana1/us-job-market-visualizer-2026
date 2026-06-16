#!/usr/bin/env python3
"""Compute AI-exposure metrics from real O*NET work-activity ratings.

Methodology (transparent and reproducible):

  Each occupation's task mix is collapsed into four axes computed from
  O*NET Generalized Work Activity *importance* ratings (see
  ``onet_parse.compute_work_axes``):

    info    – information / cognitive work (getting, processing, analysing
              information; interacting with computers; decisions)
    routine – structured, rule-based, repeatable tasks (net of creativity)
    manual  – physical / hands-on / equipment work
    social  – interpersonal, care, influence, coordination

  ``occupation_seed._exposure_core`` turns these into a composite exposure
  score and, following the **Anthropic Economic Index**, splits it into
  augmentation vs. automation potential. Non-routine, judgement- and
  people-heavy work skews to augmentation; highly routine work carries more
  automation potential.

  IMPORTANT: exposure measures *task overlap* with current AI capabilities,
  NOT a forecast of employment change. High exposure frequently coincides
  with high wages and high growth (e.g. software development), where
  augmentation tends to dominate.

When the O*NET database is present in ``data/raw`` this computes exposure
from real ratings and writes ``data/raw/ai_exposure.json`` keyed by SOC.
Without it, the curated seed's exposure is emitted so the table is complete.
"""
from __future__ import annotations

import json
import sys

from config import RAW_DIR
from occupation_seed import SEEDS, _exposure_core, ai_exposure


def from_onet() -> list[dict] | None:
    """Compute exposure for every SOC with O*NET work-activity coverage."""
    onet_zip = RAW_DIR / "onet_database.zip"
    if not onet_zip.exists():
        return None
    try:
        import onet_parse

        onet_dir = onet_parse.extract_onet(onet_zip)
        axes = onet_parse.compute_work_axes(onet_dir)
    except Exception as exc:  # noqa: BLE001
        print(f"O*NET exposure computation failed: {exc}", file=sys.stderr)
        return None

    rows = []
    for rec in axes.to_dict("records"):
        soc = rec["soc_code"]
        rows.append(
            {
                "soc_code": soc,
                "info": rec["info"],
                "routine": rec["routine"],
                "manual": rec["manual"],
                "social": rec["social"],
                **_exposure_core(rec["info"], rec["routine"], rec["manual"], rec["social"], soc),
            }
        )
    return rows


def from_seed() -> list[dict]:
    return [{"soc_code": s.soc, "title": s.title, **ai_exposure(s)} for s in SEEDS]


def main() -> int:
    rows = from_onet()
    source = "onet-work-activities"
    if rows is None:
        print("O*NET database not found - emitting curated-seed exposure.", file=sys.stderr)
        rows = from_seed()
        source = "curated-seed"

    out = RAW_DIR / "ai_exposure.json"
    out.write_text(json.dumps({"source": source, "rows": rows}, indent=2))
    bands = {"high": 0, "moderate": 0, "low": 0}
    for r in rows:
        bands[r["exposure_band"]] += 1
    print(f"✓ AI exposure for {len(rows)} occupations ({source}) -> {out.name}")
    print(f"  high={bands['high']}  moderate={bands['moderate']}  low={bands['low']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
