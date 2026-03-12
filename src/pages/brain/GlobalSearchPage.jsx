import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Search, Terminal, Bot, Globe, FileText, NotebookPen, Bug, Loader2, ExternalLink, X, Copy, Check } from "lucide-react";
import { brainApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import ConversationBubble from "@/components/brain/ConversationBubble";

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

function safeFormat(dateStr, fmt) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return format(d, fmt);
  } catch {
    return "";
  }
}

function highlight(text, query) {
  if (!text || !query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{p}</mark>
      : p
  );
}

function parseTerminalJson(raw) {
  if (!raw) return null;
  // Full parse first
  try { return JSON.parse(raw); } catch {}
  // Regex fallback — handles truncated JSON strings sent by the search API
  const str = (key) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : null;
  };
  const command = str("command");
  if (!command) return null; // not a terminal JSON at all
  return {
    command,
    eventType:        str("eventType"),
    workingDirectory: str("workingDirectory"),
    projectName:      str("projectName") ?? str("repoName"),
    output:           str("output"),
  };
}

function getItemTitle(item) {
  if (item.source === "terminal") {
    if (item.command) return item.command;
    const p = parseTerminalJson(item.body ?? item.preview ?? item.snippet);
    if (p?.command) return p.command;
  }
  return item.title ?? item.subject ?? item.command ?? item.domain ?? "—";
}

function getItemPreview(item) {
  const raw = item.preview ?? item.snippet ?? item.body;
  if (item.source === "terminal" && raw) {
    const p = parseTerminalJson(raw);
    if (p) {
      const parts = [p.projectName ?? p.repoName, p.workingDirectory].filter(Boolean);
      return parts.length > 0 ? parts.join(" • ") : null;
    }
  }
  return raw;
}

// ─── Detail sub-components ──────────────────────────────────────────────────

function DetailTerminal({ item }) {
  const raw       = item.body ?? item.preview ?? item.snippet;
  const parsed    = parseTerminalJson(raw);
  const command   = item.command   ?? parsed?.command   ?? getItemTitle(item);
  const dir       = item.working_directory ?? parsed?.workingDirectory ?? parsed?.working_directory;
  const project   = item.project_name     ?? parsed?.projectName      ?? parsed?.repoName;
  const eventType = parsed?.eventType;
  const output    = item.output   ?? parsed?.output;
  const exitCode  = item.exit_code ?? parsed?.exitCode;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Command</p>
        <div className="rounded-lg bg-black/40 border border-border/40 px-4 py-3 font-mono text-sm space-y-1.5">
          <p className="text-green-300">$ {command}</p>
          {project && <p className="text-yellow-300 text-xs">🗂 {project}</p>}
          {dir     && <p className="text-blue-300  text-xs">📁 {dir}</p>}
        </div>
      </div>
      {(eventType || exitCode !== undefined || item.duration) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Context</p>
          <div className="flex flex-wrap gap-2">
            {eventType && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-1 text-xs text-zinc-300">
                ⚡ {eventType}
              </span>
            )}
            {exitCode !== undefined && (
              <span className={cn("inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs",
                exitCode === 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300")}>
                {exitCode === 0 ? "✓" : "✗"} exit {exitCode}
              </span>
            )}
            {item.duration && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-muted/10 px-2.5 py-1 text-xs text-muted-foreground">
                ⏱ {item.duration}
              </span>
            )}
          </div>
        </div>
      )}
      {output && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Output</p>
          <pre className="rounded-lg bg-black/40 border border-border/40 px-4 py-3 font-mono text-xs text-muted-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-56 overflow-y-auto">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}

function DetailAI({ item }) {
  // Search results use `preview` for the JSON conversation array, `summary` for TL;DR
  const promptText = item.prompt_text ?? item.preview;
  const tldr = item.response_text ?? item.summary;
  const scrollRef = useRef(null);

  // Auto-scroll conversation to the bottom whenever the selected item changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [item]);

  return (
    // Full-height flex column: chat grows to fill space, summary capped at 1/3
    <div className="h-full flex flex-col gap-3">

      {/* Page title — fixed height */}
      {item.page_title && (
        <div className="flex-shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Page</p>
          <p className="text-sm text-foreground">{item.page_title}</p>
        </div>
      )}

      {/* Conversation — takes all remaining space, scrolls internally */}
      <div className="flex flex-col flex-1 min-h-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex-shrink-0">
          Conversation
        </p>
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 pr-1">
          <ConversationBubble promptText={promptText} responseText={null} />
        </div>
      </div>

      {/* TL;DR summary — natural height up to max 1/3 of panel, scrolls if longer */}
      {tldr && (
        <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ maxHeight: "33%" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400 mb-1 flex-shrink-0">
            TL;DR
          </p>
          <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-3 overflow-y-auto min-h-0">
            <p className="text-xs text-foreground leading-relaxed">{tldr}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailWeb({ item }) {
  // API may put the page URL in `url` or in `created_at`
  const pageUrl = item.url ?? item.created_at;
  return (
    <div className="space-y-4">
      {item.title && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Title</p>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
        </div>
      )}
      {pageUrl && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">URL</p>
          <a href={pageUrl} target="_blank" rel="noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 break-all flex items-center gap-1">
            {pageUrl} <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
      )}
      {(item.body ?? item.preview ?? item.snippet) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {item.body ?? item.preview ?? item.snippet}
          </p>
        </div>
      )}
    </div>
  );
}

function DetailGeneric({ item }) {
  const body = item.body ?? item.preview ?? item.snippet;
  return (
    <div className="space-y-4">
      {item.title && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Title</p>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
        </div>
      )}
      {item.status && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
          <span className="inline-flex rounded-lg border border-border/40 bg-muted/10 px-2.5 py-1 text-xs text-muted-foreground capitalize">
            {item.status}
          </span>
        </div>
      )}
      {body && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Content</p>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
        </div>
      )}
    </div>
  );
}

function DetailTranscript({ item }) {
  const summary = item.summary ?? item.response_text;
  const preview = item.preview ?? item.snippet ?? item.body;

  return (
    // Full-height flex column: summary 2/3, preview 1/3
    <div className="h-full flex flex-col gap-3">

      {/* Summary — takes 2/3, scrolls internally */}
      {summary && (
        <div className="flex flex-col min-h-0" style={{ flex: "2 1 0" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-2 flex-shrink-0">
            Summary
          </p>
          <div className="flex-1 overflow-y-auto min-h-0 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        </div>
      )}

      {/* Preview / raw content — takes 1/3, scrolls if overflow */}
      {preview && (
        <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ maxHeight: "33%" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex-shrink-0">
            Preview
          </p>
          <div className="overflow-y-auto min-h-0 rounded-lg bg-muted/10 border border-border/40 px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{preview}</p>
          </div>
        </div>
      )}

      {/* Fallback if neither field present */}
      {!summary && !preview && (
        <p className="text-xs text-muted-foreground">No content available.</p>
      )}
    </div>
  );
}

function DetailPanel({ item, onClose }) {
  const meta = SOURCE_META[item.source] || SOURCE_META.terminal;
  const Icon = meta.icon;
  const title = getItemTitle(item);

  // Source-specific hyperlink shown under the title.
  // API quirk: for web/transcript the page URL sometimes lives in `created_at`.
  // For AI: `url` holds the conversation link, `ai_service` is shown as a badge.
  const sourceLink = (() => {
    if (item.source === "web") {
      const href = item.url ?? item.created_at;
      if (!href) return null;
      let label = item.domain;
      if (!label) { try { label = new URL(href).hostname; } catch { label = href; } }
      return { href, label, badge: null };
    }
    if (item.source === "transcript") {
      const href = item.url ?? item.created_at;
      if (!href) return null;
      const label = item.domain ?? href;
      return { href, label, badge: null };
    }
    if (item.source === "ai") {
      const svc = item.ai_service ?? item.aiService;
      const href = item.url ?? null;
      if (!svc && !href) return null;
      // badge = service name; href = conversation URL (separate link)
      return { href, label: svc ?? href, badge: svc ?? null };
    }
    return null;
  })();

  return (
    <div className="flex-1 rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={cn("flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0", meta.bg)}>
            <Icon className={cn("h-3.5 w-3.5", meta.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-muted-foreground flex-shrink-0">
                {safeFormat(item.created_at, "MMM d, yyyy · HH:mm")}
              </p>
              {sourceLink && (
                <div className="flex items-center gap-1.5">
                  {/* Colored service badge (AI only) */}
                  {sourceLink.badge && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0", meta.bg, meta.color, "border-current/20")}>
                      {sourceLink.badge}
                    </span>
                  )}
                  {/* Clickable URL (web / transcript / AI conversation link) */}
                  {sourceLink.href && (
                    <a href={sourceLink.href} target="_blank" rel="noreferrer"
                      className="flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 truncate max-w-[200px]">
                      <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                      {/* For AI show nothing extra (badge already has service name); for others show domain label */}
                      {!sourceLink.badge && (sourceLink.label ?? sourceLink.href)}
                    </a>
                  )}
                  {/* Fallback: label-only badge when neither href nor badge */}
                  {!sourceLink.href && !sourceLink.badge && sourceLink.label && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0", meta.bg, meta.color, "border-current/20")}>
                      {sourceLink.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/30 transition-colors flex-shrink-0">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Body — AI and Transcript manage their own internal scroll zones via flex-col */}
      <div className={cn(
        "flex-1 min-h-0 p-4",
        (item.source === "ai" || item.source === "transcript") ? "flex flex-col overflow-hidden" : "overflow-y-auto"
      )}>
        {item.source === "terminal"   && <DetailTerminal item={item} />}
        {item.source === "ai"         && <DetailAI item={item} />}
        {item.source === "web"        && <DetailWeb item={item} />}
        {item.source === "note"       && <DetailGeneric item={item} />}
        {item.source === "issue"      && <DetailGeneric item={item} />}
        {item.source === "transcript" && <DetailTranscript item={item} />}
      </div>
    </div>
  );
}

// ─── Result Card ────────────────────────────────────────────────────────────

function ResultCard({ item, query, meta, isSelected, onSelect }) {
  const Icon    = meta.icon;
  const title   = getItemTitle(item);
  const preview = getItemPreview(item);
  const [copied, setCopied] = useState(false);

  // Row-1 sub-label: domain (web/transcript), AI domain (ai), event type (terminal)
  const sourceId = (() => {
    if (item.source === "web" || item.source === "transcript")
      return item.domain ?? null;
    if (item.source === "ai")
      return item.created_at ?? item.ai_service ?? item.aiService ?? null;
    if (item.source === "terminal") {
      const p = parseTerminalJson(item.preview ?? item.snippet ?? item.body);
      return p?.eventType ?? null;
    }
    return null;
  })();

  const hasSummary  = !!item.summary;
  const isTerminal  = item.source === "terminal";

  // Parse extra terminal fields for enriched display
  const terminalMeta = (() => {
    if (!isTerminal) return null;
    const p = parseTerminalJson(item.preview ?? item.snippet ?? item.body);
    const dir     = item.working_directory ?? p?.workingDirectory ?? p?.working_directory;
    const project = item.project_name      ?? p?.projectName      ?? p?.repoName;
    return { dir, project };
  })();

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(title).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg border-l-2 border border-border/50 px-3 py-2.5 transition-colors space-y-1",
        isSelected
          ? "border-l-violet-500 border-violet-500/40 bg-violet-500/10"
          : "border-l-transparent hover:border-l-violet-500/40 hover:border-violet-500/20 hover:bg-violet-500/5"
      )}
    >
      {/* Row 1 — type badge · sub-label badge · date */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={cn(
          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wide flex-shrink-0",
          meta.bg, meta.color, "border-current/20"
        )}>
          <Icon className="h-2.5 w-2.5" />
          {meta.label.toUpperCase()}
        </span>
        {sourceId && (
          <span className={cn(
            "text-[9px] rounded border px-1.5 py-0.5 flex-shrink-0 truncate max-w-[120px]",
            meta.bg, meta.color, "border-current/20 opacity-80"
          )}>
            {sourceId}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground tabular-nums ml-auto flex-shrink-0">
          {safeFormat(item.created_at, "MMM d")}
        </span>
      </div>

      {/* Row 2 — command (terminal) or title · copy button · AI Summary */}
      <div className="flex items-center gap-1.5 min-w-0">
        {isTerminal ? (
          <span className="flex-1 min-w-0 font-mono text-xs text-green-300 truncate">
            <span className="text-zinc-500 mr-1">$</span>
            {highlight(title, query)}
          </span>
        ) : (
          <p className="text-xs text-foreground font-medium truncate flex-1">
            {highlight(title, query)}
          </p>
        )}
        {isTerminal && (
          <button
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy command"}
            className={cn(
              "flex-shrink-0 p-1 rounded transition-colors",
              copied ? "text-green-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            {copied
              ? <Check className="h-3 w-3" />
              : <Copy className="h-3 w-3" />
            }
          </button>
        )}
        {hasSummary && (
          <span className={cn(
            "text-[9px] rounded border px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap",
            meta.bg, meta.color, "border-current/20"
          )}>
            AI Summary
          </span>
        )}
      </div>

      {/* Row 3 — working dir / project (terminal) or preview snippet for other sources */}
      {isTerminal ? (
        // Only render if we successfully parsed the JSON — never show raw JSON text
        (terminalMeta?.dir || terminalMeta?.project) && (
          <p className="text-[11px] text-zinc-500 truncate font-mono">
            {terminalMeta.project && (
              <span className="text-yellow-600/70 mr-1.5">🗂 {terminalMeta.project}</span>
            )}
            {terminalMeta.dir && (
              <span>📁 {terminalMeta.dir}</span>
            )}
          </p>
        )
      ) : preview ? (
        <p className="text-[11px] text-muted-foreground truncate">{highlight(preview, query)}</p>
      ) : null}
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function GlobalSearchPage() {
  const navigate = useNavigate();
  const [query,     setQuery]    = useState("");
  const [submitted, setSubmit]   = useState("");
  const [types,     setTypes]    = useState([]);
  const [dateFrom,  setDateFrom] = useState("");
  const [page,      setPage]     = useState(0);
  const [selected,  setSelected] = useState(null);

  const params = {
    q:         submitted || undefined,
    types:     types.length > 0 ? types.join(",") : undefined,
    startDate: dateFrom || undefined,
    page,
    limit:     20,
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
    setSelected(null);
  };

  useEffect(() => { setPage(0); setSelected(null); }, [types, dateFrom]);

  const toggleType = (t) =>
    setTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  // Group results by source
  const bySource = items.reduce((acc, item) => {
    if (!acc[item.source]) acc[item.source] = [];
    acc[item.source].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4 flex flex-col h-full">
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
        {DATE_PRESETS.map((d) => (
          <button key={d.label} onClick={() => setDateFrom(d.value)}
            className={cn("px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
              dateFrom === d.value ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "border-border/60 text-muted-foreground hover:text-foreground")}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Body */}
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
      ) : (
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Results list — shrinks to 35% when a detail panel is open */}
          <div className={cn(
            "flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden transition-all duration-200",
            selected ? "w-[35%] flex-shrink-0" : "w-full"
          )}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 flex-shrink-0">
              <span className="text-[11px] text-muted-foreground">
                {total} result{total !== 1 ? "s" : ""}{submitted ? ` for "${submitted}"` : ""}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button disabled={page === 0} onClick={() => setPage(page - 1)}
                    className="px-2 py-0.5 rounded border border-border/50 text-[10px] text-muted-foreground disabled:opacity-40 hover:bg-muted/20">‹</button>
                  <span className="text-[10px] text-muted-foreground">{page + 1}/{totalPages}</span>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
                    className="px-2 py-0.5 rounded border border-border/50 text-[10px] text-muted-foreground disabled:opacity-40 hover:bg-muted/20">›</button>
                </div>
              )}
            </div>

            {/* Grouped results */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 min-h-0">
              {Object.entries(bySource).map(([src, srcItems]) => {
                const meta = SOURCE_META[src] || SOURCE_META.terminal;
                const Icon = meta.icon;
                return (
                  <div key={src}>
                    <div className="flex items-center gap-1.5 px-1 mb-1.5">
                      <div className={cn("flex h-4 w-4 items-center justify-center rounded", meta.bg)}>
                        <Icon className={cn("h-2.5 w-2.5", meta.color)} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                      <span className="text-[10px] text-muted-foreground/60">({srcItems.length})</span>
                    </div>
                    <div className="space-y-1">
                      {srcItems.map((item, i) => (
                        <ResultCard
                          key={item.id ?? i}
                          item={item}
                          query={submitted}
                          meta={meta}
                          isSelected={selected?.id != null && selected.id === item.id && selected.source === item.source}
                          onSelect={() => setSelected(item)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <DetailPanel
              item={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
