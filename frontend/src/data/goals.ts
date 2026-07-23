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
