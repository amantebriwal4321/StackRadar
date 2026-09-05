/* How old is the reading we are showing?
 *
 * StackRadar's whole claim is that the ranking is a measurement rather than an
 * opinion, and three places on the landing say the sources are read "every
 * day". Nothing anywhere checked whether that had actually happened. A local
 * instance was serving numbers from 46 days earlier while the navbar showed a
 * green dot and the word "idle", which reads as healthy.
 *
 * Being stale is fine and normal — a free-tier backend sleeps, a scrape fails,
 * a token expires. Being stale *silently*, under a claim of daily updates, is
 * the part that is not fine.
 *
 * TIMEZONE. The API returns a naive timestamp with no offset
 * ("2026-07-18T17:28:53.683645"), produced by the backend in UTC. JavaScript
 * parses an ISO string with no zone as LOCAL time, so on a UTC+5:30 machine a
 * scrape that finished a minute ago reads as five and a half hours old — and
 * on a negative-offset machine it reads as being in the future. Anything
 * without a zone is pinned to UTC here.
 */

export type FreshnessLevel = "fresh" | "aging" | "stale";

export type Freshness = {
  level: FreshnessLevel;
  /** Whole hours since the last reading. */
  ageHours: number;
  /** Short human form: "14m", "3h", "2d". */
  ageLabel: string;
  /** True once the "read every day" claim stops being true. */
  contradictsClaim: boolean;
};

/** Parse the API's timestamp, treating a missing offset as UTC. */
export function parseReading(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw.trim());
  const d = new Date(hasZone ? raw : `${raw.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function freshness(
  lastUpdated: string | null | undefined,
  now: Date = new Date(),
): Freshness | null {
  const at = parseReading(lastUpdated);
  if (!at) return null;

  // Clamp at zero: a backend clock a few seconds ahead should read "just now",
  // never a negative age.
  const ms = Math.max(0, now.getTime() - at.getTime());
  const mins = Math.floor(ms / 60000);
  const ageHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(ageHours / 24);

  /* Units must survive being UPPERCASED. The navbar renders this inside a
     `uppercase` span, which turned "3m old" into "3M OLD" — read as three
     MONTHS on data that was three minutes fresh. The freshness feature exists
     to stop the product looking staler than it is, and that label was doing
     precisely the opposite. "min" and "hr" are unambiguous in either case. */
  const ageLabel = mins < 60 ? `${mins} min` : ageHours < 48 ? `${ageHours} hr` : `${days}d`;

  /* The scraper loop runs every 30 minutes, so anything inside six hours is
     working as designed. Past 48 hours the "every day" copy is false, which is
     the threshold that actually matters. */
  const level: FreshnessLevel = ageHours < 6 ? "fresh" : ageHours < 48 ? "aging" : "stale";

  return { level, ageHours, ageLabel, contradictsClaim: level === "stale" };
}
