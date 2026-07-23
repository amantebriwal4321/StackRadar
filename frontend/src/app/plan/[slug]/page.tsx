import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, PlayCircle, Flame } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import ShareButton from "@/components/ShareButton";
import { goalBySlug, GOALS } from "@/data/goals";

/**
 * Public, shareable landing for a career plan.
 *
 * This is the URL the Share button hands out. Being a server component, it gets
 * a per-goal Open Graph card (generateMetadata below), so a link dropped in
 * WhatsApp or X previews as "Your path to AI/ML" rather than a bare URL — that
 * preview is what converts a share into a click. From here one tap opens the
 * live roadmap.
 */

// Pre-render every goal page at build time; the goal set is fixed, so any other
// slug 404s instead of rendering a dynamic page.
export const dynamicParams = false;
export function generateStaticParams() {
  return GOALS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const goal = goalBySlug(slug);
  if (!goal) return { title: "Learning plan · StackRadar" };

  const title = `Your path to ${goal.label.replace(/^(Land a|Get into|Break into) /i, "")}`;
  const desc = `${goal.outcome} — the right tools in the right order, each with the single best free video. Free on StackRadar.`;
  const og = `/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(goal.outcome)}&emoji=${encodeURIComponent(goal.icon)}`;

  return {
    title: `${title} · StackRadar`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [{ url: og, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [og],
    },
  };
}

export default async function PlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const goal = goalBySlug(slug);
  if (!goal) notFound();

  const features = [
    { icon: CheckCircle2, t: "Sequenced steps", d: "The right order, not a random pile of links" },
    { icon: PlayCircle, t: "Best free video each", d: "Hand-picked and checked to be live" },
    { icon: Flame, t: "Streak tracking", d: "One thing a day — build the habit" },
  ];

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto">
        <div className="tech-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="hud-grid absolute inset-0 opacity-[0.25] pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[var(--accent-2)]/[0.08] blur-3xl pointer-events-none" />

          <div className="relative">
            <span className="text-[11px] font-mono font-bold text-indigo-600 uppercase tracking-widest">
              Your 5-minute career plan
            </span>
            <div className="flex items-start gap-4 mt-3 mb-6">
              <span className="text-5xl md:text-6xl leading-none select-none">{goal.icon}</span>
              <div>
                <h1 className="text-3xl md:text-5xl font-black font-display text-[var(--c-ink)] leading-tight">
                  {goal.label}
                </h1>
                <p className="text-sm md:text-base text-[var(--c-ink-2)] font-light mt-1.5">
                  {goal.outcome} · {goal.weeks}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              {features.map((f) => (
                <div key={f.t} className="p-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)]/60">
                  <f.icon className="w-5 h-5 text-indigo-600 mb-2" />
                  <p className="text-sm font-bold text-[var(--c-ink)]">{f.t}</p>
                  <p className="text-xs text-[var(--c-ink-2)] font-light mt-0.5">{f.d}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/roadmap/${goal.slug}`}
                prefetch
                className="btn-primary text-sm py-3.5 px-7 rounded-xl justify-center"
              >
                Open the roadmap <ArrowRight className="w-4 h-4" />
              </Link>
              <ShareButton
                path={`/plan/${goal.slug}`}
                title={`My ${goal.label} plan on StackRadar`}
                text={`${goal.outcome} — the right tools in the right order, each with the best free video. Free 👇`}
                label="Share this plan"
              />
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--c-ink-2)]/70 font-mono mt-6">
          Not your goal?{" "}
          <Link href="/" className="text-indigo-600 hover:underline">Pick another →</Link>
        </p>
      </div>
    </DashboardShell>
  );
}
