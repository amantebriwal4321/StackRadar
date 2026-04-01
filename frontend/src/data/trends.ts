/**
 * Tool data types and helpers — all data comes from API.
 */

export interface Tool {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  github_repo: string;
  score: number;
  stage: string;
  stars: number;
  forks: number;
  growth_pct: number;
  hn_count: number;
  devto_count: number;
  reddit_count: number;
  news_count: number;
  trend_stage: string;
  recommendation: string;
  learning_priority: string;
  level: string;
  is_entry_point: boolean;
  learning_sequence_score: number;
  parent_slug: string | null;
  updated_at: string | null;
}

export interface ToolDetail extends Tool {
  open_issues: number;
  watchers: number;
  total_mentions: number;
  parent_name: string | null;
  has_roadmap: boolean;
  roadmap_slug: string | null;
}

export interface ToolHistoryPoint {
  date: string;
  score: number;
  stars: number;
  forks: number;
  mentions: number;
  hn_count: number;
  devto_count: number;
  reddit_count: number;
}

export interface Roadmap {
  slug: string;
  title: string;
  description: string;
  icon: string;
  estimated_weeks: number;
  step_count?: number;
  steps?: RoadmapStep[];
}

export interface RoadmapStep {
  step: number;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  resources: { label: string; url: string }[];
}

export interface DomainSummary {
  slug: string;
  name: string;
  icon: string;
  score: number;
  stage: string;
  summary: string;
  tool_count: number;
  updated_at: string | null;
}

// Categories for filtering
export const categories = [
  "AI / ML",
  "Web Development",
  "Cloud Native",
  "DevOps",
  "Systems Programming",
  "Cybersecurity",
  "Web3 / Blockchain",
  "Data & Databases",
] as const;

export type Category = (typeof categories)[number];

// API base URL
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// API helpers
export async function fetchTools(category?: string): Promise<Tool[]> {
  const url = new URL(`${API_BASE}/api/v1/tools`);
  if (category && category !== "All") {
    url.searchParams.set("category", category);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tools");
  return res.json();
}

export async function fetchToolDetail(slug: string): Promise<ToolDetail> {
  const res = await fetch(`${API_BASE}/api/v1/tools/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Tool '${slug}' not found`);
  return res.json();
}

export async function fetchToolHistory(slug: string, days = 30): Promise<{ data: ToolHistoryPoint[] }> {
  const res = await fetch(`${API_BASE}/api/v1/tools/${slug}/history?days=${days}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function fetchRoadmaps(): Promise<Roadmap[]> {
  const res = await fetch(`${API_BASE}/api/v1/roadmaps`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch roadmaps");
  return res.json();
}

export async function fetchRoadmap(slug: string): Promise<Roadmap> {
  const res = await fetch(`${API_BASE}/api/v1/roadmaps/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Roadmap '${slug}' not found`);
  return res.json();
}

export async function fetchDomains(): Promise<DomainSummary[]> {
  const res = await fetch(`${API_BASE}/api/v1/domains`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch domains");
  return res.json();
}

// Learning path types
export interface LearningPathTool {
  slug: string;
  name: string;
  icon: string;
  score: number;
  stars: number;
  is_entry_point: boolean;
  parent_slug: string | null;
  learning_sequence_score: number;
  description: string;
  recommendation: string | null;
}

export interface LearningPathLevel {
  level: string;
  label: string;
  tools: LearningPathTool[];
}

export interface LearningPath {
  domain: string;
  domain_slug: string;
  domain_icon: string;
  entry: string | null;
  path: LearningPathLevel[];
}

export async function fetchLearningPath(domainSlug: string): Promise<LearningPath> {
  const res = await fetch(`${API_BASE}/api/v1/domains/${domainSlug}/learning-path`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch learning path");
  return res.json();
}
