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
  stage: "Emerging" | "Growing" | "Mature" | "Declining" | "Experimental";
  growth: TrendDataPoint[];
  github_repos: number;
  hn_mentions: number;
  devto_articles: number;
  reddit_mentions: number;
  news_mentions: number;
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

// Domain slug → readable name mapping
export const domainSlugMap: Record<string, string> = {
  "ai-ml": "AI / ML",
  "web3": "Web3 / Blockchain",
  "cybersecurity": "Cybersecurity",
  "cloud-native": "Cloud Native",
  "edge-computing": "Edge Computing",
  "ar-vr": "AR / VR",
  "quantum": "Quantum Computing",
  "devops": "DevOps",
};

// Empty array — data comes from API now
export const technologies: Technology[] = [];

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
