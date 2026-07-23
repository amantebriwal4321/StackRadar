import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Play, ListVideo, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { fetchRoadmap, fetchRoadmaps, type Roadmap } from "@/data/trends";

/**
 * SEO guide page — the free-traffic front door.
 *
 * Students search "how to learn X", not "momentum percentiles". This is a
 * server-rendered, content-rich, indexable answer to that query: the full
 * step-by-step path with the best free video per tool, an FAQ, and structured
 * data (Course + FAQ + Breadcrumb) for rich Google results. It funnels to the
 * interactive roadmap and the shareable plan.
 *
 * Deliberately separate from /roadmap (interactive app, client-rendered) and
 * /plan (share/convert) — this one exists to rank and to inform.
 */

export const revalidate = 86400; // rebuild daily; content tracks live data slowly
export const dynamicParams = false; // only real roadmap slugs; others 404

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://stackradar.dev";

export async function generateStaticParams() {
  try {
    const roadmaps = await fetchRoadmaps();
    return roadmaps.map((r) => ({ slug: r.slug }));
  } catch {
    return ["ai-ml", "web-development", "devops", "cybersecurity", "cloud-native", "systems", "web3", "data-databases"].map((slug) => ({ slug }));
  }
}

/** "AI / ML Roadmap" -> "AI / ML" — a clean subject for the headline. */
function subject(r: Roadmap): string {
  return r.title.replace(/\s*roadmap\s*$/i, "").trim();
}

async function getRoadmap(slug: string): Promise<Roadmap | null> {
  try {
    const r = await fetchRoadmap(slug);
    return r?.slug ? r : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRoadmap(slug);
  if (!r) return { title: "Learning guide · StackRadar" };
  const subj = subject(r);
  const title = `How to Learn ${subj} in 2026 — Free Step-by-Step Roadmap`;
  const description = `The complete free roadmap to learn ${subj}: the exact tools in the right order, the single best free video for each, and a plan you can track. Ranked by live industry data.`;
  const og = `/api/og?title=${encodeURIComponent(`How to learn ${subj}`)}&subtitle=${encodeURIComponent(`Free step-by-step roadmap · best video per step`)}&emoji=${encodeURIComponent(r.icon || "🧭")}`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/learn/${slug}` },
    openGraph: { title, description, url: `${SITE}/learn/${slug}`, images: [{ url: og, width: 1200, height: 630 }], type: "article" },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

export default async function LearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRoadmap(slug);
  if (!r) notFound();

  const subj = subject(r);
  const steps = r.steps || [];
  const allTools = steps.flatMap((s) => s.tools || []);
  const weeks = r.estimated_weeks || 10;

  const faqs = [
    {
      q: `Is ${subj} worth learning in 2026?`,
      a: `Yes. StackRadar scores every tool in this path by live momentum from GitHub, Hacker News and developer communities, and ${subj} tools remain in strong demand. This roadmap tracks that data, so you learn what the industry is actually using — not a syllabus from years ago.`,
    },
    {
      q: `How long does it take to learn ${subj}?`,
      a: `About ${weeks} weeks at a steady pace of a little each day. The roadmap breaks it into ${steps.length} sequenced steps so you always know the single next thing to do, and a streak tracker keeps you consistent.`,
    },
    {
      q: `Do I need to pay for a course to learn ${subj}?`,
      a: `No. Every step here links the single best free video we could find — hand-picked and checked to be live — plus free documentation and practice resources. The whole path is free.`,
    },
    {
      q: `What should I learn first in ${subj}?`,
      a: steps[0] ? `Start with "${steps[0].title}". ${steps[0].description}` : `Start at step one and follow the sequence — the order is the point.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        name: `How to Learn ${subj} — Free Roadmap`,
        description: `A free, sequenced roadmap to learn ${subj}, with the best free video for each step.`,
        provider: { "@type": "Organization", name: "StackRadar", url: SITE },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE}/roadmaps` },
          { "@type": "ListItem", position: 3, name: subj, item: `${SITE}/learn/${slug}` },
        ],
      },
    ],
  };

  return (
    <DashboardShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 text-[11px] font-mono text-indigo-600 uppercase tracking-widest mb-4">
            <Link href="/roadmaps" className="hover:underline">Roadmaps</Link>
            <span className="text-[var(--c-ink-2)]/40">/</span>
            <span className="text-[var(--c-ink-2)]">{subj}</span>
          </div>
          <div className="text-5xl mb-4">{r.icon || "🧭"}</div>
          <h1 className="text-3xl md:text-5xl font-black font-display text-[var(--c-ink)] leading-tight mb-4">
            How to Learn {subj} in 2026
          </h1>
          <p className="text-base md:text-lg text-[var(--c-ink-2)] font-light leading-relaxed">
            A complete, free roadmap — the exact tools in the right order, the single best free video for each,
            and a plan you can actually track. Ranked by live industry momentum, so you learn what teams use today.
          </p>

          <div className="flex flex-wrap gap-4 mt-6 text-sm font-mono">
            <span className="flex items-center gap-1.5 text-[var(--c-ink-2)]"><Clock className="w-4 h-4 text-indigo-600" /> ~{weeks} weeks</span>
            <span className="flex items-center gap-1.5 text-[var(--c-ink-2)]"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> {steps.length} steps</span>
            <span className="flex items-center gap-1.5 text-[var(--c-ink-2)]"><TrendingUp className="w-4 h-4 text-indigo-600" /> {allTools.length} tools</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href={`/roadmap/${slug}`} prefetch className="btn-primary text-sm py-3.5 px-7 rounded-xl justify-center">
              Start the interactive roadmap <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href={`/plan/${slug}`} prefetch className="px-7 py-3.5 rounded-xl border border-indigo-500/25 bg-[var(--c-surface)]/60 hover:bg-[var(--c-surface-2)] text-sm font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors text-[var(--c-ink)]">
              Get your 5-minute plan
            </Link>
          </div>
        </header>

        {/* The path */}
        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-black font-display text-[var(--c-ink)] mb-6">
            The step-by-step path
          </h2>
          <ol className="space-y-5">
            {steps.map((s) => (
              <li key={s.step} className="tech-panel rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    {s.step}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold font-display text-[var(--c-ink)]">{s.title}</h3>
                  <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-[var(--c-ink-2)]/70 shrink-0">{s.level}</span>
                </div>
                <p className="text-sm text-[var(--c-ink-2)] font-light leading-relaxed mb-3">{s.description}</p>

                {s.tools && s.tools.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {s.tools.map((t) => (
                      t.video ? (
                        <a
                          key={t.slug}
                          href={t.video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-lg border border-indigo-500/20 bg-[var(--accent-1)]/10 text-xs font-bold text-[var(--accent-1)] hover:bg-[var(--accent-1)] hover:text-white transition-colors"
                        >
                          {t.video.kind === "playlist" ? <ListVideo className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          {t.name}
                        </a>
                      ) : (
                        <Link
                          key={t.slug}
                          href={`/tools/${t.slug}`}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-500/15 bg-[var(--c-surface)]/70 text-xs font-bold text-[var(--c-ink)] hover:border-indigo-400/40 transition-colors"
                        >
                          {t.icon} {t.name}
                        </Link>
                      )
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-black font-display text-[var(--c-ink)] mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="tech-panel rounded-xl p-5 group">
                <summary className="font-bold text-[var(--c-ink)] cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-indigo-600 group-open:rotate-45 transition-transform text-xl leading-none shrink-0">+</span>
                </summary>
                <p className="text-sm text-[var(--c-ink-2)] font-light leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="tech-panel rounded-2xl p-6 md:p-8 text-center">
          <h2 className="text-xl md:text-2xl font-black font-display text-[var(--c-ink)] mb-2">
            Ready to start learning {subj}?
          </h2>
          <p className="text-sm text-[var(--c-ink-2)] font-light mb-6">Free, no sign-up to begin. Track your streak, one lesson at a time.</p>
          <Link href={`/roadmap/${slug}`} prefetch className="btn-primary text-sm py-3.5 px-7 rounded-xl inline-flex">
            Open the {subj} roadmap <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </article>
    </DashboardShell>
  );
}
