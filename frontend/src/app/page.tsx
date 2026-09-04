import { fetchTools, fetchOverview, fetchRoadmaps } from "@/data/trends";
import LandingClient from "./LandingClient";

/* The landing, server-rendered.
 *
 * THIS FILE EXISTS BECAUSE THE CACHING NEVER WORKED. Every fetch in
 * data/trends.ts passes `next: { revalidate: 1800 }`, and every data page was
 * "use client" — so ISR applied to none of it. There was no cached copy of
 * anything, anywhere, and every visitor's browser called the live API. A
 * sleeping backend therefore blanked the entire site, which is why a
 * full-screen blocking curtain had to be invented to cover for it.
 *
 * Fetching here instead means Vercel caches this page WITH the real numbers in
 * it. A visitor arriving while the backend is asleep gets the last good
 * snapshot instantly and never learns anything was down. Revalidation happens
 * in the background on a stale hit; a failed revalidation serves the stale page
 * rather than an error.
 *
 * NOTHING THROWS. Each fetch degrades to empty, because a landing page that
 * 500s when the API is unreachable is far worse than one that renders its six
 * chapters with dashes where the figures go. The copy, the chapters and the
 * navigation need no API at all.
 */
export const revalidate = 1800;

export default async function Home() {
  const [tools, overview, roadmaps] = await Promise.all([
    fetchTools().catch(() => []),
    fetchOverview().catch(() => null),
    fetchRoadmaps().catch(() => []),
  ]);

  return <LandingClient tools={tools} overview={overview} roadmaps={roadmaps} />;
}
