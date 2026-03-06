import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Search, Terminal, Bot, Globe, FileText, NotebookPen, Bug, Loader2, ExternalLink } from "lucide-react";
import { brainApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const SOURCE_META = {
  terminal:   { icon: Terminal,   color: "text-zinc-400",   bg: "bg-zinc-500/10",    label: "Terminal",    route: "/terminal" },
  ai:         { icon: Bot,        color: "text-violet-400", bg: "bg-violet-500/10",  label: "AI Chat",     route: "/ai" },
  web:        { icon: Globe,      color: "text-blue-400",   bg: "bg-blue-500/10",    label: "Web",         route: "/web" },
  transcript: { icon: FileText,   color: "text-amber-400",  bg: "bg-amber-500/10",   label: "Transcript",  route: "/transcripts" },
  note:       { icon: NotebookPen,color: "text-emerald-400",bg: "bg-emerald-500/10", label: "Note",        route: "/notes" },
  issue:      { icon: Bug,        color: "text-orange-400", bg: "bg-orange-500/10",  label: "Issue",       route: "/issues" },
};

const SOURCE_TYPES = Object.keys(SOURCE_META);

const DATE_PRESETS = [
  { label: "Any time", value: "" },
  { label: "Today",    value: format(new Date(), "yyyy-MM-dd") },
  { label: "7 days",   value: format(subDays(new Date(), 7), "yyyy-MM-dd") },
  { label: "30 days",  value: format(subDays(new Date(), 30), "yyyy-MM-dd") },
];

function highlight(text, query) {
  if (!text || !query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{p}</mark>
      : p
  );
}

export default function GlobalSearchPage() {
  const navigate = useNavigate();
  const [query,     setQuery]    = useState("");
  const [submitted, setSubmit]   = useState("");
  const [types,     setTypes]    = useState([]);
  const [dateFrom,  setDateFrom] = useState("");
  const [page,      setPage]     = useState(0);
  const [grouped,   setGrouped]  = useState(true);

  const params = {
    q:          submitted || undefined,
    types:      types.length > 0 ? types.join(",") : undefined,
    startDate:  dateFrom || undefined,
    page,
    limit:      20,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey:  ["brain-search", params],
    queryFn:   () => brainApi.search(params).then((r) => r.data?.data ?? r.data),
    enabled:   !!submitted,
    keepPreviousData: true,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSubmit(query.trim());
    setPage(0);
  };

  const toggleType = (t) =>
    setTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  // Group results by source
  const bySource = items.reduce((acc, item) => {
    if (!acc[item.source]) acc[item.source] = [];
    acc[item.source].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Search className="h-5 w-5 text-violet-400" />
          Global Search
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Search across all your activity — commands, AI chats, sites, notes and issues</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-card px-4 py-3 focus-within:border-violet-500/60 transition-colors">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything…"
            autoFocus
            className="flex-1 text-base bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
          {(isLoading || isFetching) && submitted && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
          )}
          <button type="submit" className="px-4 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-colors flex-shrink-0">
            Search
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Source chips */}
        <span className="text-xs text-muted-foreground">Filter:</span>
        {SOURCE_TYPES.map((t) => {
          const meta = SOURCE_META[t];
          const Icon = meta.icon;
          const active = types.includes(t);
          return (
            <button key={t} onClick={() => toggleType(t)}
              className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
                active ? `${meta.bg} ${meta.color} border-current/30` : "border-border/60 text-muted-foreground hover:text-foreground")}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </button>
          );
        })}

        <div className="h-4 w-px bg-border/60" />

        {/* Date presets */}
        {DATE_PRESETS.map((d) => (
          <button key={d.label} onClick={() => setDateFrom(d.value)}
            className={cn("px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
              dateFrom === d.value ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "border-border/60 text-muted-foreground hover:text-foreground")}>
            {d.label}
          </button>
        ))}

        {items.length > 0 && (
          <button onClick={() => setGrouped(!grouped)} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {grouped ? "Show flat list" : "Group by source"}
          </button>
        )}
      </div>

      {/* Results */}
      {!submitted ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Search className="h-14 w-14 mb-4 opacity-15" />
          <p className="text-base font-medium">Start typing to search</p>
          <p className="text-sm mt-1 opacity-70">Searches terminal commands, AI chats, websites, transcripts, notes and issues</p>
        </div>
      ) : items.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Search className="h-14 w-14 mb-4 opacity-15" />
          <p className="text-base font-medium">No results for "{submitted}"</p>
          <p className="text-sm mt-1 opacity-70">Try different keywords or remove filters</p>
        </div>
      ) : grouped ? (
        <div className="space-y-6">
          {Object.entries(bySource).map(([src, srcItems]) => {
            const meta = SOURCE_META[src] || SOURCE_META.terminal;
            const Icon = meta.icon;
            return (
              <div key={src}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", meta.bg)}>
                    <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">({srcItems.length})</span>
                </div>
                <div className="space-y-2">
                  {srcItems.map((item, i) => (
                    <ResultCard key={item.id ?? i} item={item} query={submitted} meta={meta} navigate={navigate} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const meta = SOURCE_META[item.source] || SOURCE_META.terminal;
            return <ResultCard key={item.id ?? i} item={item} query={submitted} meta={meta} navigate={navigate} />;
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-muted/20">Prev</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-muted/20">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ item, query, meta, navigate }) {
  const Icon = meta.icon;
  return (
    <button
      onClick={() => navigate(meta.route)}
      className="w-full text-left rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/30 hover:bg-violet-500/5 transition-colors space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-5 w-5 items-center justify-center rounded", meta.bg)}>
            <Icon className={cn("h-3 w-3", meta.color)} />
          </div>
          <span className={cn("text-xs font-semibold", meta.color)}>{meta.label}</span>
          {item.matched_field && (
            <span className="text-[10px] text-muted-foreground border border-border/40 rounded px-1.5 py-0.5">{item.matched_field}</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : ""}
        </span>
      </div>
      <p className="text-sm text-foreground font-medium">{highlight(item.title || "—", query)}</p>
      {item.preview && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{highlight(item.preview, query)}</p>
      )}
    </button>
  );
}
