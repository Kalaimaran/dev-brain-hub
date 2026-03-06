import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { FileText, ExternalLink, X, NotebookPen, Search, Globe } from "lucide-react";
import { brainApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function TranscriptsPage() {
  const [query,    setQuery]    = useState("");
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [domain,   setDomain]   = useState("");
  const [page,     setPage]     = useState(0);
  const [selected, setSelected] = useState(null);

  const params = { dateFrom: dateFrom || undefined, domain: domain || undefined, q: query || undefined, page, limit: PAGE_SIZE };

  const { data, isLoading } = useQuery({
    queryKey: ["brain-transcripts", params],
    queryFn:  () => brainApi.transcripts(params).then((r) => r.data?.data ?? r.data),
    keepPreviousData: true,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-400" />
          Page Transcripts
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pages you saved for reference</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-48 rounded-lg border border-border/60 bg-card px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Search title or content…" value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            className="flex-1 text-sm bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
        </div>
        <input type="date" value={dateFrom} max={format(new Date(), "yyyy-MM-dd")}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm text-foreground outline-none" />
        <input type="text" placeholder="Filter by domain…" value={domain}
          onChange={(e) => { setDomain(e.target.value); setPage(0); }}
          className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground w-44" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Card grid */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-xl border border-border/60 bg-card">
              <FileText className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No transcripts found</p>
            </div>
          ) : (
            items.map((t, i) => (
              <button
                key={t.id ?? i}
                onClick={() => setSelected(t)}
                className={cn("w-full rounded-xl border text-left p-4 hover:bg-muted/20 transition-colors space-y-2",
                  selected?.id === t.id ? "border-amber-500/30 bg-amber-500/5" : "border-border/60 bg-card")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Globe className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-blue-400 truncate">{t.domain || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {t.word_count && (
                      <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        {t.word_count} words
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {t.created_at ? format(new Date(t.created_at), "MMM d") : ""}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-1">{t.page_title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.page_text_preview || "—"}</p>
              </button>
            ))
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-border/60 text-xs disabled:opacity-40 hover:bg-muted/20">Prev</button>
              <span className="text-xs text-muted-foreground self-center">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-border/60 text-xs disabled:opacity-40 hover:bg-muted/20">Next</button>
            </div>
          )}
        </div>

        {/* Full text panel */}
        <div className="lg:col-span-3 rounded-xl border border-border/60 bg-card overflow-hidden sticky top-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Select a transcript to read</p>
            </div>
          ) : (
            <div className="flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{selected.page_title || "Untitled"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Globe className="h-3 w-3 text-blue-400" />
                    <span className="text-xs text-blue-400">{selected.domain}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{selected.created_at ? format(new Date(selected.created_at), "MMM d, yyyy HH:mm") : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {selected.url && (
                    <a href={selected.url} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-muted/40 transition-colors">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </a>
                  )}
                  <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-muted/40 transition-colors">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {selected.page_text_preview || selected.page_text || "No content available"}
                </p>
              </div>

              <div className="border-t border-border/40 px-5 py-3">
                <button className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                  <NotebookPen className="h-3.5 w-3.5" />
                  Create note from this transcript
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
