import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Globe, Terminal, Bot, FileText, Clock, Search, RefreshCw, Calendar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { brainApi } from "@/lib/api";
import StatCard from "@/components/brain/StatCard";
import ActivityFeed from "@/components/brain/ActivityFeed";

const RANGE_OPTIONS = [
  { label: "7 days",  value: "7d" },
  { label: "14 days", value: "14d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
];

const DONUT_COLORS = ["#8b5cf6","#3b82f6","#f59e0b","#10b981","#ec4899","#6b7280"];

function SectionTitle({ children }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{children}</h3>;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [range, setRange]               = useState("7d");

  const { data: summary, isLoading: loadingSummary, refetch } = useQuery({
    queryKey: ["brain-daily-summary", selectedDate],
    queryFn:  () => brainApi.dailySummary(selectedDate).then((r) => r.data?.data ?? r.data),
  });

  const { data: rangeData, isLoading: loadingRange } = useQuery({
    queryKey: ["brain-range-summary", range],
    queryFn:  () => brainApi.rangeSummary(range).then((r) => r.data?.data ?? r.data),
  });

  // Merged activity feed — combine terminal + ai + web from summary
  const feedEvents = summary?.recentEvents || [];

  // Build range chart data
  const rangeChartData = Array.isArray(rangeData)
    ? rangeData.map((d) => ({
        date:     format(new Date(d.date), "MM/dd"),
        visits:   d.visits  ?? 0,
        commands: d.commands ?? 0,
        ai:       d.aiPrompts ?? 0,
      }))
    : [];

  // Command breakdown donut
  const cmdBreakdown = summary?.commandBreakdown
    ? Object.entries(summary.commandBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  // AI services donut
  const aiBreakdown = summary?.aiBreakdown
    ? Object.entries(summary.aiBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  // Top domains bar
  const topDomains = (summary?.topDomains || []).slice(0, 6).map((d) => ({
    domain: d.domain?.replace("www.", "") || "—",
    visits: d.count ?? d.visits ?? 0,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Daily Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your developer activity at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm bg-transparent text-foreground outline-none"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard title="Sites Visited"  value={summary?.visits   ?? "—"} icon={Globe}    iconColor="text-blue-400"   iconBg="bg-blue-500/10"   loading={loadingSummary} />
        <StatCard title="Web Searches"   value={summary?.searches ?? "—"} icon={Search}   iconColor="text-teal-400"   iconBg="bg-teal-500/10"   loading={loadingSummary} />
        <StatCard title="Commands Run"   value={summary?.commands ?? "—"} icon={Terminal}  iconColor="text-zinc-400"   iconBg="bg-zinc-500/10"   loading={loadingSummary} />
        <StatCard title="AI Prompts"     value={summary?.aiPrompts ?? "—"} icon={Bot}      iconColor="text-violet-400" iconBg="bg-violet-500/10" loading={loadingSummary} />
        <StatCard title="Pages Saved"    value={summary?.transcripts ?? "—"} icon={FileText} iconColor="text-amber-400" iconBg="bg-amber-500/10"  loading={loadingSummary} />
        <StatCard title="Active Window"  value={summary?.activeFrom ? `${summary.activeFrom}–${summary.activeTo}` : "—"} icon={Clock} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" loading={loadingSummary} />
      </div>

      {/* Range selector + chart */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Activity Trend</SectionTitle>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  range === opt.value
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rangeChartData} barSize={6}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#fafafa", fontSize: 11 }} itemStyle={{ fontSize: 11 }} />
            <Bar dataKey="visits"   fill="#3b82f6" name="Web Visits"  radius={[3,3,0,0]} />
            <Bar dataKey="commands" fill="#71717a"  name="Commands"    radius={[3,3,0,0]} />
            <Bar dataKey="ai"       fill="#8b5cf6" name="AI Prompts"  radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row: Top Domains + Command Breakdown + AI Services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Top Domains */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <SectionTitle>Top Domains Today</SectionTitle>
          {topDomains.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No visits recorded</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={topDomains} layout="vertical" barSize={8}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="domain" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#fafafa", fontSize: 11 }} itemStyle={{ fontSize: 11 }} />
                <Bar dataKey="visits" fill="#3b82f6" name="Visits" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Command Breakdown */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <SectionTitle>Command Breakdown</SectionTitle>
          {cmdBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No commands recorded</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={cmdBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                  {cmdBreakdown.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI Services */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <SectionTitle>AI Services Used</SectionTitle>
          {aiBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No AI prompts recorded</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={aiBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                  {aiBreakdown.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <SectionTitle>Chronological Activity Feed</SectionTitle>
        <ActivityFeed events={feedEvents} loading={loadingSummary} />
      </div>
    </div>
  );
}
