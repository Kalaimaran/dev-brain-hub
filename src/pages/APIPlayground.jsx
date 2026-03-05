import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Copy, Check, Terminal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAccessToken, getRefreshToken } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function CodeBlock({ title, code, tag }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{title}</span>
          {tag && (
            <span className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold",
              tag === "POST" ? "bg-primary/12 text-primary"
              : tag === "GET" ? "bg-info/12 text-info"
              : "bg-warning/12 text-warning"
            )}>
              {tag}
            </span>
          )}
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed font-mono text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function APIPlaygroundPage() {
  const token = getAccessToken() || "<YOUR_ACCESS_TOKEN>";
  const refreshToken = getRefreshToken() || "<YOUR_REFRESH_TOKEN>";

  const examples = [
    {
      title: "Embed Text",
      tag: "POST",
      code: `curl -X POST ${API_BASE}/api/train/embed \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
    "input": "Your text content to embed"
  }'`,
    },
    {
      title: "Semantic Search",
      tag: "POST",
      code: `curl -X POST ${API_BASE}/api/train/search \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
    "input": "your search query",
    "topK": 5
  }'`,
    },
    {
      title: "Monitoring Summary",
      tag: "GET",
      code: `curl -X GET "${API_BASE}/api/train/monitoring/summary?days=30" \\
  -H "Authorization: Bearer ${token}"`,
    },
    {
      title: "Daily Stats",
      tag: "GET",
      code: `curl -X GET "${API_BASE}/api/train/monitoring/daily?days=30" \\
  -H "Authorization: Bearer ${token}"`,
    },
    {
      title: "API Logs",
      tag: "GET",
      code: `curl -X GET "${API_BASE}/api/train/monitoring/logs?page=1&limit=20" \\
  -H "Authorization: Bearer ${token}"`,
    },
    {
      title: "Request Type Breakdown",
      tag: "GET",
      code: `curl -X GET "${API_BASE}/api/train/monitoring/by-type?days=30" \\
  -H "Authorization: Bearer ${token}"`,
    },
    {
      title: "Refresh Token",
      tag: "POST",
      code: `curl -X POST ${API_BASE}/api/v1/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{"refreshToken": "${refreshToken}"}'`,
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">API Playground</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ready-to-use curl commands with your auth token</p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <span className="font-semibold text-primary">Token auto-injected.</span>
        <span className="text-foreground/80 ml-1">Copy any command and run it directly in your terminal.</span>
      </div>

      <div className="space-y-3">
        {examples.map((ex) => (
          <CodeBlock key={ex.title} title={ex.title} code={ex.code} tag={ex.tag} />
        ))}
      </div>
    </div>
  );
}
