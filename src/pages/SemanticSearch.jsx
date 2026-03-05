import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { dataApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Sparkles } from "lucide-react";

export default function SemanticSearchPage() {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [matchThreshold, setMatchThreshold] = useState(70);

  const searchMutation = useMutation({
    mutationFn: () => dataApi.search(query, topK),
  });

  // Backend returns ApiResponse<List<SearchResultDto>>
  // Shape: { success, data: [ { id, input, intent, userId, similarity, formattedContent } ] }
  const rawResults = searchMutation.data?.data?.data || [];

  // Filter results client-side by match threshold
  const results = useMemo(() => {
    if (matchThreshold <= 0) return rawResults;
    return rawResults.filter(
      (r) => (r.similarity || 0) * 100 >= matchThreshold
    );
  }, [rawResults, matchThreshold]);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Semantic Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Search your embedded data using natural language</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Search Query</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Ask anything about your data…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && query.trim() && searchMutation.mutate()}
              className="pl-10 font-mono"
            />
          </div>
        </div>
        <div className="flex items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Top K Results</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-24"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Match %</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                value={matchThreshold}
                onChange={(e) => setMatchThreshold(Number(e.target.value))}
                className="w-24 pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
            </div>
          </div>
          <Button
            onClick={() => searchMutation.mutate()}
            disabled={!query.trim() || searchMutation.isPending}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {searchMutation.isPending ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>

      {rawResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-medium">{results.length} results</p>
            {results.length < rawResults.length && (
              <span className="text-[11px] text-muted-foreground/60">
                ({rawResults.length - results.length} filtered below {matchThreshold}% match)
              </span>
            )}
          </div>
          {results.map((result, i) => (
            <div
              key={result.id || i}
              className="rounded-xl border border-border bg-card p-5 space-y-3 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground">#{i + 1}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Match</span>
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                    {((result.similarity || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Input (question) */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Input</p>
                <p className="text-sm text-foreground leading-relaxed">{result.input || "—"}</p>
              </div>

              {/* Intent (answer) */}
              {result.intent && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Intent</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.intent}</p>
                </div>
              )}

              {/* Formatted content */}
              {result.formattedContent && (
                <details className="group">
                  <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    View formatted content
                  </summary>
                  <pre className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono text-foreground whitespace-pre-wrap overflow-auto max-h-40">
                    {result.formattedContent}
                  </pre>
                </details>
              )}

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="font-mono">ID: {result.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchMutation.isSuccess && results.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {rawResults.length > 0
              ? `No results above ${matchThreshold}% match threshold.`
              : "No results found."
            }
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {rawResults.length > 0
              ? "Try lowering the match threshold."
              : "Try a different query or add more data."
            }
          </p>
        </div>
      )}
    </div>
  );
}
