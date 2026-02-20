import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";

const WEEK = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const fallback = WEEK.map((d) => ({ date: d, searches: 0, adds: 0, latency: 0 }));

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: 11,
    color: "hsl(var(--foreground))",
  },
  cursor: { fill: "hsl(var(--muted) / 0.3)" },
};

function SectionHeader({ title, sub }) {
  return (
    <div className="px-5 py-4 border-b border-border">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function UsagePage() {
  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: () => analyticsApi.usage().then((r) => r.data),
    retry: false,
  });

  const stats = usage || {};
  const daily = stats.daily || stats.requestsPerDay || fallback;
  const latencyData = stats.latencyOverview || stats.latency || fallback;

  const summaryCards = [
    { label: "Total Requests", value: stats.totalRequests || 0 },
    { label: "Avg Latency", value: `${stats.avgLatency || 0}ms` },
    { label: "Error Rate", value: `${stats.errorRate || 0}%` },
    { label: "Uptime", value: stats.uptime || "99.9%" },
  ];

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usage & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">API usage metrics and performance overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold font-mono text-foreground tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader
            title="Requests Per Day"
            sub="Searches and data additions over time"
          />
          <div className="p-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <XAxis
                  dataKey="date"
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
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="searches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Searches" />
                <Bar dataKey="adds" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} name="Adds" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader
            title="Latency Overview"
            sub="Average response time in milliseconds"
          />
          <div className="p-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={latencyData.length ? latencyData : daily}
                margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  dot={false}
                  name="Avg Latency (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
