#!/usr/bin/env python3
"""Fetch the public O*NET text database.

The full O*NET database is published as a tab-delimited text bundle at
https://www.onetcenter.org/database.html - a **public** download requiring
no credentials. ``ONET_USERNAME`` / ``ONET_PASSWORD`` are only needed for
the authenticated Web Services API and are merely probed here if present.

Robustness:
  * Version auto-discovery - tries the newest known release first and steps
    back, so the pipeline keeps working as O*NET ships new versions.
  * The resolved version is recorded in ``data/raw/onet_version.txt`` so
    build_dataset.py can stamp it into the dataset metadata.

Saves to::
    data/raw/onet_database.zip
    data/raw/onet_version.txt

Failures are non-fatal: O*NET enrichment (skills, knowledge, task axes) is
optional - the live BLS data still builds without it.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from config import ONET_PASSWORD, ONET_USERNAME, RAW_DIR

# Newest first. Add new releases to the front as O*NET ships them.
ONET_CANDIDATE_VERSIONS = ["29_1", "29_0", "28_3", "28_2", "28_1", "28_0"]
ONET_WS_BASE = "https://services.onetcenter.org/ws/"
HEADERS = {"User-Agent": "us-job-market-visualizer/1.0 (+https://github.com)"}


def db_url(version: str) -> str:
    return f"https://www.onetcenter.org/dl_files/database/db_{version}_text.zip"


def _require_requests():
    try:
        import requests
        return requests
    except ImportError:
        print("requests not installed; run pip install -r scripts/requirements.txt", file=sys.stderr)
        raise


def download_bulk(dest: Path) -> str | None:
    """Download the newest available O*NET database; return its version."""
    requests = _require_requests()
    for version in ONET_CANDIDATE_VERSIONS:
        url = db_url(version)
        try:
            print(f"↓ {url}")
            resp = requests.get(url, timeout=240, headers=HEADERS)
            if resp.status_code == 200 and resp.content[:2] == b"PK":
                dest.write_bytes(resp.content)
                (RAW_DIR / "onet_version.txt").write_text(version.replace("_", "."))
                print(f"  saved {dest.name} ({len(resp.content):,} bytes) - O*NET {version.replace('_', '.')}")
                return version
            print(f"  HTTP {resp.status_code} - trying older version", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"  error: {exc}", file=sys.stderr)
        time.sleep(1)
    return None


def probe_web_service() -> None:
    if not (ONET_USERNAME and ONET_PASSWORD):
        print("No O*NET Web Services credentials set - skipping API probe (not required).")
        return
    requests = _require_requests()
    try:
        resp = requests.get(
            ONET_WS_BASE + "about",
            auth=(ONET_USERNAME, ONET_PASSWORD),
            headers={"Accept": "application/json", **HEADERS},
            timeout=30,
        )
        print("O*NET Web Services auth OK." if resp.ok else f"O*NET WS returned {resp.status_code}")
    except Exception as exc:  # noqa: BLE001
        print(f"O*NET WS probe failed: {exc}", file=sys.stderr)


def main() -> int:
    version = download_bulk(RAW_DIR / "onet_database.zip")
    probe_web_service()
    if not version:
        print("O*NET fetch failed for all candidate versions.", file=sys.stderr)
        return 1
    print("✓ O*NET database downloaded to data/raw/.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
