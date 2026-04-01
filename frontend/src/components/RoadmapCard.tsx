import Link from "next/link";
import { Clock, ArrowRight, Layers } from "lucide-react";
import { type Roadmap } from "@/data/trends";
import { motion } from "framer-motion";

const MotionLink = motion.create(Link);

interface RoadmapCardProps {
  roadmap: Roadmap;
  index: number;
}

export default function RoadmapCard({ roadmap, index }: RoadmapCardProps) {
  return (
    <MotionLink
      href={`/roadmap/${roadmap.slug}`}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group relative block h-full bg-card rounded-2xl border border-border/60 p-6 transition-colors duration-300 hover:border-primary/50 glow-hover slide-up overflow-hidden flex flex-col"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Subtle background glow on hover */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] bg-primary/0 transition-all duration-500 group-hover:bg-primary/20" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-3xl shadow-sm border border-border/40 group-hover:scale-110 transition-transform duration-300">
            {roadmap.icon}
          </div>
        </div>

        {/* Title & Description */}
        <div className="mb-6 flex-grow">
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
            {roadmap.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {roadmap.description}
          </p>
        </div>

        {/* Meta Info */}
        <div className="space-y-3 pt-4 border-t border-border/40">
          <div className="flex items-center text-xs text-muted-foreground font-medium">
            <Layers className="w-4 h-4 mr-2 text-primary/70" />
            <span>{roadmap.step_count || 0} Steps</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-amber-500/70" />
              <span>~ {roadmap.estimated_weeks} Weeks</span>
            </div>
            <div className="flex items-center text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              <span className="mr-1">View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </MotionLink>
  );
}
