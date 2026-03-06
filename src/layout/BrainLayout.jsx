import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Brain,
  Terminal,
  Bot,
  Globe,
  FileText,
  NotebookPen,
  Bug,
  Search,
  User,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";

const navItems = [
  { title: "Overview",         url: "/dashboard",    icon: Brain },
  { title: "Terminal History", url: "/terminal",     icon: Terminal },
  { title: "AI Conversations", url: "/ai",           icon: Bot },
  { title: "Web Activity",     url: "/web",          icon: Globe },
  { title: "Transcripts",      url: "/transcripts",  icon: FileText },
  { title: "Notes",            url: "/notes",        icon: NotebookPen },
  { title: "Issues & KB",      url: "/issues",       icon: Bug },
  { title: "Global Search",    url: "/search",       icon: Search },
];

export default function BrainLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isDark = theme === "dark";
  const displayName = user?.username || user?.email?.split("@")[0] || "User";
  const avatarLetter = displayName[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-52 flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar h-screen">

        {/* Brand */}
        <div className="px-4 pt-4 pb-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-sidebar-accent-foreground leading-none">DevBrain</p>
              <p className="text-[10px] text-sidebar-foreground/60 mt-0.5">Developer Journal</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-400 flex-shrink-0">
              {avatarLetter}
            </div>
            <span className="text-xs font-medium text-violet-300 truncate">{displayName}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/dashboard"}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeClassName="bg-violet-500/15 text-violet-300 font-medium border border-violet-500/20"
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 pb-2 border-t border-sidebar-border pt-2 space-y-0.5">
          <NavLink
            to="/profile"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <User className="h-4 w-4 flex-shrink-0" />
            <span>Profile</span>
          </NavLink>

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content (only this scrolls) ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
