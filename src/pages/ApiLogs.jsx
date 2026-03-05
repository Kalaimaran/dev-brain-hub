import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { providerApi } from "@/lib/api";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

function TypeBadge({ type }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold",
        type === "EMBED" ? "bg-primary/12 text-primary" : "bg-info/12 text-info"
      )}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "text-xs font-mono font-semibold",
        status === "SUCCESS" ? "text-success" : "text-destructive"
      )}
    >
      {status}
    </span>
  );
}

export default function ApiLogsPage() {
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["provider-logs", page],
    queryFn: () => providerApi.logs({ page, limit: 20 }).then((r) => r.data?.data ?? r.data),
    retry: false,
  });

  const logs = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">API Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Request and response log history</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 px-4 py-2.5"></th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">API Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Input</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Latency</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Tokens</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Loading logs…</td></tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <ScrollText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No logs found. Make some embed or search API calls to see activity here.</p>
                </td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <>{/* eslint-disable-next-line react/jsx-key */}
                  <tr
                    key={log.id || i}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {expandedRow === i
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={log.apiType} /></td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-foreground truncate">{log.requestBody || "—"}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.responseTimeMs || 0}ms</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.totalTokens || 0}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                  {expandedRow === i && (
                    <tr key={`${log.id || i}-detail`}>
                      <td colSpan={7} className="bg-muted/20 px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Request Input</p>
                            <pre className="rounded-lg border border-border bg-card p-3 text-xs font-mono text-foreground overflow-auto max-h-48">
                              {log.requestBody || "—"}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Response Summary</p>
                            <pre className="rounded-lg border border-border bg-card p-3 text-xs font-mono text-foreground overflow-auto max-h-48">
                              {log.responseSummary || "—"}
                            </pre>
                            {log.errorMessage && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-destructive mb-1">Error</p>
                                <pre className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs font-mono text-destructive overflow-auto max-h-32">
                                  {log.errorMessage}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                          <span>Input Tokens: <span className="font-mono">{log.inputTokens || 0}</span></span>
                          <span>Output Tokens: <span className="font-mono">{log.outputTokens || 0}</span></span>
                          <span>Total Tokens: <span className="font-mono font-semibold">{log.totalTokens || 0}</span></span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
