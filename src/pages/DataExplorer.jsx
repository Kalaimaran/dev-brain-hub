import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, X, Info, Filter, Database } from "lucide-react";
import { toast } from "sonner";

export default function DataExplorerPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState("");
  const [metaKey, setMetaKey] = useState("");
  const [metaVal, setMetaVal] = useState("");
  const [metadata, setMetadata] = useState({});
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

  const addMeta = () => {
    if (metaKey.trim()) {
      setMetadata({ ...metadata, [metaKey.trim()]: metaVal });
      setMetaKey("");
      setMetaVal("");
    }
  };

  const removeMeta = (k) => {
    const m = { ...metadata };
    delete m[k];
    setMetadata(m);
  };

  const items = data?.items || data || [];

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Explorer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your embedded data records</p>
        </div>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          size="sm"
          variant={showAdd ? "outline" : "default"}
          className="gap-2"
        >
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAdd ? "Cancel" : "Add Data"}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in">
          <p className="text-sm font-medium text-foreground">Embed New Document</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Text Content</Label>
            <Textarea
              placeholder="Enter text to embed..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Metadata (optional)</Label>
            <div className="flex gap-2">
              <Input placeholder="Key" value={metaKey} onChange={(e) => setMetaKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMeta()} className="flex-1" />
              <Input placeholder="Value" value={metaVal} onChange={(e) => setMetaVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMeta()} className="flex-1" />
              <Button variant="outline" size="sm" onClick={addMeta}>Add</Button>
            </div>
            {Object.entries(metadata).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(metadata).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-mono">
                    {k}: {v}
                    <button onClick={() => removeMeta(k)} className="ml-1 text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => embedMutation.mutate()} disabled={!text.trim() || embedMutation.isPending} className="gap-2">
              <Database className="h-4 w-4" />
              {embedMutation.isPending ? "Embedding…" : "Embed Data"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Filter by namespace…"
              value={nsFilter}
              onChange={(e) => setNsFilter(e.target.value)}
              className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 p-0"
            />
          </div>
          <span className="text-xs text-muted-foreground">{items.length} records</span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-10 px-4 py-2.5"></th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Content</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Tags</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Database className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No data found.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add your first record using the button above.</p>
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr key={item.id || i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="h-3.5 w-3.5 rounded border-border accent-primary" />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm text-foreground truncate">{item.text || item.content || "—"}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-mono text-muted-foreground">ID: {(item.id || "").slice(0, 10)}…</span>
                      <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">Done</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.type || "Text"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.metadata?.tag || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-muted-foreground hover:text-foreground transition-colors"><Info className="h-4 w-4" /></button>
                      <button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
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
