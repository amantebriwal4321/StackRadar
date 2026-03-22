export interface Language {
  id: string;
  name: string;
  icon: string;
  color: string;
  domains: string[];
  description: string;
  popularity: number; // 0–100
  trending: boolean;
}

export const languages: Language[] = [
  {
    id: "python",
    name: "Python",
    icon: "🐍",
    color: "sky",
    domains: ["AI / ML", "Data Science", "Cybersecurity", "DevOps", "Web Development"],
    description: "The most versatile language. Dominates AI/ML, strong in automation, scripting, and backend.",
    popularity: 95,
    trending: true,
  },
  {
    id: "javascript",
    name: "JavaScript",
    icon: "⚡",
    color: "yellow",
    domains: ["Web Development", "Full Stack", "Mobile (React Native)", "Edge Computing"],
    description: "The language of the web. Powers frontend, backend (Node.js), and increasingly edge computing.",
    popularity: 93,
    trending: true,
  },
  {
    id: "typescript",
    name: "TypeScript",
    icon: "🔷",
    color: "blue",
    domains: ["Web Development", "Full Stack", "Cloud Native", "DevOps"],
    description: "JavaScript with types. Rapidly becoming the default for all new web and Node.js projects.",
    popularity: 88,
    trending: true,
  },
  {
    id: "rust",
    name: "Rust",
    icon: "🦀",
    color: "orange",
    domains: ["Systems Programming", "Web3 / Blockchain", "Cloud Native", "Edge Computing"],
    description: "Memory-safe systems language. Growing fast in WebAssembly, blockchain, and infrastructure tooling.",
    popularity: 72,
    trending: true,
  },
  {
    id: "go",
    name: "Go",
    icon: "🐹",
    color: "cyan",
    domains: ["Cloud Native", "DevOps", "Backend", "Distributed Systems"],
    description: "Built for cloud infrastructure. Kubernetes, Docker, and most cloud-native tools are written in Go.",
    popularity: 76,
    trending: false,
  },
  {
    id: "solidity",
    name: "Solidity",
    icon: "💎",
    color: "violet",
    domains: ["Web3 / Blockchain", "DeFi", "Smart Contracts"],
    description: "The primary language for Ethereum smart contracts. Essential for DeFi and dApp development.",
    popularity: 45,
    trending: false,
  },
  {
    id: "java",
    name: "Java",
    icon: "☕",
    color: "red",
    domains: ["Enterprise", "Android", "Cloud Native", "Big Data"],
    description: "Enterprise backbone. Still one of the most widely used languages in production systems worldwide.",
    popularity: 82,
    trending: false,
  },
  {
    id: "cpp",
    name: "C++",
    icon: "⚙️",
    color: "slate",
    domains: ["Systems Programming", "Game Development", "AR / VR", "Quantum Computing"],
    description: "High-performance computing powerhouse. Essential for game engines, OS development, and embedded systems.",
    popularity: 68,
    trending: false,
  },
  {
    id: "swift",
    name: "Swift",
    icon: "🍎",
    color: "orange",
    domains: ["iOS Development", "AR / VR", "Mobile"],
    description: "Apple's modern language for iOS, macOS, and visionOS spatial computing apps.",
    popularity: 58,
    trending: false,
  },
  {
    id: "kotlin",
    name: "Kotlin",
    icon: "🟣",
    color: "purple",
    domains: ["Android", "Backend", "Multiplatform"],
    description: "Modern JVM language. The default for Android development and growing in backend/multiplatform.",
    popularity: 62,
    trending: false,
  },
];

export function getLanguageById(id: string): Language | undefined {
  return languages.find((l) => l.id === id);
}

export function getLanguagesByDomain(domain: string): Language[] {
  return languages.filter((l) => l.domains.includes(domain));
}

export function getTrendingLanguages(): Language[] {
  return languages.filter((l) => l.trending);
}

// Get all unique domains from languages
export function getAllDomains(): string[] {
  const domainSet = new Set<string>();
  languages.forEach((lang) => lang.domains.forEach((d) => domainSet.add(d)));
  return Array.from(domainSet).sort();
}
