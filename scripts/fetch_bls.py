#!/usr/bin/env python3
"""Fetch the public BLS bulk releases (OEWS + Employment Projections).

  * OEWS  – Occupational Employment & Wage Statistics national file
            (employment + wage percentiles by detailed SOC).
  * EP    – Employment Projections "occupational projections and
            characteristics" table (10-yr growth, openings, education).

Both are **public** downloads - no API key is required. A ``BLS_API_KEY``,
if present, is only used to lift the time-series API rate limit and is not
needed here.

Robustness:
  * Browser-like headers (BLS fronts downloads with Akamai, which rejects
    bare programmatic User-Agents).
  * Retries with backoff.
  * OEWS year auto-discovery: the latest national file usually lags the
    current year, so we try REFERENCE_YEAR and step back a few years.

Saves to::
    data/raw/oews_national.zip
    data/raw/ep_occupation.xlsx

Failures are non-fatal: build_dataset.py falls back to the curated sample
when these files are absent.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from config import BLS_API_KEY, RAW_DIR, REFERENCE_YEAR

EP_OCCUPATION_URL = (
    "https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.xlsx"
)

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/zip,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _session():
    import requests

    s = requests.Session()
    s.headers.update(BROWSER_HEADERS)
    if BLS_API_KEY:
        # Not required for bulk files, but harmless and documents intent.
        s.headers["X-BLS-API-Key"] = BLS_API_KEY
    return s


def oews_url(year: int) -> str:
    return f"https://www.bls.gov/oes/special-requests/oesm{str(year)[2:]}nat.zip"


def download(session, url: str, dest: Path, *, retries: int = 3) -> bool:
    for attempt in range(1, retries + 1):
        try:
            print(f"↓ {url} (attempt {attempt})")
            resp = session.get(url, timeout=180, allow_redirects=True)
            if resp.status_code == 200 and resp.content:
                dest.write_bytes(resp.content)
                print(f"  saved {dest.name} ({len(resp.content):,} bytes)")
                return True
            print(f"  HTTP {resp.status_code}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"  error: {exc}", file=sys.stderr)
        time.sleep(2 * attempt)
    return False


def fetch_oews(session) -> bool:
    """Try the reference year, then step back until a national file exists."""
    for year in range(REFERENCE_YEAR, REFERENCE_YEAR - 4, -1):
        if download(session, oews_url(year), RAW_DIR / "oews_national.zip"):
            # The saved file uses a generic name, so record the resolved year
            # for build_dataset.py to stamp into the dataset metadata.
            (RAW_DIR / "oews_year.txt").write_text(str(year))
            print(f"  OEWS national file: May {year}")
            return True
    return False


def main() -> int:
    try:
        import requests  # noqa: F401
    except ImportError:
        print("requests not installed; run pip install -r scripts/requirements.txt", file=sys.stderr)
        return 2

    session = _session()
    ok_oews = fetch_oews(session)
    ok_ep = download(session, EP_OCCUPATION_URL, RAW_DIR / "ep_occupation.xlsx")

    if not (ok_oews and ok_ep):
        print(
            "\nBLS fetch incomplete. If you see HTTP 403, your network/IP is "
            "being blocked by BLS's CDN (common on cloud/datacenter IPs) - "
            "run this from a residential network or a CI runner. "
            "build_dataset.py will fall back to the curated sample meanwhile.",
            file=sys.stderr,
        )
        return 1
    print("✓ BLS raw files downloaded to data/raw/.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
