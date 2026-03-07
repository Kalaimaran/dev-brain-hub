import { useState } from "react";
import { ChevronDown, ChevronRight, GitBranch, Package, Wrench, Terminal, Bot, Globe, Box, Code, Network, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const TYPE_META = {
  git_activity:           { label: "Git",       color: "bg-orange-500/15 text-orange-300 border-orange-500/25",   icon: GitBranch },
  package_manager:        { label: "Package",   color: "bg-blue-500/15 text-blue-300 border-blue-500/25",         icon: Package },
  build_tool:             { label: "Build",     color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",   icon: Wrench },
  ai_cli_prompt:          { label: "AI CLI",    color: "bg-violet-500/15 text-violet-300 border-violet-500/25",   icon: Bot },
  terminal_command:       { label: "Terminal",  color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",         icon: Terminal },
  container_orchestration:{ label: "Container", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",         icon: Box },
  python:                 { label: "Python",    color: "bg-green-500/15 text-green-300 border-green-500/25",      icon: Code },
  java:                   { label: "Java",      color: "bg-red-500/15 text-red-300 border-red-500/25",            icon: Code },
  http_request:           { label: "HTTP",      color: "bg-teal-500/15 text-teal-300 border-teal-500/25",         icon: Network },
  remote_access:          { label: "SSH",       color: "bg-pink-500/15 text-pink-300 border-pink-500/25",         icon: Globe },
  infrastructure:         { label: "Infra",     color: "bg-amber-500/15 text-amber-300 border-amber-500/25",      icon: Box },
};

function parsePageText(pageText) {
  if (!pageText) return null;
  try { return JSON.parse(pageText); } catch { return null; }
}

export default function CommandRow({ event }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[event.event_type] || TYPE_META["terminal_command"];
  const Icon = meta.icon;
  const parsed = parsePageText(event.page_text);
  const command = event.search_query || parsed?.command || "—";
  const project = event.domain || parsed?.projectName || parsed?.repoName || "—";
  const dir = parsed?.workingDirectory || event.url || "";

  const ts = event.created_at ? format(new Date(event.created_at), "HH:mm:ss") : "";

  const handleCopy = (e) => {
    e.stopPropagation();
    if (command === "—") return;
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("border-b border-border/40 last:border-0", expanded && "bg-muted/30")}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0", meta.color)}>
          {meta.label}
        </span>
        <span className="flex-1 text-sm font-mono text-foreground truncate">{command}</span>
        <button
          onClick={handleCopy}
          title="Copy command"
          className="flex-shrink-0 p-1 rounded hover:bg-muted/60 transition-colors"
        >
          {copied
            ? <Check className="h-3 w-3 text-emerald-400" />
            : <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />}
        </button>
        <span className="text-xs text-muted-foreground flex-shrink-0 hidden md:block">{project}</span>
        <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums ml-3">{ts}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 text-xs">
          {/* Show structured fields from parsed JSON */}
          {parsed && (
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
          )}
          {dir && (
            <p className="text-muted-foreground font-mono">{dir}</p>
          )}
        </div>
      )}
    </div>
  );
}
