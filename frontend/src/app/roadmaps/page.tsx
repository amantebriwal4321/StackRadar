"use client";

import { useState, useEffect, useMemo } from "react";
import { MapPin, Compass, Search, PackageOpen, Loader2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import RoadmapCard from "@/components/RoadmapCard";
import { type Roadmap, fetchRoadmaps } from "@/data/trends";

export default function RoadmapsIndexPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchRoadmaps();
        setRoadmaps(data);
      } catch (err) {
        console.error("Failed to fetch roadmaps:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredRoadmaps = useMemo(() => {
    if (!searchQuery) return roadmaps;
    return roadmaps.filter((rm) =>
      rm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rm.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, roadmaps]);

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
      <div className="space-y-8 fade-in flex flex-col min-h-full pb-10">

        {/* Header & Search Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 border-b border-border/40 pb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Compass className="w-8 h-8 text-primary" />
              Learning Roadmaps
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Step-by-step learning paths for technology domains. Curated curricula from beginner fundamentals to advanced production deployments.
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search roadmaps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-card border border-border/60 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 shrink-0">
          <MapPin className="w-4 h-4" />
          Showing {filteredRoadmaps.length} {filteredRoadmaps.length === 1 ? "roadmap" : "roadmaps"}
        </div>

        {/* Grid Layout or Empty State */}
        {filteredRoadmaps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {filteredRoadmaps.map((roadmap, idx) => (
              <RoadmapCard
                key={roadmap.slug}
                roadmap={roadmap}
                index={idx}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10 slide-up">
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
              <PackageOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">No Roadmaps Found</h3>
            <p className="text-muted-foreground max-w-sm mb-6 pb-6">
              We couldn&apos;t find any learning paths matching &quot;{searchQuery}&quot;. Try adjusting your search.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              Clear Search
            </button>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
