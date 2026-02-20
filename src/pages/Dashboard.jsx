import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, dataApi } from "@/lib/api";
import { TrendingUp, Trash2, Info, Filter } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Requests", "Memory Graph", "Connectors"];

const WEEK_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function mkWeekData(adds = 0, searches = 0) {
  return WEEK_DAYS.map((d, i) => ({
    day: d,
    add: i === 6 ? adds : 0,
    search: i === 6 ? searches : 0,
  }));
}

function StatCard({ label, value, trend, quota }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-foreground tabular-nums font-mono">{value}</p>
      <div className="flex items-center justify-between">
        {trend && (
          <div className="flex items-center gap-1 text-xs text-success font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            {trend}
          </div>
        )}
        {quota && (
          <span className="ml-auto rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            {quota}
          </span>
        )}
      </div>
    </div>
  );
}

const DONUT_COLORS = ["#3b82f6", "#22c55e"];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [timeRange] = useState("Last 30 days");

  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: () => analyticsApi.usage().then((r) => r.data),
    retry: false,
  });

  const { data: dataList } = useQuery({
    queryKey: ["data-list"],
    queryFn: () => dataApi.list({}).then((r) => r.data),
    retry: false,
  });

  const { data: logs } = useQuery({
    queryKey: ["logs", "recent"],
    queryFn: () => analyticsApi.logs({ limit: 5 }).then((r) => r.data),
    retry: false,
  });

  const stats = usage || {};
  const tokens = stats.totalRecords || stats.tokensProcessed || 9;
  const searches = stats.totalSearches || 8;
  const memories = stats.memoriesCreated || 2;
  const connections = stats.connectionsActive || 0;

  const items = dataList?.items || dataList || [];
  const recentLogs = logs?.items || logs || [];

  const weekData = mkWeekData(
    recentLogs.filter((l) => l.method === "POST").length,
    recentLogs.filter((l) => l.method === "GET").length,
  );

  const donutData = [
    { name: "add", value: Math.max(tokens, 1) },
    { name: "search", value: Math.max(searches, 1) },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors">
          {timeRange}
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2",
              activeTab === tab
                ? "text-foreground border-primary bg-primary/5"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Tokens Processed"
              value={tokens}
              trend="+100%"
              quota={`${tokens} / 1.0M`}
            />
            <StatCard
              label="Search Queries"
              value={searches}
              trend="+100%"
              quota={`${searches} / 10.0K`}
            />
            <StatCard
              label="Memories Created"
              value={memories}
              trend="+100%"
            />
            <StatCard
              label="Connections Active"
              value={connections}
              trend="+0%"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Container tags – placeholder */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-sm font-medium text-foreground">Container Tags Distribution</p>
              <p className="text-xs text-muted-foreground">Distribution of documents across different container tags</p>
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <p className="text-sm text-muted-foreground">No container tags found</p>
                <p className="text-xs text-muted-foreground text-center max-w-[180px]">
                  Start adding documents with container tags to see the distribution
                </p>
              </div>
            </div>

            {/* Token usage line chart */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-sm font-medium text-foreground">Token Usage</p>
              <p className="text-xs text-muted-foreground">
                {tokens} tokens processed over the last 7 days
              </p>
              <div className="h-44 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 11,
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Line type="monotone" dataKey="add" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Tokens" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Request types donut */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-sm font-medium text-foreground">Request Types</p>
              <p className="text-xs text-muted-foreground">Distribution of API request types</p>
              <div className="h-44 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {donutData.map((_, idx) => (
                        <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(val) => (
                        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{val}</span>
                      )}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 11,
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Documents table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-foreground">Recent Documents</h2>
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                  {items.length} total
                </span>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Filter by container tags
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-10 px-4 py-2.5"></th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Content</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Tags</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No documents yet. Head to Data Explorer to add your first record.
                    </td>
                  </tr>
                ) : (
                  items.slice(0, 5).map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded border-border accent-primary" />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm text-foreground truncate">{item.text || item.content || "—"}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ID: {(item.id || "").slice(0, 10)}…
                          </span>
                          <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                            Done
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.type || "Text"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          {item.metadata?.tag || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString("en-GB")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <Info className="h-4 w-4" />
                          </button>
                          <button className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab !== "Overview" && (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-border bg-card">
          <p className="text-muted-foreground text-sm">
            The <span className="font-medium text-foreground">{activeTab}</span> view is coming soon.
          </p>
        </div>
      )}
    </div>
  );
}
