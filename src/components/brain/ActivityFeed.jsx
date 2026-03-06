import { Globe, Bot, Terminal, FileText, GitBranch, Search, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

const EVENT_META = {
  website_visit:    { icon: Globe,    color: "text-blue-400",   bg: "bg-blue-500/10",    label: "Visit" },
  website_search:   { icon: Search,   color: "text-teal-400",   bg: "bg-teal-500/10",    label: "Search" },
  ai_prompt:        { icon: Bot,      color: "text-violet-400", bg: "bg-violet-500/10",  label: "AI" },
  ai_response:      { icon: Bot,      color: "text-violet-400", bg: "bg-violet-500/10",  label: "AI" },
  ai_conversation:  { icon: Bot,      color: "text-violet-400", bg: "bg-violet-500/10",  label: "AI" },
  ai_cli_prompt:    { icon: Bot,      color: "text-violet-400", bg: "bg-violet-500/10",  label: "AI CLI" },
  page_content:     { icon: FileText, color: "text-amber-400",  bg: "bg-amber-500/10",   label: "Transcript" },
  git_activity:     { icon: GitBranch,color: "text-orange-400", bg: "bg-orange-500/10",  label: "Git" },
  terminal_command: { icon: Terminal, color: "text-zinc-400",   bg: "bg-zinc-500/10",    label: "Terminal" },
};

function getDefaultMeta(type) {
  return EVENT_META[type] || { icon: Terminal, color: "text-zinc-400", bg: "bg-zinc-500/10", label: type };
}

function EventCard({ event }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getDefaultMeta(event.event_type || event.source);
  const Icon = meta.icon;
  const title = event.page_title || event.search_query || event.domain || event.ai_service || event.event_type || "—";
  const subtitle = event.domain || event.url || "";
  const ts = event.created_at ? format(new Date(event.created_at), "HH:mm") : "";

  return (
    <div className={cn("rounded-lg border border-border/40 overflow-hidden", expanded && "border-violet-500/20")}>
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0", meta.bg)}>
          <Icon className={cn("h-3 w-3", meta.color)} />
        </div>
        <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide flex-shrink-0", meta.bg, meta.color)}>
          {meta.label}
        </span>
        <span className="flex-1 text-sm text-foreground truncate">{title}</span>
        <span className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums">{ts}</span>
        {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 text-xs text-muted-foreground space-y-1">
          {subtitle && <p className="truncate">{subtitle}</p>}
          {event.prompt_text && <p className="text-foreground line-clamp-3 whitespace-pre-wrap">{event.prompt_text}</p>}
          {event.search_query && event.event_type !== "website_search" && <p>Query: {event.search_query}</p>}
          {event.time_spent_ms && <p>Time on page: {Math.round(event.time_spent_ms / 1000)}s</p>}
        </div>
      )}
    </div>
  );
}

export default function ActivityFeed({ events = [], loading = false }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Terminal className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">No activity recorded for this day</p>
      </div>
    );
  }

  // Group by hour
  const byHour = events.reduce((acc, ev) => {
    const h = ev.created_at ? format(new Date(ev.created_at), "HH:00") : "??:00";
    if (!acc[h]) acc[h] = [];
    acc[h].push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byHour)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([hour, items]) => (
          <div key={hour}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{hour}</p>
            <div className="space-y-1.5">
              {items.map((ev, i) => <EventCard key={ev.id ?? i} event={ev} />)}
            </div>
          </div>
        ))}
    </div>
  );
}
