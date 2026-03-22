import Link from "next/link";
import { UserButton, SignInButton } from "@clerk/nextjs";
import { LayoutDashboard, TrendingUp, Layers, Cpu, Github, BookOpen, Search, Activity } from "lucide-react";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/predictions", label: "AI Predictions", icon: Activity },
    { href: "/trends", label: "Trends", icon: TrendingUp },
    { href: "/stacks", label: "Tech Stacks", icon: Layers },
    { href: "/architectures", label: "Architectures", icon: Cpu },
    { href: "/github", label: "GitHub Insights", icon: Github },
    { href: "/learning", label: "Learning Paths", icon: BookOpen },
    { href: "/search", label: "Search", icon: Search },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r bg-card/50 backdrop-blur-sm hidden md:flex md:flex-col">
                <div className="flex h-16 items-center px-6 border-b">
                    <Layers className="w-6 h-6 mr-2 text-primary" />
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
                        StackRadar
                    </span>
                </div>
                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-3">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors"
                                    >
                                        <Icon className="w-4 h-4 text-muted-foreground" />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <div className="p-4 border-t">
                    <div className="flex items-center justify-center p-2 rounded-md bg-muted/50">
                        <SignInButton mode="modal">
                            <button className="text-sm font-medium text-primary">Sign In / Profile</button>
                        </SignInButton>
                        <UserButton />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 flex items-center justify-between px-6 border-b md:hidden bg-background">
                    <div className="flex items-center">
                        <Layers className="w-6 h-6 mr-2 text-primary" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
                            StackRadar
                        </span>
                    </div>
                    <div className="flex items-center justify-center p-2">
                        <SignInButton mode="modal">
                            <button className="text-sm font-medium text-primary">Sign In / Profile</button>
                        </SignInButton>
                        <UserButton />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mx-auto max-w-6xl">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
