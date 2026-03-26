"""
Domain Taxonomy, Keyword Matching, and Trend Scoring Engine.

This is the intelligence core of StackRadar. It:
1. Defines 8 technology domains with keyword lists
2. Classifies any text content into matching domains
3. Calculates weighted trend scores from multi-source signals
4. Determines growth stage (Emerging / Growing / Mature / Declining)
5. Generates template-based summaries
"""

from typing import List, Dict, Any, Set


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOMAIN TAXONOMY — keywords that map content to domains
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOMAIN_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "ai-ml": {
        "name": "AI / ML",
        "icon": "🧠",
        "keywords": [
            "ai", "artificial intelligence", "machine learning", "deep learning",
            "neural network", "llm", "large language model", "gpt", "chatgpt",
            "openai", "claude", "gemini", "transformer", "bert", "diffusion",
            "stable diffusion", "midjourney", "dall-e", "copilot",
            "langchain", "langgraph", "llamaindex", "crewai", "autogpt",
            "ollama", "hugging face", "huggingface", "pytorch", "tensorflow",
            "ml ops", "mlops", "computer vision", "nlp", "natural language",
            "rag", "retrieval augmented", "fine-tuning", "fine tuning",
            "embedding", "vector database", "pinecone", "chromadb", "weaviate",
            "qdrant", "milvus", "ai agent", "ai agents", "generative ai",
            "gen ai", "genai", "prompt engineering", "model training",
        ],
    },
    "web3": {
        "name": "Web3 / Blockchain",
        "icon": "⛓️",
        "keywords": [
            "web3", "blockchain", "ethereum", "solidity", "smart contract",
            "defi", "decentralized", "nft", "dao", "dapp", "crypto",
            "cryptocurrency", "bitcoin", "layer 2", "l2", "arbitrum",
            "optimism", "polygon", "solana", "avalanche", "cosmos",
            "chainlink", "uniswap", "aave", "compound", "metamask",
            "hardhat", "foundry", "ethers.js", "wagmi", "viem",
            "zero knowledge", "zk-proof", "rollup", "tokenization",
        ],
    },
    "cybersecurity": {
        "name": "Cybersecurity",
        "icon": "🛡️",
        "keywords": [
            "cybersecurity", "security", "vulnerability", "cve", "exploit",
            "ransomware", "malware", "phishing", "zero-day", "zero day",
            "penetration testing", "pentest", "soc", "siem", "threat",
            "firewall", "encryption", "oauth", "authentication", "auth",
            "zero trust", "devsecops", "owasp", "xss", "sql injection",
            "ddos", "botnet", "intrusion detection", "incident response",
            "bug bounty", "ctf", "capture the flag", "infosec",
            "data breach", "privacy", "compliance", "gdpr",
        ],
    },
    "cloud-native": {
        "name": "Cloud Native",
        "icon": "☁️",
        "keywords": [
            "cloud native", "kubernetes", "k8s", "docker", "container",
            "serverless", "lambda", "aws", "azure", "gcp", "google cloud",
            "microservice", "service mesh", "istio", "linkerd", "envoy",
            "terraform", "pulumi", "infrastructure as code", "iac",
            "helm", "argocd", "gitops", "cloud formation", "cdk",
            "fargate", "ecs", "eks", "aks", "gke", "openshift",
            "cloud run", "vercel", "netlify", "fly.io", "railway",
            "finops", "cloud cost", "multi-cloud", "hybrid cloud",
            "platform engineering", "backstage",
        ],
    },
    "edge-computing": {
        "name": "Edge Computing",
        "icon": "📡",
        "keywords": [
            "edge computing", "edge ai", "iot", "internet of things",
            "embedded", "microcontroller", "arduino", "raspberry pi",
            "mqtt", "tinyml", "edge device", "fog computing",
            "5g", "cdn", "cloudflare workers", "deno deploy",
            "edge function", "wasm", "webassembly", "sensor",
            "real-time", "low latency", "fpga",
        ],
    },
    "ar-vr": {
        "name": "AR / VR",
        "icon": "🥽",
        "keywords": [
            "ar", "vr", "augmented reality", "virtual reality",
            "mixed reality", "spatial computing", "xr", "metaverse",
            "apple vision pro", "visionos", "quest", "oculus",
            "unity", "unreal engine", "webxr", "a-frame", "three.js",
            "3d", "holographic", "immersive",
        ],
    },
    "quantum": {
        "name": "Quantum Computing",
        "icon": "⚛️",
        "keywords": [
            "quantum", "qubit", "quantum computing", "quantum algorithm",
            "qiskit", "cirq", "pennylane", "quantum machine learning",
            "quantum error correction", "quantum cryptography",
            "quantum supremacy", "quantum advantage", "superposition",
            "entanglement", "quantum gate",
        ],
    },
    "devops": {
        "name": "DevOps",
        "icon": "🔧",
        "keywords": [
            "devops", "ci/cd", "cicd", "continuous integration",
            "continuous deployment", "github actions", "jenkins",
            "gitlab ci", "circleci", "ansible", "puppet", "chef",
            "monitoring", "prometheus", "grafana", "datadog",
            "observability", "opentelemetry", "logging", "tracing",
            "sre", "site reliability", "incident management",
            "pagerduty", "opsgenie", "infrastructure", "deploy",
            "release management", "feature flag", "canary",
        ],
    },
}


def classify_text_to_domains(text: str) -> Set[str]:
    """
    Classify a text string into matching domain slugs based on keyword matching.
    Returns a set of domain slugs (e.g. {"ai-ml", "devops"}).
    """
    if not text:
        return set()
    
    text_lower = text.lower()
    matched_domains = set()
    
    for slug, domain_info in DOMAIN_TAXONOMY.items():
        for keyword in domain_info["keywords"]:
            if keyword in text_lower:
                matched_domains.add(slug)
                break  # One match per domain is enough
    
    return matched_domains


def calculate_domain_score(
    github_count: int,
    hn_count: int,
    devto_count: int,
    reddit_count: int = 0,
    news_count: int = 0,
) -> float:
    """
    Calculate a 0-100 trend score using weighted, normalized, multi-source signals.
    
    Weights:
        GitHub activity:    30%
        HackerNews:         20%  
        Dev.to:             10%
        Reddit:             20%
        Tech News:          10%
        Recency/Base:       10%
    """
    # Normalize each signal to 0-100 range using log-scale saturation
    import math
    
    def normalize(count: int, saturation: int) -> float:
        """Convert a raw count to 0-100 using diminishing returns."""
        if count <= 0:
            return 0.0
        return min(100.0, (math.log(count + 1) / math.log(saturation + 1)) * 100)
    
    gh_norm = normalize(github_count, 50)    # 50 repos = 100%
    hn_norm = normalize(hn_count, 20)        # 20 mentions = 100%
    devto_norm = normalize(devto_count, 15)  # 15 articles = 100%
    reddit_norm = normalize(reddit_count, 25) # 25 posts = 100%
    news_norm = normalize(news_count, 10)     # 10 articles = 100%
    
    # Weighted combination
    score = (
        gh_norm * 0.30 +
        hn_norm * 0.20 +
        devto_norm * 0.10 +
        reddit_norm * 0.20 +
        news_norm * 0.10 +
        10.0  # Base activity score for tracked domains
    )
    
    return round(min(score, 100.0), 1)


def classify_growth_stage(score: float) -> str:
    """
    Classify a domain's growth stage based on its trend score.
    
    Declining:  < 20
    Emerging:   20-45
    Growing:    45-75
    Mature:     > 75
    """
    if score < 20:
        return "Declining"
    elif score < 45:
        return "Emerging"
    elif score < 75:
        return "Growing"
    else:
        return "Mature"


def generate_domain_summary(
    domain_name: str,
    score: float,
    stage: str,
    github_count: int,
    hn_count: int,
    devto_count: int,
    reddit_count: int = 0,
    news_count: int = 0,
) -> str:
    """
    Generate a concise, intelligent summary for a domain based on its signals.
    Template-based — no LLM dependency.
    """
    total_signals = github_count + hn_count + devto_count + reddit_count + news_count
    
    if total_signals == 0:
        return f"{domain_name} has limited activity across tracked sources."
    
    # Build signal breakdown
    parts = []
    if github_count > 0:
        parts.append(f"{github_count} trending GitHub repositories")
    if hn_count > 0:
        parts.append(f"{hn_count} HackerNews discussions")
    if devto_count > 0:
        parts.append(f"{devto_count} Dev.to articles")
    if reddit_count > 0:
        parts.append(f"{reddit_count} Reddit threads")
    if news_count > 0:
        parts.append(f"{news_count} tech news mentions")
    
    signal_text = ", ".join(parts[:-1]) + (f" and {parts[-1]}" if len(parts) > 1 else parts[0])
    
    # Stage-specific language
    stage_text = {
        "Mature": "showing sustained strong momentum",
        "Growing": "experiencing significant growth",
        "Emerging": "gaining early traction",
        "Declining": "showing reduced activity",
    }.get(stage, "being actively tracked")
    
    return f"{domain_name} is {stage_text} with {signal_text} detected in the latest scan."


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Legacy helpers (kept for backward compatibility with tool-level pipeline)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def calculate_trend_score(github_count: int, hn_mentions: int, devto_mentions: int) -> float:
    """Legacy scoring for individual tools."""
    github_signal = min(github_count, 10) * 5
    discussion_signal = min(hn_mentions, 5) * 3
    article_signal = min(devto_mentions, 5) * 2
    raw_score = github_signal + discussion_signal + article_signal
    return float(min(raw_score, 100))


def get_category_for_tech(tech_name: str) -> str:
    """Map individual technology to its domain category."""
    categories = {
        "LangGraph": "AI / ML", "CrewAI": "AI / ML", "Ollama": "AI / ML",
        "AutoGPT": "AI / ML", "LlamaIndex": "AI / ML",
        "Supabase": "Cloud Native", "Qdrant": "AI / ML",
        "Weaviate": "AI / ML", "Chroma": "AI / ML",
        "Bun": "DevOps", "Astro": "Cloud Native",
        "SvelteKit": "Cloud Native", "HTMX": "Cloud Native",
        "TRPC": "Cloud Native", "Vite": "DevOps",
        "Turborepo": "DevOps", "Docker": "DevOps", "Kubernetes": "DevOps",
    }
    return categories.get(tech_name, "Emerging Tool")


def extract_technologies(text: str) -> List[str]:
    """Legacy: extract individual tool names from text."""
    if not text:
        return []
    text_lower = text.lower()
    found = set()
    for key, formal_name in get_emerging_tech_dict().items():
        if key in text_lower:
            found.add(formal_name)
    return list(found)


def get_emerging_tech_dict() -> Dict[str, str]:
    return {
        "langgraph": "LangGraph", "crewai": "CrewAI", "ollama": "Ollama",
        "autogpt": "AutoGPT", "llamaindex": "LlamaIndex",
        "supabase": "Supabase", "qdrant": "Qdrant", "weaviate": "Weaviate",
        "chromadb": "Chroma", "chroma": "Chroma",
        "bun": "Bun", "astro": "Astro", "sveltekit": "SvelteKit",
        "htmx": "HTMX", "trpc": "TRPC", "vite": "Vite", "turborepo": "Turborepo",
    }
