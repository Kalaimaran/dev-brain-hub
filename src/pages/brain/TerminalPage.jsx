import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Terminal, Calendar, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { brainApi } from "@/lib/api";
import CommandRow from "@/components/brain/CommandRow";
import { cn } from "@/lib/utils";

const TERMINAL_TYPES = [
  "git_activity", "terminal_command", "package_manager", "build_tool",
  "python", "java", "container_orchestration", "http_request",
  "remote_access", "infrastructure", "ai_cli_prompt",
];

const PAGE_SIZE = 50;

// GitHub-style 7×24 heatmap
function CommandHeatmap({ data = [] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  // data: [{hour, dayOfWeek, count}]
  const grid = useMemo(() => {
    const map = {};
    data.forEach(({ hour, dayOfWeek, count }) => { map[`${dayOfWeek}-${hour}`] = count; });
    const max = Math.max(1, ...Object.values(map));
    return { map, max };
  }, [data]);

  const opacity = (count) => {
    if (!count) return 0.05;
    return 0.15 + (count / grid.max) * 0.85;
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        <div className="flex flex-col justify-around pr-2 text-[9px] text-muted-foreground" style={{ paddingTop: 14 }}>
          {days.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div>
          <div className="flex gap-1 mb-1">
            {hours.map((h) => (
              <span key={h} className="text-[8px] text-muted-foreground w-4 text-center">{h % 6 === 0 ? h : ""}</span>
            ))}
          </div>
          {days.map((day, di) => (
            <div key={day} className="flex gap-1 mb-1">
              {hours.map((h) => {
                const count = grid.map[`${di + 1}-${h}`] || 0;
                return (
                  <div
                    key={h}
                    title={`${day} ${h}:00 — ${count} commands`}
                    className="h-4 w-4 rounded-sm bg-violet-500 transition-opacity"
                    style={{ opacity: opacity(count) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TerminalPage() {
  const [date, setDate]         = useState(format(new Date(), "yyyy-MM-dd"));
  const [typeFilter, setType]   = useState("");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(0);
  const [groupByDay, setGroup]  = useState(false);
  const [heatmapOpen, setHeat]  = useState(false);
  const [filterOpen, setFilter] = useState(true);

  const params = { date: date || undefined, type: typeFilter || undefined, q: search || undefined, page, limit: PAGE_SIZE };

  const { data, isLoading } = useQuery({
    queryKey: ["brain-terminal", params],
    queryFn:  () => brainApi.terminal(params).then((r) => r.data?.data ?? r.data),
    keepPreviousData: true,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Group by day
  const grouped = useMemo(() => {
    if (!groupByDay) return null;
    return items.reduce((acc, ev) => {
      const d = ev.created_at ? format(new Date(ev.created_at), "yyyy-MM-dd") : "Unknown";
      if (!acc[d]) acc[d] = [];
      acc[d].push(ev);
      return acc;
    }, {});
  }, [items, groupByDay]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Terminal className="h-5 w-5 text-zinc-400" />
            Terminal History
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Commands, git activity, builds and more</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroup(!groupByDay)}
            className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
              groupByDay ? "bg-zinc-500/20 border-zinc-500/30 text-zinc-300" : "border-border/60 text-muted-foreground hover:text-foreground")}
          >
            Group by Day
          </button>
          <button
            onClick={() => setHeat(!heatmapOpen)}
            className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Heatmap {heatmapOpen ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Heatmap */}
      {heatmapOpen && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Command Activity Heatmap (last 30 days)</p>
          <CommandHeatmap data={data?.heatmap || []} />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <button
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3"
          onClick={() => setFilter(!filterOpen)}
        >
          <Filter className="h-3 w-3" />
          Filters
          {filterOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {filterOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date */}
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={date}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => { setDate(e.target.value); setPage(0); }}
                className="flex-1 text-sm bg-transparent text-foreground outline-none"
              />
            </div>
            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) => { setType(e.target.value); setPage(0); }}
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none"
            >
              <option value="">All types</option>
              {TERMINAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {/* Search */}
            <input
              type="text"
              value={search}
              placeholder="Search commands…"
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border/40 bg-muted/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="w-4 flex-shrink-0" />
          <span className="w-4 flex-shrink-0" />
          <span className="w-16 flex-shrink-0">Type</span>
          <span className="flex-1">Command</span>
          <span className="hidden md:block w-28 text-right">Project</span>
          <span className="w-16 text-right">Time</span>
        </div>

        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-11 border-b border-border/40 bg-muted/10 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Terminal className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No commands found for the selected filters</p>
          </div>
        ) : groupByDay && grouped ? (
          Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([day, evts]) => (
            <GroupAccordion key={day} label={day} count={evts.length}>
              {evts.map((ev, i) => <CommandRow key={ev.id ?? i} event={ev} />)}
            </GroupAccordion>
          ))
        ) : (
          items.map((ev, i) => <CommandRow key={ev.id ?? i} event={ev} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-muted/20 transition-colors">
              Prev
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-muted/20 transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupAccordion({ label, count, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/40 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label}
        <span className="ml-auto text-[10px] rounded-full bg-muted px-1.5 py-0.5">{count}</span>
      </button>
      {open && children}
    </div>
  );
}
