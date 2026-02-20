import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { dataApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Sparkles } from "lucide-react";

export default function SemanticSearchPage() {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);

  const searchMutation = useMutation({
    mutationFn: () => dataApi.search(query, topK),
  });

  const results = searchMutation.data?.data?.results || searchMutation.data?.data || [];

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

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">{results.length} results</p>
          {results.map((result, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 space-y-3 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground">#{i + 1}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Similarity</span>
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                    {((result.score || result.similarity || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{result.text || result.content}</p>
              {result.metadata && Object.keys(result.metadata).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(result.metadata).map(([k, v]) => (
                    <span key={k} className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {searchMutation.isSuccess && results.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No results found.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try a different query or add more data.</p>
        </div>
      )}
    </div>
  );
}
