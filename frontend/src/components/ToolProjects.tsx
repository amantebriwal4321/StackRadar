"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hammer } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import { fetchToolProjects, type ProjectSummary } from "@/data/trends";

/* "Now go build something with it", on the tool profile.
 *
 * Sits directly under LearningResources, which is the right order: a learner
 * has just decided this tool is worth their time and picked a course. The next
 * question is what to do with it.
 *
 * THE EMPTY STATE IS HONEST AND VISIBLE. Coverage is partial by design — six
 * tools have briefs, the rest do not yet — so a tool with nothing says so
 * plainly instead of rendering an empty grid or hiding the section entirely.
 * Hiding it would leave a learner unsure whether the feature exists at all.
 */
export default function ToolProjects({ slug, toolName }: { slug: string; toolName: string }) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchToolProjects(slug)
      .then((d) => { if (alive) setProjects(d.projects); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [slug]);

  // Never render a skeleton for a section that may legitimately be empty.
  if (failed || projects === null) return null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-normal text-[var(--c-ink)]">
          <Hammer className="h-5 w-5 text-indigo-600" />
          Build something with {toolName}
        </h2>
        {projects.length > 0 && (
          <Link href="/projects" className="font-mono text-[11px] uppercase tracking-widest text-[var(--c-ink-2)] transition-colors hover:text-[var(--c-ink)]">
            All projects →
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--c-border)] p-6">
          <p className="text-[14px] font-medium leading-relaxed text-[var(--c-ink-2)]">
            No project brief for {toolName} yet. They are written by hand, one
            tool at a time — nothing is generated to fill the gap.{" "}
            <Link href="/projects" className="underline decoration-[var(--c-ink-3)] underline-offset-4 hover:text-[var(--c-ink)]">
              See the ones that exist
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {projects.map((p) => (
            <li key={p.slug} className="h-full">
              <ProjectCard project={p} showTool={false} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
