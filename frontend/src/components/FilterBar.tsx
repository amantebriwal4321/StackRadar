import { Filter } from "lucide-react";
import { type ReactNode } from "react";

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
  className = "flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none",
  showIcon = true,
  prefixNode,
}: FilterBarProps) {
  return (
    <div className={className}>
      {showIcon && <Filter className="w-4 h-4 text-muted-foreground mr-1 shrink-0" />}
      {prefixNode}
      
      <button
        onClick={() => onDomainChange("All")}
        className={`px-3.5 py-1.5 rounded-full text-sm font-medium shrink-0 transition-all duration-200 ${
          activeDomain === "All"
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/60"
        }`}
      >
        {allLabel}
      </button>

      {domains.map((domain) => (
        <button
          key={domain}
          onClick={() => onDomainChange(domain)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium shrink-0 transition-all duration-200 ${
            activeDomain === domain
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/60"
          }`}
        >
          {domain}
        </button>
      ))}
    </div>
  );
}
