import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Globe, Search, BarChart3, Clock, ExternalLink } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { brainApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const RANGE_OPTIONS = [
  { label: "Today",  value: "1d" },
  { label: "7 days", value: "7d" },
  { label: "30 days",value: "30d" },
];
const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899","#6b7280"];

function msToReadable(ms) {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const rs = s % 60;
  return `${m}m ${rs}s`;
}

export default function WebActivityPage() {
  const [tab, setTab]         = useState("overview");
  const [range, setRange]     = useState("7d");
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [domain, setDomain]   = useState("");
  const [type, setType]       = useState("");
  const [page, setPage]       = useState(0);

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ["brain-web-stats", range],
    queryFn:  () => brainApi.webStats(range).then((r) => r.data?.data ?? r.data),
  });

  const params = { dateFrom: dateFrom || undefined, domain: domain || undefined, type: type || undefined, page, limit: PAGE_SIZE };
  const { data: listData, isLoading: loadingList } = useQuery({
    queryKey: ["brain-web-activity", params],
    queryFn:  () => brainApi.webActivity(params).then((r) => r.data?.data ?? r.data),
    enabled:  tab !== "overview",
    keepPreviousData: true,
  });

  const items = listData?.items || [];
  const total = listData?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const topSites   = statsData?.topSites || [];
  const topSearches = statsData?.topSearches || [];
  const timeline   = (statsData?.timelineByDay || []).map((d) => ({
    date: format(new Date(d.date), "MM/dd"),
    visits: d.visits ?? 0,
    searches: d.searches ?? 0,
  }));
  const engines = statsData?.searchEngines || [];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Web Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sites visited, searches and time tracking</p>
        </div>
        <div className="flex gap-1">
          {["overview","visits","searches"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors",
                tab === t ? "bg-blue-500/20 border-blue-500/30 text-blue-300" : "border-border/60 text-muted-foreground hover:text-foreground")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setRange(opt.value)}
                className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  range === opt.value ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/40")}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Visits + searches chart */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Daily Visits & Searches</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeline} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#fafafa", fontSize: 11 }} itemStyle={{ fontSize: 11 }} />
                <Bar dataKey="visits"   fill="#3b82f6" name="Visits"   radius={[3,3,0,0]} />
                <Bar dataKey="searches" fill="#8b5cf6" name="Searches" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Sites table */}
            <div className="md:col-span-2 rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Sites</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2 text-left">Domain</th>
                    <th className="px-5 py-2 text-right">Visits</th>
                    <th className="px-5 py-2 text-right">Total Time</th>
                    <th className="px-5 py-2 text-right">Avg / Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {topSites.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-xs text-muted-foreground">No data</td></tr>
                  ) : topSites.map((s, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-2.5 text-foreground font-medium">{s.domain}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{s.visits}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{msToReadable(s.totalTimeMs)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{msToReadable(s.avgTimeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Search Engines pie */}
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Search Engines</p>
              {engines.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No searches</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={engines.map((e) => ({ name: e.engine, value: e.count }))} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                      {engines.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ fontSize: 11 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Searches */}
          {topSearches.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Search Queries</p>
              </div>
              <div className="divide-y divide-border/40">
                {topSearches.slice(0, 10).map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground">{s.query}</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{s.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Visits / Searches Tab ── */}
      {(tab === "visits" || tab === "searches") && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5">
              <input type="date" value={dateFrom} max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="text-sm bg-transparent text-foreground outline-none" />
            </div>
            <input type="text" placeholder="Filter by domain…" value={domain}
              onChange={(e) => { setDomain(e.target.value); setPage(0); }}
              className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>

          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 text-left">Time</th>
                  <th className="px-4 py-2.5 text-left">Domain</th>
                  <th className="px-4 py-2.5 text-left">{tab === "searches" ? "Query" : "Page Title"}</th>
                  {tab === "visits" && <th className="px-4 py-2.5 text-right">Time Spent</th>}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loadingList ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="h-10 bg-muted/10 animate-pulse" /></tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">No records found</td></tr>
                ) : items.map((ev, i) => (
                  <tr key={ev.id ?? i} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {ev.created_at ? format(new Date(ev.created_at), "HH:mm:ss") : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground">{ev.domain || "—"}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground truncate max-w-xs">
                      {tab === "searches" ? (ev.search_query || "—") : (ev.page_title || "—")}
                    </td>
                    {tab === "visits" && (
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground tabular-nums">{msToReadable(ev.time_spent_ms)}</td>
                    )}
                    <td className="px-4 py-2.5">
                      {ev.url && (
                        <a href={ev.url} target="_blank" rel="noreferrer" className="flex justify-end">
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-muted/20">Prev</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-muted/20">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
