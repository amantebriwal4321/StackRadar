import { Loader2 } from "lucide-react";

// Lightweight route-transition fallback. Deliberately NOT a full DashboardShell
// (that rendered a second navbar/main — heavy, and the inert "double-main").
export default function Loading() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/55 backdrop-blur-sm pointer-events-none">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        Loading…
      </span>
    </div>
  );
}
