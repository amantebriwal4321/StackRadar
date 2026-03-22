"use client";

import { useState, useMemo } from "react";
import { TrendingUp, BarChart3, LineChart as LineChartIcon, Filter } from "lucide-react";
import { technologies, domains } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import FilterBar from "@/components/FilterBar";
import TrendCard from "@/components/TrendCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import ChartContainer, { chartColors, chartTooltipStyle, chartItemStyle, chartLabelStyle } from "@/components/ChartContainer";

export default function TrendsPage() {
  const [activeDomain, setActiveDomain] = useState<string>("All");

  // Transform data for Recharts (merge all tech growth arrays by year)
  const chartData = useMemo(() => {
    const years = [2020, 2021, 2022, 2023, 2024, 2025];
    
    // Filter out technologies not in the active domain
    const relevantTechs = activeDomain === "All" 
      ? technologies 
      : technologies.filter(t => t.domain === activeDomain);

    return years.map(year => {
      const dataPoint: any = { year: year.toString() };
      relevantTechs.forEach((tech) => {
        const growthForYear = tech.growth.find((g) => g.year === year)?.score || 0;
        dataPoint[tech.id] = growthForYear;
      });
      return dataPoint;
    });
  }, [activeDomain]);

  const displayedTechs = activeDomain === "All" 
    ? technologies.slice(0, 6) // Limit to 6 lines max if "All" is selected to avoid clutter
    : technologies.filter(t => t.domain === activeDomain);

  return (
    <DashboardShell>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              Trends Overview
            </h1>
            <p className="text-muted-foreground mt-1">
              Analyze historical growth and predict future momentum for emerging technologies.
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          activeDomain={activeDomain}
          onDomainChange={setActiveDomain}
          domains={domains}
          allLabel="All (Top 6)"
          showIcon={false}
          className="bg-card p-4 rounded-xl border border-border/60 flex items-center gap-3 overflow-x-auto shadow-sm"
          prefixNode={
            <>
              <Filter className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
              <span className="text-sm font-semibold text-muted-foreground mr-2 shrink-0">Domain:</span>
            </>
          }
        />

        {/* Main Chart Card */}
        <div className="bg-card p-5 lg:p-6 rounded-2xl border border-border/60 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-primary" />
                Momentum Over Time (2020-2025)
              </h2>
              <p className="text-sm text-muted-foreground">
                Comparing {displayedTechs.length} technologies in {activeDomain === "All" ? "various domains" : activeDomain}
              </p>
            </div>
          </div>

          <ChartContainer height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="year" 
                stroke="var(--muted-foreground)" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke="var(--muted-foreground)" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}`} 
                dx={-10}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                itemStyle={chartItemStyle}
                labelStyle={chartLabelStyle}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
                iconSize={10} 
                iconType="circle"
              />
              {displayedTechs.map((tech, idx) => (
                <Line
                  key={tech.id}
                  type="monotone"
                  dataKey={tech.id}
                  name={tech.name}
                  stroke={chartColors[idx % chartColors.length]}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayedTechs.slice(0, 4).map((tech, idx) => (
             <TrendCard key={tech.id} technology={tech} variant="compact" index={idx} />
          ))}
        </div>

      </div>
    </DashboardShell>
  );
}
