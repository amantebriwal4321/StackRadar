import DashboardShell from "@/components/DashboardShell";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <DashboardShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-semibold tracking-wide uppercase">Organizing insights...</p>
      </div>
    </DashboardShell>
  );
}
