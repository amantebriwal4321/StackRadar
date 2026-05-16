"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Bookmark, BookmarkCheck, Trash2, Loader2, TrendingUp, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { type Tool, fetchTools } from "@/data/trends";

// Watchlist stored in localStorage keyed by Clerk user ID
function getWatchlist(userId: string): string[] {
  try {
    const data = localStorage.getItem(`watchlist_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setWatchlist(userId: string, slugs: string[]) {
  localStorage.setItem(`watchlist_${userId}`, JSON.stringify(slugs));
}

export function toggleWatchlistItem(userId: string, slug: string): boolean {
  const current = getWatchlist(userId);
  if (current.includes(slug)) {
    setWatchlist(userId, current.filter((s) => s !== slug));
    return false; // removed
  } else {
    setWatchlist(userId, [...current, slug]);
    return true; // added
  }
}

export function isInWatchlist(userId: string, slug: string): boolean {
  return getWatchlist(userId).includes(slug);
}

export default function WatchlistPage() {
  const { user, isLoaded } = useUser();
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [watchedSlugs, setWatchedSlugs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.id || "";

  // Load tools + watchlist
  useEffect(() => {
    if (!isLoaded || !userId) return;
    setWatchedSlugs(getWatchlist(userId));
    fetchTools()
      .then((data) => { setAllTools(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [isLoaded, userId]);

  const watchedTools = allTools.filter((t) => watchedSlugs.includes(t.slug));

  const handleRemove = useCallback((slug: string) => {
    toggleWatchlistItem(userId, slug);
    setWatchedSlugs(getWatchlist(userId));
  }, [userId]);

  if (!isLoaded) {
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
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
            <BookmarkCheck className="w-7 h-7 text-primary" />
            My Watchlist
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tools you&apos;re tracking. Click the ⭐ on any tool card across the site to add it here.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : watchedTools.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl bg-muted/10">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-bold mb-1">No tools in your watchlist</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Browse the dashboard and click the bookmark icon on any tool to start tracking it.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Browse Tools <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {watchedTools.map((tool) => (
              <div
                key={tool.slug}
                className="group relative p-5 bg-card rounded-2xl border border-border/60 hover:border-primary/40 transition-colors shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <Link href={`/tools/${tool.slug}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-xl shadow-sm border border-border/40">
                      {tool.icon}
                    </div>
                    <div>
                      <h3 className="font-bold group-hover:text-primary transition-colors">{tool.name}</h3>
                      <span className="text-xs text-muted-foreground">{tool.category}</span>
                    </div>
                  </Link>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary">{tool.score}</span>
                    <span className="text-xs text-muted-foreground ml-1">/100</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(1)}k` : tool.stars}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {tool.stage}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(tool.slug)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
