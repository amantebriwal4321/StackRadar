"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, TrendingUp } from "lucide-react";
import { technologies, domains, getTechnologiesByDomain } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import TrendCard from "@/components/TrendCard";
import FilterBar from "@/components/FilterBar";

export default function HomePage() {
  const [activeDomain, setActiveDomain] = useState<string>("All");

  const filtered = getTechnologiesByDomain(activeDomain);

  return (
    <DashboardShell>
      <div className="space-y-10 fade-in">

        {/* Hero Section */}
        <div className="text-center space-y-6 py-10 md:py-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 shadow-sm shadow-primary/10">
            <Zap className="w-4 h-4 animate-pulse" />
            StackRadar MVP
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Discover Emerging{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-cyan-300">
              Technologies
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We analyze GitHub velocity alongside developer discussions on HackerNews and Dev.to to find you the most explosive tools right now.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
          <FilterBar
            activeDomain={activeDomain}
            onDomainChange={setActiveDomain}
            domains={domains}
            className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto"
          />
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Trending Right Now</h2>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} {filtered.length === 1 ? "technology" : "technologies"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((tech, idx) => (
              <TrendCard key={tech.id} technology={tech} index={idx} />
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
