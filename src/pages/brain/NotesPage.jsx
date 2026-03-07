import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { NotebookPen, Plus, Trash2, Eye, Edit3, Search, Save, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { notesApi } from "@/lib/api";
import TagInput from "@/components/brain/TagInput";
import { cn } from "@/lib/utils";

const EMPTY_NOTE = { id: null, title: "", content: "", tags: [] };

export default function NotesPage() {
  const qc = useQueryClient();
  const [search,      setSearch]   = useState("");
  const [tagFilter,   setTagFilter] = useState("");
  const [sortAsc,     setSortAsc]  = useState(false);
  const [current,     setCurrent]  = useState(EMPTY_NOTE);
  const [preview,     setPreview]  = useState(false);
  const [saveStatus,  setSave]     = useState("idle"); // idle | saving | saved
  const debounceTimer = useRef(null);

  const { data } = useQuery({
    queryKey: ["notes", { q: search, tag: tagFilter }],
    queryFn:  () => notesApi.list({ q: search || undefined, tag: tagFilter || undefined, limit: 100 })
                    .then((r) => r.data?.data ?? r.data),
  });

  const notes = (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []).sort((a, b) =>
    sortAsc
      ? (a.title || "").localeCompare(b.title || "")
      : new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  );

  // Collect all tags
  const allTags = [...new Set(notes.flatMap((n) => n.tags || []))];

  const createMutation = useMutation({
    mutationFn: (body) => notesApi.create(body).then((r) => r.data?.data ?? r.data),
    onSuccess:  (note) => { qc.invalidateQueries({ queryKey: ["notes"] }); setCurrent(note); setSave("saved"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => notesApi.update(id, body).then((r) => r.data?.data ?? r.data),
    onSuccess:  (note) => { qc.invalidateQueries({ queryKey: ["notes"] }); setCurrent(note); setSave("saved"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => notesApi.remove(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["notes"] }); setCurrent(EMPTY_NOTE); },
  });

  const autoSave = useCallback((note) => {
    clearTimeout(debounceTimer.current);
    setSave("saving");
    debounceTimer.current = setTimeout(() => {
      if (!note.title && !note.content) { setSave("idle"); return; }
      if (note.id) {
        updateMutation.mutate({ id: note.id, body: { title: note.title, content: note.content, tags: note.tags } });
      } else {
        createMutation.mutate({ title: note.title, content: note.content, tags: note.tags });
      }
    }, 1000);
  }, []);

  const handleChange = (field, val) => {
    const updated = { ...current, [field]: val };
    setCurrent(updated);
    autoSave(updated);
  };

  const newNote = () => {
    clearTimeout(debounceTimer.current);
    setCurrent(EMPTY_NOTE);
    setPreview(false);
    setSave("idle");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex h-[calc(100vh-5rem)] gap-4">
        {/* Left panel */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-violet-400" />
              Notes
            </h1>
            <button onClick={newNote}
              className="flex items-center gap-1 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 px-2.5 py-1.5 text-xs font-medium hover:bg-violet-500/30 transition-colors">
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input type="text" placeholder="Search notes…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-xs bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
          </div>

          {/* Tag filter chips */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setTagFilter("")}
                className={cn("text-[10px] rounded px-1.5 py-0.5 border transition-colors",
                  tagFilter === "" ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "border-border/60 text-muted-foreground hover:text-foreground")}>
                All
              </button>
              {allTags.map((t) => (
                <button key={t} onClick={() => setTagFilter(t === tagFilter ? "" : t)}
                  className={cn("text-[10px] rounded px-1.5 py-0.5 border transition-colors",
                    tagFilter === t ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "border-border/60 text-muted-foreground hover:text-foreground")}>
                  {t}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setSortAsc(!sortAsc)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors text-left">
            Sort: {sortAsc ? "A→Z" : "Recent first"} (click to toggle)
          </button>

          {/* Note list */}
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No notes yet</p>
            ) : notes.map((n) => (
              <button key={n.id}
                onClick={() => { setCurrent(n); setPreview(false); setSave("idle"); }}
                className={cn("w-full rounded-lg border text-left px-3 py-2.5 transition-colors",
                  current.id === n.id ? "border-violet-500/30 bg-violet-500/10" : "border-border/60 bg-card hover:bg-muted/20")}>
                <p className="text-sm font-medium text-foreground truncate">{n.title || "Untitled"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.content?.substring(0, 60) || "—"}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  {(n.tags || []).slice(0, 3).map((t) => (
                    <span key={t} className="text-[9px] bg-violet-500/15 text-violet-400 rounded px-1 py-0.5">{t}</span>
                  ))}
                  <span className="ml-auto text-[9px] text-muted-foreground tabular-nums">
                    {n.updated_at ? format(new Date(n.updated_at), "MMM d") : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right editor */}
        <div className="flex-1 rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <button onClick={() => setPreview(false)}
                className={cn("flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                  !preview ? "bg-violet-500/20 text-violet-300" : "text-muted-foreground hover:text-foreground")}>
                <Edit3 className="h-3 w-3" />Edit
              </button>
              <button onClick={() => setPreview(true)}
                className={cn("flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                  preview ? "bg-violet-500/20 text-violet-300" : "text-muted-foreground hover:text-foreground")}>
                <Eye className="h-3 w-3" />Preview
              </button>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
              {saveStatus === "saved"  && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="h-3 w-3" />Saved
                </span>
              )}
              {current.id && (
                <button onClick={() => { if (confirm("Delete this note?")) deleteMutation.mutate(current.id); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3 w-3" />Delete
                </button>
              )}
            </div>
          </div>

          {preview ? (
            /* Preview mode */
            <div className="flex-1 overflow-y-auto px-6 py-5 prose prose-invert prose-sm max-w-none">
              <h1>{current.title || "Untitled"}</h1>
              <ReactMarkdown>{current.content || "*No content*"}</ReactMarkdown>
            </div>
          ) : (
            /* Edit mode */
            <div className="flex-1 flex flex-col overflow-hidden">
              <input
                type="text"
                value={current.title}
                placeholder="Note title…"
                onChange={(e) => handleChange("title", e.target.value)}
                className="px-6 pt-5 pb-2 text-xl font-bold bg-transparent text-foreground outline-none placeholder:text-muted-foreground/40 border-b border-border/30"
              />
              <div className="px-6 py-3 border-b border-border/30">
                <TagInput tags={current.tags} onChange={(tags) => handleChange("tags", tags)} placeholder="Add tags…" />
              </div>
              <textarea
                value={current.content}
                placeholder="Write your note in Markdown…"
                onChange={(e) => handleChange("content", e.target.value)}
                className="flex-1 px-6 py-4 bg-transparent text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/40 font-mono leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
