import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background relative">
      {/* Premium Background Blurs */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-primary/5 dark:bg-primary/10 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-[100px] pointer-events-none -z-10" />
      
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-grid relative">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-8 relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

