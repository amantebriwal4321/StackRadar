"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  number: string | number;
  label: string;
  icon?: ReactNode;
  iconColorClass?: string;
  hoverColorClass?: string;
}

export default function StatCard({ 
  number, 
  label, 
  icon, 
  iconColorClass = "text-primary",
  hoverColorClass = "hover:border-primary/30"
}: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`bg-card p-5 rounded-2xl border border-border/60 text-center glow-hover hover:shadow-lg hover:shadow-primary/5 cursor-default ${hoverColorClass}`}
    >
      {icon && (
        <div className={`w-6 h-6 mx-auto mb-3 ${iconColorClass}`}>
          {icon}
        </div>
      )}
      <div className="text-3xl font-black text-foreground">
        {number}
      </div>
      <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mt-1">
        {label}
      </div>
    </motion.div>
  );
}
