"""
Offline smoke test for the sentiment runtime guardrail — no network, no Groq key.

Run from backend/:  ./venv/Scripts/python.exe scripts/check_guardrails.py

Feeds hand-built model responses (well-formed, malformed, hallucinated index,
ungrounded strong sentiment) through validate_sentiment_batch and asserts the
GuardrailReport tallies match. Exits non-zero on any failure.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.guardrails import validate_sentiment_batch

# batch[0] names a tracked tool (react), batch[1] names none, batch[2] is empty.
BATCH = [
    {"title": "Why we migrated our dashboard from Redux to React Server Components"},
    {"title": "A quiet walk through the autumn woods near my house"},
    {"title": ""},
]

CASES = [
    (
        "well-formed, all grounded or neutral",
        '[{"i": 0, "s": "positive"}, {"i": 1, "s": "neutral"}, {"i": 2, "s": "neutral"}]',
        {"accepted": 3, "quarantined": 0, "dropped": 0, "hallucinated_index": 0},
        {0: "positive", 1: "neutral", 2: "neutral"},
    ),
    (
        "strong sentiment about an untracked headline is quarantined",
        '[{"i": 1, "s": "positive"}]',
        {"accepted": 1, "quarantined": 1},
        {1: "neutral"},
    ),
    (
        "strong sentiment about an empty headline is quarantined",
        '[{"i": 2, "s": "negative"}]',
        {"accepted": 1, "quarantined": 1},
        {2: "neutral"},
    ),
    (
        "hallucinated index is discarded",
        '[{"i": 9, "s": "positive"}]',
        {"accepted": 0, "hallucinated_index": 1},
        {},
    ),
    (
        "unknown label row is dropped",
        '[{"i": 0, "s": "glowing"}]',
        {"accepted": 0, "dropped": 1},
        {},
    ),
    (
        "unparseable response rejects the whole batch",
        "sorry, I cannot do that",
        {"batch_rejected": True, "dropped": 3},
        {},
    ),
    (
        "markdown-fenced JSON is still read",
        '```json\n[{"i": 0, "s": "positive"}]\n```',
        {"accepted": 1},
        {0: "positive"},
    ),
]


def main() -> int:
    failures = 0
    for name, raw, expect_report, expect_map in CASES:
        sentiment_map, report = validate_sentiment_batch(raw, BATCH)
        got = report.as_dict()
        ok = all(got.get(k) == v for k, v in expect_report.items())
        if expect_map is not None:
            ok = ok and sentiment_map == expect_map
        status = "ok  " if ok else "FAIL"
        print(f"[{status}] {name}")
        if not ok:
            failures += 1
            print(f"        report   {got}")
            print(f"        expected {expect_report}")
            print(f"        map      {sentiment_map}  expected {expect_map}")

    print()
    if failures:
        print(f"{failures} case(s) failed")
        return 1
    print(f"all {len(CASES)} cases passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
