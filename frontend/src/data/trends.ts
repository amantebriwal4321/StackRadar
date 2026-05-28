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
  sentiment_label: string;
  sentiment_positive: number;
  sentiment_negative: number;
  rank: number;
  rank_in_category: number;
  category_size: number;
  percentile: number;
  last_7_scores: number[];
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
  github_stars_delta: number;
  mention_count: number;
  sentiment_score: number;
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

// Categories — fetched dynamically from /domains API
export async function fetchCategories(): Promise<string[]> {
  const domains = await fetchDomains();
  return domains.map(d => d.name);
}

// API base URL
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ISR revalidation interval (seconds) — matches the backend scraper loop (30 min)
const REVALIDATE_SECONDS = 1800;

// API helpers
export async function fetchTools(category?: string): Promise<Tool[]> {
  const url = new URL(`${API_BASE}/api/v1/tools`);
  if (category && category !== "All") {
    url.searchParams.set("category", category);
  }
  // Request all tools (per_page=100 covers our current dataset)
  url.searchParams.set("per_page", "100");
  const res = await fetch(url.toString(), { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch tools");
  const data = await res.json();
  // Backend returns {tools: [...], total, page, per_page, total_pages}
  return data.tools || data;
}

export async function fetchToolDetail(slug: string): Promise<ToolDetail> {
  const res = await fetch(`${API_BASE}/api/v1/tools/${slug}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Tool '${slug}' not found`);
  return res.json();
}

export async function fetchToolHistory(slug: string, days = 30): Promise<{ data: ToolHistoryPoint[] }> {
  const res = await fetch(`${API_BASE}/api/v1/tools/${slug}/history?days=${days}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function fetchRoadmaps(): Promise<Roadmap[]> {
  const res = await fetch(`${API_BASE}/api/v1/roadmaps`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch roadmaps");
  return res.json();
}

export async function fetchRoadmap(slug: string): Promise<Roadmap> {
  const res = await fetch(`${API_BASE}/api/v1/roadmaps/${slug}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Roadmap '${slug}' not found`);
  return res.json();
}

export async function fetchDomains(): Promise<DomainSummary[]> {
  const res = await fetch(`${API_BASE}/api/v1/domains`, { next: { revalidate: REVALIDATE_SECONDS } });
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
  const res = await fetch(`${API_BASE}/api/v1/domains/${domainSlug}/learning-path`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch learning path");
  return res.json();
}

// Compare tools types
export interface CompareToolHistoryPoint {
  date: string;
  score: number;
  github_stars_delta: number;
  mention_count: number;
  sentiment_score: number;
}

export interface CompareTool {
  slug: string;
  name: string;
  icon: string;
  category: string;
  score: number;
  stage: string;
  stars: number;
  forks: number;
  growth_pct: number;
  hn_count: number;
  devto_count: number;
  reddit_count: number;
  news_count: number;
  sentiment_label: string;
  sentiment_positive: number;
  sentiment_negative: number;
  learning_priority: string;
  recommendation: string;
  history: CompareToolHistoryPoint[];
}

export async function fetchCompareTools(slugs: string[]): Promise<{ tools: CompareTool[] }> {
  const res = await fetch(`${API_BASE}/api/v1/tools/compare?slugs=${slugs.join(",")}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to compare tools");
  return res.json();
}

// Phase 2: Top movers (sorted by growth_pct)
export async function fetchTopMovers(limit = 5): Promise<Tool[]> {
  const tools = await fetchTools();
  return tools
    .filter(t => t.growth_pct !== 0)
    .sort((a, b) => b.growth_pct - a.growth_pct)
    .slice(0, limit);
}

// Phase 3.1: Tools grouped by domain
export interface DomainWithTools {
  name: string;
  slug: string;
  icon: string;
  score: number;
  tools: {
    slug: string;
    name: string;
    icon: string;
    score: number;
    stars: number;
    stage: string;
    growth_pct: number;
    learning_priority: string;
    description: string;
  }[];
}

export async function fetchToolsByDomain(): Promise<DomainWithTools[]> {
  const res = await fetch(`${API_BASE}/api/v1/tools/by-domain`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch tools by domain");
  const data = await res.json();
  return data.domains || [];
}

