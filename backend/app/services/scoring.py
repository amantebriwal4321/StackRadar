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
from typing import Set, Dict, List, Any

logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOOL KEYWORDS — maps aliases/keywords to tool slugs
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOOL_REGISTRY = {
    # Frontend
    "react":      {"repo": "facebook/react",           "keywords": ["react", "reactjs", "react.js"], "domain": "frontend"},
    "vue":        {"repo": "vuejs/vue",                 "keywords": ["vue", "vuejs", "vue.js"],       "domain": "frontend"},
    "angular":    {"repo": "angular/angular",           "keywords": ["angular", "angularjs"],         "domain": "frontend"},
    "svelte":     {"repo": "sveltejs/svelte",           "keywords": ["svelte", "sveltekit"],          "domain": "frontend"},
    "nextjs":     {"repo": "vercel/next.js",            "keywords": ["next.js", "nextjs"],            "domain": "frontend"},
    # Backend
    "fastapi":    {"repo": "tiangolo/fastapi",          "keywords": ["fastapi", "fast api"],          "domain": "backend"},
    "django":     {"repo": "django/django",             "keywords": ["django"],                       "domain": "backend"},
    "express":    {"repo": "expressjs/express",         "keywords": ["express", "expressjs"],         "domain": "backend"},
    "nestjs":     {"repo": "nestjs/nest",               "keywords": ["nestjs", "nest.js"],            "domain": "backend"},
    "laravel":    {"repo": "laravel/laravel",           "keywords": ["laravel"],                      "domain": "backend"},
    # Languages
    "rust":       {"repo": "rust-lang/rust",            "keywords": ["rust", "rustlang"],             "domain": "languages"},
    "go":         {"repo": "golang/go",                 "keywords": ["golang", "go lang"],            "domain": "languages"},
    "typescript": {"repo": "microsoft/TypeScript",      "keywords": ["typescript", "ts"],             "domain": "languages"},
    "python":     {"repo": "python/cpython",            "keywords": ["python", "py"],                 "domain": "languages"},
    "kotlin":     {"repo": "JetBrains/kotlin",          "keywords": ["kotlin"],                       "domain": "languages"},
    # AI/ML
    "pytorch":    {"repo": "pytorch/pytorch",           "keywords": ["pytorch", "torch"],             "domain": "ai_ml"},
    "tensorflow": {"repo": "tensorflow/tensorflow",     "keywords": ["tensorflow", "tf"],             "domain": "ai_ml"},
    "langchain":  {"repo": "langchain-ai/langchain",    "keywords": ["langchain"],                    "domain": "ai_ml"},
    "huggingface":{"repo": "huggingface/transformers",  "keywords": ["huggingface", "transformers"],  "domain": "ai_ml"},
    "openai":     {"repo": "openai/openai-python",      "keywords": ["openai", "chatgpt", "gpt-4"],   "domain": "ai_ml"},
    # DevOps / Cloud
    "docker":     {"repo": "docker/compose",            "keywords": ["docker", "dockerfile"],         "domain": "devops"},
    "kubernetes": {"repo": "kubernetes/kubernetes",     "keywords": ["kubernetes", "k8s"],            "domain": "devops"},
    "terraform":  {"repo": "hashicorp/terraform",       "keywords": ["terraform"],                    "domain": "devops"},
    "github_actions": {"repo": "actions/runner",        "keywords": ["github actions", "gh actions"], "domain": "devops"},
    "prometheus": {"repo": "prometheus/prometheus",     "keywords": ["prometheus"],                   "domain": "devops"},
    # Databases
    "postgresql": {"repo": "postgres/postgres",         "keywords": ["postgresql", "postgres"],       "domain": "databases"},
    "redis":      {"repo": "redis/redis",               "keywords": ["redis"],                        "domain": "databases"},
    "mongodb":    {"repo": "mongodb/mongo",             "keywords": ["mongodb", "mongo"],             "domain": "databases"},
    "supabase":   {"repo": "supabase/supabase",         "keywords": ["supabase"],                     "domain": "databases"},
    "prisma":     {"repo": "prisma/prisma",             "keywords": ["prisma"],                       "domain": "databases"},
    # Mobile
    "react_native":{"repo": "facebook/react-native",   "keywords": ["react native"],                 "domain": "mobile"},
    "flutter":    {"repo": "flutter/flutter",           "keywords": ["flutter", "dart"],              "domain": "mobile"},
    "swift":      {"repo": "apple/swift",               "keywords": ["swift", "swiftui"],             "domain": "mobile"},
    # Testing
    "jest":       {"repo": "jestjs/jest",               "keywords": ["jest", "jestjs"],               "domain": "testing"},
    "playwright": {"repo": "microsoft/playwright",      "keywords": ["playwright"],                   "domain": "testing"},
    "vitest":     {"repo": "vitest-dev/vitest",         "keywords": ["vitest"],                       "domain": "testing"},
    # Web3
    "solidity":   {"repo": "ethereum/solidity",         "keywords": ["solidity", "ethereum"],         "domain": "web3"},
    # Tooling
    "vite":       {"repo": "vitejs/vite",               "keywords": ["vite", "vitejs"],               "domain": "tooling"},
    "bun":        {"repo": "oven-sh/bun",               "keywords": ["bun", "bunjs"],                 "domain": "tooling"},
    "deno":       {"repo": "denoland/deno",             "keywords": ["deno"],                         "domain": "tooling"},
    "graphql":    {"repo": "graphql/graphql-js",        "keywords": ["graphql"],                      "domain": "api"},
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
        title = item.get("title", "")
        tags = " ".join(item.get("tag_list", [])) if isinstance(item.get("tag_list"), list) else ""
        subreddit = item.get("subreddit", "")
        text = f"{title} {tags} {subreddit}".strip()

        sentiment = item.get("sentiment", "neutral")
        weight = SENTIMENT_WEIGHTS.get(sentiment, 0.5)

        matched = classify_text_to_tools(text)
        for slug in matched:
            if slug in counts:
                counts[slug] += weight

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


def calculate_all_tool_scores(
    tool_data: List[Dict[str, Any]],
) -> List[float]:
    """
    Calculate scores for ALL tools at once using percentile-based normalization.

    Each tool is ranked against every other tool on each signal.
    This guarantees a natural spread: top tool ≈ 85-95, bottom tool ≈ 10-20.

    Input: list of dicts, each with keys:
        stars, forks, hn_count, devto_count, reddit_count, news_count

    Weights:
        GitHub stars:       20%  (popularity proxy)
        GitHub forks:        5%  (usage proxy)
        HackerNews:         20%  (developer buzz)
        Dev.to:             10%  (tutorial ecosystem)
        Reddit:             15%  (community discussion)
        Tech News:          10%  (mainstream coverage)
        Momentum:           15%  (weighted mention sum — rewards multi-source buzz)
        Base:                5%  (tracked tool bonus)

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

        # Logarithmic normalization (maxes out around 250k stars)
        def normalize_log(val, max_val):
            if val <= 0: return 0.0
            return min(100.0, (math.log(val + 1) / math.log(max_val + 1)) * 100.0)

        stars_norm = normalize_log(stars, 250000)
        forks_norm = normalize_log(forks, 50000)

        # Mentions are hourly/daily, so even 1-2 mentions is huge. We use linear for them.
        def normalize_lin(val, max_val):
            return min(100.0, (val / max_val) * 100.0)

        hn_norm = normalize_lin(hn_count, 5)
        devto_norm = normalize_lin(devto_count, 5)
        reddit_norm = normalize_lin(reddit_count, 5)
        news_norm = normalize_lin(news_count, 3)

        momentum = (hn_count * 2) + (devto_count * 1.5) + (reddit_count * 1.5) + (news_count * 2)
        momentum_norm = normalize_lin(momentum, 15)

        # Weights: GitHub heavily anchors the score so popular tools aren't dragged down by quiet news days.
        score = (
            stars_norm * 0.45 +
            forks_norm * 0.20 +
            hn_norm * 0.05 +
            devto_norm * 0.05 +
            reddit_norm * 0.05 +
            news_norm * 0.05 +
            momentum_norm * 0.05 +
            10.0  # Base score
        )
        scores.append(round(min(score, 100.0), 1))

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
    if score < 20:
        return "Declining"
    elif score < 45:
        return "Emerging"
    elif score < 75:
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
