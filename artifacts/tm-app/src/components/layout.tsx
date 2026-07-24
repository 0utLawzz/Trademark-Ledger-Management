import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BookOpen,
  PieChart,
  Upload,
  Search,
  History,
  Scale
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/cases", label: "Cases", icon: Briefcase },
    { href: "/ledger", label: "Ledger", icon: BookOpen },
    { href: "/reports", label: "Reports", icon: PieChart },
    { href: "/import", label: "Import", icon: Upload },
    { href: "/search", label: "Search", icon: Search },
    { href: "/audit", label: "Audit Log", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar text-sidebar-foreground flex-shrink-0 md:h-screen sticky top-0 flex flex-col z-20">
        <div className="p-4 md:p-6 flex items-center gap-3 border-b border-sidebar-border">
          <div className="bg-accent text-accent-foreground p-2 rounded-sm flex items-center justify-center">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">TRADEMARK LEDGER</h1>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Case Management</p>
          </div>
        </div>
        
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon size={18} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground">
              LF
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">Law Firm Admin</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">admin@lawfirm.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 flex items-center px-6 justify-between flex-shrink-0">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <span className="hidden md:inline-flex">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
