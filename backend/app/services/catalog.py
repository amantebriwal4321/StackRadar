"""
StackRadar — Unified Tool Catalog (single source of truth).

Every technology StackRadar tracks is defined ONCE here. Both the seeder
(app/services/seed.py) and the scoring engine (app/services/scoring.py) read
from this list, so the display catalog and the mention-tracking registry can
never drift apart again.

Each entry carries three concerns in one place:
  • Display     — name, slug, icon, category, description
  • Learning    — level, is_entry_point, seq, parent_slug (roadmap placement)
  • Scraping    — github_repo, keywords (how HN/Reddit/Dev.to mentions are
                  attributed to this tool)

`category` MUST match a Domain name in seed.SEED_DOMAINS so domain pages and
learning paths resolve. A tool tracked here is fully "learnable": every entry
sits in a domain and (via level/parent) a roadmap.
"""

# fmt: off
TOOLS = [
    # ── Web Development ─────────────────────────────────────────────
    {"name": "React",        "slug": "react",       "icon": "⚛️", "category": "Web Development",     "github_repo": "facebook/react",           "description": "A JavaScript library for building user interfaces, maintained by Meta.",        "level": "beginner",     "is_entry_point": True,  "seq": 10, "parent_slug": None,      "keywords": ["react", "reactjs", "react.js"]},
    {"name": "Tailwind CSS", "slug": "tailwindcss", "icon": "🎨", "category": "Web Development",     "github_repo": "tailwindlabs/tailwindcss", "description": "A utility-first CSS framework for rapid UI development.",                        "level": "beginner",     "is_entry_point": False, "seq": 15, "parent_slug": None,      "keywords": ["tailwind", "tailwindcss", "tailwind css"]},
    {"name": "Vite",         "slug": "vite",        "icon": "⚡", "category": "Web Development",     "github_repo": "vitejs/vite",              "description": "Next-generation frontend build tool with instant HMR.",                         "level": "beginner",     "is_entry_point": False, "seq": 20, "parent_slug": "react",   "keywords": ["vite", "vitejs"]},
    {"name": "Vue.js",       "slug": "vuejs",       "icon": "💚", "category": "Web Development",     "github_repo": "vuejs/core",               "description": "Progressive JavaScript framework for building modern web UIs.",                 "level": "intermediate", "is_entry_point": False, "seq": 30, "parent_slug": None,      "keywords": ["vue", "vuejs", "vue.js"]},
    {"name": "Svelte",       "slug": "svelte",      "icon": "🔥", "category": "Web Development",     "github_repo": "sveltejs/svelte",          "description": "Cybernetically enhanced web apps — compiles to minimal JS.",                    "level": "intermediate", "is_entry_point": False, "seq": 35, "parent_slug": None,      "keywords": ["svelte", "sveltekit"]},
    {"name": "Next.js",      "slug": "nextjs",      "icon": "▲",  "category": "Web Development",     "github_repo": "vercel/next.js",           "description": "The React framework for production — SSR, SSG, and API routes.",                "level": "intermediate", "is_entry_point": False, "seq": 40, "parent_slug": "react",   "keywords": ["next.js", "nextjs"]},
    {"name": "FastAPI",      "slug": "fastapi",     "icon": "🐍", "category": "Web Development",     "github_repo": "fastapi/fastapi",          "description": "Modern, fast (high-performance) Python web framework for building APIs.",        "level": "intermediate", "is_entry_point": False, "seq": 45, "parent_slug": None,      "keywords": ["fastapi", "fast api"]},
    {"name": "Astro",        "slug": "astro",       "icon": "🚀", "category": "Web Development",     "github_repo": "withastro/astro",          "description": "The web framework for content-driven websites with island architecture.",       "level": "intermediate", "is_entry_point": False, "seq": 50, "parent_slug": None,      "keywords": ["astro"]},
    {"name": "tRPC",         "slug": "trpc",        "icon": "🔗", "category": "Web Development",     "github_repo": "trpc/trpc",                "description": "End-to-end typesafe APIs for TypeScript and JavaScript.",                       "level": "advanced",     "is_entry_point": False, "seq": 70, "parent_slug": "nextjs",  "keywords": ["trpc"]},
    {"name": "Bun",          "slug": "bun",         "icon": "🍞", "category": "Web Development",     "github_repo": "oven-sh/bun",              "description": "Incredibly fast JavaScript runtime, bundler, and package manager.",             "level": "advanced",     "is_entry_point": False, "seq": 75, "parent_slug": None,      "keywords": ["bun", "bunjs"]},
    {"name": "Deno",         "slug": "deno",        "icon": "🦕", "category": "Web Development",     "github_repo": "denoland/deno",            "description": "A modern runtime for JavaScript and TypeScript with built-in security.",        "level": "advanced",     "is_entry_point": False, "seq": 80, "parent_slug": None,      "keywords": ["deno"]},

    # ── Data & Databases ────────────────────────────────────────────
    {"name": "Prisma",       "slug": "prisma",      "icon": "💎", "category": "Data & Databases",    "github_repo": "prisma/prisma",            "description": "Next-generation ORM for Node.js and TypeScript.",                               "level": "beginner",     "is_entry_point": True,  "seq": 10, "parent_slug": None,      "keywords": ["prisma"]},

    # ── AI / ML ─────────────────────────────────────────────────────
    {"name": "PyTorch",      "slug": "pytorch",     "icon": "🔥", "category": "AI / ML",             "github_repo": "pytorch/pytorch",          "description": "Open-source machine learning framework for research and production.",           "level": "beginner",     "is_entry_point": True,  "seq": 10, "parent_slug": None,      "keywords": ["pytorch", "torch"]},
    {"name": "TensorFlow",   "slug": "tensorflow",  "icon": "🧮", "category": "AI / ML",             "github_repo": "tensorflow/tensorflow",    "description": "End-to-end open source ML platform by Google.",                                 "level": "beginner",     "is_entry_point": True,  "seq": 15, "parent_slug": None,      "keywords": ["tensorflow"]},
    {"name": "Hugging Face Transformers", "slug": "transformers", "icon": "🤗", "category": "AI / ML", "github_repo": "huggingface/transformers", "description": "State-of-the-art NLP models: BERT, GPT, T5, and more.",                        "level": "intermediate", "is_entry_point": False, "seq": 40, "parent_slug": "pytorch", "keywords": ["huggingface", "transformers", "hugging face"]},
    {"name": "LangChain",    "slug": "langchain",   "icon": "🦜", "category": "AI / ML",             "github_repo": "langchain-ai/langchain",   "description": "Build LLM-powered applications with composable chains and agents.",             "level": "advanced",     "is_entry_point": False, "seq": 70, "parent_slug": "transformers", "keywords": ["langchain"]},
    {"name": "Ollama",       "slug": "ollama",      "icon": "🦙", "category": "AI / ML",             "github_repo": "ollama/ollama",            "description": "Run large language models locally with a simple CLI.",                          "level": "intermediate", "is_entry_point": False, "seq": 50, "parent_slug": None,      "keywords": ["ollama"]},

    # ── Cloud Native ────────────────────────────────────────────────
    {"name": "Supabase",     "slug": "supabase",    "icon": "⚡", "category": "Cloud Native",        "github_repo": "supabase/supabase",        "description": "Open-source Firebase alternative with Postgres backend.",                       "level": "beginner",     "is_entry_point": True,  "seq": 10, "parent_slug": None,      "keywords": ["supabase"]},
    {"name": "Terraform",    "slug": "terraform",   "icon": "🏗️", "category": "Cloud Native",        "github_repo": "hashicorp/terraform",      "description": "Infrastructure as Code tool for cloud resource management.",                    "level": "intermediate", "is_entry_point": False, "seq": 40, "parent_slug": None,      "keywords": ["terraform"]},
    {"name": "Kubernetes",   "slug": "kubernetes",  "icon": "☸️", "category": "Cloud Native",        "github_repo": "kubernetes/kubernetes",    "description": "Production-grade container orchestration system.",                              "level": "advanced",     "is_entry_point": False, "seq": 70, "parent_slug": "docker",  "keywords": ["kubernetes", "k8s"]},

    # ── DevOps ──────────────────────────────────────────────────────
    {"name": "Docker",       "slug": "docker",      "icon": "🐳", "category": "DevOps",              "github_repo": "moby/moby",                "description": "Platform for building, sharing, and running containerized apps.",               "level": "beginner",     "is_entry_point": True,  "seq": 10, "parent_slug": None,      "keywords": ["docker", "dockerfile"]},
    {"name": "Grafana",      "slug": "grafana",     "icon": "📊", "category": "DevOps",              "github_repo": "grafana/grafana",          "description": "Open-source platform for monitoring and observability dashboards.",             "level": "intermediate", "is_entry_point": False, "seq": 40, "parent_slug": "docker",  "keywords": ["grafana"]},
    {"name": "Prometheus",   "slug": "prometheus",  "icon": "📈", "category": "DevOps",              "github_repo": "prometheus/prometheus",    "description": "Systems monitoring and alerting toolkit for cloud-native environments.",        "level": "intermediate", "is_entry_point": False, "seq": 45, "parent_slug": "docker",  "keywords": ["prometheus"]},

    # ── Systems Programming ─────────────────────────────────────────
    {"name": "Rust",         "slug": "rust",        "icon": "🦀", "category": "Systems Programming", "github_repo": "rust-lang/rust",           "description": "Memory-safe systems language for performance-critical software.",               "level": "beginner",     "is_entry_point": True,  "seq": 10, "parent_slug": None,      "keywords": ["rust", "rustlang"]},
    {"name": "Go",           "slug": "go",          "icon": "🐹", "category": "Systems Programming", "github_repo": "golang/go",                "description": "Statically typed, compiled language designed for cloud infrastructure.",        "level": "beginner",     "is_entry_point": True,  "seq": 15, "parent_slug": None,      "keywords": ["golang", "go lang"]},

    # ── Cybersecurity ───────────────────────────────────────────────
    {"name": "Wireshark",    "slug": "wireshark",   "icon": "🦈", "category": "Cybersecurity",       "github_repo": "wireshark/wireshark",      "description": "The world's most popular network protocol analyzer for traffic inspection.",    "level": "beginner",     "is_entry_point": True,  "seq": 10, "parent_slug": None,      "keywords": ["wireshark"]},
    {"name": "Metasploit",   "slug": "metasploit",  "icon": "🗡️", "category": "Cybersecurity",       "github_repo": "rapid7/metasploit-framework", "description": "Penetration testing framework for finding vulnerabilities in systems.",       "level": "intermediate", "is_entry_point": False, "seq": 40, "parent_slug": "wireshark", "keywords": ["metasploit"]},
    {"name": "OWASP ZAP",    "slug": "owasp-zap",   "icon": "🛡️", "category": "Cybersecurity",       "github_repo": "zaproxy/zaproxy",          "description": "Free security tool for finding vulnerabilities in web applications.",           "level": "intermediate", "is_entry_point": False, "seq": 45, "parent_slug": "wireshark", "keywords": ["owasp zap", "owasp-zap", "zaproxy"]},

    # ── Web3 / Blockchain ───────────────────────────────────────────
    {"name": "Hardhat",      "slug": "hardhat",     "icon": "👷", "category": "Web3 / Blockchain",   "github_repo": "NomicFoundation/hardhat",  "description": "Ethereum development environment for compiling, testing, and deploying smart contracts.", "level": "beginner", "is_entry_point": True, "seq": 10, "parent_slug": None,     "keywords": ["hardhat"]},
    {"name": "Foundry",      "slug": "foundry",     "icon": "🔨", "category": "Web3 / Blockchain",   "github_repo": "foundry-rs/foundry",       "description": "Blazing-fast Solidity development toolkit written in Rust.",                     "level": "intermediate", "is_entry_point": False, "seq": 40, "parent_slug": "hardhat", "keywords": ["foundry"]},
    {"name": "Ethers.js",    "slug": "ethersjs",    "icon": "⟠",  "category": "Web3 / Blockchain",   "github_repo": "ethers-io/ethers.js",      "description": "Complete Ethereum library for interacting with the blockchain in JavaScript.",  "level": "beginner",     "is_entry_point": False, "seq": 15, "parent_slug": None,      "keywords": ["ethers.js", "ethersjs", "ethers"]},
]
# fmt: on

# Convenience lookups derived from the single source of truth.
TOOLS_BY_SLUG = {t["slug"]: t for t in TOOLS}
CATALOG_SLUGS = frozenset(TOOLS_BY_SLUG.keys())
