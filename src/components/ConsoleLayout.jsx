import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Database,
  Search,
  Terminal,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Zap,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Key,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "API Keys", url: "/settings", icon: Key },
  { title: "Data Explorer", url: "/data", icon: Database },
  { title: "Semantic Search", url: "/search", icon: Search },
  { title: "API Playground", url: "/playground", icon: Terminal },
  { title: "Usage & Billing", url: "/usage", icon: BarChart3 },
  { title: "API Logs", url: "/logs", icon: ScrollText },
];

const bottomNavItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help", url: "/logs", icon: HelpCircle },
];

function UsageBar({ label, used, total, unit }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-sidebar-foreground">{label}</span>
        <span className="text-sidebar-foreground/70 font-mono">{used.toLocaleString()} of {(total / 1000).toFixed(0)}K {unit}</span>
      </div>
      <div className="h-1 rounded-full bg-sidebar-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ConsoleLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: () => analyticsApi.usage().then((r) => r.data),
    retry: false,
    staleTime: 60_000,
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isDark = theme === "dark";
  const tokens = usage?.totalSearches || 0;
  const searches = usage?.totalSearches || 0;
  const tokenLimit = 1_000_000;
  const searchLimit = 10_000;

  const displayName = user?.username || user?.email?.split("@")[0] || "User";
  const avatarLetter = displayName[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* ── Sidebar ── */}
      <aside className="w-52 flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">

        {/* Brand + plan */}
        <div className="px-4 pt-4 pb-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-sidebar-accent-foreground truncate max-w-[100px]">
                {displayName.toUpperCase()}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground" />
            </div>
            <span className="rounded-full border border-sidebar-border px-2 py-0.5 text-[10px] font-medium text-sidebar-foreground bg-sidebar-accent">
              Free Plan
            </span>
          </div>
          <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors">
            <Zap className="h-3.5 w-3.5" />
            Upgrade
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/dashboard"}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}

          <div className="pt-1 border-t border-sidebar-border mt-1">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.title + item.url}
                to={item.url}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeClassName=""
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            ))}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </div>
        </nav>

        {/* Usage stats */}
        <div className="px-4 py-3 border-t border-sidebar-border space-y-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">Usage</p>
          <UsageBar label="Tokens" used={tokens} total={tokenLimit} unit="" />
          <UsageBar label="Searches" used={searches} total={searchLimit} unit="" />
          <p className="text-[10px] text-sidebar-foreground/50">
            Usage will reset Mon Mar 16 2026
          </p>
        </div>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors"
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {avatarLetter}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{displayName}</p>
              <p className="text-[10px] text-sidebar-foreground truncate">{user?.email}</p>
            </div>
            {userMenuOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-sidebar-foreground flex-shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground flex-shrink-0" />
            )}
          </button>

          {userMenuOpen && (
            <div className="mt-1 rounded-lg border border-sidebar-border bg-sidebar-accent overflow-hidden">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground hover:text-destructive hover:bg-sidebar-border/40 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
