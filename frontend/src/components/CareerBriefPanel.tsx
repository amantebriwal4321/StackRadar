import { Briefcase, ClipboardList, FolderGit2, CalendarDays } from "lucide-react";

import type { CareerBrief } from "@/data/trends";

/**
 * "What the first job asks for" — the bridge from a momentum score to a career
 * decision, and the one place the product makes a claim about employment.
 *
 * Two kinds of claim live here and they are deliberately styled apart:
 *
 *   MEASURED  — the per-tool counts, always with their denominator and the
 *               period, because "React: 171" alone would be a claim about the
 *               job market that three threads from one community cannot carry.
 *   AUTHORED  — the prose, marked with the review date, because it is judgement.
 *               Opinion rendered as data is the failure this product exists to
 *               avoid.
 *
 * No hooks, so it renders inside the server-rendered /learn page (the surface
 * that ranks) and the client-rendered /roadmap page alike.
 */
export default function CareerBriefPanel({
  career,
  domain,
}: {
  career: CareerBrief;
  domain: string;
}) {
  const measured = career.demand.filter((d) => d.jobs_sample);
  const sample = measured[0]?.jobs_sample ?? null;
  const period = measured[0]?.jobs_period ?? null;

  return (
    <section
      aria-labelledby="first-job"
      className="tech-panel rounded-2xl p-6 md:p-8"
    >
      <div className="flex items-center gap-2.5">
        <Briefcase className="h-4 w-4 shrink-0 text-indigo-600" />
        <h2
          id="first-job"
          className="text-[19px] font-medium leading-snug text-[var(--c-ink)]"
        >
          What the first {domain} job asks for
        </h2>
      </div>

      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-ink-3)]">
        {career.role_title}
      </p>

      <p className="mt-4 max-w-2xl text-[15px] font-medium leading-relaxed text-[var(--c-ink-2)]">
        {career.reality}
      </p>

      {/* MEASURED — counts, denominator, period. */}
      {measured.length > 0 && (
        <div className="mt-6 border-t border-[var(--c-border)] pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-ink-3)]">
            Measured · how many of {sample?.toLocaleString("en-US")} hiring posts named each
            {period ? ` · ${period}` : ""}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {measured.map((tool) => (
              <li
                key={tool.slug}
                className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] px-2.5 py-1.5"
              >
                <span aria-hidden>{tool.icon}</span>
                <span className="text-[13px] font-medium text-[var(--c-ink)]">
                  {tool.name}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-[var(--c-ink-2)]">
                  {tool.jobs_mentions
                    ? tool.jobs_mentions.toLocaleString("en-US")
                    : "not named"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--c-ink-3)]">
            Counted from the monthly “Ask HN: Who is hiring?” threads — one community,
            not the whole market.
          </p>
        </div>
      )}

      {/* AUTHORED — judgement, dated. */}
      <div className="mt-6 grid gap-6 border-t border-[var(--c-border)] pt-5 md:grid-cols-3">
        <Column
          icon={<ClipboardList className="h-3.5 w-3.5" />}
          title="Postings ask for"
          items={career.postings_ask}
        />
        <Column
          icon={<FolderGit2 className="h-3.5 w-3.5" />}
          title="Your portfolio needs"
          items={career.portfolio_expects}
        />
        <Column
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          title="The first 90 days"
          items={career.first_90_days}
        />
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-[var(--c-ink-3)]">
        Written by hand and reviewed {career.reviewed} against those counts — judgement,
        not a measurement.
      </p>
    </section>
  );
}

function Column({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-ink-3)]">
        {icon}
        {title}
      </p>
      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-[14px] font-medium leading-relaxed text-[var(--c-ink-2)]"
          >
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--c-ink-3)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
