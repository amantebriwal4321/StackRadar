"""
Scoring Engine — Tool-level keyword classification and trend computation.

Responsibilities:
  1. Map keywords/aliases to specific tools (TOOL_KEYWORDS)
  2. Classify any text into matching tool slugs
  3. Calculate weighted trend scores from multi-source signals
  4. Classify growth stage
  5. Generate tool summaries
  6. Decision Intelligence: trend classification, recommendations, learning priority
"""

import math
import logging
from typing import Set, Dict, List, Any, Optional

from app.services.catalog import TOOLS

logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOOL REGISTRY — derived from the unified catalog (single source of truth).
# Keys are the curated tool slugs; each maps to the repo + keywords + category
# the scraper/scoring pipeline needs. Editing tools happens in catalog.py only.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOOL_REGISTRY = {
    t["slug"]: {
        "repo": t["github_repo"],
        "keywords": t["keywords"],
        "domain": t["category"],
    }
    for t in TOOLS
}

import re

# Pre-compile regex patterns for each tool keyword (Phase 5.1)
# Short keywords (<=3 chars) use strict word boundaries to avoid false positives
# (e.g. "go" matching every sentence containing "go to", "going", etc.)
_TOOL_PATTERNS: Dict[str, List[re.Pattern]] = {}
for _slug, _data in TOOL_REGISTRY.items():
    _patterns = []
    for _kw in _data["keywords"]:
        # Use word boundaries for all keywords
        _patterns.append(re.compile(r'\b' + re.escape(_kw) + r'\b', re.IGNORECASE))
    _TOOL_PATTERNS[_slug] = _patterns


def classify_text_to_tools(text: str) -> Set[str]:
    """
    Classify a text string into matching tool slugs using word boundary regex.

    Phase 5.1 improvement: Uses \\b word boundaries instead of naive `in` substring
    matching. This prevents "go" from matching "going", "ts" from matching "its", etc.

    Returns a set of tool slugs (e.g. {"react", "pytorch"}).
    """
    if not text:
        return set()

    matched_tools: Set[str] = set()

    for tool_slug, patterns in _TOOL_PATTERNS.items():
        for pattern in patterns:
            if pattern.search(text):
                matched_tools.add(tool_slug)
                break  # One match per tool is enough

    return matched_tools



# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SENTIMENT WEIGHTING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SENTIMENT_WEIGHTS: Dict[str, float] = {
    "positive": 1.0,    # Full credit — praise, adoption, excitement
    "neutral": 0.5,     # Half credit — informational, tutorial
    "negative": -0.3,   # Slight penalty — criticism, decline
}


def count_weighted_mentions(
    items: List[Dict],
    source_key: str,
    all_tool_slugs: set,
) -> Dict[str, float]:
    """
    Count sentiment-weighted mentions per tool from a list of content items.

    Each item must have "title" (str) and "sentiment" (str) keys.
    Returns {tool_slug: weighted_count} where weighted_count can be fractional.
    """
    counts: Dict[str, float] = {slug: 0.0 for slug in all_tool_slugs}

    for item in items:
        text = _item_text(item)

        sentiment = item.get("sentiment", "neutral")
        weight = SENTIMENT_WEIGHTS.get(sentiment, 0.5)

        matched = classify_text_to_tools(text)
        for slug in matched:
            if slug in counts:
                counts[slug] += weight

    return counts


def _item_text(item: Dict) -> str:
    """Assemble the searchable text for a content item.

    Includes the Dev.to `description` and comma `tags` string in addition to
    title / tag_list / subreddit — these carry real tool mentions that were
    previously ignored, so more posts now attribute to a tool.
    """
    title = item.get("title", "") or ""
    tag_list = item.get("tag_list", [])
    tags = " ".join(tag_list) if isinstance(tag_list, list) else (item.get("tags", "") or "")
    subreddit = item.get("subreddit", "") or ""
    description = item.get("description", "") or ""
    return f"{title} {tags} {subreddit} {description}".strip()


def count_mentions(items: List[Dict], all_tool_slugs: set) -> Dict[str, int]:
    """Raw mention counts — how many items mention each tool.

    Unlike `count_weighted_mentions`, this returns integer counts (one per
    matching item) and does NOT apply sentiment weighting. This is what the
    UI's "N mentions" reflects: with sentiment disabled, a single mention must
    still count as 1 (the old code multiplied by the 0.5 neutral weight and then
    `round()`-ed, so isolated mentions silently became 0).
    """
    counts: Dict[str, int] = {slug: 0 for slug in all_tool_slugs}
    for item in items:
        matched = classify_text_to_tools(_item_text(item))
        for slug in matched:
            if slug in counts:
                counts[slug] += 1
    return counts


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SCORING — Percentile-based normalization
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _percentile_rank(values: List[float]) -> List[float]:
    """
    Rank a list of values into 0–100 percentile scores.
    Ties get the average rank (fractional ranking).
    """
    n = len(values)
    if n <= 1:
        return [50.0] * n

    ranks = []
    for v in values:
        less_than = sum(1 for x in values if x < v)
        equal_to = sum(1 for x in values if x == v)
        rank = less_than + (equal_to / 2.0)
        ranks.append((rank / n) * 100.0)

    return ranks


def _norm_log(val: float, floor: float, ceil: float) -> float:
    """
    Floor-anchored logarithmic normalisation → 0-100.

    Values at or below `floor` score 0; at or above `ceil` score 100. Anchoring
    to a floor (rather than dividing by log(ceil) alone) is what gives the scale
    real spread instead of bunching everything near the top.
    """
    if val <= floor:
        return 0.0
    lo, hi = math.log(floor), math.log(ceil)
    return max(0.0, min(100.0, ((math.log(val) - lo) / (hi - lo)) * 100.0))


def calculate_star_velocity(
    history: List[Dict[str, Any]],
    min_days: float = 3.0,
) -> Optional[float]:
    """
    Real momentum: percent star growth per week, from absolute star history.

    `history` is a list of {"recorded_at": datetime, "stars": int|None} in any
    order. Points without an absolute star count are ignored — a delta cannot be
    interpreted without knowing its interval, and guessing is fabrication.

    Returns None when momentum is genuinely unknowable (fewer than two usable
    points, or a span shorter than `min_days`). Callers MUST render that as
    "building history", never as 0.0% — those mean very different things.
    """
    points = sorted(
        [h for h in history if h.get("stars") is not None and h.get("recorded_at")],
        key=lambda h: h["recorded_at"],
    )
    if len(points) < 2:
        return None

    first, last = points[0], points[-1]
    days = (last["recorded_at"] - first["recorded_at"]).total_seconds() / 86400.0
    if days < min_days or not first["stars"]:
        return None

    growth = (last["stars"] - first["stars"]) / first["stars"]
    return round((growth / days) * 7.0 * 100.0, 2)


def calculate_all_tool_scores(
    tool_data: List[Dict[str, Any]],
) -> List[float]:
    """
    Score every tool on an ABSOLUTE 0-100 scale.

    Absolute, not relative: a tool's score depends only on its own signals, so it
    does not move when unrelated tools move, and a rise genuinely means the tool
    grew. (An earlier docstring here claimed percentile ranking — it never did;
    `_percentile_rank` below is unused and kept only for reference.)

    Input: list of dicts, each with keys:
        stars, forks, hn_count, devto_count, reddit_count, news_count

    Weights:
        GitHub stars:       60%  (adoption — the reliable signal)
        GitHub forks:       15%  (usage; correlates with stars, so kept light)
        Community activity: 25%  (HN + Dev.to + Reddit + news mentions)

    Returns: list of scores (same order as input), each 0-100.
    """
    if not tool_data:
        return []

    scores = []
    for d in tool_data:
        stars = d.get("stars", 0)
        forks = d.get("forks", 0)
        hn_count = d.get("hn_count", 0)
        devto_count = d.get("devto_count", 0)
        reddit_count = d.get("reddit_count", 0)
        news_count = d.get("news_count", 0)

        # Floor-anchored log normalisation.
        #
        # The old form was log(v)/log(max), which has no floor — an 8.5k-star repo
        # scored 73/100 against React's 99.8, so every tool collapsed into a narrow
        # 56-76 band and the number told the user nothing. Anchoring to a floor
        # spreads the scale across its full range.
        stars_norm = _norm_log(stars, floor=500, ceil=300_000)
        forks_norm = _norm_log(forks, floor=50, ceil=60_000)

        # One combined activity signal. Previously each source saturated at 5
        # mentions, so a single busy cycle pinned it to 100 and the score lurched
        # (React swung 85 -> 76 on noise). Saturating on the total, higher up,
        # makes a handful of mentions register as a handful.
        total_mentions = hn_count + devto_count + reddit_count + news_count
        activity_norm = min(100.0, (total_mentions / 25.0) * 100.0)

        # Weighting: GitHub adoption is the reliable signal and anchors the score;
        # forks is largely a restatement of stars so it is deliberately light.
        # No flat base — a tool has to earn its number.
        score = (
            stars_norm * 0.60 +
            forks_norm * 0.15 +
            activity_norm * 0.25
        )
        scores.append(round(max(0.0, min(score, 100.0)), 1))

    return scores


def calculate_tool_score(
    stars: int,
    forks: int,
    hn_count: int,
    devto_count: int,
    reddit_count: int = 0,
    news_count: int = 0,
) -> float:
    """
    Fallback: single-tool score using log normalization.
    Used only when percentile ranking is not possible (e.g., single tool insert).
    Prefer calculate_all_tool_scores() for batch scoring.
    """
    def normalize(count: int, saturation: int) -> float:
        if count <= 0:
            return 0.0
        return min(100.0, (math.log(count + 1) / math.log(saturation + 1)) * 100)

    stars_norm = normalize(stars, 200000)
    forks_norm = normalize(forks, 50000)
    hn_norm = normalize(hn_count, 10)
    devto_norm = normalize(devto_count, 8)
    reddit_norm = normalize(reddit_count, 15)
    news_norm = normalize(news_count, 5)

    score = (
        stars_norm * 0.25 +
        forks_norm * 0.05 +
        hn_norm * 0.25 +
        devto_norm * 0.10 +
        reddit_norm * 0.20 +
        news_norm * 0.10 +
        5.0
    )

    return round(min(score, 100.0), 1)


def classify_growth_stage(score: float) -> str:
    """
    Classify a tool's growth stage based on its trend score.
    """
    # Thresholds retuned for the absolute scale (scores now span ~25-95 instead
    # of bunching in 56-76, so the old 45/75 cut-points no longer fit).
    if score < 20:
        return "Declining"
    elif score < 40:
        return "Emerging"
    elif score < 70:
        return "Growing"
    else:
        return "Mature"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DECISION INTELLIGENCE LAYER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def classify_trend(growth_pct: float) -> str:
    """
    Classify trend direction from growth percentage.

    > 15%   → rising
    5-15%   → growing
    -5 to 5 → stable
    < -5%   → declining
    """
    if growth_pct > 15:
        return "rising"
    elif growth_pct > 5:
        return "growing"
    elif growth_pct >= -5:
        return "stable"
    else:
        return "declining"


def generate_recommendation(tool_name: str, trend_stage: str, score: float) -> str:
    """
    Generate a human-readable recommendation based on trend stage.
    """
    templates = {
        "rising": (
            f"🚀 {tool_name} is experiencing strong growth with significant momentum "
            f"(score: {score}). High demand in the job market — consider prioritizing this skill."
        ),
        "growing": (
            f"📈 {tool_name} shows steady demand and consistent community engagement "
            f"(score: {score}). A solid choice for skill development."
        ),
        "stable": (
            f"📊 {tool_name} is a mature, established tool with stable adoption "
            f"(score: {score}). Reliable for career investment with proven industry use."
        ),
        "declining": (
            f"⚠️ {tool_name} shows reduced activity and waning interest "
            f"(score: {score}). Consider alternatives unless already deeply invested."
        ),
    }
    return templates.get(trend_stage, f"{tool_name} is being tracked (score: {score}).")


def classify_learning_priority(trend_stage: str) -> str:
    """
    Map trend stage to learning priority for students.

    rising   → HIGH
    growing  → MEDIUM
    stable   → LOW
    declining → AVOID
    """
    priority_map = {
        "rising": "HIGH",
        "growing": "MEDIUM",
        "stable": "LOW",
        "declining": "AVOID",
    }
    return priority_map.get(trend_stage, "MEDIUM")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SUMMARIES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def generate_tool_summary(
    tool_name: str,
    score: float,
    stage: str,
    stars: int,
    hn_count: int,
    devto_count: int,
    reddit_count: int = 0,
    news_count: int = 0,
) -> str:
    """Generate a concise summary for a tool based on its signals."""
    total = hn_count + devto_count + reddit_count + news_count
    if total == 0 and stars == 0:
        return f"{tool_name} has limited activity across tracked sources."

    parts = []
    if stars > 0:
        parts.append(f"{stars:,} GitHub stars")
    if hn_count > 0:
        parts.append(f"{hn_count} HackerNews discussions")
    if devto_count > 0:
        parts.append(f"{devto_count} Dev.to articles")
    if reddit_count > 0:
        parts.append(f"{reddit_count} Reddit threads")
    if news_count > 0:
        parts.append(f"{news_count} news mentions")

    if len(parts) > 1:
        signal_text = ", ".join(parts[:-1]) + f" and {parts[-1]}"
    else:
        signal_text = parts[0] if parts else "no signals"

    stage_text = {
        "Mature": "showing sustained strong momentum",
        "Growing": "experiencing significant growth",
        "Emerging": "gaining early traction",
        "Declining": "showing reduced activity",
    }.get(stage, "being actively tracked")

    return f"{tool_name} is {stage_text} with {signal_text} detected."
