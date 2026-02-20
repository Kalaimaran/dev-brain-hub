import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://api.example.com";

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed font-mono text-foreground bg-secondary/30">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function APIPlaygroundPage() {
  const { accessToken } = useAuth();
  const token = accessToken || "<YOUR_ACCESS_TOKEN>";

  const examples = [
    {
      title: "Add Data (Embed)",
      code: `curl -X POST ${API_BASE}/data/embed \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
    "text": "Your text content to embed",
    "metadata": {
      "source": "api",
      "category": "example"
    }
  }'`,
    },
    {
      title: "Semantic Search",
      code: `curl -X POST ${API_BASE}/data/search \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
    "query": "your search query",
    "topK": 5
  }'`,
    },
    {
      title: "List Data",
      code: `curl -X GET ${API_BASE}/data/list \\
  -H "Authorization: Bearer ${token}"`,
    },
    {
      title: "Refresh Token",
      code: `curl -X POST ${API_BASE}/api/v1/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{
    "refreshToken": "<YOUR_REFRESH_TOKEN>"
  }'`,
    },
    {
      title: "Get Usage Stats",
      code: `curl -X GET ${API_BASE}/usage \\
  -H "Authorization: Bearer ${token}"`,
    },
    {
      title: "Get API Logs",
      code: `curl -X GET "${API_BASE}/logs?page=1&limit=20" \\
  -H "Authorization: Bearer ${token}"`,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">API Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">Ready-to-use curl commands with your auth token</p>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <span className="font-medium text-primary">Your token is auto-injected</span> into the commands below. Copy and run directly in your terminal.
      </div>

      <div className="space-y-4">
        {examples.map((ex) => (
          <CodeBlock key={ex.title} title={ex.title} code={ex.code} />
        ))}
      </div>
    </div>
  );
}
