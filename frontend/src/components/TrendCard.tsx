import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { type Tool } from "@/data/trends";
import { motion } from "framer-motion";
import WatchlistButton from "@/components/WatchlistButton";

const MotionLink = motion.create(Link);

interface ToolCardProps {
  tool: Tool;
  variant?: "default" | "compact";
  index?: number;
}

// Stage badge colors
const stageBadge: Record<string, string> = {
  "Emerging": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "Growing": "bg-primary/10 text-primary border-primary/20",
  "Mature": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "Declining": "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

// Learning priority badge
const priorityBadge: Record<string, string> = {
  "HIGH": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "MEDIUM": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "LOW": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  "AVOID": "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

// Sentiment badge
const sentimentBadge: Record<string, { class: string; label: string }> = {
  "positive": { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "🟢 Positive Buzz" },
  "negative": { class: "bg-rose-500/10 text-rose-400 border-rose-500/20", label: "🔴 Negative Buzz" },
  "mixed":    { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "🟡 Mixed Signals" },
  "neutral":  { class: "", label: "" },
};

function GrowthIndicator({ growth }: { growth: number }) {
  if (growth > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-bold text-xs">
        <TrendingUp className="w-3.5 h-3.5" />
        +{growth.toFixed(1)}%
      </span>
    );
  } else if (growth < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-rose-500 dark:text-rose-400 font-bold text-xs">
        <TrendingDown className="w-3.5 h-3.5" />
        {growth.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground font-bold text-xs">
      <Minus className="w-3.5 h-3.5" />
      0.0%
    </span>
  );
}

export default function TrendCard({ tool, variant = "default", index = 0 }: ToolCardProps) {
  // Sparkline Component
  const Sparkline = ({ points, growth, slug }: { points?: number[]; growth: number; slug: string }) => {
    const chartPoints = points && points.length > 0
      ? points
      : [50, 50, 50, 50, 50, 50, 50]; // default fallback
    
    const width = 120;
    const height = 36;
    const min = Math.min(...chartPoints);
    const max = Math.max(...chartPoints);
    const range = max - min === 0 ? 1 : max - min;
    const padding = 2;
    const chartHeight = height - padding * 2;

    const coords = chartPoints.map((p, idx) => {
      const x = (idx / (chartPoints.length - 1)) * width;
      const y = height - padding - ((p - min) / range) * chartHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${coords.join(" L ")}`;
    const fillPathD = `${pathD} L ${width},${height} L 0,${height} Z`;

    const strokeColor = growth > 0
      ? "oklch(0.70 0.16 185)" // Emerald
      : growth < 0
        ? "oklch(0.60 0.20 25)"  // Rose
        : "oklch(0.55 0.02 240)"; // Muted

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id={`sparkline-grad-${slug}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillPathD} fill={`url(#sparkline-grad-${slug})`} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  if (variant === "compact") {
    return (
      <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="bg-card p-5 rounded-xl border border-border/60 glow-hover shadow-sm"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center text-lg">
              {tool.icon}
            </div>
            <h3 className="font-bold text-sm line-clamp-1">{tool.name}</h3>
          </div>
          <GrowthIndicator growth={tool.growth_pct} />
        </div>

        {/* Sparkline in compact variant */}
        <div className="h-8 my-3 w-full opacity-80">
          <Sparkline points={tool.last_7_scores} growth={tool.growth_pct} slug={tool.slug} />
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Score</p>
            <p className="text-3xl font-black text-foreground">{tool.score}</p>
          </div>
          <div className="text-right space-y-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${stageBadge[tool.stage] || stageBadge["Emerging"]}`}>
              {tool.stage}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              {tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(1)}k` : tool.stars}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant
  const totalMentions = tool.hn_count + tool.devto_count + tool.reddit_count + tool.news_count;
  const sentiment = sentimentBadge[tool.sentiment_label] || sentimentBadge["neutral"];

  return (
    <MotionLink
      href={`/tools/${tool.slug}`}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group relative block p-6 bg-card rounded-2xl border border-border/60 glow-hover transition-colors duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

      {/* Bookmark Button */}
      <div className="absolute top-4 right-4 z-20">
        <WatchlistButton toolSlug={tool.slug} />
      </div>

      <div className="flex justify-between items-center mb-4 relative z-10 pr-8">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shadow-sm border border-border/40 group-hover:scale-105 transition-transform duration-300 shrink-0">
            {tool.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold group-hover:text-primary transition-colors truncate">{tool.name}</h3>
            <div className="flex gap-1.5 flex-wrap mt-1">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${stageBadge[tool.stage] || stageBadge["Emerging"]}`}>
                {tool.stage}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityBadge[tool.learning_priority] || priorityBadge["MEDIUM"]}`}>
                {tool.learning_priority === "HIGH" ? "🔥 HIGH" :
                 tool.learning_priority === "AVOID" ? "⚠️ CAUTION" :
                 tool.learning_priority}
              </span>
              {sentiment.label && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${sentiment.class} hidden sm:inline-block`}>
                  {sentiment.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Inline Sparkline */}
        <div className="hidden sm:block mx-4 h-9 w-24 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
          <Sparkline points={tool.last_7_scores} growth={tool.growth_pct} slug={tool.slug} />
        </div>

        <div className="text-right shrink-0">
          <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
            Score
          </span>
          <span className="text-2xl font-black text-foreground drop-shadow-sm">
            {tool.score}
          </span>
          <div className="mt-1">
            <GrowthIndicator growth={tool.growth_pct} />
          </div>
        </div>
      </div>

      {/* Rank + Metrics Grid */}
      <div className="bg-muted/20 rounded-xl p-3 mb-4 relative z-10 border border-border/30">
        {/* Rank context row */}
        {tool.rank_in_category > 0 && (
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/20 text-xs">
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground">#{tool.rank_in_category}</span> in {tool.category}
            </span>
            <span className="text-muted-foreground">
              Top <span className="font-bold text-foreground">{tool.percentile}%</span> overall
            </span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-1 text-center text-xs">
          <div className="hover:bg-muted/40 rounded-lg py-1 transition-colors">
            <div className="font-bold text-foreground text-sm">{tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(0)}k` : tool.stars}</div>
            <div className="text-muted-foreground text-[10px] uppercase font-semibold">Stars</div>
          </div>
          <div className="hover:bg-muted/40 rounded-lg py-1 transition-colors">
            <div className="font-bold text-foreground text-sm">{tool.forks >= 1000 ? `${(tool.forks / 1000).toFixed(0)}k` : tool.forks}</div>
            <div className="text-muted-foreground text-[10px] uppercase font-semibold">Forks</div>
          </div>
          <div className="hover:bg-muted/40 rounded-lg py-1 transition-colors">
            <div className="font-bold text-foreground text-sm">{totalMentions}</div>
            <div className="text-muted-foreground text-[10px] uppercase font-semibold">Daily Mentions</div>
          </div>
        </div>
      </div>

      <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed relative z-10 mb-2">
        {tool.description}
      </p>

      <div className="mt-4 flex items-center text-sm font-bold text-primary transition-all relative z-10">
        View Details <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1.5" />
      </div>
    </MotionLink>
  );
}

