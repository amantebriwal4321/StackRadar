import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { type Technology } from "@/data/trends";
import { motion } from "framer-motion";

const MotionLink = motion.create(Link);

interface TrendCardProps {
  technology: Technology;
  variant?: "default" | "compact";
  index?: number;
}

export default function TrendCard({ technology: tech, variant = "default", index = 0 }: TrendCardProps) {
  if (variant === "compact") {
    const latestScore = tech.growth[tech.growth.length - 1].score;
    const previousScore = tech.growth[tech.growth.length - 2].score;
    const difference = latestScore - previousScore;

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
              {tech.icon}
            </div>
            <h3 className="font-bold text-sm line-clamp-1">{tech.name}</h3>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Current Score</p>
            <p className="text-3xl font-black text-foreground">{tech.score}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
              difference >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
            }`}>
              <TrendingUp className={`w-3 h-3 ${difference < 0 ? "rotate-180" : ""}`} />
              {difference > 0 ? '+' : ''}{difference}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">vs last year</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant (Homepage)
  return (
    <MotionLink
      href={`/technology/${tech.id}`}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group relative block p-6 bg-card rounded-2xl border border-border/60 glow-hover transition-colors duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shadow-sm border border-border/40 group-hover:scale-105 transition-transform duration-300">
            {tech.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{tech.name}</h3>
            <div className="flex gap-2 flex-wrap mt-1">
              <span className="px-2 py-0.5 bg-muted/60 rounded-md text-xs font-semibold text-muted-foreground border border-border/40">
                {tech.domain}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                  tech.stage === "Experimental"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : tech.stage === "Mature"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : tech.stage === "Emerging"
                    ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
                    : "bg-primary/10 text-primary border-primary/20"
                }`}
              >
                {tech.stage}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
            Score
          </span>
          <span className="text-2xl font-black text-foreground drop-shadow-sm">
            {tech.score}
          </span>
        </div>
      </div>

      <div className="bg-muted/20 rounded-xl p-3 mb-4 grid grid-cols-3 gap-2 text-center text-xs border border-border/30 relative z-10">
        <div className="group/stat hover:bg-muted/40 rounded-lg py-1 transition-colors">
          <div className="font-bold text-foreground text-sm">{tech.github_repos.toLocaleString()}</div>
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">GitHub</div>
        </div>
        <div className="group/stat hover:bg-muted/40 rounded-lg py-1 transition-colors">
          <div className="font-bold text-foreground text-sm">{tech.hn_mentions.toLocaleString()}</div>
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">HackerNews</div>
        </div>
        <div className="group/stat hover:bg-muted/40 rounded-lg py-1 transition-colors">
          <div className="font-bold text-foreground text-sm">{tech.devto_articles.toLocaleString()}</div>
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">Dev.to</div>
        </div>
      </div>

      <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed relative z-10 mb-2">
        {tech.description}
      </p>
      
      <div className="mt-4 flex items-center text-sm font-bold text-primary transition-all relative z-10">
        View Details <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1.5" />
      </div>
    </MotionLink>
  );
}
