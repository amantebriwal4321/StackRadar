"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Radar, Signal, BarChart3, Map, ArrowRight, GitBranch,
  MessageSquare, Newspaper, Compass, GraduationCap, Users, Megaphone,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { fetchOverview, fetchTools, type Overview, type Tool } from "@/data/trends";

// ── shared motion preset (respects reduced-motion via framer's global setting) ──
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

function scoreColor(score: number) {
  if (score >= 75) return "#12B76A"; // strong
  if (score >= 45) return "#B54708"; // watch
  return "#F04438";                  // weak
}

export default function AboutPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [topTools, setTopTools] = useState<Tool[]>([]);

  useEffect(() => {
    fetchOverview().then(setOverview).catch(() => {});
    fetchTools()
      .then((t) => setTopTools(t.slice(0, 3)))
      .catch(() => {});
  }, []);

  const stats = [
    { value: overview ? overview.tools_tracked : "—", label: "Technologies scored" },
    { value: overview ? overview.domains : "—", label: "Domains mapped" },
    { value: overview ? overview.source_count : 5, label: "Live signal sources" },
  ];

  return (
    <DashboardShell fullWidth>
      {/* ══════════════ HERO ══════════════ */}
      <section className="relative grid lg:grid-cols-[1.1fr_.9fr] gap-12 lg:gap-16 items-center pt-6 md:pt-10 pb-16">
        {/* techy HUD grid backdrop */}
        <div
          className="absolute inset-0 -z-10 hud-grid opacity-70 [mask-image:radial-gradient(ellipse_at_35%_40%,black,transparent_78%)] pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative">
          <motion.span
            {...reveal}
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.28em] uppercase text-accent-primary"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            Real-time tech intelligence
          </motion.span>

          <motion.h1
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.05 }}
            className="font-display font-extrabold tracking-tight leading-[0.98] text-[clamp(2.5rem,6vw,4.5rem)] mt-5 mb-5 text-balance"
          >
            The <span className="text-text-primary">Bloomberg Terminal</span> for your tech stack.
          </motion.h1>

          <motion.p
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.1 }}
            className="text-text-secondary text-[clamp(1rem,1.4vw,1.2rem)] max-w-[42ch] leading-relaxed"
          >
            Know what to learn and adopt next — scored live from where developers
            actually talk, not from a survey published once a year.
          </motion.p>

          <motion.div
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.15 }}
            className="flex flex-wrap gap-3.5 mt-8"
          >
            <Link href="/trends" className="btn-primary text-xs py-3 px-6 flex items-center gap-2">
              <Radar className="w-4 h-4" /> Explore the radar
            </Link>
            <Link
              href="/explore"
              className="font-mono text-xs tracking-[0.14em] uppercase font-bold py-3 px-6 rounded-xl border border-border-subtle bg-[var(--c-surface)]/[0.02] text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors flex items-center gap-2"
            >
              <Compass className="w-4 h-4" /> Start learning
            </Link>
          </motion.div>

          {/* live stat row */}
          <motion.div
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.2 }}
            className="flex flex-wrap gap-x-10 gap-y-4 mt-11"
          >
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl font-bold tabular-nums text-text-primary">
                  {s.value}
                </div>
                <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-text-secondary mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Radar visual ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-square w-full max-w-[400px] mx-auto"
          aria-hidden="true"
        >
          {/* concentric rings */}
          <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full">
            {[190, 140, 90, 42].map((r) => (
              <circle key={r} cx="200" cy="200" r={r} fill="none" style={{ stroke: "var(--c-border)" }} strokeWidth="1" />
            ))}
            {[0, 30, 60, 90, 120, 150].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={200 - Math.cos(rad) * 190}
                  y1={200 - Math.sin(rad) * 190}
                  x2={200 + Math.cos(rad) * 190}
                  y2={200 + Math.sin(rad) * 190}
                  style={{ stroke: "var(--c-border)" }}
                  strokeWidth="1"
                />
              );
            })}
          </svg>

          {/* rotating sweep */}
          <div
            className="absolute inset-0 rounded-full motion-safe:animate-[spin_7s_linear_infinite]"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(194,62,110,0.35) 0deg, rgba(194,62,110,0.05) 34deg, transparent 60deg, transparent 360deg)",
              maskImage: "radial-gradient(circle at center, black 0%, black 47%, transparent 48%)",
              WebkitMaskImage: "radial-gradient(circle at center, black 0%, black 47%, transparent 48%)",
            }}
          />
          {/* core */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent-glow shadow-[0_0_16px_var(--accent-2)]" />

          {/* real top-3 tool chips */}
          {topTools.map((t, i) => {
            const pos = [
              { top: "8%", left: "2%" },
              { top: "44%", right: "-4%" },
              { bottom: "10%", left: "8%" },
            ][i];
            return (
              <div
                key={t.slug}
                className="absolute glass-panel rounded-lg px-2.5 py-1.5 flex items-center gap-2 font-mono text-[11px] font-bold whitespace-nowrap shadow-[0_6px_24px_-10px_#000]"
                style={pos}
              >
                <span>{t.icon}</span>
                <span className="text-text-secondary">{t.name}</span>
                <span className="font-extrabold" style={{ color: scoreColor(t.score) }}>
                  {Math.round(t.score)}
                </span>
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* ══════════════ THE GAP ══════════════ */}
      <Section
        eyebrow="The gap"
        title="Developers make high-stakes bets on stale information."
        blurb="“Should I learn this? Is it still worth investing in? What’s rising right now?” — asked constantly, answered badly."
      >
        <div className="grid md:grid-cols-2 gap-5">
          <div className="tech-panel rounded-2xl p-6 md:p-7">
            <h3 className="font-mono text-xs tracking-[0.16em] uppercase text-text-secondary mb-4">
              Today, you rely on…
            </h3>
            <ul className="space-y-3 text-text-secondary/80">
              {[
                "An annual developer survey from 8 months ago.",
                "A viral thread with no data behind it.",
                "GitHub stars alone — a lagging vanity metric.",
                "Gut feel about what your team should adopt.",
              ].map((t) => (
                <li key={t} className="line-through decoration-accent-hot/70 opacity-70">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-panel-glow rounded-2xl p-6 md:p-7 border border-accent-primary/20">
            <h3 className="font-mono text-xs tracking-[0.16em] uppercase text-accent-primary mb-4">
              StackRadar gives you…
            </h3>
            <ul className="space-y-3 text-text-primary/90">
              {[
                <>A live <b className="text-text-primary">0–100 momentum score</b> per tool, refreshed continuously.</>,
                <>Signal from <b className="text-text-primary">GitHub, Hacker News, Reddit, Dev.to &amp; tech RSS</b> — fused.</>,
                <>Growth stage and trajectory, not just today&apos;s star count.</>,
                <>A one-click jump from “this is rising” to <b className="text-text-primary">a learning roadmap</b>.</>,
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-accent-primary mt-0.5">→</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ══════════════ POSITIONING STATEMENT ══════════════ */}
      <motion.section {...reveal} className="py-14 border-t border-border-subtle">
        <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-accent-primary">
          Positioning
        </span>
        <p className="font-display font-bold tracking-tight leading-[1.12] text-[clamp(1.6rem,4vw,2.75rem)] max-w-[22ch] mt-4 text-balance">
          StackRadar is the live intelligence layer for{" "}
          <span className="text-accent-primary">technology decisions</span> — it turns
          what the developer world is saying into a score, and turns that score into a
          next step.
        </p>
        <div className="font-mono text-xs tracking-[0.2em] uppercase text-accent-cyan mt-6">
          Category · Real-time developer tech intelligence
        </div>
      </motion.section>

      {/* ══════════════ THE LOOP ══════════════ */}
      <Section
        eyebrow="The product in one motion"
        title="Signal → Score → Roadmap."
        blurb="The wedge isn’t the dashboard — it’s the bridge from intelligence to action. That’s the part competitors don’t have."
      >
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              n: "01 · Ingest", k: "Signal", icon: Signal,
              body: "Scrape GitHub, Hacker News, Reddit, Dev.to and tech RSS on a live loop — real developer conversation, not marketing.",
            },
            {
              n: "02 · Analyze", k: "Score", icon: BarChart3,
              body: "Fuse repository activity, cross-source mentions and trajectory into one 0–100 momentum score, ranked against every other tool.",
            },
            {
              n: "03 · Act", k: "Roadmap", icon: Map,
              body: "Every rising tool links straight into a sequenced learning path — so the answer to “what now?” is one click away.",
            },
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.k} className="relative tech-panel tech-panel-interactive rounded-2xl p-6">
                <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-text-secondary/70">
                  {step.n}
                </div>
                <div className="flex items-center gap-3 mt-3 mb-2.5">
                  <span className="w-8 h-8 rounded-lg grid place-items-center bg-accent-primary/12 border border-border-subtle">
                    <Icon className="w-4 h-4 text-accent-primary" />
                  </span>
                  <span className="font-display font-bold text-lg">{step.k}</span>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed">{step.body}</p>
                {i < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-[11px] top-1/2 -translate-y-1/2 w-5 h-5 text-accent-primary bg-background rounded-full p-0.5 border border-border-subtle z-10" />
                )}
              </div>
            );
          })}
        </div>

        {/* source badges */}
        <div className="flex flex-wrap items-center gap-2.5 mt-6">
          {[
            { label: "GitHub", icon: GitBranch },
            { label: "Hacker News", icon: MessageSquare },
            { label: "Reddit", icon: MessageSquare },
            { label: "Dev.to", icon: Newspaper },
            { label: "Tech RSS", icon: Newspaper },
          ].map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-secondary border border-border-subtle rounded-full px-3 py-1.5"
            >
              <s.icon className="w-3 h-3" /> {s.label}
            </span>
          ))}
        </div>
      </Section>

      {/* ══════════════ WHO IT'S FOR ══════════════ */}
      <Section
        eyebrow="Who opens it daily"
        title="Built for the people making a choice."
        blurb="One product, three jobs-to-be-done. We lead with the first — the highest-volume, most shareable."
      >
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              tag: "Primary", accent: "#7C2D4A", icon: GraduationCap,
              who: "Learners & career-switchers",
              jtbd: "“I have limited time — what do I learn next so it still matters in two years?”",
              hook: "See what’s rising, then start its roadmap in one click. Intelligence becomes action.",
            },
            {
              tag: "Secondary", accent: "#7C2D4A", icon: Users,
              who: "Senior devs & tech leads",
              jtbd: "“Is this tool safe to standardize on, or is it already cooling off?”",
              hook: "Compare momentum and trajectory before you bet a codebase on it.",
            },
            {
              tag: "Growth loop", accent: "#7C2D4A", icon: Megaphone,
              who: "DevRel & creators",
              jtbd: "“What’s heating up that I should make content about this week?”",
              hook: "Screenshot-ready score cards and movers → built-in distribution.",
            },
          ].map((a) => (
            <div key={a.who} className="relative tech-panel rounded-2xl p-6 overflow-hidden flex flex-col gap-3">
              <span className="absolute left-0 inset-y-0 w-[3px]" style={{ background: a.accent, opacity: 0.6 }} />
              <div className="flex items-center justify-between">
                <a.icon className="w-5 h-5" style={{ color: a.accent }} />
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-secondary/70">
                  {a.tag}
                </span>
              </div>
              <div className="font-display font-bold text-lg">{a.who}</div>
              <p className="text-text-secondary text-sm">{a.jtbd}</p>
              <p className="text-sm text-text-primary/90 border-t border-dashed border-border-subtle pt-3 mt-auto">
                {a.hook}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════ CTA ══════════════ */}
      <motion.section
        {...reveal}
        className="my-6 rounded-3xl glass-panel-glow border border-accent-primary/15 px-6 md:px-12 py-12 md:py-16 text-center relative overflow-hidden"
      >
        <div className="ambient-orb ambient-orb-1" aria-hidden="true" />
        <h2 className="font-display font-extrabold tracking-tight text-[clamp(1.75rem,3.5vw,2.75rem)] text-balance">
          Start with what&apos;s <span className="gradient-text">actually rising</span>.
        </h2>
        <p className="text-text-secondary max-w-[46ch] mx-auto mt-4">
          {overview
            ? `${overview.tools_tracked} technologies scored live across ${overview.domains} domains — see today’s movers, then jump straight into learning.`
            : "See today’s movers, then jump straight into learning."}
        </p>
        <div className="flex flex-wrap gap-3.5 justify-center mt-8">
          <Link href="/trends" className="btn-primary text-xs py-3 px-6 flex items-center gap-2">
            <Radar className="w-4 h-4" /> See the live board
          </Link>
          <Link
            href="/explore"
            className="font-mono text-xs tracking-[0.14em] uppercase font-bold py-3 px-6 rounded-xl border border-border-subtle bg-[var(--c-surface)]/[0.02] text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors flex items-center gap-2"
          >
            <Compass className="w-4 h-4" /> Browse learning paths
          </Link>
        </div>
      </motion.section>
    </DashboardShell>
  );
}

// ── reusable section scaffold ──
function Section({
  eyebrow, title, blurb, children,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section {...reveal} className="py-14 border-t border-border-subtle">
      <span className="block w-10 neon-rule mb-7" aria-hidden="true" />
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-accent-primary">
            {eyebrow}
          </span>
          <h2 className="font-display font-bold tracking-tight text-[clamp(1.5rem,3vw,2.1rem)] mt-2 leading-tight text-balance max-w-[20ch]">
            {title}
          </h2>
        </div>
        {blurb && <p className="text-text-secondary text-sm max-w-[42ch]">{blurb}</p>}
      </div>
      {children}
    </motion.section>
  );
}
