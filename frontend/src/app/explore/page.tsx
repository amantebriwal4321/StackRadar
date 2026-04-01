"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search, Compass, ChevronDown, ChevronUp, Star, Loader2,
  ArrowRight, Sparkles, GraduationCap,
} from "lucide-react";
import {
  type Tool, type DomainSummary, type LearningPath,
  fetchTools, fetchDomains, fetchLearningPath,
} from "@/data/trends";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import Link from "next/link";

// Level styling
const levelStyle: Record<string, { dot: string; border: string; bg: string }> = {
  beginner:     { dot: "bg-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
  intermediate: { dot: "bg-amber-500",   border: "border-amber-500/30",   bg: "bg-amber-500/5" },
  advanced:     { dot: "bg-rose-500",     border: "border-rose-500/30",    bg: "bg-rose-500/5" },
};

export default function ExplorePage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  // Load all tools and domains on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [toolData, domainData] = await Promise.all([
          fetchTools(),
          fetchDomains(),
        ]);
        setTools(toolData);
        setDomains(domainData);
        // Auto-select first domain
        if (domainData.length > 0) {
          setActiveDomain(domainData[0].slug);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Fetch learning path when domain changes
  useEffect(() => {
    if (!activeDomain) return;
    async function loadPath() {
      setPathLoading(true);
      try {
        const data = await fetchLearningPath(activeDomain!);
        setLearningPath(data);
      } catch (err) {
        console.error("Failed to fetch learning path:", err);
        setLearningPath(null);
      } finally {
        setPathLoading(false);
      }
    }
    loadPath();
  }, [activeDomain]);

  // Search support: filter tools across ALL domains
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, tools]);

  const currentDomainName = domains.find(d => d.slug === activeDomain)?.name || "";

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 fade-in">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
              <Compass className="w-7 h-7 text-primary" />
              Learning Paths
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              Guided learning paths organized by domain. Start with beginner tools and progress to advanced.
            </p>
          </div>
          <div className="relative group w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search all tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 bg-card border border-border/60 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* If searching, show flat results */}
        {searchResults ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((tool) => (
                <ToolMiniCard key={tool.slug} tool={tool} expanded={expandedSlug === tool.slug} onToggle={() => setExpandedSlug(expandedSlug === tool.slug ? null : tool.slug)} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Domain Selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {domains.map((d) => (
                <button
                  key={d.slug}
                  onClick={() => setActiveDomain(d.slug)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all duration-200 flex items-center gap-2 ${
                    activeDomain === d.slug
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  <span>{d.icon}</span>
                  {d.name}
                </button>
              ))}
            </div>

            {/* Confusion Resolver */}
            {learningPath && learningPath.entry && (
              <div className="bg-card border border-border/60 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    New to {currentDomainName}?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Start with{" "}
                    <Link href={`/tools/${learningPath.entry}`} className="text-primary font-bold hover:underline">
                      {learningPath.path[0]?.tools.find(t => t.slug === learningPath.entry)?.name || learningPath.entry}
                    </Link>
                    {" → "}then move to {learningPath.path.length > 1 ? "intermediate tools" : "the next level"}.
                  </p>
                </div>
              </div>
            )}

            {/* Learning Path View */}
            {pathLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : learningPath ? (
              <div className="space-y-6">
                {learningPath.path.map((tier, tierIdx) => {
                  const style = levelStyle[tier.level] || levelStyle.intermediate;
                  return (
                    <div key={tier.level} className="space-y-3">
                      {/* Level header */}
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                        <h3 className="text-base font-bold">{tier.label}</h3>
                        <span className="text-xs text-muted-foreground">
                          {tier.tools.length} tool{tier.tools.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Tools grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tier.tools.map((tool, idx) => {
                          const fullTool = tools.find(t => t.slug === tool.slug);
                          if (!fullTool) return null;
                          return (
                            <LearningCard
                              key={tool.slug}
                              tool={fullTool}
                              isEntry={tool.is_entry_point}
                              parentSlug={tool.parent_slug}
                              levelStyle={style}
                              index={idx}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Select a domain to see its learning path.
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}


// ── Learning Card (used in Learning Path view) ──────────────────────────

function LearningCard({
  tool,
  isEntry,
  parentSlug,
  levelStyle: style,
  index,
}: {
  tool: Tool;
  isEntry: boolean;
  parentSlug: string | null;
  levelStyle: { dot: string; border: string; bg: string };
  index: number;
}) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`group relative block p-4 rounded-xl border transition-all duration-300 hover:shadow-md slide-up ${
        isEntry
          ? `${style.border} ${style.bg} ring-1 ring-inset ${style.border}`
          : "border-border/60 bg-card hover:border-primary/30"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Entry point badge */}
      {isEntry && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full shadow-sm">
          🚀 START
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 border border-border/40 ${
          isEntry ? style.bg : "bg-muted/50"
        }`}>
          {tool.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm group-hover:text-primary transition-colors truncate">
            {tool.name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            <span>{tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(1)}k` : tool.stars}</span>
            <span className="opacity-40">•</span>
            <span className="font-semibold text-foreground/80">{tool.score}</span>
            <span className="opacity-40">pts</span>
          </div>
          {parentSlug && (
            <p className="text-[10px] text-muted-foreground mt-1">
              📍 Prerequisite: <span className="font-semibold text-foreground/70 capitalize">{parentSlug}</span>
            </p>
          )}
        </div>
        <div className="shrink-0 self-center">
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </div>
      </div>

      {/* Start Learning CTA for entry points */}
      {isEntry && (
        <div className="mt-3 pt-2 border-t border-border/30 flex items-center gap-1.5 text-xs font-bold text-primary">
          <GraduationCap className="w-3.5 h-3.5" />
          Start with {tool.name}
        </div>
      )}
    </Link>
  );
}


// ── Mini card for search results ────────────────────────────────────────

function ToolMiniCard({ tool, expanded, onToggle }: { tool: Tool; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`bg-card rounded-xl border transition-all duration-200 cursor-pointer ${
        expanded ? "border-primary/40 shadow-md" : "border-border/60 hover:border-primary/20"
      }`}
    >
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center text-lg shrink-0 border border-border/30">
          {tool.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm truncate">{tool.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{tool.category}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-black text-foreground">{tool.score}</span>
          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground justify-end">
            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
            {tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(0)}k` : tool.stars}
          </div>
        </div>
        <button className="p-1 rounded-full text-muted-foreground shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/30 space-y-2">
              <p className="text-xs text-foreground/80">{tool.description}</p>
              <Link
                href={`/tools/${tool.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                View Details <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
