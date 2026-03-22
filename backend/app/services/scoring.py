from typing import List, Dict, Any

def calculate_trend_score(github_count: int, hn_mentions: int, devto_mentions: int) -> float:
    """
    Returns the raw core trend score based on weighted inputs.
    Normalization to a 0-100 scale will happen dynamically.
    """
    github_signal = min(github_count, 10) * 5
    discussion_signal = min(hn_mentions, 5) * 3
    article_signal = min(devto_mentions, 5) * 2
    
    raw_score = github_signal + discussion_signal + article_signal
    momentum_score = min(raw_score, 100)
    return float(momentum_score)

def get_category_for_tech(tech_name: str) -> str:
    """Map technology to its domain category."""
    categories = {
        "LangGraph": "AI / LLM",
        "CrewAI": "AI / LLM",
        "Ollama": "AI / LLM",
        "AutoGPT": "AI / LLM",
        "LlamaIndex": "AI / LLM",
        "Supabase": "Backend Systems",
        "Qdrant": "Databases",
        "Weaviate": "Databases",
        "Chroma": "Databases",
        "Bun": "Backend Systems",
        "Astro": "Web Development",
        "SvelteKit": "Web Development",
        "HTMX": "Web Development",
        "TRPC": "Web Development",
        "Vite": "Web Development",
        "Turborepo": "Developer Tools",
        "Docker": "DevOps",
        "Kubernetes": "DevOps"
    }
    return categories.get(tech_name, "Emerging Tool")

def extract_technologies(text: str) -> List[str]:
    """
    Strictly filters out mature languages and baseline tools.
    Prioritizes detection of new emerging frameworks and platforms.
    """
    if not text:
        return []
        
    text_lower = text.lower()
    
    # EXCLUDE Baseline / Mature: Python, JavaScript, React, AWS, Docker, Java, C++, TypeScript
    # FOCUS ON: Emerging Frameworks, AI Agents, Vector DBs, Edge Tools
    
    emerging_tech = get_emerging_tech_dict()
    
    found = set()
    for key, formal_name in emerging_tech.items():
        if key in text_lower:
            found.add(formal_name)
            
    return list(found)

def get_emerging_tech_dict() -> Dict[str, str]:
    return {
        "langgraph": "LangGraph",
        "crewai": "CrewAI",
        "ollama": "Ollama",
        "autogpt": "AutoGPT",
        "llamaindex": "LlamaIndex",
        "supabase": "Supabase",
        "qdrant": "Qdrant",
        "weaviate": "Weaviate",
        "chromadb": "Chroma",
        "chroma": "Chroma",
        "bun": "Bun",
        "astro": "Astro",
        "sveltekit": "SvelteKit",
        "htmx": "HTMX",
        "trpc": "TRPC",
        "vite": "Vite",
        "turborepo": "Turborepo"
    }
