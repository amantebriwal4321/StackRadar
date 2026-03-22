"use client";

import { useState, useMemo } from "react";
import { Search, Map, Filter, ChevronDown, ChevronUp, Star, TrendingUp } from "lucide-react";
import { languages, getAllDomains } from "@/data/languages";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import FilterBar from "@/components/FilterBar";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allDomains = getAllDomains();

  const filteredLanguages = useMemo(() => {
    return languages.filter((lang) => {
      const matchesSearch = lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            lang.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = activeDomain === "All" || lang.domains.includes(activeDomain);
      return matchesSearch && matchesDomain;
    });
  }, [searchQuery, activeDomain]);

  return (
    <DashboardShell>
      <div className="space-y-8 fade-in">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/40 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Map className="w-8 h-8 text-primary" />
              Technology Map
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Explore programming languages, their primary domains, and use cases. Click any card to expand for deeper insights.
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search languages..."
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
          domains={allDomains}
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none shrink-0"
        />

        {/* Results Info */}
        <div className="text-sm font-medium text-muted-foreground">
          Showing {filteredLanguages.length} {filteredLanguages.length === 1 ? "technology" : "technologies"}
        </div>

        {/* Interactive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {filteredLanguages.map((lang, idx) => {
            const isExpanded = expandedId === lang.id;
            
            return (
              <div
                key={lang.id}
                onClick={() => setExpandedId(isExpanded ? null : lang.id)}
                className={`relative bg-card rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden group slide-up
                  ${isExpanded 
                    ? "border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20" 
                    : "border-border/60 hover:border-primary/30 glow-hover"
                  }
                `}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Background ambient glow based on language color */}
                <div 
                  className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] transition-opacity duration-500
                    ${isExpanded ? "opacity-50" : "opacity-10 group-hover:opacity-30"}
                  `}
                  style={{ backgroundColor: `var(--color-${lang.color}-500, #6366f1)` }}
                />

                <div className="p-5 relative z-10 flex flex-col">
                  
                  {/* Card Header Always Visible */}
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center text-2xl shadow-sm border border-border/40 shrink-0">
                        {lang.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold flex items-center gap-2 truncate">
                          {lang.name}
                          {lang.trending && (
                            <span className="flex items-center text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                              <TrendingUp className="w-3 h-3 mr-0.5" /> Hot
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-muted-foreground truncate">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          <span className="text-foreground shrink-0">{lang.popularity}/100</span>
                          <span className="mx-1 opacity-40 shrink-0">•</span>
                          <span className="truncate">{lang.domains[0]}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      className="p-1.5 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 ml-2"
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                {/* Expanded Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/40 bg-muted/10 p-5 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description & Use Cases</h4>
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {lang.description}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Primary Domains</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {lang.domains.map((domain) => (
                              <span 
                                key={domain} 
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-muted/60 border border-border/40 text-muted-foreground"
                              >
                                {domain}
                              </span>
                            ))}
                          </div>
                        </div>

                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            );
          })}
        </div>

      </div>
    </DashboardShell>
  );
}
