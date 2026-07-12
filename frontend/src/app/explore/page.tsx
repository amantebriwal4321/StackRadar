"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search, Compass, Star, Loader2, ArrowRight, Sparkles,
  GraduationCap, TrendingUp, Map, Route, Zap,
} from "lucide-react";
import {
  type Tool, type DomainSummary, type LearningPath,
  fetchTools, fetchDomains, fetchLearningPath,
} from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/* ─── Score band helpers ─── */
function scoreColor(score: number): string {
  if (score >= 75) return "#34D399";
  if (score >= 45) return "#A78BFA";
  return "#F472B6";
}
function priorityStyle(p: string): { label: string; cls: string } {
  switch ((p || "").toUpperCase()) {
    case "HIGH": return { label: "High priority", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    case "MEDIUM": return { label: "Worth learning", cls: "text-violet-300 bg-violet-500/10 border-violet-500/20" };
    case "LOW": return { label: "Stable pick", cls: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" };
    case "AVOID": return { label: "Declining", cls: "text-rose-300 bg-rose-500/10 border-rose-500/20" };
    default: return { label: "Tracked", cls: "text-[#A1A1AA] bg-white/5 border-white/10" };
  }
}

/* ─── Circular score gauge ─── */
function ScoreRing({ score, size = 56, stroke = 4 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: circ - dash }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 5px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-black text-sm" style={{ color }}>{Math.round(score)}</span>
      </div>
    </div>
  );
}

/* ─── Premium path node card ─── */
function PathCard({ tool, isEntry = false }: { tool: Tool; isEntry?: boolean }) {
  const prio = priorityStyle(tool.learning_priority);
  const growthStr = tool.growth_pct >= 0 ? `+${tool.growth_pct.toFixed(1)}%` : `${tool.growth_pct.toFixed(1)}%`;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative rounded-2xl border border-violet-500/10 bg-[#18181B]/50 p-5 card-hover-glow overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {isEntry && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-violet-600 text-[8px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <GraduationCap className="w-3 h-3" /> Start here
        </span>
      )}
      <div className="flex items-center gap-4 relative">
        <span className="text-3xl p-2.5 bg-[#111113] border border-violet-500/10 rounded-xl group-hover:scale-105 transition-transform">
          {tool.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-white group-hover:text-violet-400 transition-colors truncate">{tool.name}</h4>
          <p className="text-[10px] font-mono text-[#A1A1AA]/60 uppercase truncate">{tool.category}</p>
        </div>
        <ScoreRing score={tool.score} />
      </div>

      <p className="text-[11px] text-[#A1A1AA] leading-relaxed mt-4 line-clamp-2 font-light relative">
        {tool.description || "Tracked live across developer signal sources."}
      </p>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-violet-500/5 relative">
        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-mono font-bold uppercase tracking-wide ${prio.cls}`}>
          {prio.label}
        </span>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-[#A1A1AA]/70">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            {tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(0)}k` : tool.stars}
          </span>
          <Link href={`/tools/${tool.slug}`} className="flex items-center gap-0.5 text-violet-400 hover:text-white transition-colors font-bold">
            Analyze <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

const TIER_META: Record<string, { label: string; color: string; ring: string; num: string }> = {
  beginner: { label: "Start Here", color: "#34D399", ring: "shadow-[0_0_16px_rgba(52,211,153,0.5)]", num: "01" },
  intermediate: { label: "Build Foundations", color: "#FBBF24", ring: "shadow-[0_0_16px_rgba(251,191,36,0.5)]", num: "02" },
  advanced: { label: "Go Advanced", color: "#F472B6", ring: "shadow-[0_0_16px_rgba(244,114,182,0.5)]", num: "03" },
};

export default function ExplorePage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [toolData, domainData] = await Promise.all([fetchTools(), fetchDomains()]);
        setTools(toolData);
        setDomains(domainData);
        if (domainData.length > 0) setActiveDomain(domainData[0].slug);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!activeDomain) return;
    async function loadPath() {
      setPathLoading(true);
      try {
        setLearningPath(await fetchLearningPath(activeDomain!));
      } catch (err) {
        console.error("Failed to fetch learning path:", err);
        setLearningPath(null);
      } finally {
        setPathLoading(false);
      }
    }
    loadPath();
  }, [activeDomain]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return tools.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [searchQuery, tools]);

  const currentDomain = domains.find((d) => d.slug === activeDomain);
  const toolBySlug = useMemo(() => Object.fromEntries(tools.map((t) => [t.slug, t])), [tools]);
  const entryTool = learningPath?.entry ? toolBySlug[learningPath.entry] : undefined;

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <span className="text-xs font-mono text-[#A1A1AA]/70">Mapping learning paths…</span>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="absolute top-10 left-10 w-[300px] h-[300px] rounded-full bg-violet-500/5 blur-[90px] pointer-events-none z-0" />
      <div className="absolute bottom-20 right-10 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none z-0" />

      <div className="space-y-8 relative z-10 pb-16">

        {/* ─── Cinematic Header ─── */}
        <header className="p-6 md:p-8 rounded-3xl border border-violet-500/10 bg-[#111113]/80 backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(167,139,250,0.08),transparent_55%)] pointer-events-none" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 relative">
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <Route className="w-3.5 h-3.5" /> Momentum-driven learning paths
              </span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight font-display flex items-center gap-3">
                <span className="gradient-text">Explore Universe</span>
              </h1>
              <p className="text-[#A1A1AA] text-sm max-w-xl font-light">
                Pick a domain and follow the sequence StackRadar recommends — ordered by what&apos;s worth learning
                <span className="text-violet-300"> right now</span>, from entry point to advanced.
              </p>
            </div>

            <div className="relative group w-full md:w-80">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl opacity-20 group-focus-within:opacity-50 transition-opacity duration-300 blur-sm" />
              <div className="relative bg-[#18181B] rounded-xl flex items-center border border-violet-500/10 px-3">
                <Search className="w-4 h-4 text-slate-500 group-focus-within:text-violet-400" />
                <input
                  type="text"
                  placeholder="Search all technologies…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none py-3 px-2 text-xs text-white focus:outline-none placeholder-[#A1A1AA]/50"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ─── Domain rail ─── */}
          <aside className="lg:col-span-3 bg-[#111113]/80 border border-violet-500/10 rounded-2xl p-4 space-y-1.5 lg:sticky lg:top-24 z-10 backdrop-blur-md">
            <span className="text-[10px] font-mono font-bold text-[#A1A1AA]/50 uppercase tracking-widest block px-2 pb-2 border-b border-violet-500/5">
              Domains
            </span>
            <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none">
              {domains.map((d) => {
                const isActive = activeDomain === d.slug && !searchQuery.trim();
                return (
                  <button
                    key={d.slug}
                    onClick={() => { setSearchQuery(""); setActiveDomain(d.slug); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-mono tracking-wider transition-all duration-300 shrink-0 text-left cursor-pointer ${
                      isActive ? "bg-[#A78BFA]/15 border-violet-500/40 text-white font-bold" : "bg-transparent border-transparent text-[#A1A1AA] hover:text-white hover:bg-[#18181B]/50"
                    }`}
                  >
                    <span className="text-base select-none">{d.icon}</span>
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: scoreColor(d.score), background: `${scoreColor(d.score)}18` }}>
                      {Math.round(d.score)}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ─── Main ─── */}
          <main className="lg:col-span-9 space-y-8">
            {searchResults ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-mono text-[#A1A1AA]">SEARCH RESULTS · &quot;{searchQuery}&quot;</h3>
                  <span className="text-xs font-mono text-violet-400 font-bold">{searchResults.length} FOUND</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-12 glass-panel rounded-2xl text-center font-mono text-xs text-[#A1A1AA]">
                    No tracked technologies match this lookup.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {searchResults.map((tool) => <PathCard key={tool.slug} tool={tool} />)}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ─── Entry-node spotlight (the score → roadmap bridge) ─── */}
                <AnimatePresence mode="wait">
                  {entryTool && currentDomain && (
                    <motion.div
                      key={entryTool.slug}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="relative rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#18181B]/80 to-[#111113]/60 p-6 md:p-8 overflow-hidden glass-panel-glow"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(167,139,250,0.12),transparent_55%)] pointer-events-none" />
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative">
                        <div className="flex items-center gap-5">
                          <span className="text-5xl p-4 bg-[#111113] border border-violet-500/20 rounded-2xl">{entryTool.icon}</span>
                          <ScoreRing score={entryTool.score} size={76} stroke={5} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Recommended entry point · {currentDomain.name}
                          </span>
                          <h2 className="text-2xl md:text-3xl font-black font-display">
                            Start with <span className="text-white">{entryTool.name}</span>
                          </h2>
                          <p className="text-sm text-[#A1A1AA] font-light max-w-xl leading-relaxed">
                            {entryTool.recommendation || `${entryTool.name} is the highest-leverage place to begin in ${currentDomain.name}. Follow the path below from here.`}
                          </p>
                          <div className="flex flex-wrap gap-3 pt-2">
                            <Link href={`/roadmap/${currentDomain.slug}`} className="btn-primary text-xs py-2.5 px-5 rounded-xl">
                              <Map className="w-4 h-4" /> Start the {currentDomain.name} roadmap
                            </Link>
                            <Link href={`/tools/${entryTool.slug}`} className="px-5 py-2.5 rounded-xl border border-violet-500/20 bg-[#111113]/60 hover:bg-[#18181B] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-colors">
                              <Zap className="w-3.5 h-3.5" /> Analyze {entryTool.name}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ─── Journey spine ─── */}
                {pathLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                    <span className="text-xs font-mono text-[#A1A1AA]/60">Sequencing the path…</span>
                  </div>
                ) : learningPath && learningPath.path.length > 0 ? (
                  <div className="relative pl-6 md:pl-8">
                    {/* glowing vertical spine */}
                    <div className="absolute left-[9px] md:left-[13px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-emerald-500/60 via-amber-500/50 to-rose-500/60 rounded-full" />
                    <div className="space-y-12">
                      {learningPath.path.map((tier) => {
                        const meta = TIER_META[tier.level] ?? TIER_META.intermediate;
                        return (
                          <div key={tier.level} className="relative">
                            {/* node marker */}
                            <div
                              className={`absolute -left-6 md:-left-8 top-1 w-4 h-4 rounded-full border-2 border-[#09090B] ${meta.ring}`}
                              style={{ background: meta.color }}
                            />
                            <div className="flex items-center gap-3 mb-5">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: meta.color, background: `${meta.color}18` }}>
                                STEP {meta.num}
                              </span>
                              <h3 className="text-lg md:text-xl font-black font-display uppercase tracking-wide">{meta.label}</h3>
                              <span className="text-[10px] font-mono text-[#A1A1AA]/50 border border-violet-500/10 rounded px-2 py-0.5">
                                {tier.tools.length} {tier.tools.length === 1 ? "tool" : "tools"}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                              {tier.tools.map((t) => {
                                const full = toolBySlug[t.slug];
                                if (!full) return null;
                                return <PathCard key={t.slug} tool={full} isEntry={t.is_entry_point} />;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-[#A1A1AA]/50 text-xs font-mono border border-dashed border-violet-500/10 rounded-2xl">
                    Select a domain to reveal its learning sequence.
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </DashboardShell>
  );
}
