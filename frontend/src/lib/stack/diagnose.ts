import { roadmapForCategory } from "@/data/goals";
import type { Tool } from "@/data/trends";

/* One reading of "what does this stack look like", shared by the catalog and
 * the colophon.
 *
 * Those two chapters previously each did their own arithmetic, which is how
 * they ended up feeling unrelated: the catalog counted picks and the colophon
 * separately averaged scores, and neither told you anything the other did.
 * Both now render from this one function, so they cannot drift.
 *
 * Everything here comes from fields the API already returns. Nothing is
 * inferred, weighted or invented: a counter is a truth claim with motion
 * attached, and the whole page rests on the numbers being real.
 */

export type DomainCoverage = {
  category: string;
  /** Tools picked in this domain. */
  held: number;
  /** Tools tracked in this domain, so `held / total` is a real fraction. */
  total: number;
  /** Highest-scoring tool here that has NOT been picked, if any. */
  strongestMissing: Tool | null;
  tint: string;
};

export type Diagnosis = {
  count: number;
  /** Mean momentum of the picked tools. Null when nothing is picked. */
  avg: number | null;
  coverage: DomainCoverage[];
  /** Domains with at least one pick. */
  domainsHeld: number;
  levels: { beginner: number; intermediate: number; advanced: number };
  /** The strongest tool in a domain holding nothing. The headline insight. */
  gap: Tool | null;
  /** Roadmap slug for the gap's domain, or null if it has no roadmap. */
  nextRoadmap: string | null;
  picked: Tool[];
};

/* The accent set, assigned to domains by a stable order so a given domain is
 * always the same colour across the catalog bar and the colophon plate. */
const TINTS = [
  "#8ED462",
  "#FF705D",
  "#2BA0FF",
  "#F5E211",
  "#C3AEFF",
  "#A8E5E5",
  "#FFB29B",
  "#B6E3A0",
];

export function diagnose(pickedSlugs: string[], tools: Tool[]): Diagnosis {
  const pickedSet = new Set(pickedSlugs);
  const picked = tools.filter((t) => pickedSet.has(t.slug));

  // Domains in a stable order: by catalog size, so the colour assignment does
  // not shuffle when scores move.
  const byCategory = new Map<string, Tool[]>();
  for (const t of tools) {
    if (!t.category) continue;
    const list = byCategory.get(t.category);
    if (list) list.push(t);
    else byCategory.set(t.category, [t]);
  }
  const categories = [...byCategory.keys()].sort((a, b) => {
    const d = (byCategory.get(b)?.length ?? 0) - (byCategory.get(a)?.length ?? 0);
    return d !== 0 ? d : a.localeCompare(b);
  });

  const coverage: DomainCoverage[] = categories.map((category, i) => {
    const all = byCategory.get(category) ?? [];
    const unpicked = all
      .filter((t) => !pickedSet.has(t.slug))
      .sort((a, b) => b.score - a.score);
    return {
      category,
      held: all.filter((t) => pickedSet.has(t.slug)).length,
      total: all.length,
      strongestMissing: unpicked[0] ?? null,
      tint: TINTS[i % TINTS.length],
    };
  });

  /* The gap: the strongest tool in a domain holding NOTHING. That is a more
   * useful thing to say than "the strongest tool you skipped", because a
   * domain at zero is a real hole rather than a preference. Once every domain
   * has something, fall back to the strongest unpicked tool overall. */
  const emptyDomains = coverage.filter((c) => c.held === 0 && c.strongestMissing);
  const gap =
    emptyDomains.length > 0
      ? emptyDomains
          .map((c) => c.strongestMissing as Tool)
          .sort((a, b) => b.score - a.score)[0]
      : [...tools]
          .filter((t) => !pickedSet.has(t.slug))
          .sort((a, b) => b.score - a.score)[0] ?? null;

  const levels = { beginner: 0, intermediate: 0, advanced: 0 };
  for (const t of picked) {
    const l = (t.level || "").toLowerCase();
    if (l === "beginner" || l === "intermediate" || l === "advanced") levels[l] += 1;
  }

  return {
    count: picked.length,
    avg: picked.length ? picked.reduce((n, t) => n + t.score, 0) / picked.length : null,
    coverage,
    domainsHeld: coverage.filter((c) => c.held > 0).length,
    levels,
    gap,
    nextRoadmap: roadmapForCategory(gap?.category),
    picked,
  };
}
