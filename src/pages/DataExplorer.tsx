import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function DataExplorerPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState("");
  const [metaKey, setMetaKey] = useState("");
  const [metaVal, setMetaVal] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [nsFilter, setNsFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["data-list", nsFilter],
    queryFn: () => dataApi.list({ namespace: nsFilter || undefined }).then((r) => r.data),
    retry: false,
  });

  const embedMutation = useMutation({
    mutationFn: () => dataApi.embed(text, Object.keys(metadata).length ? metadata : undefined),
    onSuccess: () => {
      toast.success("Data embedded successfully");
      setText("");
      setMetadata({});
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ["data-list"] });
    },
    onError: () => toast.error("Failed to embed data"),
  });

  const items = data?.items || data || [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Data Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your embedded data records</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="gap-2">
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAdd ? "Cancel" : "Add Data"}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Label>Text Content</Label>
            <Textarea
              placeholder="Enter text to embed..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-secondary border-border min-h-[100px] font-mono text-sm"
            />
          </div>
          <div>
            <Label className="mb-2 block">Metadata (optional)</Label>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Key" value={metaKey} onChange={(e) => setMetaKey(e.target.value)} className="bg-secondary border-border flex-1" />
              <Input placeholder="Value" value={metaVal} onChange={(e) => setMetaVal(e.target.value)} className="bg-secondary border-border flex-1" />
              <Button variant="outline" size="sm" onClick={() => {
                if (metaKey.trim()) {
                  setMetadata({ ...metadata, [metaKey.trim()]: metaVal });
                  setMetaKey("");
                  setMetaVal("");
                }
              }}>Add</Button>
            </div>
            {Object.entries(metadata).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1 mr-2 mb-1 rounded bg-secondary px-2 py-1 text-xs font-mono">
                {k}: {v}
                <button onClick={() => { const m = { ...metadata }; delete m[k]; setMetadata(m); }} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <Button onClick={() => embedMutation.mutate()} disabled={!text.trim() || embedMutation.isPending}>
            {embedMutation.isPending ? "Embedding..." : "Embed Data"}
          </Button>
        </div>
      )}

      {/* Filter */}
      <div>
        <Input
          placeholder="Filter by namespace..."
          value={nsFilter}
          onChange={(e) => setNsFilter(e.target.value)}
          className="bg-secondary border-border max-w-xs"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Content</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Metadata</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No data found. Add your first record.</td></tr>
            ) : (
              items.map((item: any, i: number) => (
                <tr key={item.id || i} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{(item.id || "").slice(0, 8)}...</td>
                  <td className="px-4 py-3 max-w-xs truncate text-foreground">{item.text || item.content}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {item.metadata ? JSON.stringify(item.metadata).slice(0, 40) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
