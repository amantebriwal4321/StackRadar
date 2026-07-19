"""
Seed data for the StackRadar platform.

Seeds:
  - 8 Domains (AI/ML, Web Dev, Cloud Native, DevOps, etc.)
  - ~25 Tools with their canonical GitHub repos
  - 8 Roadmaps (migrated from the old frontend hardcoded data)

Called once on startup if the tools table is empty.
"""

import json
import logging
from sqlalchemy.orm import Session
from app.models.all_models import Domain, Tool, ToolRoadmap, ToolSnapshot
from app.services.catalog import TOOLS as SEED_TOOLS, CATALOG_SLUGS

logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOMAINS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEED_DOMAINS = [
    {"name": "AI / ML",              "slug": "ai-ml",           "icon": "🧠"},
    {"name": "Web Development",      "slug": "web-development", "icon": "🌐"},
    {"name": "Cloud Native",         "slug": "cloud-native",    "icon": "☁️"},
    {"name": "DevOps",               "slug": "devops",          "icon": "🔧"},
    {"name": "Systems Programming",  "slug": "systems",         "icon": "⚙️"},
    {"name": "Cybersecurity",        "slug": "cybersecurity",   "icon": "🛡️"},
    {"name": "Web3 / Blockchain",    "slug": "web3",            "icon": "⛓️"},
    {"name": "Data & Databases",     "slug": "data-databases",  "icon": "🗄️"},
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOOLS — imported from app/services/catalog.py (single source of truth).
# SEED_TOOLS is now `catalog.TOOLS` (see the import above). The literal list
# that used to live here was removed so the display catalog and the scraper's
# mention-tracking registry can never drift apart again.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROADMAPS (migrated from frontend/src/data/roadmaps.ts)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEED_ROADMAPS = [
    {
        "slug": "ai-ml",
        "title": "AI / Machine Learning",
        "description": "From Python fundamentals to deploying production ML models and working with LLMs.",
        "icon": "🧠",
        "estimated_weeks": 24,
        "steps": [
            {"step": 1, "title": "Python Programming Fundamentals", "level": "Beginner", "description": "Master Python syntax, data structures, OOP, and essential libraries like NumPy and Pandas.", "resources": [{"label": "Python Official Tutorial", "url": "https://docs.python.org/3/tutorial/"}, {"label": "Automate the Boring Stuff", "url": "https://automatetheboringstuff.com/"}]},
            {"step": 2, "title": "Mathematics for ML", "level": "Beginner", "description": "Linear algebra, calculus, probability, and statistics.", "resources": [{"label": "3Blue1Brown Linear Algebra", "url": "https://www.3blue1brown.com/topics/linear-algebra"}, {"label": "Khan Academy Statistics", "url": "https://www.khanacademy.org/math/statistics-probability"}]},
            {"step": 3, "title": "Core ML Algorithms", "level": "Intermediate", "description": "Supervised and unsupervised learning: regression, classification, clustering, decision trees.", "resources": [{"label": "Scikit-learn Documentation", "url": "https://scikit-learn.org/stable/user_guide.html"}, {"label": "Andrew Ng's ML Course", "url": "https://www.coursera.org/learn/machine-learning"}]},
            {"step": 4, "title": "Deep Learning & Neural Networks", "level": "Intermediate", "description": "CNNs, RNNs, Transformers — build and train neural networks with PyTorch or TensorFlow.", "resources": [{"label": "Fast.ai Practical DL", "url": "https://course.fast.ai/"}, {"label": "PyTorch Tutorials", "url": "https://pytorch.org/tutorials/"}]},
            {"step": 5, "title": "LLMs & Prompt Engineering", "level": "Advanced", "description": "Work with large language models, fine-tuning, RAG pipelines, and AI agents.", "resources": [{"label": "Hugging Face Course", "url": "https://huggingface.co/course"}, {"label": "LangChain Documentation", "url": "https://docs.langchain.com/"}]},
            {"step": 6, "title": "MLOps & Deployment", "level": "Advanced", "description": "Model serving, monitoring, CI/CD for ML, and production deployment patterns.", "resources": [{"label": "MLflow Documentation", "url": "https://mlflow.org/docs/latest/index.html"}, {"label": "Made With ML - MLOps", "url": "https://madewithml.com/"}]},
        ],
    },
    {
        "slug": "web-development",
        "title": "Web Development",
        "description": "Master modern web development from HTML/CSS to full-stack frameworks and deployment.",
        "icon": "🌐",
        "estimated_weeks": 20,
        "steps": [
            {"step": 1, "title": "HTML, CSS & JavaScript", "level": "Beginner", "description": "Core web technologies: semantic HTML, responsive CSS, and modern JavaScript (ES6+).", "resources": [{"label": "MDN Web Docs", "url": "https://developer.mozilla.org/"}, {"label": "freeCodeCamp", "url": "https://www.freecodecamp.org/"}]},
            {"step": 2, "title": "React / Vue / Svelte", "level": "Intermediate", "description": "Component-based UI frameworks, state management, and build tooling.", "resources": [{"label": "React Official Docs", "url": "https://react.dev/"}, {"label": "Vue.js Guide", "url": "https://vuejs.org/guide/introduction.html"}]},
            {"step": 3, "title": "Backend & APIs", "level": "Intermediate", "description": "REST and GraphQL APIs with Node.js, Python (FastAPI), or Go.", "resources": [{"label": "FastAPI Tutorial", "url": "https://fastapi.tiangolo.com/tutorial/"}, {"label": "Node.js Docs", "url": "https://nodejs.org/en/docs/guides"}]},
            {"step": 4, "title": "Databases & ORMs", "level": "Intermediate", "description": "PostgreSQL, MongoDB, Prisma, and database design patterns.", "resources": [{"label": "Prisma Getting Started", "url": "https://www.prisma.io/docs/getting-started"}, {"label": "PostgreSQL Tutorial", "url": "https://www.postgresqltutorial.com/"}]},
            {"step": 5, "title": "Full-Stack Deployment", "level": "Advanced", "description": "CI/CD, Docker, Vercel/AWS, monitoring, and production best practices.", "resources": [{"label": "Vercel Docs", "url": "https://vercel.com/docs"}, {"label": "Docker Getting Started", "url": "https://docs.docker.com/get-started/"}]},
        ],
    },
    {
        "slug": "cloud-native",
        "title": "Cloud Native",
        "description": "Master containers, Kubernetes, serverless, and cloud-native architecture patterns.",
        "icon": "☁️",
        "estimated_weeks": 18,
        "steps": [
            {"step": 1, "title": "Docker & Containers", "level": "Beginner", "description": "Container fundamentals, Dockerfiles, multi-stage builds, Docker Compose.", "resources": [{"label": "Docker Getting Started", "url": "https://docs.docker.com/get-started/"}, {"label": "Play with Docker", "url": "https://labs.play-with-docker.com/"}]},
            {"step": 2, "title": "Kubernetes Fundamentals", "level": "Intermediate", "description": "Pods, Services, Deployments, ConfigMaps, Secrets, and kubectl mastery.", "resources": [{"label": "Kubernetes Official Docs", "url": "https://kubernetes.io/docs/tutorials/"}, {"label": "KillerCoda Scenarios", "url": "https://killercoda.com/kubernetes"}]},
            {"step": 3, "title": "Serverless & FaaS", "level": "Intermediate", "description": "AWS Lambda, Azure Functions, Vercel Edge Functions, and event-driven architectures.", "resources": [{"label": "Serverless Framework", "url": "https://www.serverless.com/framework/docs"}, {"label": "AWS Lambda Guide", "url": "https://docs.aws.amazon.com/lambda/"}]},
            {"step": 4, "title": "Service Mesh & Observability", "level": "Advanced", "description": "Istio, Linkerd, distributed tracing, and cloud-native observability.", "resources": [{"label": "Istio Documentation", "url": "https://istio.io/latest/docs/"}, {"label": "OpenTelemetry Docs", "url": "https://opentelemetry.io/docs/"}]},
        ],
    },
    {
        "slug": "devops",
        "title": "DevOps / Platform Engineering",
        "description": "Build CI/CD pipelines, infrastructure as code, and internal developer platforms.",
        "icon": "🔧",
        "estimated_weeks": 16,
        "steps": [
            {"step": 1, "title": "Linux & Shell Scripting", "level": "Beginner", "description": "Linux administration, Bash scripting, cron jobs, and system monitoring.", "resources": [{"label": "Linux Journey", "url": "https://linuxjourney.com/"}, {"label": "Shell Scripting Tutorial", "url": "https://www.shellscript.sh/"}]},
            {"step": 2, "title": "CI/CD & Version Control", "level": "Beginner", "description": "Git workflows, GitHub Actions, Jenkins, and automated testing pipelines.", "resources": [{"label": "GitHub Actions Docs", "url": "https://docs.github.com/en/actions"}, {"label": "Learn Git Branching", "url": "https://learngitbranching.js.org/"}]},
            {"step": 3, "title": "Infrastructure as Code", "level": "Intermediate", "description": "Terraform, Pulumi, Ansible — manage infrastructure declaratively.", "resources": [{"label": "Terraform Tutorials", "url": "https://developer.hashicorp.com/terraform/tutorials"}, {"label": "Ansible Getting Started", "url": "https://docs.ansible.com/ansible/latest/getting_started/"}]},
            {"step": 4, "title": "Platform Engineering & IDP", "level": "Advanced", "description": "Build internal developer platforms with Backstage, golden paths, and developer portals.", "resources": [{"label": "Backstage by Spotify", "url": "https://backstage.io/docs/overview/what-is-backstage"}, {"label": "Platform Engineering Guide", "url": "https://platformengineering.org/"}]},
        ],
    },
    {
        "slug": "cybersecurity",
        "title": "Cybersecurity",
        "description": "From networking basics to penetration testing and zero-trust architecture.",
        "icon": "🛡️",
        "estimated_weeks": 20,
        "steps": [
            {"step": 1, "title": "Networking & Linux Fundamentals", "level": "Beginner", "description": "TCP/IP, DNS, HTTP, firewalls, and command-line Linux administration.", "resources": [{"label": "TryHackMe Pre-Security", "url": "https://tryhackme.com/path/outline/presecurity"}, {"label": "Linux Journey", "url": "https://linuxjourney.com/"}]},
            {"step": 2, "title": "Security Concepts & Cryptography", "level": "Beginner", "description": "CIA triad, encryption, PKI, hashing, digital signatures.", "resources": [{"label": "OverTheWire Wargames", "url": "https://overthewire.org/wargames/"}, {"label": "Crypto101 Handbook", "url": "https://www.crypto101.io/"}]},
            {"step": 3, "title": "Penetration Testing", "level": "Intermediate", "description": "OWASP Top 10, Burp Suite, Metasploit, and vulnerability assessment.", "resources": [{"label": "PortSwigger Web Security Academy", "url": "https://portswigger.net/web-security"}, {"label": "HackTheBox", "url": "https://www.hackthebox.com/"}]},
            {"step": 4, "title": "SOC & Incident Response", "level": "Intermediate", "description": "SIEM tools, log analysis, threat hunting, and incident response.", "resources": [{"label": "Blue Team Labs", "url": "https://blueteamlabs.online/"}, {"label": "SANS Reading Room", "url": "https://www.sans.org/white-papers/"}]},
            {"step": 5, "title": "Zero Trust & Cloud Security", "level": "Advanced", "description": "Zero-trust architecture, CSPM, and DevSecOps practices.", "resources": [{"label": "NIST Zero Trust Architecture", "url": "https://www.nist.gov/publications/zero-trust-architecture"}, {"label": "AWS Security Best Practices", "url": "https://docs.aws.amazon.com/security/"}]},
        ],
    },
    {
        "slug": "web3",
        "title": "Web3 / Blockchain",
        "description": "Learn blockchain fundamentals, smart contract development, and decentralized app building.",
        "icon": "⛓️",
        "estimated_weeks": 16,
        "steps": [
            {"step": 1, "title": "Blockchain Fundamentals", "level": "Beginner", "description": "Distributed ledgers, consensus mechanisms, cryptographic hashing.", "resources": [{"label": "Bitcoin Whitepaper", "url": "https://bitcoin.org/bitcoin.pdf"}, {"label": "Blockchain Demo", "url": "https://andersbrownworth.com/blockchain/"}]},
            {"step": 2, "title": "Solidity & Smart Contracts", "level": "Intermediate", "description": "Write, test, and deploy smart contracts on Ethereum using Solidity.", "resources": [{"label": "CryptoZombies", "url": "https://cryptozombies.io/"}, {"label": "Solidity by Example", "url": "https://solidity-by-example.org/"}]},
            {"step": 3, "title": "DApp Development", "level": "Intermediate", "description": "Build full-stack decentralized applications with ethers.js and wagmi.", "resources": [{"label": "Ethereum.org Developers", "url": "https://ethereum.org/en/developers/"}, {"label": "wagmi Documentation", "url": "https://wagmi.sh/"}]},
            {"step": 4, "title": "DeFi & Advanced Protocols", "level": "Advanced", "description": "AMMs, lending protocols, oracles, and cross-chain bridges.", "resources": [{"label": "Uniswap V3 Docs", "url": "https://docs.uniswap.org/"}, {"label": "Chainlink Docs", "url": "https://docs.chain.link/"}]},
        ],
    },
    {
        "slug": "systems",
        "title": "Systems Programming",
        "description": "Master low-level programming with Rust and Go for high-performance systems.",
        "icon": "⚙️",
        "estimated_weeks": 20,
        "steps": [
            {"step": 1, "title": "Memory & OS Fundamentals", "level": "Beginner", "description": "Stack vs heap, pointers, system calls, processes, and threads.", "resources": [{"label": "Operating Systems: Three Easy Pieces", "url": "https://pages.cs.wisc.edu/~remzi/OSTEP/"}, {"label": "CS:APP", "url": "https://csapp.cs.cmu.edu/"}]},
            {"step": 2, "title": "Rust Fundamentals", "level": "Intermediate", "description": "Ownership, borrowing, lifetimes, and building CLI tools in Rust.", "resources": [{"label": "The Rust Book", "url": "https://doc.rust-lang.org/book/"}, {"label": "Rustlings", "url": "https://rustlings.cool/"}]},
            {"step": 3, "title": "Go for Backend Systems", "level": "Intermediate", "description": "Goroutines, channels, HTTP servers, and production Go patterns.", "resources": [{"label": "Go by Example", "url": "https://gobyexample.com/"}, {"label": "Effective Go", "url": "https://go.dev/doc/effective_go"}]},
            {"step": 4, "title": "Distributed Systems", "level": "Advanced", "description": "Consensus algorithms, gRPC, event-driven architectures, and fault tolerance.", "resources": [{"label": "Designing Data-Intensive Applications", "url": "https://dataintensive.net/"}, {"label": "MIT 6.824 Labs", "url": "https://pdos.csail.mit.edu/6.824/"}]},
        ],
    },
    {
        "slug": "data-databases",
        "title": "Data & Databases",
        "description": "Learn SQL, NoSQL, ORMs, and modern data engineering patterns.",
        "icon": "🗄️",
        "estimated_weeks": 12,
        "steps": [
            {"step": 1, "title": "SQL Fundamentals", "level": "Beginner", "description": "Relational databases, SQL queries, joins, indexing, and normalization.", "resources": [{"label": "SQLBolt", "url": "https://sqlbolt.com/"}, {"label": "PostgreSQL Tutorial", "url": "https://www.postgresqltutorial.com/"}]},
            {"step": 2, "title": "NoSQL & Document Databases", "level": "Intermediate", "description": "MongoDB, Redis, and when to choose NoSQL vs SQL.", "resources": [{"label": "MongoDB University", "url": "https://learn.mongodb.com/"}, {"label": "Redis University", "url": "https://university.redis.io/"}]},
            {"step": 3, "title": "ORMs & Data Modeling", "level": "Intermediate", "description": "Prisma, SQLAlchemy, Drizzle, and practical schema design.", "resources": [{"label": "Prisma Docs", "url": "https://www.prisma.io/docs"}, {"label": "SQLAlchemy Tutorial", "url": "https://docs.sqlalchemy.org/en/20/tutorial/"}]},
        ],
    },
]

# Map each tool slug to the roadmap slug for its category
TOOL_ROADMAP_MAP = {
    # AI / ML tools → ai-ml roadmap
    "pytorch": "ai-ml", "tensorflow": "ai-ml", "langchain": "ai-ml",
    "transformers": "ai-ml", "ollama": "ai-ml",
    # Web Dev tools → web-development roadmap
    "react": "web-development", "nextjs": "web-development", "vuejs": "web-development",
    "svelte": "web-development", "astro": "web-development", "vite": "web-development",
    "tailwindcss": "web-development", "fastapi": "web-development", "trpc": "web-development",
    "bun": "web-development", "deno": "web-development",
    # Cloud Native → cloud-native roadmap
    "kubernetes": "cloud-native", "terraform": "cloud-native", "supabase": "cloud-native",
    # DevOps → devops roadmap
    "docker": "devops", "grafana": "devops", "prometheus": "devops",
    # Systems → systems roadmap
    "rust": "systems", "go": "systems",
    # Data → data-databases roadmap
    "prisma": "data-databases",
    # Cybersecurity → cybersecurity roadmap
    "wireshark": "cybersecurity", "metasploit": "cybersecurity", "owasp-zap": "cybersecurity",
    # Web3 → web3 roadmap
    "hardhat": "web3", "foundry": "web3", "ethersjs": "web3",
}


def run_seed(db: Session) -> None:
    """Seed the database with domains, tools, roadmaps, and initial history snapshots."""

    existing_tools = db.query(Tool).count()
    if existing_tools > 0:
        logger.info(f"Seed: Database already has {existing_tools} tools — skipping seed.")
        return

    logger.info("Seed: Empty database detected — seeding domains, tools, and roadmaps...")

    # 1. Seed Domains
    domain_map: dict[str, Domain] = {}
    for d in SEED_DOMAINS:
        domain = Domain(name=d["name"], slug=d["slug"], icon=d["icon"])
        db.add(domain)
        db.flush()
        domain_map[d["name"]] = domain
    logger.info(f"Seed: Created {len(SEED_DOMAINS)} domains.")

    # 2. Seed Tools (first pass — create all tools without parent links)
    tool_map: dict[str, Tool] = {}
    parent_links: list[tuple[str, str]] = []  # (child_slug, parent_slug)
    for t in SEED_TOOLS:
        domain = domain_map.get(t["category"])
        tool = Tool(
            name=t["name"],
            slug=t["slug"],
            description=t["description"],
            icon=t["icon"],
            category=t["category"],
            github_repo=t["github_repo"],
            domain_id=domain.id if domain else None,
            level=t.get("level", "intermediate"),
            is_entry_point=t.get("is_entry_point", False),
            learning_sequence_score=t.get("seq", 50),
        )
        db.add(tool)
        db.flush()
        tool_map[t["slug"]] = tool
        if t.get("parent_slug"):
            parent_links.append((t["slug"], t["parent_slug"]))
    logger.info(f"Seed: Created {len(SEED_TOOLS)} tools.")

    # 2b. Link parent tools (second pass)
    for child_slug, parent_slug in parent_links:
        child = tool_map.get(child_slug)
        parent = tool_map.get(parent_slug)
        if child and parent:
            child.parent_tool_id = parent.id
    db.flush()
    logger.info(f"Seed: Linked {len(parent_links)} parent-child tool relationships.")

    # 3. Seed Roadmaps (domain-level, linked to first matching tool)
    for rm in SEED_ROADMAPS:
        # Find a tool to link this roadmap to (optional, for relational access)
        linked_tool_id = None
        for tool_slug, roadmap_slug in TOOL_ROADMAP_MAP.items():
            if roadmap_slug == rm["slug"] and tool_slug in tool_map:
                linked_tool_id = tool_map[tool_slug].id
                break

        roadmap = ToolRoadmap(
            slug=rm["slug"],
            title=rm["title"],
            description=rm["description"],
            icon=rm["icon"],
            estimated_weeks=rm["estimated_weeks"],
            steps_json=json.dumps(rm["steps"]),
            tool_id=linked_tool_id,
        )
        db.add(roadmap)
    logger.info(f"Seed: Created {len(SEED_ROADMAPS)} roadmaps.")

    # 4. History snapshots are NOT pre-seeded.
    #
    # This used to generate 7 days of `random.uniform()` scores per tool so charts
    # "wouldn't look empty" on first visit. That made every tool render a fake
    # hockey-stick growth curve — fatal for a product whose entire value is
    # trustworthy momentum data. Real history now accumulates from the scraper
    # (one snapshot per tool per cycle); until it does, charts show an honest
    # "building history" state instead of an invented one.

    db.commit()
    logger.info("Seed: Database seeded successfully!")


def reconcile_catalog(db: Session) -> None:
    """Make the live `tools` table match the curated catalog exactly.

    Runs on every startup (after run_seed). Its job is to purge rows that are
    NOT in catalog.TOOLS — i.e. the bare placeholder/duplicate tools the scraper
    used to create for every TOOL_REGISTRY slug (e.g. a category-less "Python",
    or "vue" alongside the curated "vuejs"). These are auto-generated artifacts,
    never user data, so deleting them is safe; their snapshots/roadmaps cascade.

    This is the fix for the long-standing dual-catalog data-integrity bug:
    without it, `run_seed` early-returns on a non-empty DB and the placeholder
    rows linger forever, polluting the rankings.
    """
    orphans = db.query(Tool).filter(~Tool.slug.in_(CATALOG_SLUGS)).all()
    if not orphans:
        logger.info("Reconcile: catalog is clean — no non-catalog tools to remove.")
        return

    orphan_slugs = [t.slug for t in orphans]
    for tool in orphans:
        db.delete(tool)  # cascades to snapshots + roadmap via relationships
    db.commit()
    logger.info(
        f"Reconcile: removed {len(orphans)} non-catalog tools "
        f"(placeholder/duplicate rows): {', '.join(sorted(orphan_slugs))}"
    )


