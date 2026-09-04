"use client";

import { useCallback, useEffect, useState } from "react";
import { type Tool, type Overview, type Roadmap } from "@/data/trends";
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

export default function LandingClient({
  tools,
  overview,
  roadmaps,
}: {
  tools: Tool[];
  overview: Overview | null;
  roadmaps: Roadmap[];
}) {

  /* The signature move's state. Never pre-filled from anything but the
     reader's own earlier session, so whatever the colophon reports was always
     genuinely chosen. Persisted because a reload used to wipe it, which made
     the whole mechanic feel disposable. */
  const [picked, setPicked] = useState<string[]>([]);
  const [picksLoaded, setPicksLoaded] = useState(false);

  useEffect(() => {
    /* Deferred so the setState does not cascade a render from the effect body,
       but on a TIMER rather than requestAnimationFrame.
       
       rAF does not fire in a hidden or background tab, and `picksLoaded` gates
       the persistence effect below — so in a backgrounded tab a reader could
       pick tools, see them highlight, and have every one silently discarded on
       reload. Measured: two tools pressed, localStorage still null. This is the
       third place in this app the same rAF assumption has bitten, after the
       Navbar theme toggle and the Preloader. */
    const f = setTimeout(() => {
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
    }, 0);
    return () => clearTimeout(f);
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

  /* The engine collects its acts ONCE inside mount() and layout() never
     rescans, so the root must not mount before the chapters have rendered.
     They render from props now, so there is nothing to wait for — this used to
     gate on a client fetch and show a "reading the last cycle" placeholder,
     which is exactly the blank-page problem this change removes. */

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

      <ScrollcraftRoot className="2xl:pl-[13rem]">
        <span data-sc-progress className="sr-only" />
        <main id="top">
          <ChTitle overview={overview} tools={tools} />
          <ChGuess tools={tools} />
          <ChMeasure tools={tools} overview={overview} />
          <ChCatalog tools={tools} picked={picked} onToggle={toggle} />
          <ChOrder roadmaps={roadmaps} tools={tools} />
          <ChColophon
            picked={picked}
            tools={tools}
            onRemove={remove}
            lastUpdated={overview?.last_updated ?? null}
          />
        </main>
      </ScrollcraftRoot>
    </>
  );
}
