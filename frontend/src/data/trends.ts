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
  /** Buildable projects for this step's tools. Empty when none exist yet. */
  projects?: ProjectSummary[];
  tools?: {
    slug: string; name: string; icon: string; score: number; stars: number;
    /** Top learning video for this tool, or null if none is curated. */
    video?: {
      title: string | null; url: string; channel: string | null;
      thumbnail: string | null; kind: "video" | "playlist";
    } | null;
  }[];
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

// Platform-wide aggregate stats (real numbers for the hero)
export interface Overview {
  tools_tracked: number;
  domains: number;
  roadmaps: number;
  total_mentions: number;
  total_stars: number;
  signals_24h: number;
  sentiment_ratio: number | null;
  momentum_index: number;
  sources: string[];
  source_count: number;
  top_mover: { slug: string; name: string; icon: string; score: number; growth_pct: number } | null;
  last_updated: string | null;
  is_scraping: boolean;
  next_cycle: string | null;
}

export async function fetchOverview(): Promise<Overview> {
  const res = await resilientFetch(`${API_BASE}/api/v1/overview`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Failed to fetch overview");
  return res.json();
}

// Categories — fetched dynamically from /domains API
export async function fetchCategories(): Promise<string[]> {
  const domains = await fetchDomains();
  return domains.map(d => d.name);
}

// API base URL.
//  • Client: the page's own origin (localhost:3000, or 192.168.1.8:3000 on a
//    phone). Requests to `${API_BASE}/api/v1/*` are same-origin and get proxied
//    to the backend by the rewrite in next.config.ts — so the browser never
//    needs to reach a separate API port/host directly (no CORS, no second
//    firewall hole, works identically on desktop and phone).
//  • Server (SSR/ISR): talk to the backend directly.
export const API_BASE =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.BACKEND_ORIGIN || "http://localhost:8000";

// ISR revalidation interval (seconds) — matches the backend scraper loop (30 min)
const REVALIDATE_SECONDS = 1800;

/**
 * Cold-start–resilient GET.
 *
 * The backend runs on a free tier that sleeps after inactivity, so the FIRST
 * request after a quiet spell can take ~30–50s to wake — and while it boots it
 * may reject with 502/503/504 or a dropped connection. A plain `fetch` there
 * throws and the page is left on empty/zeros. This wrapper keeps retrying (on
 * the client only) with backoff until the server answers, so pages recover on
 * their own the moment it wakes — paired with the <BackendWaking> overlay that
 * gives the visitor friendly feedback during the wait.
 *
 * On the SERVER we do a single pass-through (no retry loop): SSR/ISR runs inside
 * a Vercel function with a hard time budget, so a 45s retry would 504 the whole
 * page. Server renders fail fast to their existing fallback/throw behaviour.
 */
/** How long a SERVER-side fetch may take before we give up on it. */
const SERVER_FETCH_TIMEOUT_MS = 8000;

async function resilientFetch(url: string, init?: RequestInit): Promise<Response> {
  /* Server: single-shot, and now with a HARD DEADLINE.
   *
   * This branch had no timeout at all, which was survivable while every page
   * was client-rendered and nothing ever called it. Now that the data pages
   * render on the server it is on the critical path: a sleeping backend takes
   * ~35s to wake (measured), a Vercel Hobby function is killed at ~10s, and a
   * hung fetch would 504 the whole page instead of falling back to the
   * cached-or-empty render.
   *
   * Failing fast is the correct behaviour here precisely BECAUSE of ISR — a
   * failed revalidation serves the previous cached page, so giving up early
   * costs a visitor nothing and protects the function. */
  if (typeof window === "undefined") {
    return fetch(url, { ...init, signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS) });
  }

  const deadline = Date.now() + 60_000; // cold start after a redeploy can run ~60–90s
  let attempt = 0;
  let lastErr: unknown;
  let retryAfterMs = 0; // honoured when the edge sends a Retry-After

  while (Date.now() < deadline) {
    attempt++;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000); // a booting request can hang
      try {
        const res = await fetch(url, { ...init, signal: ctrl.signal });
        // Retryable-while-waking: 5xx (still booting) and 429 (Cloudflare rate-
        // limiting the wake burst). Anything else is a real answer (e.g. 404)
        // and must surface immediately, not spin.
        if ((res.status >= 500 && res.status <= 599) || res.status === 429) {
          lastErr = new Error(`server ${res.status}`);
          const ra = Number(res.headers.get("retry-after"));
          retryAfterMs = Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 8000) : 0;
        } else {
          return res;
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastErr = err; // network drop / abort while the dyno wakes
      retryAfterMs = 0;
    }
    // Gentle backoff with jitter so parallel fetches don't hammer in lockstep
    // (tight synchronised retries are what trip the rate limiter): 0.8s → 1.6s →
    // 3.2s, capped at 6s, ± jitter — or the server's Retry-After if it sent one.
    const base = Math.min(800 * 2 ** (attempt - 1), 6000);
    const wait = Math.max(retryAfterMs, base) * (0.7 + Math.random() * 0.6);
    if (Date.now() + wait >= deadline) break;
    await new Promise((r) => setTimeout(r, wait));
  }

  throw lastErr instanceof Error ? lastErr : new Error("Request failed after retries");
}

// API helpers
export async function fetchTools(category?: string): Promise<Tool[]> {
  const url = new URL(`${API_BASE}/api/v1/tools`);
  if (category && category !== "All") {
    url.searchParams.set("category", category);
  }
  // Request all tools (per_page=100 covers our current dataset)
  url.searchParams.set("per_page", "100");
  const res = await resilientFetch(url.toString(), { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch tools");
  const data = await res.json();
  // Backend returns {tools: [...], total, page, per_page, total_pages}
  return data.tools || data;
}

export async function fetchToolDetail(slug: string): Promise<ToolDetail> {
  const res = await resilientFetch(`${API_BASE}/api/v1/tools/${slug}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Tool '${slug}' not found`);
  return res.json();
}

export async function fetchToolHistory(slug: string, days = 30): Promise<{ data: ToolHistoryPoint[] }> {
  const res = await resilientFetch(`${API_BASE}/api/v1/tools/${slug}/history?days=${days}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

/* Many tools' series on one shared date axis.
 *
 * The landing scrubs the whole ranking through real time as you scroll, which
 * needs every tracked tool at once; doing that through fetchToolHistory would
 * be a request per tool on every render. `series` is index-aligned to `dates`
 * and carries null where a tool has no reading that day, so the page never has
 * to invent a value to close a gap. */
export interface BulkHistoryReading {
  score: number | null;
  stars: number | null;
  mention_count: number | null;
}

export interface BulkHistoryTool {
  slug: string;
  name: string;
  icon: string | null;
  category: string | null;
  series: (BulkHistoryReading | null)[];
}

export interface BulkHistory {
  days: number;
  dates: string[];
  tools: BulkHistoryTool[];
}

export async function fetchBulkHistory(limit = 12, days = 30): Promise<BulkHistory> {
  const res = await resilientFetch(
    `${API_BASE}/api/v1/tools/history/bulk?limit=${limit}&days=${days}`,
    { next: { revalidate: REVALIDATE_SECONDS } }
  );
  if (!res.ok) throw new Error("Failed to fetch bulk history");
  return res.json();
}

export async function fetchRoadmaps(): Promise<Roadmap[]> {
  const res = await resilientFetch(`${API_BASE}/api/v1/roadmaps`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch roadmaps");
  return res.json();
}

export async function fetchRoadmap(slug: string): Promise<Roadmap> {
  const res = await resilientFetch(`${API_BASE}/api/v1/roadmaps/${slug}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Roadmap '${slug}' not found`);
  return res.json();
}

// ── Projects (learning turned into evidence) ───────────────────────────
// The catalog is hand-authored server-side in backend/app/services/projects.py.
// `video_verified` reports whether the walkthrough video was confirmed live at
// serve time; when it is false there is no video and the docs and written steps
// are what the learner gets. The UI must not imply otherwise.

export type ProjectTier = "beginner" | "intermediate" | "advanced";

/** Summary shape, as returned by the list endpoints. */
export interface ProjectSummary {
  slug: string;
  tool_slug: string;
  tool_name: string | null;
  tool_icon: string | null;
  category: string | null;
  tier: ProjectTier;
  title: string;
  summary: string;
  est_hours: number;
  has_video: boolean;
  step_count: number;
  doc_count: number;
}

export interface ProjectWalkthrough {
  video: { url: string; title: string | null; channel: string | null; thumbnail: string | null } | null;
  video_verified: boolean;
  docs: { label: string; url: string }[];
  steps: string[];
}

/** Full brief, as returned by /projects/{slug}. */
export interface Project extends ProjectSummary {
  brief: string;
  requirements: string[];
  skills: string[];
  walkthrough: ProjectWalkthrough;
}

export async function fetchProjects(opts: { tool?: string; domain?: string; tier?: ProjectTier } = {}): Promise<{
  projects: ProjectSummary[];
  count: number;
  tools_covered: string[];
}> {
  const q = new URLSearchParams();
  if (opts.tool) q.set("tool", opts.tool);
  if (opts.domain) q.set("domain", opts.domain);
  if (opts.tier) q.set("tier", opts.tier);
  const qs = q.toString();
  const res = await resilientFetch(
    `${API_BASE}/api/v1/projects${qs ? `?${qs}` : ""}`,
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function fetchProject(slug: string): Promise<Project> {
  const res = await resilientFetch(`${API_BASE}/api/v1/projects/${slug}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Project '${slug}' not found`);
  return res.json();
}

export async function fetchToolProjects(slug: string): Promise<{ tool: string; projects: ProjectSummary[]; count: number }> {
  const res = await resilientFetch(`${API_BASE}/api/v1/tools/${slug}/projects`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Projects for '${slug}' not found`);
  return res.json();
}

export async function fetchDomains(): Promise<DomainSummary[]> {
  const res = await resilientFetch(`${API_BASE}/api/v1/domains`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch domains");
  return res.json();
}

// ── Learning progress (the retention loop) ─────────────────────────────
// These are per-user and must never be cached — always fetch fresh.

export interface RoadmapProgress {
  roadmap_slug: string;
  completed_steps: number[];
  total: number;
  percent: number;
}

export interface ActiveRoadmap {
  roadmap_slug: string;
  title: string;
  icon: string;
  completed: number;
  total: number;
  percent: number;
  next_step: RoadmapStep | null;
  last_active: string | null;
}

export interface ProgressSummary {
  streak_days: number;
  total_completed: number;
  completed_today: number;
  active: ActiveRoadmap[];
  todays_focus: RoadmapStep | null;
  focus_roadmap: string | null;
}

// The Clerk session token authenticates progress calls. The backend verifies
// its signature and uses the token's user id, so `userId` is only a fallback
// for local dev where the backend runs without Clerk configured. Pass the token
// (from useAuth().getToken()) whenever the user is signed in.
function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchProgress(
  roadmapSlug: string,
  userId: string,
  token?: string | null
): Promise<RoadmapProgress> {
  const res = await fetch(
    `${API_BASE}/api/v1/progress/${roadmapSlug}?user_id=${encodeURIComponent(userId)}`,
    { cache: "no-store", headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch progress");
  return res.json();
}

export async function toggleProgressStep(
  roadmapSlug: string,
  userId: string,
  step: number,
  token?: string | null
): Promise<RoadmapProgress & { step: number; completed: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/progress/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ user_id: userId, roadmap_slug: roadmapSlug, step }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to update progress");
  return res.json();
}

export async function fetchProgressSummary(
  userId: string,
  token?: string | null
): Promise<ProgressSummary> {
  const res = await fetch(
    `${API_BASE}/api/v1/progress/summary?user_id=${encodeURIComponent(userId)}`,
    { cache: "no-store", headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch progress summary");
  return res.json();
}

// ── Daily nudge opt-in ──
export interface NotificationStatus { subscribed: boolean; email: string | null }

export async function getNotificationStatus(userId: string, token?: string | null): Promise<NotificationStatus> {
  const res = await fetch(
    `${API_BASE}/api/v1/notifications/status?user_id=${encodeURIComponent(userId)}`,
    { cache: "no-store", headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch notification status");
  return res.json();
}

export async function subscribeNotifications(userId: string, email: string, token?: string | null): Promise<NotificationStatus> {
  const res = await fetch(`${API_BASE}/api/v1/notifications/subscribe?user_id=${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ user_id: userId, email }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to subscribe");
  return res.json();
}

export async function unsubscribeNotifications(userId: string, token?: string | null): Promise<NotificationStatus> {
  const res = await fetch(`${API_BASE}/api/v1/notifications/unsubscribe?user_id=${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ user_id: userId }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to unsubscribe");
  return res.json();
}

// ── Waitlist (public, no auth) ──────────────────────────────────────────
// Top-of-funnel email capture for the "personalized version". Idempotent on
// the backend, so a repeat email resolves to { already: true } rather than an
// error. Throws only on a real failure (bad email → 422, or network down).
export interface WaitlistResult { ok: boolean; already: boolean }

export async function joinWaitlist(email: string, source = "landing"): Promise<WaitlistResult> {
  const res = await fetch(`${API_BASE}/api/v1/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, source }),
    cache: "no-store",
  });
  if (res.status === 422) throw new Error("Please enter a valid email address.");
  if (!res.ok) throw new Error("Something went wrong — please try again.");
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
  const res = await resilientFetch(`${API_BASE}/api/v1/domains/${domainSlug}/learning-path`, { next: { revalidate: REVALIDATE_SECONDS } });
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
  const res = await resilientFetch(`${API_BASE}/api/v1/tools/compare?slugs=${slugs.join(",")}`, { next: { revalidate: REVALIDATE_SECONDS } });
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
  const res = await resilientFetch(`${API_BASE}/api/v1/tools/by-domain`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error("Failed to fetch tools by domain");
  const data = await res.json();
  return data.domains || [];
}


// ─────────────────────────────────────────────────────────────
// LEARNING RESOURCES
// ─────────────────────────────────────────────────────────────

export interface LearningResource {
  kind: "video" | "playlist" | "platform" | "search";
  source: "youtube" | "curated";
  title: string;
  url: string;
  channel: string | null;
  thumbnail: string | null;
  blurb: string | null;
  views: number | null;
  likes: number | null;
  duration_s: number | null;
  item_count: number | null;
  published_at: string | null;
  language: "en" | "hi";
  rank_score: number;
  /** Set when the video predates the tool's current major release. */
  staleness: string | null;
}

export interface ToolResources {
  slug: string;
  name: string;
  icon: string;
  language: "en" | "hi";
  /**
   * What the `videos` list actually is:
   *  - "youtube_api" — live results ranked on real view/like stats
   *  - "curated"     — hand-picked flagship courses, each verified live
   *  - "search"      — scoped YouTube searches (no real videos available)
   */
  videos_source: "youtube_api" | "curated" | "search";
  /** true only when `videos` is a live-stats ranking. */
  videos_live: boolean;
  latest_version: string | null;
  latest_release_at: string | null;
  videos: LearningResource[];
  platforms: LearningResource[];
}

export async function fetchToolResources(
  slug: string,
  language: "en" | "hi" = "en"
): Promise<ToolResources> {
  const res = await resilientFetch(
    `${API_BASE}/api/v1/tools/${slug}/resources?language=${language}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Resources for '${slug}' unavailable`);
  return res.json();
}
