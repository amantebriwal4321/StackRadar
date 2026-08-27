"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchTools,
  fetchOverview,
  fetchBulkHistory,
  fetchDomains,
  fetchTopMovers,
  type Tool,
  type Overview,
  type BulkHistory,
  type DomainSummary,
} from "@/data/trends";
import ScrollcraftRoot from "@/components/scrollcraft/ScrollcraftRoot";
import ActInstrument from "@/components/landing/ActInstrument";
import ActTimeAxis from "@/components/landing/ActTimeAxis";
import ActRadarLock from "@/components/landing/ActRadarLock";
import ActSources from "@/components/landing/ActSources";
import ActCommit from "@/components/landing/ActCommit";
import MobileHome from "@/components/MobileHome";

/* The landing, built with the scrollcraft engine under the "Live surface"
 * grammar: the page does not describe the terminal, it is the terminal, and
 * scroll operates it.
 *
 * Five acts, 11.5 viewport-heights:
 *   1  instrument   pin + count      1.6   unease
 *   2  time axis    pan              2.4   exposure     <- signature move
 *   3  radar lock   pin + pointer    3.4   clarity      <- the peak
 *   4  sources      flow + in        ~     trust
 *   5  commit       pin + real input 2.3   agency
 *
 * The brief, feeling curve and peak are in scrollcraft/builds/stackradar-terminal/BRIEF.md. */
export default function Home() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [history, setHistory] = useState<BulkHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* MobileHome renders a different tree with different needs. These two are
     fetched only once the mobile branch is actually taken, so a desktop visit
     never pays for them. */
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [movers, setMovers] = useState<Tool[]>([]);

  /* Device split: render EITHER tree, never both. A CSS hidden/block split
     would still mount the desktop's R3F constellation offscreen on phones.
     Starts false so SSR and first paint agree, then corrects post-hydration. */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [allTools, overviewData, bulk] = await Promise.all([
        fetchTools(),
        fetchOverview(),
        // 10 rows is what the time axis can show without the rail becoming a
        // wall; 90 days so the axis lengthens on its own as the scraper runs.
        fetchBulkHistory(10, 90),
      ]);
      setTools(allTools);
      setOverview(overviewData);
      setHistory(bulk);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isMobile) return;
    let cancelled = false;
    Promise.all([fetchDomains(), fetchTopMovers(6)])
      .then(([d, m]) => {
        if (cancelled) return;
        setDomains(d);
        setMovers(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isMobile]);

  /* Acts mount only once there is real data to put in them. The grammar's
     honesty rule leaves no room for a placeholder surface: a dashboard drawn
     with dummy values is exactly the thing it forbids. */
  const ready = tools.length > 0 && overview !== null;

  /* Mobile gets the SAME five acts, not a separate page.
   *
   * The old split rendered a completely different tree below 768px, which
   * would have meant phones never seeing this build at all. What actually has
   * to be avoided on a phone is the WebGL context, not the design — so the
   * `webgl` flag swaps act 3's ground for a CSS lattice and the R3F tree still
   * never mounts there.
   *
   * MobileHome is kept for the one case where the acts cannot be built: no
   * live data. It renders its own empty/loading states, which the acts must
   * not fake. */
  if (isMobile && !ready) {
    return (
      <MobileHome
        tools={tools}
        domains={domains}
        movers={movers}
        overview={overview}
        isLoading={loading}
      />
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-2)]">
            no signal
          </p>
          <p className="mt-4 text-[17px] font-extralight text-[var(--c-ink-2)]">{error}</p>
          <button
            onClick={load}
            className="mt-6 text-sm font-semibold text-[var(--c-ink)] underline decoration-[var(--accent-1)] decoration-2 underline-offset-[6px]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  /* The engine collects its acts ONCE, inside mount(); layout() re-measures
     but never rescans. Mounting the root before the data arrived therefore
     found zero acts and left every pinned section one viewport tall. So the
     root is not rendered at all until the acts are, and the loading state
     lives outside it. */
  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--c-ink-3)]">
          reading the last cycle
        </p>
      </main>
    );
  }

  return (
    <ScrollcraftRoot>
      <span data-sc-progress className="sr-only" />
      <main id="top">
        <ActInstrument overview={overview} tools={tools} />
        {history && history.dates.length > 1 && <ActTimeAxis history={history} />}
        <ActRadarLock tools={tools} overview={overview} webgl={!isMobile} />
        <ActSources tools={tools} overview={overview} />
        <ActCommit />
      </main>
    </ScrollcraftRoot>
  );
}
