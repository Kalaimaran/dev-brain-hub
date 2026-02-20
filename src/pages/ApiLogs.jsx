import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

function MethodBadge({ method }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold",
        method === "POST" ? "bg-primary/12 text-primary"
        : method === "DELETE" ? "bg-destructive/12 text-destructive"
        : method === "PUT" || method === "PATCH" ? "bg-warning/12 text-warning"
        : "bg-info/12 text-info"
      )}
    >
      {method || "GET"}
    </span>
  );
}

export default function ApiLogsPage() {
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["logs", page],
    queryFn: () => analyticsApi.logs({ page, limit: 20 }).then((r) => r.data),
    retry: false,
  });

  const logs = data?.items || data || [];
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
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Method</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Endpoint</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Latency</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Loading logs…</td></tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <ScrollText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No logs found.</p>
                </td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <>
                  <tr
                    key={i}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {expandedRow === i
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                    <td className="px-4 py-3"><MethodBadge method={log.method} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{log.endpoint || log.path || "/"}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs font-mono font-semibold",
                        (log.status || 200) < 400 ? "text-success" : "text-destructive"
                      )}>
                        {log.status || 200}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.latency || 0}ms</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                    </td>
                  </tr>
                  {expandedRow === i && (
                    <tr key={`${i}-detail`}>
                      <td colSpan={6} className="bg-muted/20 px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Request</p>
                            <pre className="rounded-lg border border-border bg-card p-3 text-xs font-mono text-foreground overflow-auto max-h-48">
                              {JSON.stringify(log.request || {}, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Response</p>
                            <pre className="rounded-lg border border-border bg-card p-3 text-xs font-mono text-foreground overflow-auto max-h-48">
                              {JSON.stringify(log.response || {}, null, 2)}
                            </pre>
                          </div>
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
