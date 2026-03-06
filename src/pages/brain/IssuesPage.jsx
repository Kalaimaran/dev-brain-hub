import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bug, Plus, Search, X, Check, Edit3, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { issuesApi } from "@/lib/api";
import TagInput from "@/components/brain/TagInput";
import { cn } from "@/lib/utils";

const EMPTY_ISSUE = { title: "", problem: "", solution: "", tags: [], status: "open" };
const STATUS_COLORS = {
  open:     "bg-orange-500/15 text-orange-300 border-orange-500/25",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
};

function IssueForm({ initial = EMPTY_ISSUE, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4 p-5">
      <input type="text" value={form.title} placeholder="Issue title…"
        onChange={(e) => set("title", e.target.value)}
        className="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-violet-500/50" />

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Problem</label>
        <textarea value={form.problem} placeholder="Describe the issue…"
          onChange={(e) => set("problem", e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground font-mono resize-none focus:border-violet-500/50" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Solution</label>
        <textarea value={form.solution} placeholder="How was it resolved?…"
          onChange={(e) => set("solution", e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground font-mono resize-none focus:border-violet-500/50" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</label>
        <TagInput tags={form.tags} onChange={(tags) => set("tags", tags)} />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
        {["open","resolved"].map((s) => (
          <button key={s} type="button" onClick={() => set("status", s)}
            className={cn("px-3 py-1 rounded-lg border text-xs font-medium capitalize transition-colors",
              form.status === s ? STATUS_COLORS[s] : "border-border/60 text-muted-foreground hover:text-foreground")}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.title}
          className="px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save Issue"}
        </button>
      </div>
    </div>
  );
}

function IssueCard({ issue, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("rounded-xl border overflow-hidden", issue.status === "resolved" ? "border-border/40" : "border-border/60", "bg-card")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold capitalize flex-shrink-0", STATUS_COLORS[issue.status])}>
          {issue.status}
        </span>
        <p className={cn("flex-1 text-sm font-medium", issue.status === "resolved" ? "text-muted-foreground line-through" : "text-foreground")}>
          {issue.title}
        </p>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {(issue.tags || []).map((t) => (
            <span key={t} className="text-[9px] bg-violet-500/15 text-violet-400 rounded px-1.5 py-0.5">{t}</span>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
          {issue.created_at ? format(new Date(issue.created_at), "MMM d") : ""}
        </span>
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => onToggle(issue)} title={issue.status === "open" ? "Mark resolved" : "Reopen"}
            className={cn("p-1 rounded hover:bg-muted/40 transition-colors", issue.status === "open" ? "text-muted-foreground hover:text-emerald-400" : "text-emerald-400 hover:text-muted-foreground")}>
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onEdit(issue)} className="p-1 rounded hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(issue.id)} className="p-1 rounded hover:bg-muted/40 transition-colors text-muted-foreground hover:text-red-400">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 px-4 pb-4 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {issue.problem && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Problem</p>
              <div className="prose prose-invert prose-sm max-w-none rounded-lg bg-background/50 border border-border/40 p-3">
                <ReactMarkdown>{issue.problem}</ReactMarkdown>
              </div>
            </div>
          )}
          {issue.solution && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Solution</p>
              <div className="prose prose-invert prose-sm max-w-none rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                <ReactMarkdown>{issue.solution}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IssuesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatus] = useState("");
  const [tagFilter,    setTag]    = useState("");
  const [search,       setSearch] = useState("");
  const [formMode,     setFormMode] = useState(null); // null | 'create' | issue object
  const [slideover,    setSlide]  = useState(false);

  const { data } = useQuery({
    queryKey: ["issues", { status: statusFilter, tag: tagFilter, q: search }],
    queryFn:  () => issuesApi.list({ status: statusFilter || undefined, tag: tagFilter || undefined, q: search || undefined, limit: 100 })
                    .then((r) => r.data?.data ?? r.data),
  });

  const issues = data?.items || data || [];
  const total    = issues.length;
  const open     = issues.filter((i) => i.status === "open").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;
  const allTags  = [...new Set(issues.flatMap((i) => i.tags || []))];

  const createMutation = useMutation({
    mutationFn: (body) => issuesApi.create(body),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["issues"] }); setSlide(false); setFormMode(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => issuesApi.update(id, body),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["issues"] }); setSlide(false); setFormMode(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => issuesApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });

  const handleSave = (form) => {
    if (formMode === "create") createMutation.mutate(form);
    else updateMutation.mutate({ id: formMode.id, body: form });
  };

  const handleToggle = (issue) => {
    updateMutation.mutate({ id: issue.id, body: { status: issue.status === "open" ? "resolved" : "open" } });
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bug className="h-5 w-5 text-orange-400" />
            Issues & Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track problems and their solutions</p>
        </div>
        <button onClick={() => { setFormMode("create"); setSlide(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 px-3 py-1.5 text-sm font-medium hover:bg-violet-500/30 transition-colors">
          <Plus className="h-4 w-4" />
          New Issue
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: total,    color: "text-foreground" },
          { label: "Open",     value: open,     color: "text-orange-400" },
          { label: "Resolved", value: resolved, color: "text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold mt-1 tabular-nums", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Search issues…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm bg-transparent text-foreground outline-none placeholder:text-muted-foreground w-48" />
        </div>
        {["", "open", "resolved"].map((s) => (
          <button key={s || "all"} onClick={() => setStatus(s)}
            className={cn("px-2.5 py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors",
              statusFilter === s
                ? s === "open" ? STATUS_COLORS.open : s === "resolved" ? STATUS_COLORS.resolved : "bg-muted border-border text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground")}>
            {s || "All"}
          </button>
        ))}
        {allTags.map((t) => (
          <button key={t} onClick={() => setTag(t === tagFilter ? "" : t)}
            className={cn("px-2 py-1 rounded border text-[10px] font-medium transition-colors",
              tagFilter === t ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "border-border/60 text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {/* Issue list */}
      <div className="space-y-2">
        {issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border/60 bg-card text-muted-foreground">
            <Bug className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No issues found</p>
          </div>
        ) : issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue}
            onEdit={(i) => { setFormMode(i); setSlide(true); }}
            onDelete={(id) => { if (confirm("Delete this issue?")) deleteMutation.mutate(id); }}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Slide-over form */}
      {slideover && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => { setSlide(false); setFormMode(null); }} />
          <div className="w-full max-w-xl bg-background border-l border-border/60 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <p className="font-semibold text-foreground">{formMode === "create" ? "New Issue" : "Edit Issue"}</p>
              <button onClick={() => { setSlide(false); setFormMode(null); }} className="p-1 rounded hover:bg-muted/40 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <IssueForm
              initial={formMode === "create" ? EMPTY_ISSUE : formMode}
              onSave={handleSave}
              onCancel={() => { setSlide(false); setFormMode(null); }}
              saving={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
