import { Filter } from "lucide-react";
import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface FilterBarProps {
  activeDomain: string;
  onDomainChange: (domain: string) => void;
  domains: readonly string[] | string[];
  allLabel?: string;
  className?: string;
  showIcon?: boolean;
  prefixNode?: ReactNode;
}

export default function FilterBar({
  activeDomain,
  onDomainChange,
  domains,
  allLabel = "All Domains",
  className = "flex items-center gap-1.5 overflow-x-auto p-1 glass rounded-2xl w-fit max-w-full scrollbar-none",
  showIcon = true,
  prefixNode,
}: FilterBarProps) {
  return (
    <div className={className}>
      {showIcon && <Filter className="w-4 h-4 text-muted-foreground mr-2 ml-1.5 shrink-0" />}
      {prefixNode}
      
      <button
        onClick={() => onDomainChange("All")}
        className={`relative px-4 py-1.5 rounded-xl text-sm font-semibold shrink-0 transition-all duration-300 select-none cursor-pointer ${
          activeDomain === "All"
            ? "text-primary-foreground font-bold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {activeDomain === "All" && (
          <motion.div
            layoutId="filter-pill"
            className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/20"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <span className="relative z-10">{allLabel}</span>
      </button>

      {domains.map((domain) => {
        const isActive = activeDomain === domain;
        return (
          <button
            key={domain}
            onClick={() => onDomainChange(domain)}
            className={`relative px-4 py-1.5 rounded-xl text-sm font-semibold shrink-0 transition-all duration-300 select-none cursor-pointer ${
              isActive
                ? "text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="filter-pill"
                className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/20"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10">{domain}</span>
          </button>
        );
      })}
    </div>
  );
}
