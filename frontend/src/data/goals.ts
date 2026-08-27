/**
 * Career goals → roadmap mapping.
 *
 * One source of truth shared by the 5-minute-plan chooser, the shareable
 * /plan/[slug] pages, and the dynamic OG image route — so a goal's label,
 * outcome and target roadmap can never drift between them.
 */

export type Goal = {
  icon: string;
  label: string;
  slug: string; // roadmap slug -> /roadmap/{slug}
  outcome: string;
  weeks: string;
};

export const GOALS: Goal[] = [
  { icon: "💼", label: "Land a developer job", slug: "web-development",
    outcome: "Ship full-stack apps employers hire for", weeks: "~10 weeks" },
  { icon: "🧠", label: "Break into AI / ML", slug: "ai-ml",
    outcome: "Go from Python to training and shipping models", weeks: "~12 weeks" },
  { icon: "🔐", label: "Get into cybersecurity", slug: "cybersecurity",
    outcome: "Learn the tools real security teams use daily", weeks: "~10 weeks" },
  { icon: "☁️", label: "DevOps & cloud", slug: "devops",
    outcome: "Master Docker, CI/CD and cloud deployment", weeks: "~9 weeks" },
  { icon: "⛓️", label: "Web3 / blockchain", slug: "web3",
    outcome: "Build and deploy smart contracts", weeks: "~8 weeks" },
  { icon: "⚙️", label: "Low-level / systems", slug: "systems",
    outcome: "Get fluent in Rust and Go", weeks: "~9 weeks" },
];

export function goalBySlug(slug: string): Goal | undefined {
  return GOALS.find((g) => g.slug === slug);
}

/* Tool category → roadmap slug.
 *
 * Lives here because this file is already the one place a "what should they
 * learn next" target is resolved, and a second mapping elsewhere is exactly
 * how the catalog and the colophon drifted apart.
 *
 * Six of the eight categories match their roadmap title verbatim; "AI / ML"
 * and "DevOps" are the two that do not, which is why this is an explicit map
 * rather than a title match. GOALS above covers only six domains because it
 * lists CAREER goals; the catalog can hold anything in the catalog, so Cloud
 * Native and Data & Databases are covered here too.
 */
export const ROADMAP_BY_CATEGORY: Record<string, string> = {
  "Web Development": "web-development",
  "AI / ML": "ai-ml",
  "Cloud Native": "cloud-native",
  "DevOps": "devops",
  "Cybersecurity": "cybersecurity",
  "Web3 / Blockchain": "web3",
  "Systems Programming": "systems",
  "Data & Databases": "data-databases",
};

export function roadmapForCategory(category: string | null | undefined): string | null {
  if (!category) return null;
  return ROADMAP_BY_CATEGORY[category] ?? null;
}
