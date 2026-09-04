"use client";

import { useEffect, useMemo, useState } from "react";
import { Hammer, Loader2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import ProjectCard from "@/components/ProjectCard";
import Reveal from "@/components/ui/Reveal";
import { fetchProjects, type ProjectSummary, type ProjectTier } from "@/data/trends";
import { tintForCategory } from "@/lib/stack/domainColour";

/* The build surface.
 *
 * /trends says what is rising and /roadmaps says what order to learn it in.
 * Neither produces anything a learner can show afterwards. This is where the
 * reading turns into a thing that exists.
 *
 * Filtering is client-side on purpose. The whole catalog is a few dozen briefs
 * — smaller than one page of /trends — so fetching once and filtering in memory
 * is faster than a round trip per chip and keeps the filters instant. The API
 * supports server-side filters too, for when this outgrows that.
 */

const TIERS: ProjectTier[] = ["beginner", "intermediate", "advanced"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tier, setTier] = useState<ProjectTier | null>(null);
  const [domain, setDomain] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects()
      .then((d) => setProjects(d.projects))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const domains = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) {
      if (!p.category) continue;
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [projects]);

  const shown = useMemo(
    () =>
      projects.filter(
        (p) => (!tier || p.tier === tier) && (!domain || p.category === domain),
      ),
    [projects, tier, domain],
  );

  const totalHours = useMemo(
    () => shown.reduce((n, p) => n + (p.est_hours || 0), 0),
    [shown],
  );

  return (
    <DashboardShell>
      <div className="space-y-8 relative z-10 pb-12">
        <header className="p-6 md:p-8 rounded-2xl border border-indigo-500/10 bg-[var(--c-surface)]/80 backdrop-blur-md space-y-3">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--c-ink-3)]">
                Build something
              </span>
              <h1 className="flex items-center gap-3 font-display text-3xl md:text-4xl font-normal tracking-[-0.04em]">
                <Hammer className="h-8 w-8 text-indigo-600" />
                <span className="text-[var(--c-ink)]">Projects</span>
              </h1>
              <p className="max-w-2xl text-sm font-medium leading-relaxed text-[var(--c-ink-2)]">
                A roadmap you have finished reading looks exactly like one you
                never started. These are the things you can point at afterwards
                — one per tier, for the technologies we track.
              </p>
            </div>

            <div className="flex items-center gap-6 font-mono">
              {[
                { v: loading ? "—" : String(shown.length), l: "projects" },
                { v: loading ? "—" : `${totalHours}h`, l: "to build" },
              ].map((s) => (
                <div key={s.l} className="text-right">
                  <div className="text-xl md:text-2xl font-normal tabular-nums leading-none text-[var(--c-ink)]">
                    {s.v}
                  </div>
                  <div className="mt-1 text-[9px] uppercase tracking-widest text-[var(--c-ink-2)]/60">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Filters. `.chip` rather than utilities, because a Tailwind type size
            or colour does not apply to a <button> in this app at all. */}
        {!loading && !failed && projects.length > 0 && (
          <div className="space-y-3">
            <ul className="flex flex-wrap gap-2">
              <li>
                <button onClick={() => setTier(null)} aria-pressed={tier === null}
                  className={`chip ${tier === null ? "on-ink border-transparent bg-[var(--c-ink)]" : "border-[var(--c-border)] hover:border-[color-mix(in_srgb,var(--c-ink)_32%,transparent)]"}`}>
                  All tiers <span className="chip-n">{projects.length}</span>
                </button>
              </li>
              {TIERS.map((t) => {
                const n = projects.filter((p) => p.tier === t).length;
                if (!n) return null;
                const on = tier === t;
                return (
                  <li key={t}>
                    <button onClick={() => setTier(on ? null : t)} aria-pressed={on}
                      className={`chip ${on ? "on-ink border-transparent bg-[var(--c-ink)]" : "border-[var(--c-border)] hover:border-[color-mix(in_srgb,var(--c-ink)_32%,transparent)]"}`}>
                      {t} <span className="chip-n">{n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <ul className="flex flex-wrap gap-2">
              <li>
                <button onClick={() => setDomain(null)} aria-pressed={domain === null}
                  className={`chip ${domain === null ? "on-ink border-transparent bg-[var(--c-ink)]" : "border-[var(--c-border)] hover:border-[color-mix(in_srgb,var(--c-ink)_32%,transparent)]"}`}>
                  All domains
                </button>
              </li>
              {domains.map(([name, n]) => {
                const on = domain === name;
                return (
                  <li key={name}>
                    <button onClick={() => setDomain(on ? null : name)} aria-pressed={on}
                      className={`chip ${on ? "on-ink border-transparent bg-[var(--c-ink)]" : "border-[var(--c-border)] hover:border-[color-mix(in_srgb,var(--c-ink)_32%,transparent)]"}`}>
                      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: tintForCategory(name) }} />
                      {name} <span className="chip-n">{n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="font-mono text-xs text-[var(--c-ink-2)]/70">Loading the build list…</span>
          </div>
        ) : failed ? (
          <div className="tech-panel rounded-2xl p-10 text-center">
            <p className="text-sm font-medium text-[var(--c-ink-2)]">
              Could not reach the server. The project list lives on the API, so
              there is nothing to show offline.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="tech-panel rounded-2xl p-10 text-center">
            <p className="text-sm font-medium text-[var(--c-ink-2)]">
              No projects match that combination yet.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <Reveal as="li" key={p.slug} variant="settle" className="h-full">
                <ProjectCard project={p} />
              </Reveal>
            ))}
          </ul>
        )}

        {/* Coverage, stated rather than implied. A learner looking for a tool
            that has nothing yet should find that out here, not by hunting. */}
        {!loading && !failed && projects.length > 0 && (
          <p className="text-[13px] font-medium leading-relaxed text-[var(--c-ink-2)]">
            Briefs exist for{" "}
            <span className="font-mono tabular-nums text-[var(--c-ink)]">
              {new Set(projects.map((p) => p.tool_slug)).size}
            </span>{" "}
            technologies so far. The rest are being written — nothing is
            generated to fill the gap.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
