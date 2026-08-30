import { ROADMAP_BY_CATEGORY } from "@/data/goals";

/* One colour per domain, for the whole page.
 *
 * Colour was decorative before this: `diagnose()` handed out accents by
 * catalog-size rank, and ChOrder cycled a different array by list index. So
 * Web Development was green in the coverage bar and coral on its own roadmap
 * card, and a reader who noticed the colours at all was being told something
 * untrue by them. Structure should encode information, and the only thing
 * these fills can honestly encode is which domain you are looking at.
 *
 * Keyed by roadmap slug because that is the one identifier both sides share:
 * the coverage bar has a Domain *name* ("Web Development") and a roadmap card
 * has its slug, and ROADMAP_BY_CATEGORY already maps between them.
 *
 * WHY THESE EIGHT AND NOT THE ACCENT SET. The previous eight-tint array held
 * three near-duplicate pairs — #8ED462/#B6E3A0, #2BA0FF/#A8E5E5,
 * #FF705D/#FFB29B — which is fine as decoration and useless as identity: two
 * domains simply read as the same colour. These are eight separable hues.
 * Every one is light enough to carry charcoal `on-accent` text; the darkest,
 * blue, measures 4.90:1 against #2C2E2A and the rest clear 5:1.
 */
const DOMAIN_TINT: Record<string, string> = {
  "web-development": "#2BA0FF", // blue — the screen
  "ai-ml": "#C3AEFF", // lilac
  "cloud-native": "#7FD8D8", // aqua
  devops: "#FF705D", // coral
  cybersecurity: "#FFC24D", // gold
  "data-databases": "#8ED462", // green
  web3: "#F5E211", // yellow
  systems: "#F09BC0", // pink — the one hue nothing else occupies
};

/** Fallback for a domain added to the catalog but not yet given a colour. */
const UNASSIGNED = "#D8D3C4";

/** Tint for a roadmap/domain slug. */
export function tintForSlug(slug: string | null | undefined): string {
  if (!slug) return UNASSIGNED;
  return DOMAIN_TINT[slug] ?? UNASSIGNED;
}

/** Tint for a Domain display name, as carried on `Tool.category`. */
export function tintForCategory(category: string | null | undefined): string {
  if (!category) return UNASSIGNED;
  return tintForSlug(ROADMAP_BY_CATEGORY[category]);
}
