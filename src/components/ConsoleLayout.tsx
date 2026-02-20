import { Navigate, Outlet } from "react-router-dom";
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
  Cpu,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Data Explorer", url: "/data", icon: Database },
  { title: "Semantic Search", url: "/search", icon: Search },
  { title: "API Playground", url: "/playground", icon: Terminal },
  { title: "Usage & Analytics", url: "/usage", icon: BarChart3 },
  { title: "API Logs", url: "/logs", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function ConsoleLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-60" : "w-0 md:w-14"
        } flex-shrink-0 border-r border-border bg-sidebar transition-all duration-200 overflow-hidden`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
            <Cpu className="h-5 w-5 text-primary flex-shrink-0" />
            {sidebarOpen && (
              <span className="font-semibold text-sidebar-accent-foreground truncate">
                DevConsole
              </span>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 px-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/dashboard"}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeClassName="bg-sidebar-accent text-primary font-medium"
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="border-t border-sidebar-border p-3">
            {sidebarOpen && (
              <div className="mb-2 truncate text-xs text-muted-foreground px-1">
                {user?.email}
              </div>
            )}
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-14 items-center border-b border-border px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">API Connected</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
