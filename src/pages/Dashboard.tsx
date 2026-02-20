import { useQuery } from "@tanstack/react-query";
import { analyticsApi, dataApi } from "@/lib/api";
import { Database, Search, Activity, Clock } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-foreground font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: () => analyticsApi.usage().then((r) => r.data),
    retry: false,
  });

  const { data: logs } = useQuery({
    queryKey: ["logs", "recent"],
    queryFn: () => analyticsApi.logs({ limit: 5 }).then((r) => r.data),
    retry: false,
  });

  const stats = usage || { totalRecords: 0, totalSearches: 0, requestsToday: 0, avgLatency: 0 };
  const recentLogs = logs?.items || logs || [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your semantic memory usage</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Database} label="Total Records" value={String(stats.totalRecords || 0)} />
        <StatCard icon={Search} label="Total Searches" value={String(stats.totalSearches || 0)} />
        <StatCard icon={Activity} label="Requests Today" value={String(stats.requestsToday || 0)} />
        <StatCard icon={Clock} label="Avg Latency" value={`${stats.avgLatency || 0}ms`} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-medium text-foreground">Recent Activity</h2>
        </div>
        <div className="divide-y divide-border">
          {recentLogs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No recent activity. Start by adding data or making a search.
            </div>
          ) : (
            recentLogs.slice(0, 5).map((log: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-medium ${
                    log.method === "POST" ? "bg-primary/10 text-primary" : "bg-info/10 text-info"
                  }`}>
                    {log.method || "GET"}
                  </span>
                  <span className="text-foreground font-mono text-xs">{log.endpoint || log.path || "/"}</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground text-xs">
                  <span className={log.status < 400 ? "text-success" : "text-destructive"}>
                    {log.status || 200}
                  </span>
                  <span>{log.latency || 0}ms</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
