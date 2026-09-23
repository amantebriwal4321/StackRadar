"""
Smoke test for the Moss Fast Retrieval layer (app/services/retrieval.py).

Run from backend/:  ./venv/Scripts/python.exe scripts/check_retrieval.py

Without MOSS_PROJECT_ID / MOSS_PROJECT_KEY set, this proves the fallback
contract offline: retrieval reports itself unconfigured and every call is a
safe no-op. WITH real credentials in the environment (see backend/.env), it
builds the live 31-tool catalog index on Moss Cloud and queries it with a
handful of real scraped-style headlines, printing the matched tool and the
actual round-trip latency Moss reports — this is the number that goes in the
demo video.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import retrieval

HEADLINES = [
    "Why we migrated our dashboard from Redux to React Server Components",
    "k8s 1.32 adds native sidecar containers, no more init-container hacks",
    "The Rust compiler just got 15% faster on incremental builds",
    "Announcing Next 16: Turbopack is now the default bundler",
    "A quiet walk through the autumn woods near my house",
]


async def main() -> int:
    print(f"Moss configured: {retrieval.is_configured()}")
    if not retrieval.is_configured():
        print(
            "MOSS_PROJECT_ID / MOSS_PROJECT_KEY not set — retrieval falls back to "
            "the regex grounding check in guardrails.py. This is the expected, "
            "safe default; sign up at https://moss.dev for a free project to see "
            "live semantic retrieval below."
        )

    retrieval.reset_stats()
    for headline in HEADLINES:
        matches, latency_ms = await retrieval.retrieve(headline, top_k=1)
        if matches:
            top = matches[0]
            grounded = top.score >= retrieval.GROUND_SCORE_THRESHOLD
            if grounded:
                retrieval.mark_grounded()
            print(
                f"[{latency_ms:6.2f}ms] {'GROUNDED' if grounded else 'below threshold':15s} "
                f"score={top.score:.3f}  {top.tool_slug:15s}  {headline}"
            )
        else:
            print(f"[{latency_ms:6.2f}ms] no match          {headline}")

    print()
    print(f"Run stats: {retrieval.last_run_stats()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
