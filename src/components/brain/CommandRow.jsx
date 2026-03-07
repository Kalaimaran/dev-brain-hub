import { useState, useMemo } from "react";
import {
  ChevronDown, ChevronRight, GitBranch, Package, Wrench, Terminal, Bot,
  Globe, Box, Code, Network, Copy, Check, GitCommit, FileCode, ArrowRight, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META = {
  git_activity:            { label: "Git",       color: "bg-orange-500/15 text-orange-300 border-orange-500/25",   icon: GitBranch },
  package_manager:         { label: "Package",   color: "bg-blue-500/15 text-blue-300 border-blue-500/25",         icon: Package },
  build_tool:              { label: "Build",     color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",   icon: Wrench },
  ai_cli_prompt:           { label: "AI CLI",    color: "bg-violet-500/15 text-violet-300 border-violet-500/25",   icon: Bot },
  terminal_command:        { label: "Terminal",  color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",         icon: Terminal },
  container_orchestration: { label: "Container", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",         icon: Box },
  python:                  { label: "Python",    color: "bg-green-500/15 text-green-300 border-green-500/25",      icon: Code },
  java:                    { label: "Java",      color: "bg-red-500/15 text-red-300 border-red-500/25",            icon: Code },
  http_request:            { label: "HTTP",      color: "bg-teal-500/15 text-teal-300 border-teal-500/25",         icon: Network },
  remote_access:           { label: "SSH",       color: "bg-pink-500/15 text-pink-300 border-pink-500/25",         icon: Globe },
  infrastructure:          { label: "Infra",     color: "bg-amber-500/15 text-amber-300 border-amber-500/25",      icon: Box },
};

// ── File status badge metadata ────────────────────────────────────────────────

const FILE_STATUS_META = {
  M: { label: "M", color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30", title: "Modified" },
  A: { label: "A", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", title: "Added" },
  D: { label: "D", color: "text-red-400 bg-red-500/15 border-red-500/30", title: "Deleted" },
  R: { label: "R", color: "text-blue-400 bg-blue-500/15 border-blue-500/30", title: "Renamed" },
  C: { label: "C", color: "text-violet-400 bg-violet-500/15 border-violet-500/30", title: "Copied" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePageText(pageText) {
  if (!pageText) return null;
  try { return JSON.parse(pageText); } catch { return null; }
}

function DiffBars({ additions, deletions, max = 10 }) {
  if (additions === null && deletions === null) return null;
  const add = Math.min(additions ?? 0, max);
  const del = Math.min(deletions ?? 0, max);
  const empty = max - add - del;
  return (
    <span className="inline-flex gap-px items-center ml-1" title={`+${additions ?? 0} -${deletions ?? 0}`}>
      {Array.from({ length: add }).map((_, i) => (
        <span key={`a${i}`} className="h-2 w-1.5 rounded-sm bg-emerald-500" />
      ))}
      {Array.from({ length: del }).map((_, i) => (
        <span key={`d${i}`} className="h-2 w-1.5 rounded-sm bg-red-500" />
      ))}
      {Array.from({ length: Math.max(0, empty) }).map((_, i) => (
        <span key={`e${i}`} className="h-2 w-1.5 rounded-sm bg-muted/50" />
      ))}
    </span>
  );
}

// ── Diff parser + viewer ──────────────────────────────────────────────────────

/**
 * Parse a unified diff patch string into an array of file-level objects.
 * Returns: [{fromFile, toFile, hunks: [{header, lines: [{type, content}]}]}]
 */
function parseDiff(patch) {
  if (!patch) return [];
  const files = [];
  let currentFile = null;
  let currentHunk = null;

  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) {
      currentFile = { fromFile: "", toFile: "", hunks: [] };
      files.push(currentFile);
      currentHunk = null;
    } else if (line.startsWith("--- ") && currentFile) {
      currentFile.fromFile = line.slice(4).replace(/^a\//, "");
    } else if (line.startsWith("+++ ") && currentFile) {
      currentFile.toFile = line.slice(4).replace(/^b\//, "");
    } else if (line.startsWith("@@ ") && currentFile) {
      currentHunk = { header: line, lines: [] };
      currentFile.hunks.push(currentHunk);
    } else if (currentHunk) {
      if (line.startsWith("+")) {
        currentHunk.lines.push({ type: "add", content: line.slice(1) });
      } else if (line.startsWith("-")) {
        currentHunk.lines.push({ type: "del", content: line.slice(1) });
      } else if (line.startsWith(" ")) {
        currentHunk.lines.push({ type: "ctx", content: line.slice(1) });
      }
      // skip meta lines (index, mode, etc.)
    }
  }

  return files;
}

function FileDiff({ fileDiff }) {
  const [open, setOpen] = useState(true);
  const filename = fileDiff.toFile || fileDiff.fromFile || "unknown";
  const totalLines = fileDiff.hunks.reduce((s, h) => s + h.lines.length, 0);

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      {/* File header bar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-1.5 bg-zinc-800/60 hover:bg-zinc-700/60 transition-colors text-left border-b border-border/40"
      >
        {open
          ? <ChevronDown  className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
        <FileCode className="h-3 w-3 text-orange-400 flex-shrink-0" />
        <span className="font-mono text-xs text-foreground flex-1 truncate">{filename}</span>
        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{totalLines} lines</span>
      </button>

      {/* Diff lines */}
      {open && (
        <div className="overflow-x-auto bg-zinc-950/40">
          {fileDiff.hunks.map((hunk, hi) => (
            <div key={hi}>
              {/* Hunk header @@ line */}
              <div className="px-3 py-0.5 bg-blue-900/30 border-y border-blue-800/40 font-mono text-[10px] text-blue-300/80 select-none">
                {hunk.header}
              </div>
              {/* Diff lines */}
              {hunk.lines.map((line, li) => (
                <div
                  key={li}
                  className={cn(
                    "flex items-start font-mono text-[11px] leading-5 whitespace-pre select-text",
                    line.type === "add" && "bg-green-900/50",
                    line.type === "del" && "bg-red-900/50",
                    line.type === "ctx" && "bg-transparent",
                  )}
                >
                  {/* +/- gutter */}
                  <span
                    className={cn(
                      "w-6 flex-shrink-0 text-center select-none font-bold",
                      line.type === "add" && "text-green-400 bg-green-800/60",
                      line.type === "del" && "text-red-400 bg-red-800/60",
                      line.type === "ctx" && "text-zinc-600",
                    )}
                  >
                    {line.type === "add" ? "+" : line.type === "del" ? "−" : " "}
                  </span>
                  {/* Line content */}
                  <span
                    className={cn(
                      "px-2 flex-1",
                      line.type === "add" && "text-green-200",
                      line.type === "del" && "text-red-200",
                      line.type === "ctx" && "text-zinc-400",
                    )}
                  >
                    {line.content || "\u00a0"}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Full-height right-side drawer showing the unified diff for a commit.
 */
function DiffSidePanel({ patch, commitMessage, commitHash, onClose }) {
  const files = useMemo(() => parseDiff(patch), [patch]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Side panel */}
      <div className="fixed right-0 top-0 h-screen w-[52vw] min-w-[440px] max-w-[820px] bg-card border-l border-border z-50 flex flex-col shadow-2xl">

        {/* Panel header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/20 flex-shrink-0">
          <GitBranch className="h-4 w-4 text-orange-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {commitMessage && (
              <p className="text-sm font-semibold text-foreground truncate leading-tight">{commitMessage}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {commitHash && (
                <code className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
                  {commitHash}
                </code>
              )}
              <span className="text-[10px] text-muted-foreground">
                {files.length} file{files.length !== 1 ? "s" : ""} changed
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors flex-shrink-0"
            title="Close"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </div>

        {/* Scrollable diff content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileCode className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No diff data available for this commit</p>
            </div>
          ) : (
            files.map((f, i) => <FileDiff key={i} fileDiff={f} />)
          )}
        </div>
      </div>
    </>
  );
}

// ── Git expanded panels ───────────────────────────────────────────────────────

function CommitDetail({ parsed }) {
  const [showDiff, setShowDiff] = useState(false);

  const {
    commitMessage, commitHash, author, diffStat,
    filesChanged = [], fileStatuses = [],
    totalAdditions, totalDeletions, filesCount, branch,
    workingDirectory, diffPatch,
  } = parsed;

  // Merge filesChanged + fileStatuses by filename
  const files = filesChanged.map((fc) => {
    const fs = fileStatuses.find((s) => s.file === fc.file);
    return { ...fc, status: fs?.status || "M", oldFile: fs?.oldFile };
  });

  // Files that appear in fileStatuses but not in filesChanged (e.g. binary)
  const extraFiles = fileStatuses.filter(
    (fs) => !filesChanged.find((fc) => fc.file === fs.file)
  );

  const allFiles = [
    ...files,
    ...extraFiles.map((fs) => ({ file: fs.file, status: fs.status, oldFile: fs.oldFile, additions: null, deletions: null })),
  ];

  return (
    <div className="space-y-3">
      {/* Commit header */}
      <div className="rounded-lg bg-background border border-border/60 p-3 space-y-2">
        {commitMessage && (
          <p className="text-sm font-semibold text-foreground leading-snug">{commitMessage}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {author && <span>{author}</span>}
          {branch && (
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {branch}
            </span>
          )}
          {commitHash && (
            <code className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
              {commitHash}
            </code>
          )}
        </div>
        {workingDirectory && (
          <p className="text-[10px] font-mono text-muted-foreground/60 truncate">{workingDirectory}</p>
        )}
      </div>

      {/* Stats summary */}
      {(filesCount > 0 || (totalAdditions ?? 0) + (totalDeletions ?? 0) > 0) && (
        <div className="flex items-center gap-4 text-xs px-1">
          <span className="text-muted-foreground">
            {filesCount ?? allFiles.length} file{(filesCount ?? allFiles.length) !== 1 ? "s" : ""} changed
          </span>
          {(totalAdditions ?? 0) > 0 && (
            <span className="text-emerald-400 font-mono font-semibold">+{totalAdditions}</span>
          )}
          {(totalDeletions ?? 0) > 0 && (
            <span className="text-red-400 font-mono font-semibold">−{totalDeletions}</span>
          )}
          {diffStat && (
            <span className="text-muted-foreground/50 text-[10px] italic">{diffStat}</span>
          )}
        </div>
      )}

      {/* Files table */}
      {allFiles.length > 0 && (
        <div className="rounded-lg bg-background border border-border/60 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border/40 bg-muted/10 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <FileCode className="h-3 w-3" />
            Files Changed
          </div>
          <table className="w-full">
            <tbody>
              {allFiles.map((f, i) => {
                const sm = FILE_STATUS_META[f.status] || FILE_STATUS_META.M;
                const maxBars = 10;
                const total = (f.additions ?? 0) + (f.deletions ?? 0);
                const addBars = total > 0 ? Math.round((f.additions ?? 0) / total * maxBars) : 0;
                const delBars = total > 0 ? Math.round((f.deletions ?? 0) / total * maxBars) : 0;

                return (
                  <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                    {/* Status badge */}
                    <td className="pl-3 pr-2 py-2 w-8">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded border w-5 h-5 text-[10px] font-bold flex-shrink-0",
                          sm.color
                        )}
                        title={sm.title}
                      >
                        {sm.label}
                      </span>
                    </td>

                    {/* Filename */}
                    <td className="px-2 py-2 font-mono text-xs text-foreground">
                      {f.oldFile ? (
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className="text-muted-foreground line-through">{f.oldFile}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span>{f.file}</span>
                        </span>
                      ) : (
                        f.file
                      )}
                    </td>

                    {/* Mini bar chart */}
                    <td className="px-3 py-2 hidden sm:table-cell">
                      {total > 0 && (
                        <span className="inline-flex gap-px items-center">
                          {Array.from({ length: addBars }).map((_, j) => (
                            <span key={`a${j}`} className="h-2 w-1.5 rounded-sm bg-emerald-500" />
                          ))}
                          {Array.from({ length: delBars }).map((_, j) => (
                            <span key={`d${j}`} className="h-2 w-1.5 rounded-sm bg-red-500" />
                          ))}
                          {Array.from({ length: maxBars - addBars - delBars }).map((_, j) => (
                            <span key={`e${j}`} className="h-2 w-1.5 rounded-sm bg-muted/40" />
                          ))}
                        </span>
                      )}
                    </td>

                    {/* +/- counts */}
                    <td className="px-3 py-2 text-right font-mono text-xs whitespace-nowrap">
                      {f.additions !== null && (
                        <span className="text-emerald-400">+{f.additions}</span>
                      )}
                      {f.additions !== null && f.deletions !== null && (
                        <span className="text-muted-foreground mx-1">/</span>
                      )}
                      {f.deletions !== null && (
                        <span className="text-red-400">−{f.deletions}</span>
                      )}
                      {f.additions === null && f.deletions === null && (
                        <span className="text-muted-foreground/40 text-[10px]">binary</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View diff button */}
      {diffPatch && (
        <button
          onClick={() => setShowDiff(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-orange-500/30 bg-orange-500/5 text-xs text-orange-300/80 hover:text-orange-200 hover:bg-orange-500/10 hover:border-orange-400/50 transition-colors"
        >
          <FileCode className="h-3.5 w-3.5" />
          View Line Diff
          <ChevronRight className="h-3 w-3" />
        </button>
      )}

      {/* Right-side diff panel */}
      {showDiff && diffPatch && (
        <DiffSidePanel
          patch={diffPatch}
          commitMessage={commitMessage}
          commitHash={commitHash}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}

function PushDetail({ parsed }) {
  const {
    remoteUrl, commitsCount, commitsPushed = [],
    commitsAheadAfterPush, branch,
  } = parsed;

  return (
    <div className="space-y-3">
      {/* Push summary */}
      <div className="rounded-lg bg-background border border-border/60 p-3 space-y-2">
        <p className="text-sm font-semibold text-foreground">
          {(commitsCount ?? commitsPushed.length) > 0
            ? `Pushed ${commitsCount ?? commitsPushed.length} commit${(commitsCount ?? commitsPushed.length) !== 1 ? "s" : ""} to remote`
            : "Push completed"}
        </p>
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {branch && (
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {branch}
            </span>
          )}
          {remoteUrl && (
            <span className="font-mono truncate text-[10px]">{remoteUrl}</span>
          )}
        </div>
        {commitsAheadAfterPush === 0 && (
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Check className="h-3 w-3" /> Branch is up to date with remote
          </span>
        )}
      </div>

      {/* Commits list */}
      {commitsPushed.length > 0 && (
        <div className="rounded-lg bg-background border border-border/60 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border/40 bg-muted/10 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <GitCommit className="h-3 w-3" />
            Commits Pushed
          </div>
          <table className="w-full">
            <tbody>
              {commitsPushed.map((c, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="pl-3 pr-2 py-2 w-20">
                    <code className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground">
                      {c.hash}
                    </code>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-foreground">{c.message}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground text-right whitespace-nowrap hidden md:table-cell">
                    {c.author}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {commitsPushed.length === 0 && (
        <p className="text-xs text-muted-foreground/60 italic px-1">
          No commit details captured (push may have used --force or no upstream).
        </p>
      )}
    </div>
  );
}

function PullDetail({ parsed }) {
  const { commitsBehind, branch } = parsed;
  return (
    <div className="rounded-lg bg-background border border-border/60 p-3 space-y-1">
      <p className="text-sm font-semibold text-foreground">Pull completed</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {branch && (
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />{branch}
          </span>
        )}
        {commitsBehind !== null && commitsBehind !== undefined && (
          <span>{commitsBehind === 0 ? "Already up to date" : `Was ${commitsBehind} commit(s) behind`}</span>
        )}
      </div>
    </div>
  );
}

function CheckoutDetail({ parsed }) {
  const { newBranch, branch } = parsed;
  return (
    <div className="rounded-lg bg-background border border-border/60 p-3 flex items-center gap-3">
      <GitBranch className="h-4 w-4 text-orange-400 flex-shrink-0" />
      <div className="text-xs space-y-0.5">
        <p className="text-foreground font-medium">Switched branch</p>
        {newBranch && <p className="text-muted-foreground font-mono">→ {newBranch}</p>}
        {branch && branch !== newBranch && (
          <p className="text-muted-foreground/60 font-mono">now on: {branch}</p>
        )}
      </div>
    </div>
  );
}

function MergeDetail({ parsed }) {
  const { sourceBranch, branch } = parsed;
  return (
    <div className="rounded-lg bg-background border border-border/60 p-3 flex items-center gap-3">
      <GitBranch className="h-4 w-4 text-orange-400 flex-shrink-0" />
      <div className="text-xs space-y-0.5">
        <p className="text-foreground font-medium">Merge</p>
        {sourceBranch && branch && (
          <p className="text-muted-foreground font-mono">
            {sourceBranch} → {branch}
          </p>
        )}
      </div>
    </div>
  );
}

function GitGenericDetail({ parsed }) {
  const skip = new Set(["id", "eventType", "event_type", "workingDirectory", "timestamp", "repoRoot"]);
  const fields = Object.entries(parsed || {}).filter(([k]) => !skip.has(k));
  if (!fields.length) return null;
  return (
    <div className="rounded-lg bg-background border border-border/60 overflow-auto">
      <table className="w-full text-xs">
        <tbody>
          {fields.map(([k, v]) => (
            <tr key={k} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-1.5 font-mono text-muted-foreground w-40 flex-shrink-0">{k}</td>
              <td className="px-3 py-1.5 font-mono text-foreground break-all">
                {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GitDetailPanel({ parsed }) {
  const sub = parsed?.subCommand || "";
  if (sub === "commit")   return <CommitDetail parsed={parsed} />;
  if (sub === "push")     return <PushDetail parsed={parsed} />;
  if (sub === "pull")     return <PullDetail parsed={parsed} />;
  if (sub === "checkout") return <CheckoutDetail parsed={parsed} />;
  if (sub === "merge")    return <MergeDetail parsed={parsed} />;
  return <GitGenericDetail parsed={parsed} />;
}

// ── Inline git info for collapsed row ────────────────────────────────────────

function GitInlineInfo({ parsed }) {
  if (!parsed) return null;
  const { subCommand, commitMessage, totalAdditions, totalDeletions, commitsCount, commitsPushed, branch, newBranch, sourceBranch, commitsBehind } = parsed;

  if (subCommand === "commit" && commitMessage) {
    return (
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground/70 truncate italic text-[11px]">{commitMessage}</span>
        {((totalAdditions ?? 0) > 0 || (totalDeletions ?? 0) > 0) && (
          <span className="flex items-center gap-1 flex-shrink-0">
            {(totalAdditions ?? 0) > 0 && (
              <span className="text-emerald-400 font-mono text-[11px]">+{totalAdditions}</span>
            )}
            {(totalDeletions ?? 0) > 0 && (
              <span className="text-red-400 font-mono text-[11px]">−{totalDeletions}</span>
            )}
          </span>
        )}
      </span>
    );
  }

  if (subCommand === "push") {
    const cnt = commitsCount ?? commitsPushed?.length ?? 0;
    return (
      <span className="text-muted-foreground/70 text-[11px] flex-shrink-0">
        ↑ {cnt > 0 ? `${cnt} commit${cnt !== 1 ? "s" : ""}` : "push"}
        {branch && <span className="ml-1 opacity-60">on {branch}</span>}
      </span>
    );
  }

  if (subCommand === "pull") {
    return (
      <span className="text-muted-foreground/70 text-[11px] flex-shrink-0">
        ↓ pull{branch ? ` ${branch}` : ""}
        {commitsBehind != null && commitsBehind > 0
          ? ` (${commitsBehind} behind)`
          : commitsBehind === 0 ? " (up to date)" : ""}
      </span>
    );
  }

  if (subCommand === "checkout" && (newBranch || branch)) {
    return (
      <span className="text-muted-foreground/70 text-[11px] flex-shrink-0">
        → {newBranch || branch}
      </span>
    );
  }

  if (subCommand === "merge" && sourceBranch) {
    return (
      <span className="text-muted-foreground/70 text-[11px] flex-shrink-0">
        ← {sourceBranch}
      </span>
    );
  }

  if (branch) {
    return (
      <span className="text-muted-foreground/50 text-[11px] flex-shrink-0 flex items-center gap-1">
        <GitBranch className="h-2.5 w-2.5" />{branch}
      </span>
    );
  }

  return null;
}

// ── Git subcommands set ───────────────────────────────────────────────────────

const GIT_SUBCOMMANDS = new Set([
  "commit", "push", "pull", "merge", "rebase",
  "checkout", "reset", "stash", "tag", "fetch",
]);

// ── Main CommandRow ───────────────────────────────────────────────────────────

export default function CommandRow({ event }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);

  const parsed  = parsePageText(event.page_text);

  // Detect git_activity from the API field OR from the parsed page_text
  // (the API sometimes returns event_type as "terminal_command" even for git events)
  const isGit = event.event_type === "git_activity"
    || parsed?.eventType === "git_activity"
    || (parsed?.subCommand != null && GIT_SUBCOMMANDS.has(parsed.subCommand));

  const meta    = isGit
    ? TYPE_META["git_activity"]
    : (TYPE_META[event.event_type] || TYPE_META["terminal_command"]);
  const Icon    = meta.icon;

  const command = event.search_query || parsed?.command || "—";
  const project = event.domain || parsed?.projectName || parsed?.repoName || "—";
  const ts      = event.created_at ? format(new Date(event.created_at), "HH:mm:ss") : "";

  const handleCopy = (e) => {
    e.stopPropagation();
    if (command === "—") return;
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("border-b border-border/40 last:border-0", expanded && "bg-muted/20")}>
      {/* ── Collapsed row ──────────────────────────────────────────────────── */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Chevron */}
        {expanded
          ? <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}

        {/* Type icon */}
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

        {/* Type badge */}
        <span className={cn(
          "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0",
          meta.color
        )}>
          {meta.label}
        </span>

        {/* Command text + git inline info */}
        <span className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
          <span className="text-sm font-mono text-foreground truncate flex-shrink-0 max-w-[240px] sm:max-w-xs">
            {command}
          </span>
          {isGit && parsed && (
            <span className="flex items-center gap-2 min-w-0 overflow-hidden">
              {parsed.branch && (
                <span className="hidden sm:flex items-center gap-1 text-orange-400/70 text-[10px] font-mono flex-shrink-0">
                  <GitBranch className="h-2.5 w-2.5" />
                  {parsed.branch}
                </span>
              )}
              <GitInlineInfo parsed={parsed} />
            </span>
          )}
        </span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          title="Copy command"
          className="flex-shrink-0 p-1 rounded hover:bg-muted/60 transition-colors"
        >
          {copied
            ? <Check className="h-3 w-3 text-emerald-400" />
            : <Copy  className="h-3 w-3 text-muted-foreground hover:text-foreground" />}
        </button>

        {/* Project */}
        <span className="text-xs text-muted-foreground flex-shrink-0 hidden md:block w-28 text-right truncate">{project}</span>

        {/* Time */}
        <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums ml-1 w-16 text-right">{ts}</span>
      </button>

      {/* ── Expanded panel ─────────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 pb-4 pt-1">
          {isGit && parsed ? (
            <GitDetailPanel parsed={parsed} />
          ) : parsed ? (
            /* Generic key-value table for non-git events */
            <div className="rounded-lg bg-background border border-border/60 overflow-auto">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(parsed)
                    .filter(([k]) => k !== "id" && k !== "eventType")
                    .map(([k, v]) => (
                      <tr key={k} className="border-b border-border/40 last:border-0">
                        <td className="px-3 py-1.5 font-mono text-muted-foreground w-40 flex-shrink-0">{k}</td>
                        <td className="px-3 py-1.5 font-mono text-foreground break-all">
                          {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "—")}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">No additional details available.</p>
          )}
        </div>
      )}
    </div>
  );
}
