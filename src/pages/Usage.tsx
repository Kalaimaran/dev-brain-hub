import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function UsagePage() {
  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: () => analyticsApi.usage().then((r) => r.data),
    retry: false,
  });

  const stats = usage || {};
  const dailyData = stats.daily || stats.requestsPerDay || [];
  const latencyData = stats.latencyOverview || stats.latency || [];

  // Fallback sample data for display
  const chartData = dailyData.length > 0 ? dailyData : [
    { date: "Mon", searches: 0, adds: 0 },
    { date: "Tue", searches: 0, adds: 0 },
    { date: "Wed", searches: 0, adds: 0 },
    { date: "Thu", searches: 0, adds: 0 },
    { date: "Fri", searches: 0, adds: 0 },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Usage & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">API usage metrics and performance overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests per day */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-foreground">Requests Per Day</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220 18% 10%)",
                    border: "1px solid hsl(220 14% 18%)",
                    borderRadius: "8px",
                    fontSize: 12,
                    color: "hsl(210 15% 88%)",
                  }}
                />
                <Bar dataKey="searches" fill="hsl(175 75% 46%)" radius={[4, 4, 0, 0]} name="Searches" />
                <Bar dataKey="adds" fill="hsl(210 80% 55%)" radius={[4, 4, 0, 0]} name="Adds" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-foreground">Latency Overview</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData.length > 0 ? latencyData : chartData}>
                <XAxis dataKey="date" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220 18% 10%)",
                    border: "1px solid hsl(220 14% 18%)",
                    borderRadius: "8px",
                    fontSize: 12,
                    color: "hsl(210 15% 88%)",
                  }}
                />
                <Line type="monotone" dataKey="latency" stroke="hsl(38 90% 55%)" strokeWidth={2} dot={false} name="Avg Latency (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: stats.totalRequests || 0 },
          { label: "Avg Latency", value: `${stats.avgLatency || 0}ms` },
          { label: "Error Rate", value: `${stats.errorRate || 0}%` },
          { label: "Uptime", value: stats.uptime || "99.9%" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-2xl font-semibold font-mono text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
