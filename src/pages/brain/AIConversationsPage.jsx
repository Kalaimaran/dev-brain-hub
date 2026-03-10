import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Bot, Calendar, ExternalLink, NotebookPen, X } from "lucide-react";
import { brainApi } from "@/lib/api";
import ConversationBubble from "@/components/brain/ConversationBubble";
import { cn } from "@/lib/utils";

const AI_SERVICES = ["ChatGPT","Claude","Gemini","Ollama","Aider","Other"];
const PAGE_SIZE = 20;

function getConvTitle(promptText) {
  if (!promptText) return "—";
  try {
    const parsed = JSON.parse(promptText);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.request) {
      return parsed[0].request;
    }
  } catch {}
  return promptText;
}

function serviceColor(service) {
  const s = (service || "").toLowerCase();
  if (s.includes("claude"))  return "bg-orange-500/15 text-orange-300 border-orange-500/25";
  if (s.includes("chatgpt") || s.includes("openai")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (s.includes("gemini"))  return "bg-blue-500/15 text-blue-300 border-blue-500/25";
  if (s.includes("ollama"))  return "bg-purple-500/15 text-purple-300 border-purple-500/25";
  if (s.includes("aider"))   return "bg-pink-500/15 text-pink-300 border-pink-500/25";
  return "bg-violet-500/15 text-violet-300 border-violet-500/25";
}

export default function AIConversationsPage() {
  const [dateFrom, setDateFrom]   = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [service, setService]     = useState("");
  const [page, setPage]           = useState(0);
  const [selected, setSelected]   = useState(null);

  const params = { dateFrom: dateFrom || undefined, service: service || undefined, page, limit: PAGE_SIZE };

  const { data, isLoading } = useQuery({
    queryKey: ["brain-conversations", params],
    queryFn:  () => brainApi.conversations(params).then((r) => r.data?.data ?? r.data),
    keepPreviousData: true,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-400" />
          AI Conversations
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Browser AI sessions and CLI AI prompts</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input type="date" value={dateFrom} max={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="text-sm bg-transparent text-foreground outline-none" />
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setService(""); setPage(0); }}
            className={cn("px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
              service === "" ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "border-border/60 text-muted-foreground hover:text-foreground")}>
            All
          </button>
          {AI_SERVICES.map((s) => (
            <button key={s} onClick={() => { setService(s.toLowerCase()); setPage(0); }}
              className={cn("px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                service === s.toLowerCase() ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "border-border/60 text-muted-foreground hover:text-foreground")}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left list */}
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card overflow-hidden">
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 border-b border-border/40 bg-muted/10 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bot className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            items.map((conv, i) => (
              <button
                key={conv.id ?? i}
                onClick={() => setSelected(conv)}
                className={cn("w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors",
                  selected?.id === conv.id && "bg-violet-500/10 border-l-2 border-l-violet-500")}
              >
                <Bot className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold", serviceColor(conv.ai_service))}>
                      {conv.ai_service || "AI"}
                    </span>
                    {conv.response_text && (
                      <span className="text-[9px] bg-violet-500/15 text-violet-300 border border-violet-500/25 rounded px-1.5 py-0.5 font-medium">
                        AI Summary
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
                      {conv.created_at ? format(new Date(conv.created_at), "MMM d, HH:mm") : ""}
                    </span>
                  </div>
                  <p className="text-xs text-foreground line-clamp-2">
                    {conv.page_title || getConvTitle(conv.prompt_text)?.substring(0, 140) || "—"}
                  </p>
                </div>
              </button>
            ))
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 px-4 py-3 border-t border-border/40">
              <button disabled={page === 0} onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-border/60 text-xs disabled:opacity-40 hover:bg-muted/20 transition-colors">
                Prev
              </button>
              <span className="text-xs text-muted-foreground self-center">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-border/60 text-xs disabled:opacity-40 hover:bg-muted/20 transition-colors">
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right detail */}
        <div className="lg:col-span-3 rounded-xl border border-border/60 bg-card overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
              <Bot className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Select a conversation to view</p>
            </div>
          ) : (
            <div className="flex flex-col h-[70vh]">
              {/* Detail header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold flex-shrink-0", serviceColor(selected.ai_service))}>
                    {selected.ai_service || "AI"}
                  </span>
                  {selected.page_title && (
                    <span className="text-xs text-foreground font-medium truncate" title={selected.page_title}>
                      {selected.page_title}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">
                    {selected.created_at ? format(new Date(selected.created_at), "MMM d, yyyy HH:mm") : ""}
                  </span>
                  {selected.url && (
                    <a href={selected.url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </a>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-muted/40 transition-colors ml-2 flex-shrink-0">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              {/* Chat */}
              <div className="flex-[2] overflow-y-auto p-5 min-h-0">
                <ConversationBubble promptText={selected.prompt_text} responseText={null} />
              </div>
              {/* Summary */}
              <div className="border-t border-border/40 px-5 py-3 flex-[1] flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">TL;DR</p>
                  <button className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    <NotebookPen className="h-3.5 w-3.5" />
                    Add note about this conversation
                  </button>
                </div>
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-3 flex-1 overflow-y-auto min-h-0">
                  <p className="text-xs text-foreground leading-relaxed">
                    {selected.response_text || "No summary available"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
