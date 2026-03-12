import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Globe, Search, ExternalLink, Clock, CalendarDays, X, Link2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { brainApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const RANGE_OPTIONS = [
  { label: "Today",   value: "1d" },
  { label: "7 days",  value: "7d" },
  { label: "30 days", value: "30d" },
];
const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899","#6b7280"];

function msToReadable(ms) {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const rs = s % 60;
  return `${m}m ${rs}s`;
}
function safeFormat(val, fmt) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return format(d, fmt);
}

/* ── Slim list row ─────────────────────────────────────────── */
function ActivityRow({ ev, isSelected, isSearch, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors",
        isSelected && "bg-blue-500/5 border-l-2 border-l-blue-400"
      )}
    >
      <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap flex-shrink-0">
        {safeFormat(ev.created_at, "HH:mm")}
      </span>
      <span className="text-xs font-medium text-foreground flex-shrink-0 w-32 truncate">
        {ev.domain || "—"}
      </span>
      <span className="flex-1 text-xs text-muted-foreground truncate min-w-0">
        {isSearch ? (ev.search_query || "—") : (ev.page_title || ev.url || "—")}
      </span>
      {!isSearch && (
        <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
          {msToReadable(ev.time_spent_ms ?? ev.timeSpentMs ?? ev.duration_ms ?? ev.duration)}
        </span>
      )}
    </button>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function WebActivityPage() {
  const [tab, setTab]         = useState("overview");
  const [range, setRange]     = useState("7d");
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [domain, setDomain]   = useState("");
  const [page, setPage]       = useState(0);
  const [selected, setSelected] = useState(null);

  const { data: statsData } = useQuery({
    queryKey: ["brain-web-stats", range],
    queryFn:  () => brainApi.webStats(range).then((r) => r.data?.data ?? r.data),
  });

  const isSearch = tab === "searches";
  const params = { dateFrom: dateFrom || undefined, domain: domain || undefined, type: isSearch ? "search" : undefined, page, limit: PAGE_SIZE };
  const { data: listData, isLoading: loadingList } = useQuery({
    queryKey: ["brain-web-activity", params],
    queryFn:  () => brainApi.webActivity(params).then((r) => r.data?.data ?? r.data),
    enabled:  tab !== "overview",
    keepPreviousData: true,
  });

  const items = listData?.items || [];
  const total = listData?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const topSites    = statsData?.topSites || [];
  const topSearches = statsData?.topSearches || [];
  const timeline    = (statsData?.timelineByDay || []).map((d) => ({
    date: safeFormat(d.date, "MM/dd"),
    visits: d.visits ?? 0,
    searches: d.searches ?? 0,
  }));
  const engines = statsData?.searchEngines || [];

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Web Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sites visited, searches and time tracking</p>
        </div>
        <div className="flex gap-1">
          {["overview","visits","searches"].map((t) => (
            <button key={t} onClick={() => { setTab(t); setSelected(null); }}
              className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors",
                tab === t ? "bg-blue-500/20 border-blue-500/30 text-blue-300" : "border-border/60 text-muted-foreground hover:text-foreground")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          <div className="flex justify-end gap-1 flex-shrink-0">
            {RANGE_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setRange(opt.value)}
                className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  range === opt.value ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/40")}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Daily chart */}
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
            {/* Top Sites */}
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
                      <td className="px-5 py-2.5 text-foreground font-medium">{s.domain ?? s.host ?? "—"}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{s.visits ?? s.visit_count ?? s.count ?? 0}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{msToReadable(s.totalTimeMs ?? s.total_time_ms ?? s.totalTime)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{msToReadable(s.avgTimeMs ?? s.avg_time_ms ?? s.avgTime)}</td>
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
        <div className="flex flex-col flex-1 min-h-0 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5">
              <input type="date" value={dateFrom} max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); setSelected(null); }}
                className="text-sm bg-transparent text-foreground outline-none" />
            </div>
            <input type="text" placeholder="Filter by domain…" value={domain}
              onChange={(e) => { setDomain(e.target.value); setPage(0); setSelected(null); }}
              className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>

          {/* Split panel */}
          <div className="flex gap-3 flex-1 min-h-0">

            {/* Left: list */}
            <div className={cn(
              "rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col transition-all duration-200",
              selected ? "w-[38%] flex-shrink-0" : "w-full"
            )}>
              {loadingList ? (
                <div className="flex-1 space-y-px p-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-9 bg-muted/10 animate-pulse rounded" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                  <Globe className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No records found</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {items.map((ev, i) => (
                    <ActivityRow
                      key={ev.id ?? i}
                      ev={ev}
                      isSearch={isSearch}
                      isSelected={selected?.id === ev.id}
                      onClick={() => setSelected(ev)}
                    />
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex-shrink-0 border-t border-border/40 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
                  <div className="flex gap-1">
                    <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-muted/20">Prev</button>
                    <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-muted/20">Next</button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: detail panel */}
            {selected && (
              <div className="flex-1 rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Globe className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">{selected.domain || "Unknown domain"}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    {selected.url && (
                      <a href={selected.url} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded hover:bg-muted/40 transition-colors text-muted-foreground hover:text-blue-400">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button onClick={() => setSelected(null)}
                      className="p-1.5 rounded hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Meta row */}
                <div className="px-5 py-2.5 border-b border-border/40 flex flex-wrap items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" />
                    <span>{safeFormat(selected.created_at, "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>{safeFormat(selected.created_at, "HH:mm:ss")}</span>
                  </div>
                  {!isSearch && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-blue-400">Time spent:</span>
                      <span>{msToReadable(selected.time_spent_ms ?? selected.timeSpentMs ?? selected.duration_ms ?? selected.duration)}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0">
                  {isSearch && selected.search_query && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="h-3.5 w-3.5 text-purple-400" />
                        <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Search Query</h4>
                      </div>
                      <div className="rounded-xl border border-purple-500/25 bg-purple-500/[0.04] px-5 py-4">
                        <p className="text-sm text-foreground">{selected.search_query}</p>
                      </div>
                    </div>
                  )}

                  {selected.page_title && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-3.5 w-3.5 text-blue-400" />
                        <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Page Title</h4>
                      </div>
                      <div className="rounded-xl border border-border/40 bg-background/60 px-5 py-4">
                        <p className="text-sm text-foreground">{selected.page_title}</p>
                      </div>
                    </div>
                  )}

                  {selected.url && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</h4>
                      </div>
                      <div className="rounded-xl border border-border/40 bg-background/60 px-5 py-4">
                        <a href={selected.url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-400 hover:underline break-all">
                          {selected.url}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
