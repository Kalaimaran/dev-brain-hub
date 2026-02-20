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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Semantic Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Search your embedded data using natural language</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <Label>Search Query</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter your semantic search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && query.trim() && searchMutation.mutate()}
              className="bg-secondary border-border pl-10 font-mono"
            />
          </div>
        </div>
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <Label>Top K Results</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-secondary border-border w-24"
            />
          </div>
          <Button onClick={() => searchMutation.mutate()} disabled={!query.trim() || searchMutation.isPending} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {searchMutation.isPending ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{results.length} results found</h2>
          {results.map((result: any, i: number) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Similarity</span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary">
                    {((result.score || result.similarity || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{result.text || result.content}</p>
              {result.metadata && Object.keys(result.metadata).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.metadata).map(([k, v]) => (
                    <span key={k} className="rounded bg-secondary px-2 py-1 text-xs font-mono text-muted-foreground">
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
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No results found. Try a different query or add more data.
        </div>
      )}
    </div>
  );
}
