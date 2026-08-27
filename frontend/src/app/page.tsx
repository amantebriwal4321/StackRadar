"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchTools,
  fetchOverview,
  fetchRoadmaps,
  type Tool,
  type Overview,
  type Roadmap,
} from "@/data/trends";
import Navbar from "@/components/Navbar";
import ScrollcraftRoot from "@/components/scrollcraft/ScrollcraftRoot";
import StackFolio from "@/components/landing/StackFolio";
import ChTitle from "@/components/landing/ChTitle";
import ChGuess from "@/components/landing/ChGuess";
import ChMeasure from "@/components/landing/ChMeasure";
import ChCatalog from "@/components/landing/ChCatalog";
import ChOrder from "@/components/landing/ChOrder";
import ChColophon from "@/components/landing/ChColophon";

/* The landing, as a printed feature.
 *
 * Chaptered editorial: six chapters, each on its own ground, hard cuts between
 * them, a folio in the margin instead of a fixed marketing bar.
 *
 *   1 title page    flow          invitation
 *   2 the guess     reveal        recognition
 *   3 measurement   stacking      reassurance
 *   4 the catalog   pin  3.6      agency        <- the peak + signature move
 *   5 the order     reveal+count  momentum
 *   6 colophon      flow          resolve
 *
 * Signature move: reading builds your stack. The picks live here, at page
 * level, because the folio and the colophon both read from them.
 *
 * Brief: scrollcraft/builds/stackradar-editorial/BRIEF.md
 */

const PICKS_KEY = "stackradar_picks";

const CHAPTERS = [
  "Title page",
  "The guess",
  "The measurement",
  "The catalog",
  "The order",
  "Colophon",
];

export default function Home() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* The signature move's state. Never pre-filled from anything but the
     reader's own earlier session, so whatever the colophon reports was always
     genuinely chosen. Persisted because a reload used to wipe it, which made
     the whole mechanic feel disposable. */
  const [picked, setPicked] = useState<string[]>([]);
  const [picksLoaded, setPicksLoaded] = useState(false);

  useEffect(() => {
    // A frame later, not synchronously: setState in an effect body cascades a
    // render, which is the lint rule this file already trips on elsewhere.
    const f = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(PICKS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) {
          setPicked(parsed.filter((x): x is string => typeof x === "string"));
        }
      } catch {
        // Private mode throws on access. Losing the picks is survivable.
      }
      setPicksLoaded(true);
    });
    return () => cancelAnimationFrame(f);
  }, []);

  useEffect(() => {
    // Only after the initial read, or the first render would clobber storage
    // with the empty array before the saved value ever arrived.
    if (!picksLoaded) return;
    try {
      localStorage.setItem(PICKS_KEY, JSON.stringify(picked));
    } catch {}
  }, [picked, picksLoaded]);
  const toggle = useCallback((slug: string) => {
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));
  }, []);
  const remove = useCallback((slug: string) => {
    setPicked((p) => p.filter((s) => s !== slug));
  }, []);

  /* Which chapter the folio names. One passive rAF-throttled listener, and the
     state it sets changes at most six times in a whole read, so this is not a
     per-frame update. */
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const secs = document.querySelectorAll("[data-sc-act]");
      let current = 0;
      secs.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= window.innerHeight * 0.4) current = i;
      });
      setChapter((c) => (c === current ? c : current));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    frame = requestAnimationFrame(read);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [tools.length]);

  const load = useCallback(async () => {
    try {
      const [allTools, overviewData, rm] = await Promise.all([
        fetchTools(),
        fetchOverview(),
        fetchRoadmaps(),
      ]);
      setTools(allTools);
      setOverview(overviewData);
      setRoadmaps(rm);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the server");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <main className="ch-cream flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent-coral)]">
            no signal
          </p>
          <p className="mt-4 text-[17px] font-medium text-[var(--c-ink-2)]">{error}</p>
          <button onClick={load} className="btn-primary mt-6">
            Try again
          </button>
        </div>
      </main>
    );
  }

  const ready = tools.length > 0 && overview !== null;

  /* The engine collects its acts ONCE inside mount() and layout() never
     rescans, so the root must not mount before the chapters have rendered. */
  if (!ready) {
    return (
      <main className="ch-cream flex min-h-screen items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--c-ink-3)]">
          reading the last cycle
        </p>
      </main>
    );
  }

  return (
    <>
      <Navbar />

      <StackFolio
        chapter={chapter + 1}
        chapterTitle={CHAPTERS[chapter] ?? CHAPTERS[0]}
        picked={picked}
        tools={tools}
        onRemove={remove}
      />

      <ScrollcraftRoot className="xl:pl-[13rem]">
        <span data-sc-progress className="sr-only" />
        <main id="top">
          <ChTitle overview={overview} tools={tools} />
          <ChGuess tools={tools} />
          <ChMeasure tools={tools} overview={overview} />
          <ChCatalog tools={tools} picked={picked} onToggle={toggle} />
          <ChOrder roadmaps={roadmaps} />
          <ChColophon picked={picked} tools={tools} onRemove={remove} />
        </main>
      </ScrollcraftRoot>
    </>
  );
}
