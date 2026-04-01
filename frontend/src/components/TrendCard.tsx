import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { type Tool } from "@/data/trends";
import { motion } from "framer-motion";

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

function GrowthIndicator({ growth }: { growth: number }) {
  if (growth > 5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-500 font-bold text-xs">
        <TrendingUp className="w-3.5 h-3.5" />
        +{growth.toFixed(1)}%
      </span>
    );
  } else if (growth < -5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-500 font-bold text-xs">
        <TrendingDown className="w-3.5 h-3.5" />
        {growth.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground font-bold text-xs">
      <Minus className="w-3.5 h-3.5" />
      {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
    </span>
  );
}

export default function TrendCard({ tool, variant = "default", index = 0 }: ToolCardProps) {

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
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Score</p>
            <p className="text-3xl font-black text-foreground">{tool.score}</p>
          </div>
          <div className="text-right space-y-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${stageBadge[tool.stage] || stageBadge["Emerging"]}`}>
              {tool.stage}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
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

  return (
    <MotionLink
      href={`/tools/${tool.slug}`}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group relative block p-6 bg-card rounded-2xl border border-border/60 glow-hover transition-colors duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shadow-sm border border-border/40 group-hover:scale-105 transition-transform duration-300">
            {tool.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{tool.name}</h3>
            <div className="flex gap-2 flex-wrap mt-1">
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${stageBadge[tool.stage] || stageBadge["Emerging"]}`}>
                {tool.stage}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityBadge[tool.learning_priority] || priorityBadge["MEDIUM"]}`}>
                {tool.learning_priority === "HIGH" ? "🔥 HIGH PRIORITY" :
                 tool.learning_priority === "AVOID" ? "⚠️ CAUTION" :
                 tool.learning_priority}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
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

      {/* Metrics Grid */}
      <div className="bg-muted/20 rounded-xl p-3 mb-4 grid grid-cols-5 gap-1 text-center text-xs border border-border/30 relative z-10">
        <div className="hover:bg-muted/40 rounded-lg py-1 transition-colors">
          <div className="font-bold text-foreground text-sm">{tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(0)}k` : tool.stars}</div>
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">Stars</div>
        </div>
        <div className="hover:bg-muted/40 rounded-lg py-1 transition-colors">
          <div className="font-bold text-foreground text-sm">{tool.hn_count}</div>
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">HN</div>
        </div>
        <div className="hover:bg-muted/40 rounded-lg py-1 transition-colors">
          <div className="font-bold text-foreground text-sm">{tool.devto_count}</div>
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">Dev.to</div>
        </div>
        <div className="hover:bg-muted/40 rounded-lg py-1 transition-colors">
          <div className="font-bold text-foreground text-sm">{tool.reddit_count}</div>
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">Reddit</div>
        </div>
        <div className="hover:bg-muted/40 rounded-lg py-1 transition-colors">
          <div className="font-bold text-foreground text-sm">{tool.news_count}</div>
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">News</div>
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
