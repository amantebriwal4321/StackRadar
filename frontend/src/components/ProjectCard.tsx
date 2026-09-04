import Link from "next/link";
import { Clock, PlayCircle, FileText, ListChecks } from "lucide-react";
import TechLogo from "@/components/ui/TechLogo";
import type { ProjectSummary, ProjectTier } from "@/data/trends";

/* One project, as a card.
 *
 * Used by all three surfaces — the /projects index, the tool profile section,
 * and roadmap steps — so a project looks the same wherever a learner meets it.
 *
 * TIER COLOURS ARE BORROWED, NOT INVENTED. The roadmap page already colours its
 * step levels emerald / amber / rose, and a project's tier means the same thing
 * a step's level does. Giving projects their own scheme would have made two
 * different palettes for one idea.
 *
 * Server component: no hooks, no client bundle cost.
 */

export const TIER_BADGE: Record<ProjectTier, string> = {
  beginner: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  intermediate: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  advanced: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
};

export default function ProjectCard({
  project,
  showTool = true,
  compact = false,
}: {
  project: ProjectSummary;
  /** Hide the tool row where the surrounding context already names the tool. */
  showTool?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="tech-panel tech-panel-interactive group flex h-full flex-col rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TIER_BADGE[project.tier]}`}
        >
          {project.tier}
        </span>
        <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] tabular-nums text-[var(--c-ink-2)]">
          <Clock className="h-3 w-3" />
          {project.est_hours}h
        </span>
      </div>

      <h3
        className={`mt-3 font-medium leading-snug tracking-[-0.02em] text-[var(--c-ink)] transition-colors group-hover:text-indigo-600 ${
          compact ? "text-[15px]" : "text-[17px]"
        }`}
      >
        {project.title}
      </h3>

      <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[var(--c-ink-2)]">
        {project.summary}
      </p>

      {showTool && project.tool_name && (
        <p className="mt-3 flex items-center gap-2">
          <TechLogo slug={project.tool_slug} emoji={project.tool_icon} size={16} brand />
          <span className="text-[12px] font-medium text-[var(--c-ink-2)]">
            {project.tool_name}
          </span>
        </p>
      )}

      {/* What the walkthrough actually contains. Stated as counts rather than a
          generic "walkthrough available", because a project with five written
          steps and no video is a different proposition from one with a video,
          and the learner should be able to tell before clicking. */}
      <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 font-mono text-[10px] uppercase tracking-wider text-[var(--c-ink-3)]">
        {project.has_video && (
          <span className="flex items-center gap-1">
            <PlayCircle className="h-3 w-3" /> video
          </span>
        )}
        {project.step_count > 0 && (
          <span className="flex items-center gap-1 tabular-nums">
            <ListChecks className="h-3 w-3" /> {project.step_count} steps
          </span>
        )}
        {project.doc_count > 0 && (
          <span className="flex items-center gap-1 tabular-nums">
            <FileText className="h-3 w-3" /> {project.doc_count} docs
          </span>
        )}
      </p>
    </Link>
  );
}
