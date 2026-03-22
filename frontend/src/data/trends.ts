export interface TrendDataPoint {
  year: number;
  score: number;
}

export interface Technology {
  id: string;
  name: string;
  domain: string;
  description: string;
  score: number;
  stage: "Emerging" | "Growing" | "Mature" | "Experimental";
  growth: TrendDataPoint[];
  github_repos: number;
  hn_mentions: number;
  devto_articles: number;
  icon: string; // emoji
  color: string; // tailwind color class
  why_trending: string[];
}

export const domains = [
  "AI / ML",
  "Web3 / Blockchain",
  "Cybersecurity",
  "Cloud Native",
  "Edge Computing",
  "AR / VR",
  "Quantum Computing",
  "DevOps",
] as const;

export type Domain = (typeof domains)[number];

export const technologies: Technology[] = [
  {
    id: "ai-ml",
    name: "AI / Machine Learning",
    domain: "AI / ML",
    description:
      "From large language models to computer vision, AI/ML continues to redefine every industry with unprecedented acceleration in tooling, research, and production deployment.",
    score: 97,
    stage: "Growing",
    growth: [
      { year: 2020, score: 58 },
      { year: 2021, score: 65 },
      { year: 2022, score: 74 },
      { year: 2023, score: 88 },
      { year: 2024, score: 93 },
      { year: 2025, score: 97 },
    ],
    github_repos: 48200,
    hn_mentions: 3420,
    devto_articles: 8750,
    icon: "🧠",
    color: "violet",
    why_trending: [
      "ChatGPT and LLMs went mainstream in 2023–2024",
      "Enterprise adoption of AI Agents is accelerating",
      "Open-source model ecosystem (LLaMA, Mistral) is booming",
      "MLOps tooling has matured significantly",
    ],
  },
  {
    id: "web3",
    name: "Web3 / Blockchain",
    domain: "Web3 / Blockchain",
    description:
      "Decentralized applications, smart contracts, and DeFi protocols continue evolving beyond speculation into real-world utility with Layer 2 scaling solutions.",
    score: 62,
    stage: "Emerging",
    growth: [
      { year: 2020, score: 35 },
      { year: 2021, score: 72 },
      { year: 2022, score: 80 },
      { year: 2023, score: 55 },
      { year: 2024, score: 58 },
      { year: 2025, score: 62 },
    ],
    github_repos: 18400,
    hn_mentions: 1250,
    devto_articles: 3200,
    icon: "⛓️",
    color: "amber",
    why_trending: [
      "Layer 2 solutions (Arbitrum, Optimism) gaining traction",
      "Real-world asset tokenization growing",
      "DeFi protocols maturing beyond speculation",
      "Enterprise blockchain adoption increasing",
    ],
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    domain: "Cybersecurity",
    description:
      "Zero-trust architectures, AI-powered threat detection, and DevSecOps practices are becoming essential as attack surfaces grow exponentially.",
    score: 89,
    stage: "Growing",
    growth: [
      { year: 2020, score: 60 },
      { year: 2021, score: 68 },
      { year: 2022, score: 75 },
      { year: 2023, score: 82 },
      { year: 2024, score: 86 },
      { year: 2025, score: 89 },
    ],
    github_repos: 22100,
    hn_mentions: 2180,
    devto_articles: 4500,
    icon: "🛡️",
    color: "emerald",
    why_trending: [
      "Rise in sophisticated AI-powered cyber attacks",
      "Zero-trust architecture becoming the standard",
      "Massive talent shortage driving demand",
      "Regulatory compliance requirements increasing globally",
    ],
  },
  {
    id: "cloud-native",
    name: "Cloud Native",
    domain: "Cloud Native",
    description:
      "Kubernetes, serverless, and service mesh technologies are the backbone of modern infrastructure. Cloud-native is now the default architecture for new projects.",
    score: 91,
    stage: "Mature",
    growth: [
      { year: 2020, score: 55 },
      { year: 2021, score: 65 },
      { year: 2022, score: 76 },
      { year: 2023, score: 83 },
      { year: 2024, score: 88 },
      { year: 2025, score: 91 },
    ],
    github_repos: 35600,
    hn_mentions: 2900,
    devto_articles: 6200,
    icon: "☁️",
    color: "sky",
    why_trending: [
      "Kubernetes adopted by 90%+ of Fortune 500",
      "Serverless architectures reducing operational overhead",
      "FinOps and cloud cost optimization gaining focus",
      "Platform engineering emerging as a discipline",
    ],
  },
  {
    id: "edge-computing",
    name: "Edge Computing",
    domain: "Edge Computing",
    description:
      "Processing data closer to the source reduces latency and bandwidth. Edge AI and IoT convergence is creating new categories of real-time applications.",
    score: 71,
    stage: "Emerging",
    growth: [
      { year: 2020, score: 28 },
      { year: 2021, score: 38 },
      { year: 2022, score: 48 },
      { year: 2023, score: 58 },
      { year: 2024, score: 65 },
      { year: 2025, score: 71 },
    ],
    github_repos: 8900,
    hn_mentions: 980,
    devto_articles: 2100,
    icon: "📡",
    color: "orange",
    why_trending: [
      "5G rollout enabling new edge use cases",
      "Edge AI chips getting more powerful and cheaper",
      "CDN providers adding compute capabilities",
      "IoT device proliferation driving demand",
    ],
  },
  {
    id: "ar-vr",
    name: "AR / VR / Spatial Computing",
    domain: "AR / VR",
    description:
      "Spatial computing is evolving beyond gaming into enterprise training, remote collaboration, and healthcare with Apple Vision Pro leading the charge.",
    score: 58,
    stage: "Experimental",
    growth: [
      { year: 2020, score: 30 },
      { year: 2021, score: 42 },
      { year: 2022, score: 45 },
      { year: 2023, score: 48 },
      { year: 2024, score: 54 },
      { year: 2025, score: 58 },
    ],
    github_repos: 6200,
    hn_mentions: 720,
    devto_articles: 1500,
    icon: "🥽",
    color: "fuchsia",
    why_trending: [
      "Apple Vision Pro creating a new spatial computing category",
      "Enterprise training and simulation use cases growing",
      "WebXR making XR accessible via browsers",
      "AI-generated 3D assets reducing development costs",
    ],
  },
  {
    id: "quantum",
    name: "Quantum Computing",
    domain: "Quantum Computing",
    description:
      "While still early, quantum computing breakthroughs in error correction and increasing qubit counts are bringing practical applications closer to reality.",
    score: 42,
    stage: "Experimental",
    growth: [
      { year: 2020, score: 15 },
      { year: 2021, score: 20 },
      { year: 2022, score: 25 },
      { year: 2023, score: 32 },
      { year: 2024, score: 38 },
      { year: 2025, score: 42 },
    ],
    github_repos: 3100,
    hn_mentions: 540,
    devto_articles: 890,
    icon: "⚛️",
    color: "cyan",
    why_trending: [
      "Google and IBM achieving quantum error correction milestones",
      "Quantum-safe cryptography becoming a priority",
      "Cloud quantum computing services making it more accessible",
      "Growing investment from governments worldwide",
    ],
  },
  {
    id: "devops",
    name: "DevOps / Platform Engineering",
    domain: "DevOps",
    description:
      "Platform engineering is the evolution of DevOps, building internal developer platforms and golden paths to boost developer productivity at scale.",
    score: 85,
    stage: "Mature",
    growth: [
      { year: 2020, score: 60 },
      { year: 2021, score: 67 },
      { year: 2022, score: 73 },
      { year: 2023, score: 78 },
      { year: 2024, score: 82 },
      { year: 2025, score: 85 },
    ],
    github_repos: 28300,
    hn_mentions: 2450,
    devto_articles: 5800,
    icon: "🔧",
    color: "rose",
    why_trending: [
      "Platform Engineering replacing traditional DevOps teams",
      "Internal Developer Platforms (IDP) becoming standard",
      "GitOps and Infrastructure as Code maturing",
      "Developer experience (DX) becoming a key metric",
    ],
  },
];

export function getTechnologyById(id: string): Technology | undefined {
  return technologies.find((t) => t.id === id);
}

export function getTechnologiesByDomain(domain: string): Technology[] {
  if (domain === "All") return technologies;
  return technologies.filter((t) => t.domain === domain);
}

export function getTopTrending(count: number = 4): Technology[] {
  return [...technologies].sort((a, b) => b.score - a.score).slice(0, count);
}
