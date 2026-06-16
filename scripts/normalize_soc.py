"""SOC code normalisation utilities.

The Standard Occupational Classification (SOC) appears in several formats
across BLS and O*NET feeds:

    O*NET-SOC : ``15-1252.00``  (8-digit, with a detail suffix)
    SOC 2018  : ``15-1252``     (detailed occupation)
    OEWS      : ``151252``      (no hyphen, used in some flat files)

Everything downstream keys on the canonical SOC-2018 detailed form
(``NN-NNNN``). These helpers make that conversion deterministic and are
unit-tested via ``python scripts/normalize_soc.py --selftest``.
"""
from __future__ import annotations

import re
import sys

_DIGITS = re.compile(r"\d")


def canonical_soc(code: str) -> str:
    """Normalise any SOC/O*NET-SOC representation to ``NN-NNNN``.

    >>> canonical_soc("15-1252.00")
    '15-1252'
    >>> canonical_soc("151252")
    '15-1252'
    >>> canonical_soc("15-1252")
    '15-1252'
    """
    if code is None:
        raise ValueError("SOC code is required")
    digits = "".join(_DIGITS.findall(str(code)))
    if len(digits) < 6:
        raise ValueError(f"Not enough digits for a SOC code: {code!r}")
    digits = digits[:6]  # drop the O*NET detail suffix (e.g. .00)
    return f"{digits[:2]}-{digits[2:]}"


def is_detailed_occupation(code: str) -> bool:
    """True when the code is a detailed occupation rather than a group."""
    try:
        soc = canonical_soc(code)
    except ValueError:
        return False
    # Broad/minor groups end in 0; detailed occupations generally do not,
    # though a handful legitimately do - we treat any 6-digit code as valid.
    return bool(re.fullmatch(r"\d{2}-\d{4}", soc))


def major_group(code: str) -> str:
    """Return the two-digit major-group prefix."""
    return canonical_soc(code)[:2]


def onet_soc(code: str) -> str:
    """Convert a SOC-2018 code to its base O*NET-SOC form (``.00`` suffix)."""
    return f"{canonical_soc(code)}.00"


def _selftest() -> int:
    cases = {
        "15-1252.00": "15-1252",
        "151252": "15-1252",
        "15-1252": "15-1252",
        " 29-1141 ": "29-1141",
        "29-1141.00": "29-1141",
    }
    failures = 0
    for raw, expected in cases.items():
        got = canonical_soc(raw)
        ok = got == expected
        failures += not ok
        print(f"{'ok ' if ok else 'FAIL'} canonical_soc({raw!r}) -> {got!r}")
    assert onet_soc("15-1252") == "15-1252.00"
    assert major_group("29-1141") == "29"
    print("self-test complete" if not failures else f"{failures} failure(s)")
    return failures


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(1 if _selftest() else 0)
    for arg in sys.argv[1:]:
        print(f"{arg} -> {canonical_soc(arg)}")
