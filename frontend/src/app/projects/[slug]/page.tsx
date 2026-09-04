"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Clock, PlayCircle, ExternalLink, Check, BookOpen, Loader2, Hammer,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import TechLogo from "@/components/ui/TechLogo";
import Reveal from "@/components/ui/Reveal";
import { TIER_BADGE } from "@/components/ProjectCard";
import { fetchProject, type Project } from "@/data/trends";

/* One project brief, in full.
 *
 * The order is the order a builder needs it in: what it is, what it must do
 * when it is finished, then how to get there. Requirements come before the
 * walkthrough deliberately — the point is to build the thing, and the
 * walkthrough is support, not the assignment.
 *
 * The walkthrough section renders only what was actually verified. When
 * `video_verified` is false there is no video block at all, rather than a
 * placeholder implying one is coming.
 */
export default function ProjectPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    // No setLoading(true) here: the state already starts true, and a
    // synchronous setState in an effect body cascades a render — the rule this
    // repo enforces everywhere. The route remounts on a slug change, so there
    // is no stale-loading case to guard against.
    fetchProject(slug)
      .then(setProject)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Project not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="font-mono text-xs text-[var(--c-ink-2)]/70">Loading the brief…</span>
        </div>
      </DashboardShell>
    );
  }

  if (error || !project) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32">
          <div className="tech-panel max-w-sm space-y-4 rounded-2xl p-8 text-center">
            <p className="font-mono text-xs text-[var(--c-ink-2)]">{error || "Project not found"}</p>
            <Link href="/projects" className="btn-secondary">All projects</Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const w = project.walkthrough;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl space-y-8 relative z-10 pb-16">
        <Link href="/projects" className="inline-flex items-center font-mono text-xs text-[var(--c-ink-2)] transition-colors hover:text-[var(--c-ink)]">
          <ArrowLeft className="mr-2 h-4 w-4" /> ALL_PROJECTS
        </Link>

        {/* ── The brief ── */}
        <header className="tech-panel rounded-2xl p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TIER_BADGE[project.tier]}`}>
              {project.tier}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[var(--c-ink-2)]">
              <Clock className="h-3.5 w-3.5" /> about {project.est_hours} hours
            </span>
            {project.tool_name && (
              <Link href={`/tools/${project.tool_slug}`} className="flex items-center gap-2 transition-opacity hover:opacity-70">
                <TechLogo slug={project.tool_slug} emoji={project.tool_icon} size={17} brand />
                <span className="text-[13px] font-medium text-[var(--c-ink-2)]">{project.tool_name}</span>
              </Link>
            )}
          </div>

          <h1 className="mt-4 font-display text-3xl font-normal leading-tight tracking-[-0.04em] text-[var(--c-ink)] md:text-4xl">
            {project.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] font-medium leading-relaxed text-[var(--c-ink-2)]">
            {project.brief}
          </p>
        </header>

        {/* ── Done means this ── */}
        <Reveal variant="rise" className="tech-panel rounded-2xl p-7 md:p-9">
          <h2 className="flex items-center gap-2 font-display text-base font-normal text-[var(--c-ink)]">
            <Check className="h-5 w-5 text-indigo-600" /> It is finished when
          </h2>
          <ul className="mt-5 space-y-3">
            {project.requirements.map((r) => (
              <li key={r} className="flex gap-3">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span className="text-[14px] font-medium leading-relaxed text-[var(--c-ink-2)]">{r}</span>
              </li>
            ))}
          </ul>

          <p className="mt-7 border-t border-[var(--c-border)] pt-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-ink-3)]">
              What it proves
            </span>
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.skills.map((s) => (
              <li key={s} className="rounded-full border border-[var(--c-border)] bg-[var(--c-surface-2)] px-3 py-1 text-[12px] font-medium text-[var(--c-ink-2)]">
                {s}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* ── How to get there ── */}
        {(w.video || w.steps.length > 0 || w.docs.length > 0) && (
          <Reveal variant="rise" className="tech-panel rounded-2xl p-7 md:p-9">
            <h2 className="flex items-center gap-2 font-display text-base font-normal text-[var(--c-ink)]">
              <Hammer className="h-5 w-5 text-indigo-600" /> Walkthrough
            </h2>

            {w.video && (
              <a href={w.video.url} target="_blank" rel="noopener noreferrer"
                className="tech-panel tech-panel-interactive group mt-5 flex items-center gap-4 rounded-xl p-3">
                {w.video.thumbnail ? (
                  <Image src={w.video.thumbnail} alt="" width={160} height={90}
                    className="h-[68px] w-[120px] shrink-0 rounded-lg object-cover" unoptimized />
                ) : (
                  <span className="flex h-[68px] w-[120px] shrink-0 items-center justify-center rounded-lg bg-[var(--c-surface-2)]">
                    <PlayCircle className="h-6 w-6 text-indigo-600" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-[var(--c-ink)] group-hover:text-indigo-600">
                    {w.video.title || "Watch the walkthrough"}
                  </span>
                  {w.video.channel && (
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--c-ink-2)]">
                      {w.video.channel}
                    </span>
                  )}
                </span>
              </a>
            )}

            {w.steps.length > 0 && (
              <ol className="mt-6 space-y-4">
                {w.steps.map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--c-surface-2)] font-mono text-[11px] tabular-nums text-[var(--c-ink-2)]">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-[14px] font-medium leading-relaxed text-[var(--c-ink-2)]">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {w.docs.length > 0 && (
              <div className="mt-7 border-t border-[var(--c-border)] pt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-ink-3)]">
                  Official documentation
                </p>
                <ul className="mt-3 space-y-2">
                  {w.docs.map((d) => (
                    <li key={d.url}>
                      <a href={d.url} target="_blank" rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 text-[14px] font-medium text-[var(--c-ink-2)] transition-colors hover:text-indigo-600">
                        <BookOpen className="h-4 w-4 shrink-0" />
                        {d.label}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>
        )}

        <p className="text-[13px] font-medium leading-relaxed text-[var(--c-ink-2)]">
          Stuck? The{" "}
          <Link href={`/tools/${project.tool_slug}`} className="underline decoration-[var(--c-ink-3)] underline-offset-4 hover:text-[var(--c-ink)]">
            {project.tool_name} profile
          </Link>{" "}
          has ranked courses and the official docs for the tool itself.
        </p>
      </div>
    </DashboardShell>
  );
}
