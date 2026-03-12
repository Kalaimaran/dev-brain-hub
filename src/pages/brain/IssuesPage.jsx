import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Bug, Plus, Search, X, Check, Edit3, Trash2,
  CalendarDays, Clock3, Tags, CircleDot,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { issuesApi } from "@/lib/api";
import TagInput from "@/components/brain/TagInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const EMPTY_ISSUE = { title: "", problem: "", solution: "", tags: [], status: "open" };
const STATUS_COLORS = {
  open:     "bg-orange-500/15 text-orange-300 border-orange-500/25",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
};
const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean);
  }
  if (typeof tags === "string") {
    const value = tags.trim();
    if (!value) return [];
    if (value.startsWith("[") && value.endsWith("]")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean);
        }
      } catch {
        // Fall back to CSV parsing below.
      }
    }
    return value.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
};
const hasMarkdownSyntax = (text = "") => /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```)/m.test(text);
const toRenderableMarkdown = (content = "") => {
  const input = (content || "").replace(/\r/g, "").trim();
  if (!input) return "";
  if (hasMarkdownSyntax(input)) return input;

  const lines = input.split("\n").map((line) => line.trimRight());
  const out = [];
  let listMode = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    const next = (lines[i + 1] || "").trim();

    if (!line) { listMode = false; out.push(""); continue; }

    const bulletLike = /^\s*[•●▪◦○-]\s+/.test(raw);
    if (bulletLike) {
      out.push(`- ${line.replace(/^[•●▪◦○-]\s+/, "").trim()}`);
      listMode = true;
      continue;
    }

    const shortTitle = line.length <= 40 && /^[A-Z][A-Za-z0-9\s&/-]+$/.test(line) && !/[.:]$/.test(line);
    if (shortTitle && next) { listMode = false; out.push(`## ${line}`); out.push(""); continue; }
    if (line.endsWith(":")) { listMode = false; out.push(line); out.push(""); continue; }

    const listItemLike = !listMode && out.length > 0 && out[out.length - 1] === "" &&
      out.length > 1 && /[:)]$/.test((out[out.length - 2] || "").trim()) && line.length <= 40;
    if (listItemLike) { out.push(`- ${line}`); listMode = true; continue; }

    out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};
const htmlToMarkdown = (html) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent || "").replace(/\u00a0/g, " ");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node;
    const tag = el.tagName.toLowerCase();
    const children = () => Array.from(el.childNodes).map(walk).join("");
    if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${children().trim()}\n\n`;
    if (tag === "p") return `${children().trim()}\n\n`;
    if (tag === "br") return "\n";
    if (tag === "strong" || tag === "b") return `**${children().trim()}**`;
    if (tag === "em" || tag === "i") return `*${children().trim()}*`;
    if (tag === "code") return `\`${children().trim()}\``;
    if (tag === "pre") return `\`\`\`\n${(el.textContent || "").trim()}\n\`\`\`\n\n`;
    if (tag === "a") { const h = el.getAttribute("href") || ""; const t = children().trim() || h; return h ? `[${t}](${h})` : t; }
    if (tag === "ul") return `${Array.from(el.children).filter(c => c.tagName.toLowerCase() === "li").map(li => `- ${walk(li).trim()}`).join("\n")}\n\n`;
    if (tag === "ol") return `${Array.from(el.children).filter(c => c.tagName.toLowerCase() === "li").map((li, i) => `${i + 1}. ${walk(li).trim()}`).join("\n")}\n\n`;
    if (tag === "li") return children().replace(/\n{2,}/g, "\n").trim();
    if (tag === "blockquote") return `${children().trim().split("\n").map(l => `> ${l}`).join("\n")}\n\n`;
    if (tag === "div" || tag === "section" || tag === "article") return `${children()}\n`;
    return children();
  };
  return walk(doc.body).replace(/\r/g, "").split("\n").map(l => l.replace(/\s+$/g, ""))
    .map(l => l.replace(/^\s*[•●▪]\s+/u, "- ")).map(l => l.replace(/^\s*[◦○]\s+/u, "  - "))
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

/* ── Slim list row ─────────────────────────────────────────── */
function IssueRow({ issue, isSelected, onClick }) {
  const tags = normalizeTags(issue?.tags);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors",
        isSelected && "bg-orange-500/5 border-l-2 border-l-orange-400"
      )}
    >
      <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold capitalize flex-shrink-0", STATUS_COLORS[issue.status])}>
        {issue.status}
      </span>
      <p className={cn("flex-1 text-xs font-medium truncate min-w-0", issue.status === "resolved" ? "text-muted-foreground line-through" : "text-foreground")}>
        {issue.title}
      </p>
      <div className="flex items-center gap-1 flex-shrink-0">
        {tags.slice(0, 2).map((t) => (
          <span key={t} className="text-[9px] bg-violet-500/15 text-violet-400 rounded px-1 py-0.5">{t}</span>
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
        {issue.created_at ? format(new Date(issue.created_at), "MMM d") : ""}
      </span>
    </button>
  );
}

/* ── Issue form (slide-over) ───────────────────────────────── */
function IssueForm({ initial = EMPTY_ISSUE, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...initial, tags: normalizeTags(initial?.tags) });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handlePaste = (field) => (e) => {
    const html = e.clipboardData?.getData("text/html");
    const plain = e.clipboardData?.getData("text/plain") || "";
    const markdown = html ? htmlToMarkdown(html) : toRenderableMarkdown(plain);
    if (!markdown) return;
    e.preventDefault();
    const textarea = e.currentTarget;
    const currentValue = form?.[field] || "";
    const start = textarea.selectionStart ?? currentValue.length;
    const end = textarea.selectionEnd ?? start;
    const nextValue = `${currentValue.slice(0, start)}${markdown}${currentValue.slice(end)}`;
    set(field, nextValue);
    requestAnimationFrame(() => { const p = start + markdown.length; textarea.selectionStart = p; textarea.selectionEnd = p; });
  };

  return (
    <div className="space-y-4 p-5">
      <input type="text" value={form.title} placeholder="Issue title…"
        onChange={(e) => set("title", e.target.value)}
        className="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-violet-500/50" />

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Problem</label>
        <textarea value={form.problem} placeholder="Describe the issue…"
          onChange={(e) => set("problem", e.target.value)} onPaste={handlePaste("problem")} rows={8}
          className="w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground font-mono resize-none focus:border-violet-500/50" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Solution</label>
        <textarea value={form.solution} placeholder="How was it resolved?…"
          onChange={(e) => set("solution", e.target.value)} onPaste={handlePaste("solution")} rows={8}
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

      <div className="sticky bottom-0 z-10 -mx-5 mt-4 flex justify-end gap-2 border-t border-border/40 bg-background/95 px-5 py-4 backdrop-blur">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.title}
          className="px-4 py-2 rounded-lg bg-violet-500/25 border border-violet-500/35 text-foreground text-sm font-semibold hover:bg-violet-500/35 transition-colors disabled:opacity-50 disabled:text-muted-foreground">
          {saving ? "Saving…" : "Save Issue"}
        </button>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function IssuesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatus]  = useState("");
  const [tagFilter,    setTag]     = useState("");
  const [search,       setSearch]  = useState("");
  const [selected,     setSelected] = useState(null);
  const [formMode,     setFormMode] = useState(null);
  const [slideover,    setSlide]   = useState(false);
  const [issueToDelete, setIssueToDelete] = useState(null);

  const { data } = useQuery({
    queryKey: ["issues", { status: statusFilter, tag: tagFilter, q: search }],
    queryFn:  () => issuesApi.list({ status: statusFilter || undefined, tag: tagFilter || undefined, q: search || undefined, limit: 100 })
                    .then((r) => r.data?.data ?? r.data),
  });

  const issues   = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  const total    = issues.length;
  const open     = issues.filter((i) => i.status === "open").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;
  const allTags  = [...new Set(issues.flatMap((i) => normalizeTags(i?.tags)))];

  const createMutation = useMutation({
    mutationFn: (body) => issuesApi.create(body),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["issues"] }); setSlide(false); setFormMode(null); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => issuesApi.update(id, body),
    onSuccess:  (updated) => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      setSlide(false); setFormMode(null);
      // refresh selected if it was the one edited
      if (selected?.id === updated?.id) setSelected(updated);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => issuesApi.remove(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["issues"] }); if (selected?.id === issueToDelete?.id) setSelected(null); },
  });

  const handleSave = (form) => {
    const safeForm = { ...form, tags: normalizeTags(form?.tags) };
    if (formMode === "create") createMutation.mutate(safeForm);
    else updateMutation.mutate({ id: formMode.id, body: safeForm });
  };
  const handleToggle = (issue) => {
    updateMutation.mutate({
      id: issue.id,
      body: { title: issue.title || "", problem: issue.problem || "", solution: issue.solution || "", tags: normalizeTags(issue.tags), status: issue.status === "open" ? "resolved" : "open" },
    });
  };

  const selectedTags = normalizeTags(selected?.tags);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
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
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
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
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
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

      {/* Split panel */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Left: issue list */}
        <div className={cn(
          "rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col transition-all duration-200",
          selected ? "w-[38%] flex-shrink-0" : "w-full"
        )}>
          {issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
              <Bug className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No issues found</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {issues.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  isSelected={selected?.id === issue.id}
                  onClick={() => setSelected(issue)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="flex-1 rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col">
            {/* Detail header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold capitalize flex-shrink-0", STATUS_COLORS[selected.status])}>
                  {selected.status}
                </span>
                <p className="text-sm font-semibold text-foreground truncate">{selected.title}</p>
              </div>
              <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                <button
                  onClick={() => handleToggle(selected)}
                  title={selected.status === "open" ? "Mark resolved" : "Reopen"}
                  className={cn("p-1.5 rounded hover:bg-muted/40 transition-colors", selected.status === "open" ? "text-muted-foreground hover:text-emerald-400" : "text-emerald-400 hover:text-muted-foreground")}>
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setFormMode(selected); setSlide(true); }}
                  className="p-1.5 rounded hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setIssueToDelete(selected)}
                  className="p-1.5 rounded hover:bg-muted/40 transition-colors text-muted-foreground hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setSelected(null)}
                  className="p-1.5 rounded hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Meta row */}
            <div className="px-5 py-2.5 border-b border-border/40 flex flex-wrap items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" />
                <span>Created {selected.created_at ? format(new Date(selected.created_at), "MMM d, yyyy") : "—"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock3 className="h-3 w-3" />
                <span>Updated {selected.updated_at ? format(new Date(selected.updated_at), "MMM d, yyyy") : "—"}</span>
              </div>
              {selectedTags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Tags className="h-3 w-3" />
                  {selectedTags.map((t) => (
                    <span key={t} className="inline-flex items-center rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable content: problem + solution */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CircleDot className="h-3.5 w-3.5 text-orange-400" />
                  <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Problem</h4>
                </div>
                <div className="prose prose-invert prose-sm max-w-none leading-relaxed rounded-xl border border-border/40 bg-background/60 px-5 py-4">
                  <ReactMarkdown>{toRenderableMarkdown(selected.problem) || "*No description provided.*"}</ReactMarkdown>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Resolution</h4>
                </div>
                <div className="prose prose-invert prose-sm max-w-none leading-relaxed rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] px-5 py-4">
                  <ReactMarkdown>{toRenderableMarkdown(selected.solution) || "*No resolution provided yet.*"}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
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

      <AlertDialog open={Boolean(issueToDelete)} onOpenChange={(open) => { if (!open) setIssueToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete issue?</AlertDialogTitle>
            <AlertDialogDescription>
              {issueToDelete?.title
                ? `This will permanently delete "${issueToDelete.title}".`
                : "This will permanently delete this issue."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (issueToDelete?.id) deleteMutation.mutate(issueToDelete.id);
                setIssueToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
