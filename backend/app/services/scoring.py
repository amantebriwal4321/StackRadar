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

TOOL_KEYWORDS: Dict[str, List[str]] = {
    # Web Development
    "react": ["react", "reactjs", "react.js", "react hooks", "jsx", "react server component", "react native"],
    "nextjs": ["next.js", "nextjs", "next js", "vercel next"],
    "vuejs": ["vue", "vuejs", "vue.js", "vue 3", "nuxt", "nuxtjs"],
    "svelte": ["svelte", "sveltekit", "svelte kit"],
    "astro": ["astro", "astro.build", "astro framework"],
    "vite": ["vite", "vitejs", "vite.js"],
    "tailwindcss": ["tailwind", "tailwindcss", "tailwind css"],
    "fastapi": ["fastapi", "fast api", "fast-api"],
    "trpc": ["trpc", "t3 stack"],
    "bun": ["bun", "bunjs", "bun runtime"],
    "deno": ["deno", "denoland", "deno deploy"],
    "prisma": ["prisma", "prisma orm", "prisma client"],

    # AI / ML
    "pytorch": ["pytorch", "torch", "torchvision", "torch.nn", "libtorch"],
    "tensorflow": ["tensorflow", "tf.", "keras", "tf2", "tensorboard"],
    "langchain": ["langchain", "langgraph", "langsmith"],
    "transformers": ["hugging face", "huggingface", "transformers", "diffusers", "tokenizers"],
    "ollama": ["ollama", "llama.cpp", "local llm"],

    # Cloud Native
    "kubernetes": ["kubernetes", "k8s", "kubectl", "helm chart", "eks", "aks", "gke"],
    "terraform": ["terraform", "hashicorp terraform", "hcl", "opentofu"],
    "supabase": ["supabase", "supabase auth", "supabase edge"],

    # DevOps
    "docker": ["docker", "dockerfile", "docker compose", "docker-compose", "container", "moby"],
    "grafana": ["grafana", "grafana dashboard", "grafana cloud"],
    "prometheus": ["prometheus", "promql", "prometheus metrics"],

    # Systems
    "rust": ["rust", "rustlang", "rust-lang", "cargo", "crate", "rustc"],
    "go": ["golang", "go lang", "goroutine", "go module"],

    # Cybersecurity
    "wireshark": ["wireshark", "packet capture", "pcap", "network analyzer"],
    "metasploit": ["metasploit", "msfconsole", "metasploit framework", "pentest"],
    "owasp-zap": ["owasp zap", "zap proxy", "zaproxy", "owasp"],

    # Web3 / Blockchain
    "hardhat": ["hardhat", "hardhat deploy", "hardhat test"],
    "foundry": ["foundry", "forge test", "foundry-rs", "cast send"],
    "ethersjs": ["ethers.js", "ethersjs", "ethers js", "ethers provider"],
}


def classify_text_to_tools(text: str) -> Set[str]:
    """
    Classify a text string into matching tool slugs based on keyword matching.
    Returns a set of tool slugs (e.g. {"react", "pytorch"}).
    """
    if not text:
        return set()

    text_lower = text.lower()
    matched_tools: Set[str] = set()

    for tool_slug, keywords in TOOL_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
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
# SCORING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def calculate_tool_score(
    stars: int,
    forks: int,
    hn_count: int,
    devto_count: int,
    reddit_count: int = 0,
    news_count: int = 0,
) -> float:
    """
    Calculate a 0-100 trend score using weighted, normalized, multi-source signals.

    Weights:
        GitHub stars:       25%  (popularity proxy)
        GitHub forks:        5%  (usage proxy)
        HackerNews:         25%  (developer buzz)
        Dev.to:             10%  (tutorial ecosystem)
        Reddit:             20%  (community discussion)
        Tech News:          10%  (mainstream coverage)
        Base:                5%  (tracked tool bonus)
    """
    def normalize(count: int, saturation: int) -> float:
        """Convert a raw count to 0-100 using diminishing returns (log scale)."""
        if count <= 0:
            return 0.0
        return min(100.0, (math.log(count + 1) / math.log(saturation + 1)) * 100)

    stars_norm = normalize(stars, 200000)     # 200k stars = 100%
    forks_norm = normalize(forks, 50000)      # 50k forks = 100%
    hn_norm = normalize(hn_count, 10)         # 10 mentions = 100%
    devto_norm = normalize(devto_count, 8)    # 8 articles = 100%
    reddit_norm = normalize(reddit_count, 15) # 15 posts = 100%
    news_norm = normalize(news_count, 5)      # 5 articles = 100%

    score = (
        stars_norm * 0.25 +
        forks_norm * 0.05 +
        hn_norm * 0.25 +
        devto_norm * 0.10 +
        reddit_norm * 0.20 +
        news_norm * 0.10 +
        5.0  # Base score for being a tracked tool
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
