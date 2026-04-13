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
# TOOLS — each links to a specific GitHub repo
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEED_TOOLS = [
    # Web Development — React is the entry point; Next.js/tRPC are advanced
    {"name": "React",        "slug": "react",        "icon": "⚛️",  "category": "Web Development",     "github_repo": "facebook/react",          "description": "A JavaScript library for building user interfaces, maintained by Meta.",       "level": "beginner",      "is_entry_point": True,  "seq": 10, "parent_slug": None},
    {"name": "Tailwind CSS", "slug": "tailwindcss",  "icon": "🎨",  "category": "Web Development",     "github_repo": "tailwindlabs/tailwindcss", "description": "A utility-first CSS framework for rapid UI development.",                     "level": "beginner",      "is_entry_point": False, "seq": 15, "parent_slug": None},
    {"name": "Vite",         "slug": "vite",         "icon": "⚡",  "category": "Web Development",     "github_repo": "vitejs/vite",              "description": "Next-generation frontend build tool with instant HMR.",                      "level": "beginner",      "is_entry_point": False, "seq": 20, "parent_slug": "react"},
    {"name": "Vue.js",       "slug": "vuejs",        "icon": "💚",  "category": "Web Development",     "github_repo": "vuejs/core",               "description": "Progressive JavaScript framework for building modern web UIs.",              "level": "intermediate",  "is_entry_point": False, "seq": 30, "parent_slug": None},
    {"name": "Svelte",       "slug": "svelte",       "icon": "🔥",  "category": "Web Development",     "github_repo": "sveltejs/svelte",          "description": "Cybernetically enhanced web apps — compiles to minimal JS.",                 "level": "intermediate",  "is_entry_point": False, "seq": 35, "parent_slug": None},
    {"name": "Next.js",      "slug": "nextjs",       "icon": "▲",   "category": "Web Development",     "github_repo": "vercel/next.js",           "description": "The React framework for production — SSR, SSG, and API routes.",             "level": "intermediate",  "is_entry_point": False, "seq": 40, "parent_slug": "react"},
    {"name": "FastAPI",      "slug": "fastapi",      "icon": "🐍",  "category": "Web Development",     "github_repo": "fastapi/fastapi",          "description": "Modern, fast (high-performance) Python web framework for building APIs.",     "level": "intermediate",  "is_entry_point": False, "seq": 45, "parent_slug": None},
    {"name": "Astro",        "slug": "astro",        "icon": "🚀",  "category": "Web Development",     "github_repo": "withastro/astro",          "description": "The web framework for content-driven websites with island architecture.",     "level": "intermediate",  "is_entry_point": False, "seq": 50, "parent_slug": None},
    {"name": "tRPC",         "slug": "trpc",         "icon": "🔗",  "category": "Web Development",     "github_repo": "trpc/trpc",                "description": "End-to-end typesafe APIs for TypeScript and JavaScript.",                    "level": "advanced",      "is_entry_point": False, "seq": 70, "parent_slug": "nextjs"},
    {"name": "Bun",          "slug": "bun",          "icon": "🍞",  "category": "Web Development",     "github_repo": "oven-sh/bun",              "description": "Incredibly fast JavaScript runtime, bundler, and package manager.",          "level": "advanced",      "is_entry_point": False, "seq": 75, "parent_slug": None},
    {"name": "Deno",         "slug": "deno",         "icon": "🦕",  "category": "Web Development",     "github_repo": "denoland/deno",            "description": "A modern runtime for JavaScript and TypeScript with built-in security.",     "level": "advanced",      "is_entry_point": False, "seq": 80, "parent_slug": None},

    # Data & Databases — Prisma is the entry point
    {"name": "Prisma",       "slug": "prisma",       "icon": "💎",  "category": "Data & Databases",    "github_repo": "prisma/prisma",            "description": "Next-generation ORM for Node.js and TypeScript.",                           "level": "beginner",      "is_entry_point": True,  "seq": 10, "parent_slug": None},

    # AI / ML — PyTorch and TensorFlow are entry points
    {"name": "PyTorch",      "slug": "pytorch",      "icon": "🔥",  "category": "AI / ML",             "github_repo": "pytorch/pytorch",          "description": "Open-source machine learning framework for research and production.",       "level": "beginner",      "is_entry_point": True,  "seq": 10, "parent_slug": None},
    {"name": "TensorFlow",   "slug": "tensorflow",   "icon": "🧮",  "category": "AI / ML",             "github_repo": "tensorflow/tensorflow",    "description": "End-to-end open source ML platform by Google.",                             "level": "beginner",      "is_entry_point": True,  "seq": 15, "parent_slug": None},
    {"name": "Hugging Face Transformers", "slug": "transformers", "icon": "🤗", "category": "AI / ML", "github_repo": "huggingface/transformers",  "description": "State-of-the-art NLP models: BERT, GPT, T5, and more.",                     "level": "intermediate",  "is_entry_point": False, "seq": 40, "parent_slug": "pytorch"},
    {"name": "LangChain",    "slug": "langchain",    "icon": "🦜",  "category": "AI / ML",             "github_repo": "langchain-ai/langchain",   "description": "Build LLM-powered applications with composable chains and agents.",         "level": "advanced",      "is_entry_point": False, "seq": 70, "parent_slug": "transformers"},
    {"name": "Ollama",       "slug": "ollama",       "icon": "🦙",  "category": "AI / ML",             "github_repo": "ollama/ollama",            "description": "Run large language models locally with a simple CLI.",                      "level": "intermediate",  "is_entry_point": False, "seq": 50, "parent_slug": None},

    # Cloud Native — Supabase is the entry point
    {"name": "Supabase",     "slug": "supabase",     "icon": "⚡",  "category": "Cloud Native",        "github_repo": "supabase/supabase",        "description": "Open-source Firebase alternative with Postgres backend.",                   "level": "beginner",      "is_entry_point": True,  "seq": 10, "parent_slug": None},
    {"name": "Terraform",    "slug": "terraform",    "icon": "🏗️",  "category": "Cloud Native",        "github_repo": "hashicorp/terraform",      "description": "Infrastructure as Code tool for cloud resource management.",                "level": "intermediate",  "is_entry_point": False, "seq": 40, "parent_slug": None},
    {"name": "Kubernetes",   "slug": "kubernetes",   "icon": "☸️",  "category": "Cloud Native",        "github_repo": "kubernetes/kubernetes",     "description": "Production-grade container orchestration system.",                          "level": "advanced",      "is_entry_point": False, "seq": 70, "parent_slug": "docker"},

    # DevOps — Docker is the entry point
    {"name": "Docker",       "slug": "docker",       "icon": "🐳",  "category": "DevOps",              "github_repo": "moby/moby",                "description": "Platform for building, sharing, and running containerized apps.",           "level": "beginner",      "is_entry_point": True,  "seq": 10, "parent_slug": None},
    {"name": "Grafana",      "slug": "grafana",      "icon": "📊",  "category": "DevOps",              "github_repo": "grafana/grafana",          "description": "Open-source platform for monitoring and observability dashboards.",         "level": "intermediate",  "is_entry_point": False, "seq": 40, "parent_slug": "docker"},
    {"name": "Prometheus",   "slug": "prometheus",   "icon": "📈",  "category": "DevOps",              "github_repo": "prometheus/prometheus",    "description": "Systems monitoring and alerting toolkit for cloud-native environments.",    "level": "intermediate",  "is_entry_point": False, "seq": 45, "parent_slug": "docker"},

    # Systems Programming — Rust and Go are entry points
    {"name": "Rust",         "slug": "rust",         "icon": "🦀",  "category": "Systems Programming", "github_repo": "rust-lang/rust",           "description": "Memory-safe systems language for performance-critical software.",           "level": "beginner",      "is_entry_point": True,  "seq": 10, "parent_slug": None},
    {"name": "Go",           "slug": "go",           "icon": "🐹",  "category": "Systems Programming", "github_repo": "golang/go",                "description": "Statically typed, compiled language designed for cloud infrastructure.",    "level": "beginner",      "is_entry_point": True,  "seq": 15, "parent_slug": None},

    # Cybersecurity
    {"name": "Wireshark",    "slug": "wireshark",    "icon": "🦈",  "category": "Cybersecurity",       "github_repo": "wireshark/wireshark",      "description": "The world's most popular network protocol analyzer for traffic inspection.",  "level": "beginner",      "is_entry_point": True,  "seq": 10, "parent_slug": None},
    {"name": "Metasploit",   "slug": "metasploit",   "icon": "🗡️",  "category": "Cybersecurity",       "github_repo": "rapid7/metasploit-framework", "description": "Penetration testing framework for finding vulnerabilities in systems.",    "level": "intermediate",  "is_entry_point": False, "seq": 40, "parent_slug": "wireshark"},
    {"name": "OWASP ZAP",    "slug": "owasp-zap",    "icon": "🛡️",  "category": "Cybersecurity",       "github_repo": "zaproxy/zaproxy",          "description": "Free security tool for finding vulnerabilities in web applications.",        "level": "intermediate",  "is_entry_point": False, "seq": 45, "parent_slug": "wireshark"},

    # Web3 / Blockchain
    {"name": "Hardhat",      "slug": "hardhat",      "icon": "👷",  "category": "Web3 / Blockchain",   "github_repo": "NomicFoundation/hardhat",  "description": "Ethereum development environment for compiling, testing, and deploying smart contracts.", "level": "beginner", "is_entry_point": True,  "seq": 10, "parent_slug": None},
    {"name": "Foundry",      "slug": "foundry",      "icon": "🔨",  "category": "Web3 / Blockchain",   "github_repo": "foundry-rs/foundry",       "description": "Blazing-fast Solidity development toolkit written in Rust.",                 "level": "intermediate",  "is_entry_point": False, "seq": 40, "parent_slug": "hardhat"},
    {"name": "Ethers.js",    "slug": "ethersjs",     "icon": "⟠",   "category": "Web3 / Blockchain",   "github_repo": "ethers-io/ethers.js",      "description": "Complete Ethereum library for interacting with the blockchain in JavaScript.", "level": "beginner",  "is_entry_point": False, "seq": 15, "parent_slug": None},
]


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
    """Seed the database with domains, tools, and roadmaps if empty."""

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

    # 4. Seed 30 days of synthetic history (for chart demo)
    from datetime import date, timedelta
    import random

    snapshot_count = db.query(ToolSnapshot).count()
    if snapshot_count == 0:
        logger.info("Seed: Generating 30 days of synthetic history for charts...")
        today = date.today()

        # Base scores per tool (approximate real-world GitHub popularity)
        base_scores = {
            "react": 65, "nextjs": 34, "vuejs": 32, "svelte": 32,
            "astro": 36, "vite": 37, "tailwindcss": 32, "fastapi": 33,
            "trpc": 30, "bun": 31, "deno": 30, "prisma": 33,
            "pytorch": 34, "tensorflow": 35, "langchain": 33,
            "transformers": 34, "ollama": 34,
            "kubernetes": 35, "terraform": 33, "supabase": 34,
            "docker": 36, "grafana": 33, "prometheus": 33,
            "rust": 36, "go": 35,
        }

        for tool in tool_map.values():
            base = base_scores.get(tool.slug, 30)
            for day_offset in range(30, 0, -1):
                snap_date = today - timedelta(days=day_offset)
                # Gradual upward trend with daily noise
                progress = (30 - day_offset) / 30  # 0.0 → 1.0
                noise = random.uniform(-2.0, 2.0)
                score = round(base * (0.85 + 0.15 * progress) + noise, 1)
                score = max(5.0, min(95.0, score))

                # Stars grow slightly over time
                star_base = tool.stars if tool.stars else 10000
                star_value = int(star_base * (0.98 + 0.02 * progress))

                snapshot = ToolSnapshot(
                    tool_id=tool.id,
                    date=snap_date,
                    score=score,
                    stars=star_value,
                    forks=tool.forks if tool.forks else 0,
                    mentions=random.randint(0, 5),
                    hn_count=random.randint(0, 2),
                    devto_count=random.randint(0, 2),
                    reddit_count=random.randint(0, 2),
                )
                db.add(snapshot)

        logger.info(f"Seed: Created {len(tool_map) * 30} synthetic history snapshots.")

    db.commit()
    logger.info("Seed: Database seeded successfully!")
