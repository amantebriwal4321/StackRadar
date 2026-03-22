"use client";

import { useState, useMemo } from "react";
import { MapPin, Compass, Search, Filter, PackageOpen } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import RoadmapCard from "@/components/RoadmapCard";
import FilterBar from "@/components/FilterBar";
import { getAllRoadmaps } from "@/data/roadmaps";
import { technologies, domains } from "@/data/trends";

export default function RoadmapsIndexPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string>("All");

  const allRoadmaps = useMemo(() => getAllRoadmaps(), []);

  const filteredRoadmaps = useMemo(() => {
    return allRoadmaps.filter((roadmap) => {
      const trendData = technologies.find(t => t.id === roadmap.technologyId);
      const domain = trendData?.domain || "Unknown";

      const matchesSearch = 
        roadmap.technologyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        roadmap.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDomain = activeDomain === "All" || domain === activeDomain;

      return matchesSearch && matchesDomain;
    });
  }, [searchQuery, activeDomain, allRoadmaps]);

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
              Step-by-step learning paths for emerging technologies. Hand-crafted curricula from beginner fundamentals to advanced production deployments.
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

        {/* Domain Filters */}
        <FilterBar
          activeDomain={activeDomain}
          onDomainChange={setActiveDomain}
          domains={domains}
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none shrink-0"
        />

        {/* Results Info */}
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 shrink-0">
          <MapPin className="w-4 h-4" />
          Showing {filteredRoadmaps.length} {filteredRoadmaps.length === 1 ? "roadmap" : "roadmaps"}
        </div>

        {/* Grid Layout or Empty State */}
        {filteredRoadmaps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {filteredRoadmaps.map((roadmap, idx) => {
              const trendData = technologies.find(t => t.id === roadmap.technologyId);
              return (
                <RoadmapCard 
                  key={roadmap.technologyId} 
                  roadmap={roadmap} 
                  domain={trendData?.domain} 
                  index={idx} 
                />
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10 slide-up">
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
              <PackageOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">No Roadmaps Found</h3>
            <p className="text-muted-foreground max-w-sm mb-6 pb-6">
              We couldn't find any learning paths matching "{searchQuery}" in the {activeDomain} domain. Try adjusting your filters.
            </p>
            <button 
              onClick={() => { setSearchQuery(""); setActiveDomain("All"); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              Clear Filters
            </button>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
