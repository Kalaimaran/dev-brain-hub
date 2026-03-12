import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { NotebookPen, Plus, Trash2, Edit3, Search, Check, X } from "lucide-react";
import { notesApi } from "@/lib/api";
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

const EMPTY_NOTE = { id: null, title: "", content: "", tags: [] };
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
const normalizeNote = (note = EMPTY_NOTE) => ({
  ...note,
  content: typeof note?.content === "string"
    ? note.content
    : typeof note?.content_preview === "string"
      ? note.content_preview
      : "",
  tags: normalizeTags(note?.tags),
});
const htmlToMarkdown = (html) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || "").replace(/\u00a0/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node;
    const tag = el.tagName.toLowerCase();
    const children = () => Array.from(el.childNodes).map(walk).join("");

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      return `${"#".repeat(level)} ${children().trim()}\n\n`;
    }
    if (tag === "p") return `${children().trim()}\n\n`;
    if (tag === "br") return "\n";
    if (tag === "strong" || tag === "b") return `**${children().trim()}**`;
    if (tag === "em" || tag === "i") return `*${children().trim()}*`;
    if (tag === "code") return `\`${children().trim()}\``;
    if (tag === "pre") return `\`\`\`\n${(el.textContent || "").trim()}\n\`\`\`\n\n`;
    if (tag === "a") {
      const href = el.getAttribute("href") || "";
      const text = children().trim() || href;
      return href ? `[${text}](${href})` : text;
    }
    if (tag === "ul") {
      const items = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === "li")
        .map((li) => `- ${walk(li).trim()}`)
        .join("\n");
      return `${items}\n\n`;
    }
    if (tag === "ol") {
      const items = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === "li")
        .map((li, idx) => `${idx + 1}. ${walk(li).trim()}`)
        .join("\n");
      return `${items}\n\n`;
    }
    if (tag === "li") return children().replace(/\n{2,}/g, "\n").trim();
    if (tag === "blockquote") {
      const text = children().trim().split("\n").map((line) => `> ${line}`).join("\n");
      return `${text}\n\n`;
    }
    if (tag === "div" || tag === "section" || tag === "article") return `${children()}\n`;
    return children();
  };

  const normalized = walk(doc.body)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .map((line) => line.replace(/^\s*[•●▪]\s+/u, "- "))
    .map((line) => line.replace(/^\s*[◦○]\s+/u, "  - "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized;
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

    if (!line) {
      listMode = false;
      out.push("");
      continue;
    }

    const bulletLike = /^\s*[•●▪◦○-]\s+/.test(raw);
    if (bulletLike) {
      const normalized = line.replace(/^[•●▪◦○-]\s+/, "").trim();
      out.push(`- ${normalized}`);
      listMode = true;
      continue;
    }

    const shortTitle = line.length <= 40 && /^[A-Z][A-Za-z0-9\s&/-]+$/.test(line) && !/[.:]$/.test(line);
    if (shortTitle && next) {
      listMode = false;
      out.push(`## ${line}`);
      out.push("");
      continue;
    }

    if (line.endsWith(":")) {
      listMode = false;
      out.push(line);
      out.push("");
      continue;
    }

    const listItemLike =
      !listMode &&
      out.length > 0 &&
      out[out.length - 1] === "" &&
      out.length > 1 &&
      /[:)]$/.test((out[out.length - 2] || "").trim()) &&
      line.length <= 40;
    if (listItemLike) {
      out.push(`- ${line}`);
      listMode = true;
      continue;
    }

    out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

export default function NotesPage() {
  const qc = useQueryClient();
  const [search,      setSearch]   = useState("");
  const [tagFilter,   setTagFilter] = useState("");
  const [sortAsc,     setSortAsc]  = useState(false);
  const [current,     setCurrent]  = useState(EMPTY_NOTE);
  const [showEditor,  setShowEditor] = useState(false);
  const [saveStatus,  setSave]     = useState("idle"); // idle | saving | saved
  const [noteToDelete, setNoteToDelete] = useState(null);
  const debounceTimer = useRef(null);

  const { data } = useQuery({
    queryKey: ["notes", { q: search, tag: tagFilter }],
    queryFn:  () => notesApi.list({ q: search || undefined, tag: tagFilter || undefined, limit: 100 })
                    .then((r) => r.data?.data ?? r.data),
  });

  const notes = (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [])
    .map(normalizeNote)
    .sort((a, b) =>
    sortAsc
      ? (a.title || "").localeCompare(b.title || "")
      : new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  );

  // Collect all tags
  const allTags = [...new Set(notes.flatMap((n) => normalizeTags(n?.tags)))];

  const createMutation = useMutation({
    mutationFn: (body) => notesApi.create(body).then((r) => r.data?.data ?? r.data),
    onSuccess:  (note) => { qc.invalidateQueries({ queryKey: ["notes"] }); setCurrent(normalizeNote(note)); setSave("saved"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => notesApi.update(id, body).then((r) => r.data?.data ?? r.data),
    onSuccess:  (note) => { qc.invalidateQueries({ queryKey: ["notes"] }); setCurrent(normalizeNote(note)); setSave("saved"); },
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
      const safeTags = normalizeTags(note?.tags);
      if (note.id) {
        updateMutation.mutate({ id: note.id, body: { title: note.title, content: note.content, tags: safeTags } });
      } else {
        createMutation.mutate({ title: note.title, content: note.content, tags: safeTags });
      }
    }, 1000);
  }, []);

  const handleChange = (field, val) => {
    const updated = normalizeNote({ ...current, [field]: val });
    setCurrent(updated);
    autoSave(updated);
  };
  const handleContentPaste = (e) => {
    const html = e.clipboardData?.getData("text/html");
    const plain = e.clipboardData?.getData("text/plain") || "";
    const markdown = html ? htmlToMarkdown(html) : toRenderableMarkdown(plain);
    if (!markdown) return;

    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart ?? current.content.length;
    const end = textarea.selectionEnd ?? start;
    const nextContent = `${current.content.slice(0, start)}${markdown}${current.content.slice(end)}`;
    handleChange("content", nextContent);

    requestAnimationFrame(() => {
      const nextPos = start + markdown.length;
      textarea.selectionStart = nextPos;
      textarea.selectionEnd = nextPos;
    });
  };

  const newNote = () => {
    clearTimeout(debounceTimer.current);
    setCurrent(EMPTY_NOTE);
    setSave("idle");
    setShowEditor(true);
  };

  const closeEditor = () => {
    clearTimeout(debounceTimer.current);
    setCurrent(EMPTY_NOTE);
    setSave("idle");
    setShowEditor(false);
  };
  const currentUpdatedAt = current?.updated_at || current?.created_at;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Left panel */}
        <div className={cn("flex-shrink-0 flex flex-col gap-3 transition-all duration-200", showEditor ? "w-[38%]" : "w-full")}>
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
                onClick={() => { setCurrent(normalizeNote(n)); setSave("idle"); setShowEditor(true); }}
                className={cn("w-full rounded-lg border text-left px-3 py-2.5 transition-colors",
                  current.id === n.id ? "border-violet-500/30 bg-violet-500/10" : "border-border/60 bg-card hover:bg-muted/20")}>
                <p className="text-sm font-medium text-foreground truncate">{n.title || "Untitled"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.content?.substring(0, 60) || "—"}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  {normalizeTags(n?.tags).slice(0, 3).map((t) => (
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

        {/* Right editor — only visible when showEditor is true */}
        {showEditor && (
        <div className="flex-1 rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-violet-500/20 text-violet-300">
                <Edit3 className="h-3 w-3" />Editor
              </span>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
              {saveStatus === "saved"  && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="h-3 w-3" />Saved
                </span>
              )}
              {current.id && (
                <button onClick={() => setNoteToDelete(current)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3 w-3" />Delete
                </button>
              )}
              <button onClick={closeEditor}
                className="p-1 rounded hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-8 pt-7 pb-4 border-b border-border/30">
              <input
                type="text"
                value={current.title}
                placeholder="Note title…"
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full text-xl font-bold bg-transparent text-foreground outline-none placeholder:text-muted-foreground/40"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Updated: {currentUpdatedAt ? format(new Date(currentUpdatedAt), "MMM d, yyyy, 'at' hh:mm a") : "Not saved yet"}
              </p>
            </div>
            <div className="px-8 py-3 border-b border-border/30">
              <TagInput tags={normalizeTags(current?.tags)} onChange={(tags) => handleChange("tags", tags)} placeholder="Add tags…" />
            </div>
            <textarea
              value={current.content}
              placeholder="Write your note in Markdown…"
              onChange={(e) => handleChange("content", e.target.value)}
              onPaste={handleContentPaste}
              className="flex-1 px-8 py-6 bg-transparent text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/40 font-mono leading-relaxed"
            />
          </div>
        </div>
        )}
      </div>

      <AlertDialog open={Boolean(noteToDelete)} onOpenChange={(open) => { if (!open) setNoteToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              {noteToDelete?.title
                ? `This will permanently delete "${noteToDelete.title}".`
                : "This will permanently delete this note."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (noteToDelete?.id) deleteMutation.mutate(noteToDelete.id);
                setNoteToDelete(null);
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
